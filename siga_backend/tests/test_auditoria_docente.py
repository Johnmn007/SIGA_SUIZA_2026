import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import auth_headers


@pytest_asyncio.fixture
async def client_evaluacion():
    routes_mod = load_module_component("mod-evaluacion", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test-eval",
        headers=auth_headers(user_id=10)
    ) as client:
        yield client


@pytest_asyncio.fixture
async def client_programas():
    routes_mod = load_module_component("mod-programas-estudio", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test-prog") as client:
        yield client


@pytest_asyncio.fixture
async def client_gestion():
    routes_mod = load_module_component("mod-gestion-academica", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test-acad") as client:
        yield client


# ==============================================================================
# CASO 1: NOTA VÁLIDA (0 a 20) SE GUARDA, INVÁLIDAS SE RECHAZAN CON 4xx
# ==============================================================================
@pytest.mark.asyncio
async def test_guardar_nota_valida_rango_0_a_20(client_evaluacion, fixture_evaluacion):
    """Verifica que notas entre 0 y 20 se actualizan correctamente."""
    registro_id = fixture_evaluacion["evaluacion_id"]

    for nota in [0, 13, 20]:
        resp = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": nota})
        assert resp.status_code == 200, f"Fallo al guardar nota {nota}: {resp.text}"
        data = resp.json()
        assert data["nota_final"] == nota


@pytest.mark.asyncio
async def test_rechazo_notas_invalidas_fuera_de_rango_o_tipo(client_evaluacion, fixture_evaluacion):
    """Verifica que notas mayores a 20, menores a 0, texto o vacías sean rechazadas con 4xx (nunca 500)."""
    registro_id = fixture_evaluacion["evaluacion_id"]

    # Nota 21 (fuera de rango)
    resp_21 = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 21})
    assert resp_21.status_code in [400, 422], f"Se esperaba 4xx y se obtuvo {resp_21.status_code}"

    # Nota -1 (fuera de rango)
    resp_neg = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": -1})
    assert resp_neg.status_code in [400, 422], f"Se esperaba 4xx y se obtuvo {resp_neg.status_code}"

    # Nota tipo texto
    resp_txt = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": "veinte"})
    assert resp_txt.status_code in [400, 422], f"Se esperaba 4xx y se obtuvo {resp_txt.status_code}"

    # Nota cadena vacía
    resp_vacia = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": ""})
    assert resp_vacia.status_code in [400, 422], f"Se esperaba 4xx y se obtuvo {resp_vacia.status_code}"


# ==============================================================================
# CASO 2: CONDICIÓN APROBADO / DESAPROBADO RESPETA NOTA >= 13 (MINEDU)
# ==============================================================================
@pytest.mark.asyncio
async def test_condicion_aprobado_desaprobado_minedu(client_evaluacion, fixture_evaluacion):
    """Verifica la regla MINEDU: nota >= 13 es aprobado, < 13 es desaprobado."""
    registro_id = fixture_evaluacion["evaluacion_id"]

    # Nota 13 -> aprobado
    resp_13 = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 13})
    assert resp_13.status_code == 200
    assert resp_13.json()["estado"] == "aprobado"

    # Nota 12 -> desaprobado
    resp_12 = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 12})
    assert resp_12.status_code == 200
    assert resp_12.json()["estado"] == "desaprobado"

    # Nota 20 -> aprobado
    resp_20 = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 20})
    assert resp_20.status_code == 200
    assert resp_20.json()["estado"] == "aprobado"

    # Nota 0 -> desaprobado
    resp_0 = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 0})
    assert resp_0.status_code == 200
    assert resp_0.json()["estado"] == "desaprobado"


# ==============================================================================
# CASO 3: EDITAR NOTAS CON ACTA CERRADA SE DEBE RECHAZAR
# ==============================================================================
@pytest.mark.asyncio
async def test_editar_notas_unidad_acta_cerrada_se_rechaza(client_evaluacion, db_session: AsyncSession, fixture_evaluacion):
    """
    Regla: Si un acta ya fue cerrada o el registro está consolidado ('cerrado'/'consolidado'),
    ningún usuario debe poder modificar las notas mediante PUT /registros/{id}.
    """
    registro_id = fixture_evaluacion["evaluacion_id"]

    # Simulamos acta consolidada / cerrada en la BD
    await db_session.execute(text("""
        UPDATE evaluacion_registros SET estado = 'cerrado' WHERE id = :id;
    """), {"id": registro_id})
    await db_session.commit()

    # Intentar modificar la nota de un acta cerrada
    resp = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 18})
    # Debe rechazarse con 4xx (400, 403 o 409)
    assert resp.status_code in [400, 403, 409], f"Permitió modificar notas con acta cerrada! Código: {resp.status_code}"


