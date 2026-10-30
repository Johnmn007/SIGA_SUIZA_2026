import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timezone, timedelta

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import auth_headers, create_internal_token

@pytest_asyncio.fixture
async def app_evaluacion():
    routes_mod = load_module_component("mod-evaluacion", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    return app, routes_mod

@pytest_asyncio.fixture
async def client_evaluacion(app_evaluacion):
    app, _ = app_evaluacion
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test-eval",
        headers=auth_headers(user_id=1)
    ) as client:
        yield client

@pytest_asyncio.fixture
async def fix_carga_acta(db_session: AsyncSession, fixture_evaluacion, fixture_carga_lectiva_y_plan):
    """
    Garantiza que la carga lectiva ID=1 coincida con la unidad didáctica (101) y periodo (1)
    del registro de evaluación (ID=200).
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
        "programa_id": 1,
        "evaluacion_id": fixture_evaluacion["evaluacion_id"]
    }

# ==============================================================================
# 1. ACTA CERRADA RECHAZA POST Y PUT
# ==============================================================================
@pytest.mark.asyncio
async def test_acta_cerrada_rechaza_post_y_put(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    # Cerrar el acta en carga_lectiva
    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    # Intentar PUT
    resp_put = await client_evaluacion.put(f"/registros/{eval_id}", json={"nota_final": 17})
    assert resp_put.status_code == 409
    assert "cerrada" in resp_put.json()["detail"].lower()

    # Intentar POST
    payload_post = {
        "matricula_detalle_id": 9999,
        "estudiante_id": 100,
        "unidad_didactica_id": fix_carga_acta["unidad_id"],
        "periodo_id": fix_carga_acta["periodo_id"],
        "nota_final": 15
    }
    resp_post = await client_evaluacion.post("/registros", json=payload_post)
    assert resp_post.status_code == 409
    assert "cerrada" in resp_post.json()["detail"].lower()

# ==============================================================================
# 2. FECHA LÍMITE: VENCIDA RECHAZA, HOY Y FUTURA PERMITEN
# ==============================================================================
@pytest.mark.asyncio
async def test_fecha_limite_vencida_hoy_y_futura(client_evaluacion, app_evaluacion, db_session: AsyncSession, fix_carga_acta, monkeypatch):
    _, routes_mod = app_evaluacion
    # Fijar fecha "hoy" a 2026-10-29 para independencia del reloj
    fecha_simulada = date(2026, 10, 29)
    monkeypatch.setattr(routes_mod, "get_hoy_lima", lambda: fecha_simulada)

    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    # A) Fecha vencida (ayer: 2026-10-28) -> Debe dar 409
    await db_session.execute(
        text("UPDATE carga_lectiva SET fecha_limite_notas = '2026-10-28', acta_cerrada = false WHERE id = :id"),
        {"id": carga_id}
    )
    await db_session.commit()

    resp_vencida = await client_evaluacion.put(f"/registros/{eval_id}", json={"nota_final": 18})
    assert resp_vencida.status_code == 409
    assert "plazo para ingresar notas venció el 28/10/2026" in resp_vencida.json()["detail"]

    # B) Fecha de hoy (2026-10-29) -> Es inclusive, debe permitir (200 OK)
    await db_session.execute(
        text("UPDATE carga_lectiva SET fecha_limite_notas = '2026-10-29' WHERE id = :id"),
        {"id": carga_id}
    )
    await db_session.commit()

    resp_hoy = await client_evaluacion.put(f"/registros/{eval_id}", json={"nota_final": 18})
    assert resp_hoy.status_code == 200
    assert resp_hoy.json()["nota_final"] == 18

    # C) Fecha futura (2026-10-30) -> Debe permitir (200 OK)
    await db_session.execute(
        text("UPDATE carga_lectiva SET fecha_limite_notas = '2026-10-30' WHERE id = :id"),
        {"id": carga_id}
    )
    await db_session.commit()

    resp_futura = await client_evaluacion.put(f"/registros/{eval_id}", json={"nota_final": 19})
    assert resp_futura.status_code == 200
    assert resp_futura.json()["nota_final"] == 19

# ==============================================================================
# 3. SIN FILA EN CARGA_LECTIVA SOLO RIGE EL PERIODO
# ==============================================================================
@pytest.mark.asyncio
async def test_sin_fila_carga_lectiva_solo_rige_periodo(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (899, 50, 999, 4, 'cursando', NOW(), NOW()) 
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO evaluacion_registros (id, matricula_detalle_id, estudiante_id, unidad_didactica_id, periodo_id, nota_final, estado, created_at, updated_at)
        VALUES (299, 899, 100, 999, 1, 14, 'aprobado', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET nota_final = 14, estado = 'aprobado';
    """))
    await db_session.commit()

    # Si el periodo está en_curso / matricula_abierta, PUT debe permitir calificar
    resp = await client_evaluacion.put("/registros/299", json={"nota_final": 15})
    assert resp.status_code == 200
    assert resp.json()["nota_final"] == 15

    # Si el periodo se cierra, debe responder 409 por periodo
    await db_session.execute(text("UPDATE periodos_academicos SET estado = 'cerrado' WHERE id = 1;"))
    await db_session.commit()

    resp_cerrado = await client_evaluacion.put("/registros/299", json={"nota_final": 16})
    assert resp_cerrado.status_code == 409
    assert "se encuentra en estado 'cerrado'" in resp_cerrado.json()["detail"]

    # Restaurar periodo
    await db_session.execute(text("UPDATE periodos_academicos SET estado = 'en_curso' WHERE id = 1;"))
    await db_session.commit()

