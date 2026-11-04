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
from datetime import datetime, date, timedelta

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import auth_headers


@pytest_asyncio.fixture
async def app_eval():
    routes_mod = load_module_component("mod-evaluacion", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    return app


@pytest_asyncio.fixture
async def client_eval(app_eval):
    async with AsyncClient(
        transport=ASGITransport(app=app_eval),
        base_url="http://test-eval"
    ) as client:
        yield client


@pytest_asyncio.fixture
async def fix_batch_entorno(db_session: AsyncSession):
    """
    Configura un entorno completo relacional en siga_test para las pruebas batch:
    - planes_estudio, programas_estudio, programa_modulos, programa_unidades (101)
    - periodos_academicos (1, '2026-I', 'en_curso')
    - core_roles, core_users (1: superadmin, 10: docente_titular, 11: docente_ajeno, 30: inactivo)
    - estudiantes (100), matriculas (50), matricula_detalles (80)
    - carga_lectiva (1, unidad 101, periodo 1, docente 10, acta_cerrada=false)
    - evaluacion_registros (200, detalle 80, estudiante 100, unidad 101, periodo 1)
    """
    prog_1 = 1
    periodo_id = 1
    modulo_1 = 1
    unidad_101 = 101
    carga_id = 1
    evaluacion_id = 200
    estudiante_id = 100
    matricula_id = 50
    detalle_id = 80
    doc_titular = 10
    doc_ajeno = 11
    superadmin = 1
    inactivo = 30

    # 1. planes_estudio
    await db_session.execute(text("""
        INSERT INTO planes_estudio (id, codigo, nombre, estado, creditos_totales, horas_totales, created_at, updated_at)
        VALUES (1, 'DSI-2026', 'Desarrollo de Sistemas de Información', 'activo', 120, 2400, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado = 'activo';
    """))

    # 2. programas_estudio
    await db_session.execute(text("""
        INSERT INTO programas_estudio (id, codigo, nombre, creditos_totales, duracion_periodos, modalidad, estado, plan_estudio_id, created_at, updated_at)
        VALUES (:p1, '0584722', 'Desarrollo de Sistemas de Información', 120, 6, 'presencial', 'activo', 1, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado = 'activo', nombre = EXCLUDED.nombre;
    """), {"p1": prog_1})

    # 3. programa_modulos
    await db_session.execute(text("""
        INSERT INTO programa_modulos (id, programa_id, periodo, nombre, creditos, horas_totales)
        VALUES (:m_id, :prog_id, 3, 'Módulo 3: Sistemas Web', 30, 600)
        ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
    """), {"m_id": modulo_1, "prog_id": prog_1})

    # 4. programa_unidades
    await db_session.execute(text("""
        INSERT INTO programa_unidades (id, programa_modulo_id, nombre, horas_teoria, horas_practica, creditos, orden)
        VALUES (:u1, :m_id, 'Taller de Programación Web', 2, 4, 4, 1)
        ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, programa_modulo_id = EXCLUDED.programa_modulo_id;
    """), {"u1": unidad_101, "m_id": modulo_1})

    # 5. periodos_academicos
    now = datetime.utcnow()
    await db_session.execute(text("""
        INSERT INTO periodos_academicos (id, codigo, fecha_inicio, fecha_fin, estado, created_at, updated_at)
        VALUES (:p_id, '2026-I', :ini, :fin, 'en_curso', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado = 'en_curso';
    """), {"p_id": periodo_id, "ini": now - timedelta(days=10), "fin": now + timedelta(days=90)})

    # 6. Identidades
    await db_session.execute(text("""
        INSERT INTO core_roles (id, name, description, created_at) VALUES
            (1, 'superadmin', 'Super Administrador del Sistema', NOW()),
            (2, 'coordinador_programa', 'Coordinador de Programa de Estudios', NOW()),
            (3, 'docente', 'Docente de Unidades Didácticas', NOW()),
            (4, 'estudiante', 'Estudiante de la Institución', NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    """))

    await db_session.execute(text("""
        INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser, created_at) VALUES
            (1, 'superadmin.test@siga.edu', 'Super Admin Test', 'hash_test_123', true, true, NOW()),
            (10, 'docente.test@siga.edu', 'Prof. Docente Asignado', 'hash_test_123', true, false, NOW()),
            (11, 'docente.noasig@siga.edu', 'Prof. Docente No Asignado', 'hash_test_123', true, false, NOW()),
            (20, 'estudiante.test@siga.edu', 'Estudiante Test', 'hash_test_123', true, false, NOW()),
            (30, 'usuario.inactivo@siga.edu', 'Usuario Inactivo', 'hash_test_123', false, false, NOW())
        ON CONFLICT (id) DO UPDATE SET 
            is_active = EXCLUDED.is_active, 
            is_superuser = EXCLUDED.is_superuser,
            email = EXCLUDED.email;
    """))

    await db_session.execute(text("""
        INSERT INTO core_user_roles (user_id, role_id) VALUES
            (1, 1),
            (10, 3),
            (11, 3),
            (20, 4),
            (30, 3)
        ON CONFLICT DO NOTHING;
    """))

    await db_session.execute(text("""
        INSERT INTO perfiles_personal (id, user_id, condicion_laboral, cargo_funcional, programa_estudio_id) VALUES
            (10, 10, 'CONTRATADO', 'Docente Asignado', 1),
            (11, 11, 'CONTRATADO', 'Docente No Asignado', 1)
        ON CONFLICT (id) DO UPDATE SET 
            programa_estudio_id = EXCLUDED.programa_estudio_id,
            user_id = EXCLUDED.user_id;
    """))

    # 7. Estudiantes, Matrícula y Detalle
    await db_session.execute(text("""
        INSERT INTO estudiantes (id, codigo_estudiante, dni, nombres, apellidos, programa_id, estado_academico, pago_matricula, documentos_completos, created_at, updated_at)
        VALUES (:e_id, 'TEST-00000001', '00000001', 'Estudiante', 'Prueba SIGA', :prog_id, 'regular', true, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado_academico = 'regular';
    """), {"e_id": estudiante_id, "prog_id": prog_1})

    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, programa_id, periodo_id, estado_matricula, tipo_ingreso, observaciones, created_at, updated_at)
        VALUES (:m_id, :e_id, :prog_id, :per_id, 'confirmada', 'Ordinario', NULL, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado_matricula = 'confirmada';
    """), {"m_id": matricula_id, "e_id": estudiante_id, "prog_id": prog_1, "per_id": periodo_id})

    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (:d_id, :m_id, :u_id, 4, 'cursando', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado_curso = 'cursando';
    """), {"d_id": detalle_id, "m_id": matricula_id, "u_id": unidad_101})

    # 8. Carga lectiva
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, acta_cerrada, acta_cerrada_por, acta_cerrada_at, fecha_limite_notas, created_at, updated_at)
        VALUES (:c_id, :p_id, :prog1, :doc_a, :u101, 'MAÑANA', 'A', 'activo', false, NULL, NULL, NULL, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            periodo_id = EXCLUDED.periodo_id,
            programa_id = EXCLUDED.programa_id,
            docente_id = EXCLUDED.docente_id,
            unidad_didactica_id = EXCLUDED.unidad_didactica_id,
            turno = EXCLUDED.turno,
            seccion = EXCLUDED.seccion,
            estado = 'activo',
            acta_cerrada = false,
            acta_cerrada_por = NULL,
            acta_cerrada_at = NULL,
            fecha_limite_notas = NULL;
    """), {
        "c_id": carga_id,
        "p_id": periodo_id,
        "prog1": prog_1,
        "doc_a": doc_titular,
        "u101": unidad_101
    })

    # 9. Registro de Evaluación 200
    await db_session.execute(text("""
        INSERT INTO evaluacion_registros (id, matricula_detalle_id, estudiante_id, unidad_didactica_id, periodo_id, nota_final, estado, created_at, updated_at)
        VALUES (:ev_id, :d_id, :e_id, :u_id, :p_id, 16, 'aprobado', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            matricula_detalle_id = EXCLUDED.matricula_detalle_id,
            estudiante_id = EXCLUDED.estudiante_id,
            unidad_didactica_id = EXCLUDED.unidad_didactica_id,
            periodo_id = EXCLUDED.periodo_id,
            nota_final = EXCLUDED.nota_final,
            estado = EXCLUDED.estado;
    """), {
        "ev_id": evaluacion_id,
        "d_id": detalle_id,
        "e_id": estudiante_id,
        "u_id": unidad_101,
        "p_id": periodo_id
    })

    await db_session.execute(text("SELECT setval('carga_lectiva_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM carga_lectiva))"))
    await db_session.execute(text("SELECT setval('evaluacion_registros_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM evaluacion_registros))"))

    await db_session.commit()

    return {
        "carga_id": carga_id,
        "unidad_id": unidad_101,
        "periodo_id": periodo_id,
        "evaluacion_id": evaluacion_id,
        "matricula_detalle_id": detalle_id,
        "estudiante_id": estudiante_id,
        "docente_titular_id": doc_titular,
        "docente_ajeno_id": doc_ajeno,
        "superadmin_id": superadmin,
        "inactivo_id": inactivo
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
    await db_session.commit()
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
    await db_session.commit()
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