# ==============================================================================
# CASO 4: UN DOCENTE NO PUEDE CALIFICAR UNA UNIDAD NO ASIGNADA (BUG-D02 RESUELTO)
# ==============================================================================
@pytest.mark.asyncio
async def test_docente_no_puede_calificar_unidad_no_asignada(client_evaluacion, fixture_evaluacion):
    """
    Regla: El endpoint PUT /registros/{id} debe validar que el docente que invoca la petición
    tenga asignada la carga lectiva para dicha unidad en el periodo lectivo correspondiente.
    """
    registro_id = fixture_evaluacion["evaluacion_id"]

    # Enviamos cabecera simulando a un docente no asignado (Docente ID: 11)
    headers = auth_headers(user_id=11)
    resp = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 15}, headers=headers)
    assert resp.status_code == 403, f"Un docente no asignado pudo calificar la unidad! Código: {resp.status_code}"

    # Docente asignado (Docente ID: 10) sí puede calificar
    headers_ok = auth_headers(user_id=10)
    resp_ok = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 15}, headers=headers_ok)
    assert resp_ok.status_code == 200, f"Docente asignado no pudo calificar: {resp_ok.status_code}"


# ==============================================================================
# CASO 5: UN DOCENTE NO PUEDE VER CARGA, SÍLABOS NI PLANES DE OTRO DOCENTE (IDOR)
# ==============================================================================
@pytest.mark.asyncio
@pytest.mark.xfail(strict=True, raises=AssertionError, reason="BUG-D03: mod-programas-estudio no valida autorizacion a nivel de objeto (IDOR) en /docente/{docente_id}/*")
async def test_docente_no_puede_ver_datos_de_otro_docente_idor(client_programas, fixture_carga_lectiva_y_plan):
    """
    Regla: Un docente autenticado no debe poder acceder a la carga lectiva,
    sílabos ni planes de trabajo de otro docente simplemente alterando el {docente_id} en la URL.
    """
    docente_victima_id = fixture_carga_lectiva_y_plan["docente_id"]
    headers_docente_atacante = {"X-User-ID": "999", "X-User-Role": "Docente"}

    # Intentar ver carga de otro docente
    r_carga = await client_programas.get(f"/docente/{docente_victima_id}/carga-lectiva?periodo_id=1", headers=headers_docente_atacante)
    # Intentar ver sílabos de otro docente
    r_silabo = await client_programas.get(f"/docente/{docente_victima_id}/silabos", headers=headers_docente_atacante)
    # Intentar ver planes de otro docente
    r_plan = await client_programas.get(f"/docente/{docente_victima_id}/planes-trabajo?periodo_id=1", headers=headers_docente_atacante)

    # Todos deben responder 403 Forbidden para usuarios no autorizados
    assert r_carga.status_code in [401, 403], f"IDOR en carga-lectiva! Status: {r_carga.status_code}"
    assert r_silabo.status_code in [401, 403], f"IDOR en silabos! Status: {r_silabo.status_code}"
    assert r_plan.status_code in [401, 403], f"IDOR en planes-trabajo! Status: {r_plan.status_code}"


# ==============================================================================
# CASO 6: NO SE PUEDE CALIFICAR A UN ESTUDIANTE NO MATRICULADO (BUG-D04 CORREGIDO)
# ==============================================================================
@pytest.mark.asyncio
async def test_no_se_puede_calificar_estudiante_no_matriculado(client_evaluacion, fixture_periodo, fixture_programa_y_unidad, fixture_carga_lectiva_y_plan):
    """
    Regla: POST /registros no debe permitir crear registros de evaluación para
    matrículas inexistentes o donde el estudiante no esté matriculado en la unidad.
    """
    payload_invalido = {
        "matricula_detalle_id": 99999,  # No existe en matricula_detalles
        "estudiante_id": 99999,         # No existe en estudiantes
        "unidad_didactica_id": fixture_programa_y_unidad["unidad_id"],
        "periodo_id": fixture_periodo["periodo_id"],
        "nota_final": 17
    }
    resp = await client_evaluacion.post("/registros", json=payload_invalido)
    assert resp.status_code in [404, 422], f"Permitió calificar a estudiante no matriculado! Status: {resp.status_code}"