# ==============================================================================
# 4. CERRAR CON MATRÍCULAS SIN NOTA RECHAZA CON CONTEO EXACTO
# ==============================================================================
@pytest.mark.asyncio
async def test_cerrar_acta_con_faltantes_rechaza_con_conteo(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]
    await db_session.execute(text("UPDATE evaluacion_registros SET nota_final = NULL WHERE id = :id"), {"id": eval_id})
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post(f"/actas/carga/{carga_id}/cerrar", headers=headers)
    assert resp.status_code == 409
    data = resp.json()["detail"]
    assert data["total_faltantes"] >= 1
    assert len(data["matricula_ids"]) >= 1

# ==============================================================================
# 5. CERRAR COMPLETO FUNCIONA Y GUARDA QUIÉN Y CUÁNDO (EN UTC)
# ==============================================================================
@pytest.mark.asyncio
async def test_cerrar_acta_completo_guarda_quien_y_cuando(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    await db_session.execute(text("UPDATE evaluacion_registros SET nota_final = 16 WHERE id = :id"), {"id": eval_id})
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post(f"/actas/carga/{carga_id}/cerrar", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["acta_cerrada"] is True
    assert data["acta_cerrada_por"] == 55
    assert data["acta_cerrada_at"] is not None

    db_res = await db_session.execute(text("SELECT acta_cerrada, acta_cerrada_por, acta_cerrada_at FROM carga_lectiva WHERE id = :id"), {"id": carga_id})
    row = db_res.fetchone()
    assert row[0] is True
    assert row[1] == 55
    assert row[2] is not None

# ==============================================================================
# 6. REABRIR: VALIDACIONES Y RESTABLECIMIENTO DE EDICIÓN AL DOCENTE
# ==============================================================================
@pytest.mark.asyncio
async def test_reabrir_acta_validaciones_y_reapertura(client_evaluacion, app_evaluacion, db_session: AsyncSession, fix_carga_acta, monkeypatch):
    _, routes_mod = app_evaluacion
    fecha_simulada = date(2026, 10, 29)
    monkeypatch.setattr(routes_mod, "get_hoy_lima", lambda: fecha_simulada)

    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    headers = {"X-User-ID": "55"}

    # A) Sin motivo o motivo corto (< 10 caracteres) -> 422
    resp_sin_motivo = await client_evaluacion.post(f"/actas/carga/{carga_id}/reabrir", json={"motivo": "corto", "nueva_fecha_limite": "2026-10-31"}, headers=headers)
    assert resp_sin_motivo.status_code == 422

    # B) Fecha pasada -> 422
    resp_fecha_pasada = await client_evaluacion.post(f"/actas/carga/{carga_id}/reabrir", json={"motivo": "Reapertura justificada por reclamo", "nueva_fecha_limite": "2026-10-25"}, headers=headers)
    assert resp_fecha_pasada.status_code == 422

    # C) Reapertura válida
    resp_ok = await client_evaluacion.post(f"/actas/carga/{carga_id}/reabrir", json={
        "motivo": "Solicitud formal de ampliación de notas por coordinación académica",
        "nueva_fecha_limite": "2026-10-31"
    }, headers=headers)
    assert resp_ok.status_code == 200
    assert resp_ok.json()["acta_cerrada"] is False
    assert resp_ok.json()["fecha_limite_notas"] == "2026-10-31"

    # D) Verificar que devuelve la edición al docente
    resp_put = await client_evaluacion.put(f"/registros/{eval_id}", json={"nota_final": 20})
    assert resp_put.status_code == 200
    assert resp_put.json()["nota_final"] == 20

# ==============================================================================
# 7. REABRIR EN PERIODO CERRADO DA 409
# ==============================================================================
@pytest.mark.asyncio
async def test_reabrir_acta_en_periodo_cerrado_da_409(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    carga_id = fix_carga_acta["carga_id"]

    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
    await db_session.execute(text("UPDATE periodos_academicos SET estado = 'cerrado' WHERE id = 1"))
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post(f"/actas/carga/{carga_id}/reabrir", json={
        "motivo": "Solicitud formal de ampliación en periodo cerrado",
        "nueva_fecha_limite": "2026-12-31"
    }, headers=headers)
    assert resp.status_code == 409
    assert "periodo académico 2026-I está cerrado" in resp.json()["detail"]

    await db_session.execute(text("UPDATE periodos_academicos SET estado = 'en_curso' WHERE id = 1"))
    await db_session.commit()

# ==============================================================================
# 8. FECHA MASIVA AFECTA SOLO CARGAS NO CERRADAS DEL PROGRAMA Y PERIODO
# ==============================================================================
@pytest.mark.asyncio
async def test_fecha_masiva_afecta_solo_cargas_no_cerradas(client_evaluacion, app_evaluacion, db_session: AsyncSession, fix_carga_acta, monkeypatch):
    _, routes_mod = app_evaluacion
    monkeypatch.setattr(routes_mod, "get_hoy_lima", lambda: date(2026, 10, 29))

    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, acta_cerrada, fecha_limite_notas, created_at, updated_at)
        VALUES 
            (2, 1, 1, 10, 102, 'MAÑANA', 'A', 'activo', false, '2026-10-30', NOW(), NOW()),
            (3, 1, 1, 10, 103, 'MAÑANA', 'A', 'activo', true, '2026-10-20', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            acta_cerrada = EXCLUDED.acta_cerrada, 
            fecha_limite_notas = EXCLUDED.fecha_limite_notas,
            programa_id = EXCLUDED.programa_id,
            periodo_id = EXCLUDED.periodo_id;
    """))
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post("/actas/programa/1/periodo/1/fecha-limite", json={"fecha_limite_notas": "2026-11-15"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["actualizadas"] == 2

    db_res = await db_session.execute(text("SELECT id, fecha_limite_notas, acta_cerrada FROM carga_lectiva WHERE id IN (1, 2, 3) ORDER BY id"))
    rows = {r[0]: (str(r[1]), r[2]) for r in db_res.fetchall()}
    assert rows[1][0] == "2026-11-15"
    assert rows[2][0] == "2026-11-15"
    assert rows[3][0] == "2026-10-20"
    assert rows[3][1] is True

# ==============================================================================
# 9. EXISTE EVENTO DE AUDITORÍA EN CADA OPERACIÓN (OUTBOX_EVENTS)
# ==============================================================================
@pytest.mark.asyncio
async def test_eventos_auditoria_en_cada_operacion(client_evaluacion, app_evaluacion, db_session: AsyncSession, fix_carga_acta, monkeypatch):
    _, routes_mod = app_evaluacion
    monkeypatch.setattr(routes_mod, "get_hoy_lima", lambda: date(2026, 10, 29))

    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    await db_session.execute(text("DELETE FROM outbox_events WHERE event_type LIKE 'evaluacion.acta%';"))
    await db_session.commit()

    # 1. Fecha individual
    await client_evaluacion.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": "2026-11-01"}, headers={"X-User-ID": "100"})

    # 2. Fecha masiva
    await client_evaluacion.post("/actas/programa/1/periodo/1/fecha-limite", json={"fecha_limite_notas": "2026-11-05"}, headers={"X-User-ID": "100"})

    # 3. Cerrar acta
    await db_session.execute(text("UPDATE evaluacion_registros SET nota_final = 15 WHERE id = :id"), {"id": eval_id})
    await db_session.commit()
    await client_evaluacion.post(f"/actas/carga/{carga_id}/cerrar", headers={"X-User-ID": "100"})

    # 4. Reabrir acta
    await client_evaluacion.post(f"/actas/carga/{carga_id}/reabrir", json={
        "motivo": "Reapertura de auditoría por resolución de reclamo",
        "nueva_fecha_limite": "2026-11-10"
    }, headers={"X-User-ID": "100"})

    events_res = await db_session.execute(text("SELECT event_type, payload FROM outbox_events WHERE event_type LIKE 'evaluacion.acta%' ORDER BY id ASC;"))
    events = events_res.fetchall()
    event_types = [e[0] for e in events]

    assert "evaluacion.acta.fecha_limite_actualizada" in event_types
    assert "evaluacion.acta.fecha_limite_masiva" in event_types
    assert "evaluacion.acta.cerrada" in event_types
    assert "evaluacion.acta.reabierta" in event_types

    for ev in events:
        payload = ev[1]
        assert "user_id" in payload or "metadata" in payload
        assert "timestamp" in payload

# ==============================================================================
# 10. GET DE ACTAS DEVUELVE EDITABLE Y MOTIVO_BLOQUEO CORRECTOS
# ==============================================================================
@pytest.mark.asyncio
async def test_get_actas_devuelve_editable_y_motivo_bloqueo(client_evaluacion, app_evaluacion, db_session: AsyncSession, fix_carga_acta, monkeypatch):
    _, routes_mod = app_evaluacion
    monkeypatch.setattr(routes_mod, "get_hoy_lima", lambda: date(2026, 10, 29))

    carga_id = fix_carga_acta["carga_id"]
    u_id = fix_carga_acta["unidad_id"]
    p_id = fix_carga_acta["periodo_id"]
    prog_id = fix_carga_acta["programa_id"]

    # A) Abierta y vigente
    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = false, fecha_limite_notas = '2026-11-01' WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    resp_a = await client_evaluacion.get(f"/actas/unidad/{u_id}/periodo/{p_id}")
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["tiene_carga"] is True
    assert data_a["acta_cerrada"] is False
    assert data_a["editable"] is True
    assert data_a["motivo_bloqueo"] is None

    # B) Plazo vencido
    await db_session.execute(text("UPDATE carga_lectiva SET fecha_limite_notas = '2026-10-25' WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    resp_b = await client_evaluacion.get(f"/actas/unidad/{u_id}/periodo/{p_id}")
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["editable"] is False
    assert "venció el 25/10/2026" in data_b["motivo_bloqueo"]

    # C) Acta cerrada
    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    resp_c = await client_evaluacion.get(f"/actas/unidad/{u_id}/periodo/{p_id}")
    assert resp_c.status_code == 200
    data_c = resp_c.json()
    assert data_c["acta_cerrada"] is True
    assert data_c["editable"] is False
    assert "está cerrada" in data_c["motivo_bloqueo"]

    # D) Resumen de actas por programa y periodo
    resp_resumen = await client_evaluacion.get(f"/actas/periodo/{p_id}/programa/{prog_id}")
    assert resp_resumen.status_code == 200
    data_resumen = resp_resumen.json()
    assert "cargas" in data_resumen
    assert "unidades_sin_carga" in data_resumen
    assert "unidades_sin_programa" in data_resumen
    assert "total_matriculas_pendientes" in data_resumen
    assert len(data_resumen["cargas"]) >= 1

# ==============================================================================
# 11. MATRÍCULA PENDIENTE ES RECHAZADA EN POST /registros (409)
# ==============================================================================
@pytest.mark.asyncio
async def test_matricula_pendiente_rechazada_en_post_registros(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    u_id = fix_carga_acta["unidad_id"]
    p_id = fix_carga_acta["periodo_id"]

    # Crear una matrícula en estado 'pendiente'
    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, periodo_id, programa_id, estado_matricula, created_at, updated_at)
        VALUES (888, 100, :p_id, 1, 'pendiente', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado_matricula = 'pendiente';
    """), {"p_id": p_id})
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (8881, 888, :u_id, 4, 'cursando', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """), {"u_id": u_id})
    await db_session.commit()

    payload = {
        "matricula_detalle_id": 8881,
        "estudiante_id": 100,
        "unidad_didactica_id": u_id,
        "periodo_id": p_id,
        "nota_final": 15
    }
    resp = await client_evaluacion.post("/registros", json=payload)
    assert resp.status_code == 409
    assert "pendiente" in resp.json()["detail"].lower()

# ==============================================================================
# 12. MATRÍCULAS PENDIENTES EN /cerrar NO BLOQUEAN Y DEVUELVEN ADVERTENCIA
# ==============================================================================
@pytest.mark.asyncio
async def test_matriculas_pendientes_en_cerrar_no_bloquean_y_devuelven_advertencia(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]
    u_id = fix_carga_acta["unidad_id"]
    p_id = fix_carga_acta["periodo_id"]

    # 1. Asegurar que la matrícula confirmada tenga nota final (16)
    await db_session.execute(text("UPDATE evaluacion_registros SET nota_final = 16 WHERE id = :id"), {"id": eval_id})
    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = false WHERE id = :id"), {"id": carga_id})

    # 2. Agregar una matrícula en estado 'pendiente' en la misma unidad y periodo
    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, periodo_id, programa_id, estado_matricula, created_at, updated_at)
        VALUES (889, 100, :p_id, 1, 'pendiente', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado_matricula = 'pendiente';
    """), {"p_id": p_id})
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (8891, 889, :u_id, 4, 'cursando', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """), {"u_id": u_id})
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post(f"/actas/carga/{carga_id}/cerrar", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["acta_cerrada"] is True
    # Debe contener advertencia indicando que existen matrículas pendientes no consideradas
    assert data["advertencia"] is not None
    assert "pendiente" in data["advertencia"].lower()

# ==============================================================================
# 13. UNIDAD CON 0 MATRÍCULAS CALIFICABLES ES RECHAZADA CON 409 EN /cerrar
# ==============================================================================
@pytest.mark.asyncio
async def test_unidad_cero_matriculas_calificables_rechaza_con_409(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    p_id = fix_carga_acta["periodo_id"]
    prog_id = fix_carga_acta["programa_id"]
    # Carga ID=5 con unidad 555 sin estudiantes matriculados
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, acta_cerrada, created_at, updated_at)
        VALUES (5, :p_id, :prog_id, 10, 555, 'MAÑANA', 'A', 'activo', false, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET acta_cerrada = false, unidad_didactica_id = 555, periodo_id = :p_id, programa_id = :prog_id;
    """), {"p_id": p_id, "prog_id": prog_id})
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post("/actas/carga/5/cerrar", headers=headers)
    assert resp.status_code == 409
    assert "no cuenta con matrículas calificables" in resp.json()["detail"].lower()

