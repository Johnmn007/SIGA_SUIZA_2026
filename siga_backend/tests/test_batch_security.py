"""
Pruebas integrales de seguridad, autorización RBAC y validaciones de negocio
para el endpoint POST /registros/batch en mod-evaluacion.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import auth_headers


@pytest_asyncio.fixture
async def app_eval(db_session: AsyncSession):
    routes_mod = load_module_component("mod-evaluacion", "routes")
    db_mod = load_module_component("mod-evaluacion", "database")
    app = FastAPI()
    app.dependency_overrides[routes_mod.get_db] = lambda: db_session
    app.dependency_overrides[db_mod.get_db] = lambda: db_session
    app.include_router(routes_mod.router)
    return app


@pytest_asyncio.fixture
async def client_eval(app_eval):
    async with AsyncClient(
        transport=ASGITransport(app=app_eval),
        base_url="http://test-eval"
    ) as client:
        yield client
    app_eval.dependency_overrides.clear()


@pytest_asyncio.fixture
async def fix_batch_entorno(db_session: AsyncSession, fixture_evaluacion, fixture_carga_lectiva_y_plan):
    """
    Configura un entorno completo con unidad 101, periodo 1, docente titular 10,
    docente no asignado 11, y registro de evaluación ID 200.
    """
    await db_session.execute(text("""
        UPDATE carga_lectiva 
        SET unidad_didactica_id = 101, 
            periodo_id = 1, 
            programa_id = 1, 
            docente_id = 10,
            acta_cerrada = false, 
            fecha_limite_notas = NULL, 
            acta_cerrada_at = NULL, 
            acta_cerrada_por = NULL 
        WHERE id = 1;
    """))
    await db_session.commit()
    return {
        "carga_id": 1,
        "unidad_id": 101,
        "periodo_id": 1,
        "evaluacion_id": 200,
        "matricula_detalle_id": 80,
        "estudiante_id": 100,
        "docente_titular_id": 10,
        "docente_ajeno_id": 11,
        "superadmin_id": 1,
        "inactivo_id": 30
    }


# ==============================================================================
# 1. AUTENTICACIÓN (401)
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_payload_vacio_sin_token_rechaza_401(client_eval):
    """POST /registros/batch con payload vacío [] sin token debe responder 401 Unauthorized, no 200 []."""
    resp = await client_eval.post("/registros/batch", json=[])
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_batch_sin_token_rechaza_401(client_eval, fix_batch_entorno):
    """Petición a /registros/batch sin cabeceras de autorización devuelve 401."""
    payload = [{
        "id": fix_batch_entorno["evaluacion_id"],
        "unidad_didactica_id": fix_batch_entorno["unidad_id"],
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_final": 15
    }]
    resp = await client_eval.post("/registros/batch", json=payload)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_batch_usuario_inactivo_rechaza_401(client_eval, fix_batch_entorno):
    """Petición con usuario inactivo en core_users devuelve 401."""
    payload = [{
        "id": fix_batch_entorno["evaluacion_id"],
        "unidad_didactica_id": fix_batch_entorno["unidad_id"],
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_final": 15
    }]
    headers = auth_headers(user_id=fix_batch_entorno["inactivo_id"])
    resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
    assert resp.status_code == 401


# ==============================================================================
# 2. AUTORIZACIÓN DOCENTE TITULAR (403)
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_docente_no_asignado_rechaza_403(client_eval, fix_batch_entorno):
    """Docente ajeno que no es titular de la carga lectiva recibe 403 Forbidden."""
    payload = [{
        "id": fix_batch_entorno["evaluacion_id"],
        "unidad_didactica_id": fix_batch_entorno["unidad_id"],
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_final": 16
    }]
    headers = auth_headers(user_id=fix_batch_entorno["docente_ajeno_id"])
    resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "No tiene permisos para esta operación"


@pytest.mark.asyncio
async def test_batch_unidad_sin_carga_lectiva_rechaza_403(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """Si la unidad no tiene carga lectiva asignada, devuelve 403 con mensaje informativo."""
    try:
        await db_session.execute(text("UPDATE carga_lectiva SET unidad_didactica_id = 999 WHERE id = :id"), {"id": fix_batch_entorno["carga_id"]})
        await db_session.commit()

        payload = [{
            "id": fix_batch_entorno["evaluacion_id"],
            "unidad_didactica_id": fix_batch_entorno["unidad_id"],
            "periodo_id": fix_batch_entorno["periodo_id"],
            "nota_final": 16
        }]
        headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
        resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
        assert resp.status_code == 403
        assert "no tiene docente asignado" in resp.json()["detail"].lower()
    finally:
        try:
            await db_session.execute(
                text("UPDATE carga_lectiva SET unidad_didactica_id = :u WHERE id = :id"),
                {"u": fix_batch_entorno["unidad_id"], "id": fix_batch_entorno["carga_id"]}
            )
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            await db_session.execute(
                text("UPDATE carga_lectiva SET unidad_didactica_id = :u WHERE id = :id"),
                {"u": fix_batch_entorno["unidad_id"], "id": fix_batch_entorno["carga_id"]}
            )
            await db_session.commit()


# ==============================================================================
# 3. GUARDADO EXITOSO Y CONDICIÓN APROBADO / DESAPROBADO (MINEDU)
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_docente_asignado_guarda_exito(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """El docente titular guarda notas masivamente; se calcula condición y nota."""
    eval_id = fix_batch_entorno["evaluacion_id"]
    u_id = fix_batch_entorno["unidad_id"]
    p_id = fix_batch_entorno["periodo_id"]

    # 1. Nota 15 -> estado aprobado
    payload_15 = [{
        "id": eval_id,
        "unidad_didactica_id": u_id,
        "periodo_id": p_id,
        "nota_final": 15
    }]
    headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
    resp = await client_eval.post("/registros/batch", json=payload_15, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["nota_final"] == 15
    assert data[0]["estado"] == "aprobado"

    # Verificar en base de datos
    db_res = await db_session.execute(text("SELECT nota_final, estado FROM evaluacion_registros WHERE id = :id"), {"id": eval_id})
    row = db_res.fetchone()
    assert row[0] == 15
    assert row[1] == "aprobado"

    # 2. Nota 11 -> estado desaprobado (< 13)
    payload_11 = [{
        "id": eval_id,
        "unidad_didactica_id": u_id,
        "periodo_id": p_id,
        "nota_final": 11
    }]
    resp2 = await client_eval.post("/registros/batch", json=payload_11, headers=headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2[0]["nota_final"] == 11
    assert data2[0]["estado"] == "desaprobado"


@pytest.mark.asyncio
async def test_batch_superadmin_guarda_exito(client_eval, fix_batch_entorno):
    """Superadmin puede guardar notas en cualquier sección sin ser docente de la carga."""
    payload = [{
        "id": fix_batch_entorno["evaluacion_id"],
        "unidad_didactica_id": fix_batch_entorno["unidad_id"],
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_final": 18
    }]
    headers = auth_headers(user_id=fix_batch_entorno["superadmin_id"])
    resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["nota_final"] == 18
    assert data[0]["estado"] == "aprobado"


@pytest.mark.asyncio
async def test_batch_calculo_promedio_capacidades(client_eval, fix_batch_entorno):
    """Al enviar notas de capacidades c1=14, c2=16, c3=18, el promedio automático es 16 (aprobado)."""
    payload = [{
        "id": fix_batch_entorno["evaluacion_id"],
        "unidad_didactica_id": fix_batch_entorno["unidad_id"],
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_c1": 14,
        "nota_c2": 16,
        "nota_c3": 18
    }]
    headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
    resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["nota_c1"] == 14
    assert data[0]["nota_c2"] == 16
    assert data[0]["nota_c3"] == 18
    assert data[0]["nota_final"] == 16
    assert data[0]["estado"] == "aprobado"


# ==============================================================================
# 4. RESTRICCIONES DE NEGOCIO: PERIODO Y ACTAS (409)
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_periodo_cerrado_rechaza_409(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """Si el periodo académico está en estado 'cerrado', devuelve 409 Conflict."""
    p_id = fix_batch_entorno["periodo_id"]
    try:
        await db_session.execute(text("UPDATE periodos_academicos SET estado = 'cerrado' WHERE id = :id"), {"id": p_id})
        await db_session.commit()

        payload = [{
            "id": fix_batch_entorno["evaluacion_id"],
            "unidad_didactica_id": fix_batch_entorno["unidad_id"],
            "periodo_id": p_id,
            "nota_final": 17
        }]
        headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
        resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
        assert resp.status_code == 409
        assert "se encuentra en estado 'cerrado'" in resp.json()["detail"]
    finally:
        await db_session.execute(text("UPDATE periodos_academicos SET estado = 'en_curso' WHERE id = :id"), {"id": p_id})
        await db_session.commit()


@pytest.mark.asyncio
async def test_batch_acta_cerrada_rechaza_409(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """Si el acta ya fue cerrada formalmente, devuelve 409 Conflict."""
    carga_id = fix_batch_entorno["carga_id"]
    try:
        await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
        await db_session.commit()

        payload = [{
            "id": fix_batch_entorno["evaluacion_id"],
            "unidad_didactica_id": fix_batch_entorno["unidad_id"],
            "periodo_id": fix_batch_entorno["periodo_id"],
            "nota_final": 17
        }]
        headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
        resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
        assert resp.status_code == 409
        assert "está cerrada" in resp.json()["detail"]
    finally:
        await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = false WHERE id = :id"), {"id": carga_id})
        await db_session.commit()


@pytest.mark.asyncio
async def test_batch_fecha_limite_vencida_rechaza_409(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """Si la fecha límite de ingreso de notas ya expiró, devuelve 409 Conflict."""
    carga_id = fix_batch_entorno["carga_id"]
    ayer = date.today() - timedelta(days=1)
    try:
        await db_session.execute(text("UPDATE carga_lectiva SET fecha_limite_notas = :f WHERE id = :id"), {"f": ayer, "id": carga_id})
        await db_session.commit()

        payload = [{
            "id": fix_batch_entorno["evaluacion_id"],
            "unidad_didactica_id": fix_batch_entorno["unidad_id"],
            "periodo_id": fix_batch_entorno["periodo_id"],
            "nota_final": 17
        }]
        headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
        resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
        assert resp.status_code == 409
        assert "El plazo para ingresar notas venció" in resp.json()["detail"]
    finally:
        await db_session.execute(text("UPDATE carga_lectiva SET fecha_limite_notas = NULL WHERE id = :id"), {"id": carga_id})
        await db_session.commit()


# ==============================================================================
# 5. VALIDACIÓN DE ESCALA VIGESIMAL [0, 20] (422)
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_nota_fuera_de_rango_rechaza_422(client_eval, fix_batch_entorno):
    """Notas mayores a 20, menores a 0 o valores no numéricos devuelven 422 con mensaje descriptivo."""
    headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
    u_id = fix_batch_entorno["unidad_id"]
    p_id = fix_batch_entorno["periodo_id"]
    eval_id = fix_batch_entorno["evaluacion_id"]

    # 1. Nota final > 20
    resp_25 = await client_eval.post("/registros/batch", json=[{
        "id": eval_id, "unidad_didactica_id": u_id, "periodo_id": p_id, "nota_final": 25
    }], headers=headers)
    assert resp_25.status_code == 422
    assert resp_25.json()["detail"] == "Las notas deben estar entre 0 y 20"

    # 2. Nota c1 negativa (< 0)
    resp_neg = await client_eval.post("/registros/batch", json=[{
        "id": eval_id, "unidad_didactica_id": u_id, "periodo_id": p_id, "nota_c1": -1
    }], headers=headers)
    assert resp_neg.status_code == 422
    assert resp_neg.json()["detail"] == "Las notas deben estar entre 0 y 20"

    # 3. Nota tipo texto
    resp_txt = await client_eval.post("/registros/batch", json=[{
        "id": eval_id, "unidad_didactica_id": u_id, "periodo_id": p_id, "nota_c2": "veinte"
    }], headers=headers)
    assert resp_txt.status_code == 422
    assert resp_txt.json()["detail"] == "Las notas deben estar entre 0 y 20"

    # 4. Booleano
    resp_bool = await client_eval.post("/registros/batch", json=[{
        "id": eval_id, "unidad_didactica_id": u_id, "periodo_id": p_id, "nota_c3": True
    }], headers=headers)
    assert resp_bool.status_code == 422
    assert resp_bool.json()["detail"] == "Las notas deben estar entre 0 y 20"


# ==============================================================================
# 6. PRESERVACIÓN CRÍTICA DEL ESTADO DEL ESTUDIANTE (NUNCA 'CERRADO')
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_nunca_pone_estado_cerrado(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """Incluso si en el payload envían estado='cerrado', el sistema preserva la condición aprobatoria."""
    headers = auth_headers(user_id=fix_batch_entorno["docente_titular_id"])
    eval_id = fix_batch_entorno["evaluacion_id"]

    payload = [{
        "id": eval_id,
        "unidad_didactica_id": fix_batch_entorno["unidad_id"],
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_final": 17,
        "estado": "cerrado"  # Intento de forzar estado inválido
    }]
    resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["estado"] == "aprobado"
    assert data[0]["estado"] != "cerrado"

    # Comprobación directa en BD
    db_res = await db_session.execute(text("SELECT estado FROM evaluacion_registros WHERE id = :id"), {"id": eval_id})
    estado_db = db_res.scalar()
    assert estado_db == "aprobado"
    assert estado_db != "cerrado"


# ==============================================================================
# 7. PRECEDENCIA: 403 PRECEDE A 409 EN BATCH
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_autorizacion_403_precede_a_conflicto_409(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """Si el acta está cerrada y un docente no asignado intenta calificar en batch, recibe 403 (no 409)."""
    carga_id = fix_batch_entorno["carga_id"]
    try:
        await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
        await db_session.commit()

        payload = [{
            "id": fix_batch_entorno["evaluacion_id"],
            "unidad_didactica_id": fix_batch_entorno["unidad_id"],
            "periodo_id": fix_batch_entorno["periodo_id"],
            "nota_final": 17
        }]
        # Docente ajeno
        headers = auth_headers(user_id=fix_batch_entorno["docente_ajeno_id"])
        resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
        assert resp.status_code == 403
    finally:
        await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = false WHERE id = :id"), {"id": carga_id})
        await db_session.commit()


# ==============================================================================
# 8. SEGURIDAD BOLA / IDOR (400)
# ==============================================================================
@pytest.mark.asyncio
async def test_batch_suplantacion_unidad_bola_rechaza_400(client_eval, db_session: AsyncSession, fix_batch_entorno):
    """
    Vulnerabilidad BOLA: Docente asignado a unidad 999 intenta modificar notas
    del registro 200 (unidad 101) enviando 'unidad_didactica_id': 999 en el JSON.
    El backend detecta la discrepancia entre el payload y el registro en base de datos
    y rechaza la solicitud con HTTP 400 Bad Request.
    """
    # Carga para docente ajeno en unidad 999
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, created_at, updated_at)
        VALUES (99, 1, 1, :doc_ajeno, 999, 'MAÑANA', 'A', 'activo', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET docente_id = :doc_ajeno, unidad_didactica_id = 999;
    """), {"doc_ajeno": fix_batch_entorno["docente_ajeno_id"]})
    await db_session.commit()

    payload = [{
        "id": fix_batch_entorno["evaluacion_id"],
        "unidad_didactica_id": 999,
        "periodo_id": fix_batch_entorno["periodo_id"],
        "nota_final": 20
    }]
    headers = auth_headers(user_id=fix_batch_entorno["docente_ajeno_id"])
    resp = await client_eval.post("/registros/batch", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "Inconsistencia de unidad didáctica o periodo en el registro" in resp.json()["detail"]