# ==============================================================================
# CASO 7: VALIDACIÓN DE ESTADOS DE PERIODO AL CALIFICAR (BUG-D05 AJUSTADO)
# ==============================================================================
@pytest.mark.asyncio
async def test_periodos_calificables_en_curso_y_matricula_abierta_permiten_calificar(
    client_evaluacion, db_session: AsyncSession, fixture_evaluacion
):
    """
    Regla: Los estados 'en_curso' y 'matricula_abierta' permiten el registro y
    modificación de calificaciones (ambos son válidos durante el ciclo).
    """
    periodo_id = 1
    registro_id = fixture_evaluacion["evaluacion_id"]

    # 1. Probar con 'en_curso'
    await db_session.execute(text("UPDATE periodos_academicos SET estado = 'en_curso' WHERE id = :id;"), {"id": periodo_id})
    await db_session.commit()
    resp_en_curso = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 16})
    assert resp_en_curso.status_code == 200, f"Fallo al calificar en 'en_curso': {resp_en_curso.status_code} - {resp_en_curso.text}"

    # 2. Probar con 'matricula_abierta'
    await db_session.execute(text("UPDATE periodos_academicos SET estado = 'matricula_abierta' WHERE id = :id;"), {"id": periodo_id})
    await db_session.commit()
    resp_mat_abierta = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 17})
    assert resp_mat_abierta.status_code == 200, f"Fallo al calificar en 'matricula_abierta': {resp_mat_abierta.status_code} - {resp_mat_abierta.text}"
    assert resp_mat_abierta.json()["nota_final"] == 17


@pytest.mark.asyncio
async def test_periodos_no_calificables_cerrado_null_inventado_devuelven_409(
    client_evaluacion, db_session: AsyncSession, fixture_evaluacion
):
    """
    Regla: Si el estado del periodo no es calificable ('cerrado', NULL o un estado inventado),
    POST y PUT deben responder 409 Conflict con un mensaje en español que incluya
    el código del periodo y su estado.
    """
    periodo_id = 1
    registro_id = fixture_evaluacion["evaluacion_id"]

    casos_invalidos = [
        ("cerrado", "cerrado"),
        (None, "None"),
        ("inventado_no_valido", "inventado_no_valido"),
    ]

    for estado_val, estado_str in casos_invalidos:
        await db_session.execute(
            text("UPDATE periodos_academicos SET estado = :est WHERE id = :id;"),
            {"est": estado_val, "id": periodo_id}
        )
        await db_session.commit()

        # Probar PUT
        resp_put = await client_evaluacion.put(f"/registros/{registro_id}", json={"nota_final": 14})
        assert resp_put.status_code == 409, f"Se esperaba 409 para estado '{estado_val}', se obtuvo {resp_put.status_code}"
        detail_put = resp_put.json()["detail"]
        assert "2026-I" in detail_put, f"El mensaje '{detail_put}' no contiene el código del periodo '2026-I'"
        assert estado_str in detail_put, f"El mensaje '{detail_put}' no contiene el estado '{estado_str}'"

        # Probar POST
        resp_post = await client_evaluacion.post("/registros", json={
            "matricula_detalle_id": 80,
            "estudiante_id": 100,
            "unidad_didactica_id": 101,
            "periodo_id": periodo_id,
            "nota_final": 14
        })
        assert resp_post.status_code == 409, f"Se esperaba 409 en POST para estado '{estado_val}', se obtuvo {resp_post.status_code}"
        detail_post = resp_post.json()["detail"]
        assert "2026-I" in detail_post, f"El mensaje '{detail_post}' no contiene el código del periodo '2026-I'"
        assert estado_str in detail_post, f"El mensaje '{detail_post}' no contiene el estado '{estado_str}'"


# Alias para compatibilidad con suites que busquen el nombre anterior
test_no_se_puede_registrar_nota_en_periodo_cerrado = test_periodos_no_calificables_cerrado_null_inventado_devuelven_409