# ==============================================================================
# 14. CABECERA X-User-ID FALTANTE O NO NUMÉRICA DEVUELVE 401 EN LAS 4 RUTAS
# ==============================================================================
@pytest.mark.asyncio
async def test_cabecera_x_user_id_requerida_en_cuatro_rutas(app_evaluacion, fix_carga_acta):
    app, _ = app_evaluacion
    carga_id = fix_carga_acta["carga_id"]
    p_id = fix_carga_acta["periodo_id"]
    prog_id = fix_carga_acta["programa_id"]

    rutas = [
        ("PUT", f"/actas/carga/{carga_id}/fecha-limite", {"fecha_limite_notas": "2026-11-20"}),
        ("POST", f"/actas/programa/{prog_id}/periodo/{p_id}/fecha-limite", {"fecha_limite_notas": "2026-11-20"}),
        ("POST", f"/actas/carga/{carga_id}/cerrar", None),
        ("POST", f"/actas/carga/{carga_id}/reabrir", {"motivo": "Reapertura de auditoría por reclamo", "nueva_fecha_limite": "2026-11-20"}),
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test-eval") as clean_client:
        internal_tok = create_internal_token()
        for metodo, url, payload in rutas:
            # A) Sin cabecera alguna -> 401
            if metodo == "PUT":
                r_sin = await clean_client.put(url, json=payload)
            else:
                r_sin = await clean_client.post(url, json=payload) if payload else await clean_client.post(url)
            assert r_sin.status_code == 401, f"Fallo sin cabecera en {metodo} {url}"
            assert r_sin.json()["detail"] == "No autenticado"

            # B) Con cabecera X-User-ID no numérica -> 401
            hdr_invalid = {"X-Internal-Token": internal_tok, "X-User-ID": "usuario_invalido"}
            if metodo == "PUT":
                r_inv = await clean_client.put(url, json=payload, headers=hdr_invalid)
            else:
                r_inv = await clean_client.post(url, json=payload, headers=hdr_invalid) if payload else await clean_client.post(url, headers=hdr_invalid)
            assert r_inv.status_code == 401, f"Fallo con cabecera no numérica en {metodo} {url}"
            assert r_inv.json()["detail"] == "No autenticado"

# ==============================================================================
# 15. evaluacion_registros.estado NO CAMBIA A 'cerrado' TRAS /cerrar
# ==============================================================================
@pytest.mark.asyncio
async def test_evaluacion_registros_estado_no_cambia_tras_cerrar(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    # Dejar registro con nota 16 y estado 'aprobado'
    await db_session.execute(text("UPDATE evaluacion_registros SET nota_final = 16, estado = 'aprobado' WHERE id = :id"), {"id": eval_id})
    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = false WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    headers = {"X-User-ID": "55"}
    resp = await client_evaluacion.post(f"/actas/carga/{carga_id}/cerrar", headers=headers)
    assert resp.status_code == 200

    # Comprobar en BD que el registro conserva 'aprobado' y NO fue sobreescrito con 'cerrado'
    db_res = await db_session.execute(text("SELECT estado, nota_final FROM evaluacion_registros WHERE id = :id"), {"id": eval_id})
    row = db_res.fetchone()
    assert row[0] == "aprobado", f"Esperado 'aprobado', pero se encontró '{row[0]}'"
    assert row[1] == 16

# ==============================================================================
# 16. RESUMEN ACTAS MUESTRA unidades_sin_programa Y CONTEOS DE PENDIENTES
# ==============================================================================
@pytest.mark.asyncio
async def test_resumen_actas_unidades_sin_programa_y_conteos_pendientes(client_evaluacion, db_session: AsyncSession, fix_carga_acta):
    p_id = fix_carga_acta["periodo_id"]
    prog_id = fix_carga_acta["programa_id"]

    # Crear una matrícula y detalle para unidad 777 (huérfana, sin programa ni plan registrado)
    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, periodo_id, programa_id, estado_matricula, created_at, updated_at)
        VALUES (777, 100, :p_id, 1, 'confirmada', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado_matricula = 'confirmada';
    """), {"p_id": p_id})
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (7771, 777, 777, 4, 'cursando', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO evaluacion_registros (id, matricula_detalle_id, estudiante_id, unidad_didactica_id, periodo_id, nota_final, estado, created_at, updated_at)
        VALUES (7771, 7771, 100, 777, :p_id, 15, 'aprobado', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET nota_final = 15;
    """), {"p_id": p_id})
    await db_session.commit()

    resp = await client_evaluacion.get(f"/actas/periodo/{p_id}/programa/{prog_id}")
    assert resp.status_code == 200
    data = resp.json()

    assert "unidades_sin_programa" in data
    u_sin_prog_ids = [u["unidad_didactica_id"] for u in data["unidades_sin_programa"]]
    assert 777 in u_sin_prog_ids

# ==============================================================================
# 17. MOCK DE RELOJ: get_hoy_lima Y get_now_utc INDEPENDIENTES
# ==============================================================================
@pytest.mark.asyncio
async def test_mock_de_reloj_independencia_tiempo(client_evaluacion, app_evaluacion, db_session: AsyncSession, fix_carga_acta, monkeypatch):
    _, routes_mod = app_evaluacion
    carga_id = fix_carga_acta["carga_id"]
    eval_id = fix_carga_acta["evaluacion_id"]

    simulada_fecha = date(2027, 5, 20)
    simulada_utc = datetime(2027, 5, 20, 15, 30, 0)

    monkeypatch.setattr(routes_mod, "get_hoy_lima", lambda: simulada_fecha)
    monkeypatch.setattr(routes_mod, "get_now_utc", lambda: simulada_utc)

    # 1. Configurar fecha límite a 2027-05-20 (mismo día simulado -> permitido)
    await db_session.execute(text("UPDATE carga_lectiva SET fecha_limite_notas = '2027-05-20', acta_cerrada = false WHERE id = :id"), {"id": carga_id})
    await db_session.execute(text("UPDATE evaluacion_registros SET nota_final = 15 WHERE id = :id"), {"id": eval_id})
    await db_session.commit()

    resp_put = await client_evaluacion.put(f"/registros/{eval_id}", json={"nota_final": 17})
    assert resp_put.status_code == 200

    # 2. Cerrar acta y comprobar que el timestamp grabado corresponda al mock UTC
    headers = {"X-User-ID": "99"}
    resp_cerrar = await client_evaluacion.post(f"/actas/carga/{carga_id}/cerrar", headers=headers)
    assert resp_cerrar.status_code == 200
    assert "2027-05-20" in resp_cerrar.json()["acta_cerrada_at"]