# ==============================================================================
# CASO 8: LISTADOS CON CAMPOS NULL DEBEN RESPONDER 200 (NO 500)
# ==============================================================================
@pytest.mark.asyncio
async def test_listado_evaluacion_con_estado_null_responde_200(client_evaluacion, db_session: AsyncSession, fixture_evaluacion):
    """
    Riesgo NULL: Si 'estado' en evaluacion_registros es NULL, el endpoint
    GET /registros/unidad/{unidad_id}/periodo/{periodo_id} debe responder 200 con valor nulo/por defecto, nunca 500.
    """
    registro_id = fixture_evaluacion["evaluacion_id"]
    await db_session.execute(text("""
        UPDATE evaluacion_registros SET estado = NULL WHERE id = :id;
    """), {"id": registro_id})
    await db_session.commit()

    resp = await client_evaluacion.get("/registros/unidad/101/periodo/1")
    assert resp.status_code == 200, f"Error detectado por campo estado NULL: {resp.text}"
    assert resp.json()[0]["estado"] in ["cursando", None]


@pytest.mark.asyncio
async def test_listado_evaluacion_con_notas_null_responde_200(client_evaluacion, db_session: AsyncSession, fixture_evaluacion):
    """
    Riesgo NULL: Si nota_final y parciales son NULL, debe responder 200 sin romper la serialización.
    """
    registro_id = fixture_evaluacion["evaluacion_id"]
    await db_session.execute(text("""
        UPDATE evaluacion_registros 
        SET nota_c1 = NULL, nota_c2 = NULL, nota_c3 = NULL, nota_final = NULL 
        WHERE id = :id;
    """), {"id": registro_id})
    await db_session.commit()

    resp = await client_evaluacion.get("/registros/unidad/101/periodo/1")
    assert resp.status_code == 200
    data = resp.json()[0]
    assert data["nota_final"] is None
    assert data["nota_c1"] is None


@pytest.mark.asyncio
async def test_listado_silabos_con_campos_null_responde_200(client_programas, db_session: AsyncSession, fixture_carga_lectiva_y_plan):
    """
    Riesgo NULL: Si 'created_at' o 'estado' en silabos es NULL,
    GET /docente/{docente_id}/silabos debe responder 200 y no 500.
    """
    silabo_id = fixture_carga_lectiva_y_plan["silabo_id"]
    docente_id = fixture_carga_lectiva_y_plan["docente_id"]

    await db_session.execute(text("""
        UPDATE silabos SET created_at = NULL, estado = NULL WHERE id = :id;
    """), {"id": silabo_id})
    await db_session.commit()

    resp = await client_programas.get(f"/docente/{docente_id}/silabos")
    assert resp.status_code == 200, f"Error detectado en silabos con NULL: {resp.text}"


@pytest.mark.asyncio
async def test_listado_planes_con_campos_null_responde_200(client_programas, db_session: AsyncSession, fixture_carga_lectiva_y_plan):
    """
    Riesgo NULL: Si 'created_at' en planes_trabajo_docente es NULL,
    GET /docente/{docente_id}/planes-trabajo debe responder 200 y no 500.
    """
    plan_id = fixture_carga_lectiva_y_plan["plan_id"]
    docente_id = fixture_carga_lectiva_y_plan["docente_id"]

    await db_session.execute(text("""
        UPDATE planes_trabajo_docente SET created_at = NULL WHERE id = :id;
    """), {"id": plan_id})
    await db_session.commit()

    resp = await client_programas.get(f"/docente/{docente_id}/planes-trabajo?periodo_id=1")
    assert resp.status_code == 200, f"Error detectado en planes-trabajo con NULL: {resp.text}"


@pytest.mark.asyncio
async def test_listado_matriculas_unidad_con_estado_academico_null_responde_200(client_gestion, db_session: AsyncSession, fixture_matricula):
    """
    Riesgo NULL: Si 'estado_academico' en estudiantes es NULL,
    GET /matriculas/unidad/{unidad_id}/periodo/{periodo_id} debe responder 200 y no 500.
    """
    await db_session.execute(text("""
        UPDATE estudiantes SET estado_academico = NULL WHERE id = 100;
    """))
    await db_session.commit()

    resp = await client_gestion.get("/matriculas/unidad/101/periodo/1")
    assert resp.status_code == 200, f"Error detectado en matriculas por unidad con NULL: {resp.text}"
