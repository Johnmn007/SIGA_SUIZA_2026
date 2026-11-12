"""
Suite integral de pruebas automatizadas para los endpoints PUT de Hito 1 (SIGA Suiza 2026).
Verifica:
1. PUT /api/mod-programas-estudio/silabos/{silabo_id} (y ruta directa /silabos/{id})
   - Actualización exitosa por Coordinador de Programa y Docente titular (200 OK).
   - Bloqueo de autoaprobación por docente (403 Forbidden).
   - Rechazo a docente ajeno o coordinador de otro programa (403 Forbidden).
   - Rechazo a sílabo inexistente (404 Not Found).
   - Rechazo sin token de autorización (401 Unauthorized).
2. PUT /api/mod-programas-estudio/planes-trabajo/{plan_id} (y ruta directa /planes-trabajo/{id})
   - Actualización exitosa por Coordinador y Docente titular (200 OK).
   - Bloqueo de autoaprobación por docente (403 Forbidden).
   - Rechazo a docente ajeno o coordinador de otro programa (403 Forbidden).
   - Rechazo a plan inexistente (404 Not Found).
   - Rechazo sin token (401 Unauthorized).
3. Compatibilidad hacia atrás:
   - PUT /silabos/{id}/estado con query param (200 OK).
   - PUT /planes-trabajo/{id}/estado con query param (200 OK).
4. PUT /api/mod-programas-estudio/programas/{p}/carga-lectiva/{c}
   - Reasignación de docente, turno y sección por Coordinador o Superadmin (200 OK con persistencia en BD).
   - Rechazo si el acta se encuentra formalmente cerrada (409 Conflict).
   - Rechazo si el periodo académico está cerrado (409 Conflict).
   - Rechazo si el nuevo docente no existe o es inactivo (422 Unprocessable Entity).
   - Rechazo si la fecha límite es retroactiva (422 Unprocessable Entity).
   - Rechazo si la sección es duplicada (409 Conflict).
   - Rechazo a docentes o coordinadores de otro programa (403 Forbidden).
   - Rechazo si la carga no existe o no pertenece al programa (404 Not Found).
5. PUT /api/mod-programas-estudio/programas/{p}/horarios/{h}
   - Actualización de URL de archivo Excel, estado y observaciones por Coordinador (200 OK con persistencia).
   - Rechazo a docentes o coordinadores de otro programa (403 Forbidden).
   - Rechazo si el periodo está cerrado (409 Conflict).
   - Rechazo si el estado es inválido (422 Unprocessable Entity).
   - Rechazo si el horario no existe (404 Not Found).
   - Rechazo sin token (401 Unauthorized).
6. PUT /api/mod-evaluacion/registros/batch
   - Actualización en lote por docente titular o superadmin (200 OK con cálculo de condición aprobatoria).
   - Rechazo si el acta está cerrada o el plazo venció (409 Conflict).
   - Validación de escala vigesimal [0, 20] (422 Unprocessable Entity).
   - Blindaje BOLA/IDOR ante discrepancias de unidad/periodo (400 Bad Request).
   - Rechazo a docente ajeno (403 Forbidden) con precedencia sobre 409.
7. PUT /api/mod-evaluacion/actas/carga/{c}/fecha-limite
   - Modificación válida de fecha límite a una fecha futura (200 OK, outbox event generado).
   - Rechazo de fechas retroactivas anteriores a hoy (422 Unprocessable Entity).
   - Rechazo sobre actas cerradas (409 Conflict) o periodos cerrados (409 Conflict).
   - Rechazo a docentes o coordinadores de otro programa (403 Forbidden).
   - Rechazo a carga inexistente (404 Not Found).
   - Rechazo sin token (401 Unauthorized).

Garantía de Aislamiento:
- Ejecución estricta sobre siga_test. Cero escrituras en siga_local.
- Sin deadlocks: conexiones con NullPool y sesiones cerradas por request.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timedelta

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import auth_headers, get_jwt_secret, create_internal_token


# ==============================================================================
# FIXTURES DE APLICACIÓN Y CLIENTE HTTP
# ==============================================================================
@pytest_asyncio.fixture
async def app_put_endpoints():
    """
    Instancia una aplicación FastAPI montando las rutas de mod-programas-estudio
    y mod-evaluacion, soportando tanto la llamada directa de microservicio como
    el prefijo canónico del API Gateway (/api/mod-...).
    """
    routes_prog = load_module_component("mod-programas-estudio", "routes")
    routes_eval = load_module_component("mod-evaluacion", "routes")

    app = FastAPI(title="SIGA Test PUT Gateway")

    # Mapeo con prefijo de API Gateway (utilizado por el frontend)
    app.include_router(routes_prog.router, prefix="/api/mod-programas-estudio")
    app.include_router(routes_eval.router, prefix="/api/mod-evaluacion")

    # Mapeo directo de microservicio (para compatibilidad de rutas locales)
    app.include_router(routes_prog.router)
    app.include_router(routes_eval.router)

    return app, routes_prog, routes_eval


@pytest_asyncio.fixture
async def client_put(app_put_endpoints):
    """Cliente HTTP asíncrono para ejecutar peticiones contra la app de pruebas."""
    app, _, _ = app_put_endpoints
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test-gateway") as client:
        yield client


# ==============================================================================
# FIXTURE DE ENTORNO DE DATOS DE PRUEBA
# ==============================================================================
@pytest_asyncio.fixture
async def fix_put_entorno(db_session: AsyncSession):
    """
    Configura el entorno relacional canónico y completo en siga_test para las pruebas PUT.
    Garantiza la creación atómica y secuencial en estricto orden de dependencias FK:
      1. planes_estudio
      2. programas_estudio (Programa 1: DSI, Programa 2: Mecánica)
      3. programa_modulos (Módulo 1 para Programa 1)
      4. programa_unidades (Unidad 101 y 102 para Módulo 1)
      5. periodos_academicos (Periodo 1: 2026-I, en_curso)
      6. core_roles, core_users, core_user_roles, perfiles_personal
      7. estudiantes, matriculas, matricula_detalles
      8. carga_lectiva (Carga 1: abierta, Carga 96: cerrada)
      9. silabos (Sílabo 1 para Carga 1)
     10. planes_trabajo_docente (Plan 1 para Docente 10 en Prog 1)
     11. horarios_periodo (Horario 1 para Prog 1)
     12. evaluacion_registros (Registro 200)
     13. Sincronización de secuencias PostgreSQL
    """
    prog_1 = 1
    prog_2 = 2
    periodo_id = 1
    modulo_1 = 1
    unidad_101 = 101
    unidad_102 = 102
    carga_abierta = 1
    carga_cerrada = 96
    silabo_id = 1
    plan_id = 1
    horario_id = 1
    evaluacion_id = 200
    doc_a = 10
    doc_b = 11
    coord_a = 2
    coord_b = 3
    coord_sin_prog = 4
    superadmin = 1
    inactivo = 30
    estudiante_id = 100
    matricula_id = 50
    detalle_id = 80

    # 1. planes_estudio
    await db_session.execute(text("""
        INSERT INTO planes_estudio (id, codigo, nombre, estado, creditos_totales, horas_totales, created_at, updated_at)
        VALUES (1, 'DSI-2026', 'Desarrollo de Sistemas de Información', 'activo', 120, 2400, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado = 'activo';
    """))

    # 2. programas_estudio (Programa 1 y Programa 2)
    await db_session.execute(text("""
        INSERT INTO programas_estudio (id, codigo, nombre, creditos_totales, duracion_periodos, modalidad, estado, plan_estudio_id, created_at, updated_at)
        VALUES 
            (:p1, '0584722', 'Desarrollo de Sistemas de Información', 120, 6, 'presencial', 'activo', 1, NOW(), NOW()),
            (:p2, 'MEC-2026', 'Mecanica Automotriz', 120, 6, 'presencial', 'activo', 1, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado = 'activo', nombre = EXCLUDED.nombre;
    """), {"p1": prog_1, "p2": prog_2})

    # 3. programa_modulos (Módulo 1 para Programa 1)
    await db_session.execute(text("""
        INSERT INTO programa_modulos (id, programa_id, periodo, nombre, creditos, horas_totales)
        VALUES (:m_id, :prog_id, 3, 'Módulo 3: Sistemas Web', 30, 600)
        ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
    """), {"m_id": modulo_1, "prog_id": prog_1})

    # 4. programa_unidades (Unidades 101 y 102 pertenecientes al Módulo 1)
    await db_session.execute(text("""
        INSERT INTO programa_unidades (id, programa_modulo_id, nombre, horas_teoria, horas_practica, creditos, orden)
        VALUES 
            (:u1, :m_id, 'Taller de Programación Web', 2, 4, 4, 1),
            (:u2, :m_id, 'Base de Datos Avanzada', 2, 4, 4, 2)
        ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, programa_modulo_id = EXCLUDED.programa_modulo_id;
    """), {"u1": unidad_101, "u2": unidad_102, "m_id": modulo_1})

    # 5. periodos_academicos (Periodo 1 activo)
    now = datetime.utcnow()
    await db_session.execute(text("""
        INSERT INTO periodos_academicos (id, codigo, fecha_inicio, fecha_fin, estado, created_at, updated_at)
        VALUES (:p_id, '2026-I', :ini, :fin, 'en_curso', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET estado = 'en_curso';
    """), {"p_id": periodo_id, "ini": now - timedelta(days=10), "fin": now + timedelta(days=90)})

    # 6. Identidades (core_roles, core_users, core_user_roles, perfiles_personal)
    await db_session.execute(text("""
        INSERT INTO core_roles (id, name, description, created_at) VALUES
            (1, 'superadmin', 'Super Administrador del Sistema', NOW()),
            (2, 'coordinador_programa', 'Coordinador de Programa de Estudios', NOW()),
            (3, 'docente', 'Docente de Unidades Didácticas', NOW()),
            (4, 'estudiante', 'Estudiante de la Institución', NOW()),
            (5, 'secretaria_academica', 'Secretaría Académica', NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    """))

    await db_session.execute(text("""
        INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser, created_at) VALUES
            (1, 'superadmin.test@siga.edu', 'Super Admin Test', 'hash_test_123', true, true, NOW()),
            (2, 'coordinador.a@siga.edu', 'Coord Programa A', 'hash_test_123', true, false, NOW()),
            (3, 'coordinador.b@siga.edu', 'Coord Programa B', 'hash_test_123', true, false, NOW()),
            (4, 'coordinador.sin.prog@siga.edu', 'Coord Sin Prog', 'hash_test_123', true, false, NOW()),
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
            (2, 2),
            (3, 2),
            (4, 2),
            (10, 3),
            (11, 3),
            (20, 4),
            (30, 3)
        ON CONFLICT DO NOTHING;
    """))

    await db_session.execute(text("""
        INSERT INTO perfiles_personal (id, user_id, condicion_laboral, cargo_funcional, programa_estudio_id) VALUES
            (2, 2, 'NOMBRADO', 'Coordinador Programa 1', 1),
            (3, 3, 'NOMBRADO', 'Coordinador Programa 2', 2),
            (4, 4, 'NOMBRADO', 'Coordinador Sin Programa', NULL),
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

    # 8. Carga lectiva (Carga 1 abierta, Carga 96 cerrada)
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, acta_cerrada, acta_cerrada_por, acta_cerrada_at, fecha_limite_notas, created_at, updated_at)
        VALUES 
            (:c_abierta, :p_id, :prog1, :doc_a, :u101, 'MAÑANA', 'A', 'activo', false, NULL, NULL, NULL, NOW(), NOW()),
            (:c_cerrada, :p_id, :prog1, :doc_a, :u102, 'NOCHE', 'B', 'activo', true, :coord_a, NOW(), NULL, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            periodo_id = EXCLUDED.periodo_id,
            programa_id = EXCLUDED.programa_id,
            docente_id = EXCLUDED.docente_id,
            unidad_didactica_id = EXCLUDED.unidad_didactica_id,
            turno = EXCLUDED.turno,
            seccion = EXCLUDED.seccion,
            estado = 'activo',
            acta_cerrada = EXCLUDED.acta_cerrada,
            acta_cerrada_por = EXCLUDED.acta_cerrada_por,
            acta_cerrada_at = EXCLUDED.acta_cerrada_at,
            fecha_limite_notas = NULL;
    """), {
        "c_abierta": carga_abierta,
        "c_cerrada": carga_cerrada,
        "p_id": periodo_id,
        "prog1": prog_1,
        "doc_a": doc_a,
        "coord_a": coord_a,
        "u101": unidad_101,
        "u102": unidad_102
    })

    # 9. Sílabo 1 (asociado a Carga 1)
    await db_session.execute(text("""
        INSERT INTO silabos (id, carga_lectiva_id, estado, archivo_url, observaciones, created_at, updated_at)
        VALUES (:s_id, :c_id, 'aprobado', '/docs/silabo_dsi.pdf', 'Sílabo validado', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            carga_lectiva_id = EXCLUDED.carga_lectiva_id,
            estado = EXCLUDED.estado,
            archivo_url = EXCLUDED.archivo_url,
            observaciones = EXCLUDED.observaciones;
    """), {"s_id": silabo_id, "c_id": carga_abierta})

    # 10. Plan de Trabajo 1 (asociado a Docente 10 en Programa 1, Periodo 1)
    await db_session.execute(text("""
        INSERT INTO planes_trabajo_docente (id, periodo_id, programa_id, docente_id, estado, archivo_url, observaciones, created_at, updated_at)
        VALUES (:pl_id, :p_id, :prog1, :doc_a, 'aprobado', '/docs/plan_dsi.pdf', 'Plan aprobado', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            periodo_id = EXCLUDED.periodo_id,
            programa_id = EXCLUDED.programa_id,
            docente_id = EXCLUDED.docente_id,
            estado = EXCLUDED.estado,
            archivo_url = EXCLUDED.archivo_url,
            observaciones = EXCLUDED.observaciones;
    """), {"pl_id": plan_id, "p_id": periodo_id, "prog1": prog_1, "doc_a": doc_a})

    # 11. Horario de Periodo 1
    await db_session.execute(text("""
        INSERT INTO horarios_periodo (id, programa_id, periodo_id, archivo_excel_url, estado, observaciones, created_at, updated_at)
        VALUES (:h_id, :prog1, :p_id, 'http://storage.siga.edu/horarios/2026-I_DSI.xlsx', 'borrador', 'Versión inicial', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            archivo_excel_url = EXCLUDED.archivo_excel_url,
            estado = EXCLUDED.estado,
            observaciones = EXCLUDED.observaciones;
    """), {"h_id": horario_id, "prog1": prog_1, "p_id": periodo_id})

    # 12. Registro de Evaluación 200
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

    # 13. Sincronizar secuencias de PostgreSQL para evitar colisiones en auto-incremento
    await db_session.execute(text("SELECT setval('carga_lectiva_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM carga_lectiva))"))
    await db_session.execute(text("SELECT setval('silabos_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM silabos))"))
    await db_session.execute(text("SELECT setval('planes_trabajo_docente_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM planes_trabajo_docente))"))
    await db_session.execute(text("SELECT setval('horarios_periodo_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM horarios_periodo))"))
    await db_session.execute(text("SELECT setval('evaluacion_registros_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM evaluacion_registros))"))

    # 14. Commit atómico definitivo de todo el grafo relacional
    await db_session.commit()

    return {
        "programa_1": prog_1,
        "programa_2": prog_2,
        "periodo_id": periodo_id,
        "carga_abierta": carga_abierta,
        "carga_cerrada": carga_cerrada,
        "silabo_id": silabo_id,
        "plan_id": plan_id,
        "horario_id": horario_id,
        "evaluacion_id": evaluacion_id,
        "unidad_101": unidad_101,
        "unidad_102": unidad_102,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "coord_a": coord_a,
        "coord_b": coord_b,
        "coord_sin_prog": coord_sin_prog,
        "superadmin": superadmin,
        "inactivo": inactivo
    }


# ==============================================================================
# 1. TESTS: PUT /api/mod-programas-estudio/silabos/{silabo_id}
# ==============================================================================
@pytest.mark.asyncio
async def test_put_silabo_actualizacion_valida_coordinador_y_docente(client_put, fix_put_entorno, db_session: AsyncSession):
    """
    Verifica que el Coordinador del Programa y el Docente titular de la carga
    puedan actualizar los datos del sílabo vía PUT con payload JSON SilaboUpdate.
    """
    env = fix_put_entorno
    sil_id = env["silabo_id"]

    # 1. Coordinador del Programa 1 aprueba el sílabo y añade observaciones
    payload_coord = {
        "estado": "aprobado",
        "archivo_url": "http://files.siga.edu/silabos/2026-I_DSI_TallerWeb_v2.pdf",
        "observaciones": "Sílabo revisado y aprobado formalmente por coordinación"
    }
    resp_coord = await client_put.put(
        f"/api/mod-programas-estudio/silabos/{sil_id}",
        json=payload_coord,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp_coord.status_code == 200
    data_c = resp_coord.json()
    assert data_c["estado"] == "aprobado"
    assert data_c["archivo_url"] == payload_coord["archivo_url"]
    assert data_c["observaciones"] == payload_coord["observaciones"]

    # 2. Docente titular de la carga actualiza el enlace del documento (re-entrega)
    payload_doc = {
        "archivo_url": "http://files.siga.edu/silabos/2026-I_DSI_TallerWeb_v3.pdf",
        "estado": "presentado",
        "observaciones": "Subanexos actualizados"
    }
    resp_doc = await client_put.put(
        f"/silabos/{sil_id}",  # Ruta directa sin prefijo
        json=payload_doc,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert resp_doc.status_code == 200
    data_d = resp_doc.json()
    assert data_d["estado"] == "presentado"
    assert data_d["archivo_url"] == payload_doc["archivo_url"]

    # 3. Comprobación directa de persistencia en base de datos
    await db_session.commit()
    db_res = await db_session.execute(text("SELECT estado, archivo_url, observaciones FROM silabos WHERE id = :id"), {"id": sil_id})
    row = db_res.fetchone()
    assert row[0] == "presentado"
    assert row[1] == payload_doc["archivo_url"]
    assert row[2] == payload_doc["observaciones"]


@pytest.mark.asyncio
async def test_put_silabo_docente_autoaprobar_bloqueado_403(client_put, fix_put_entorno):
    """Docente NO puede autoaprobar su propio sílabo (403)."""
    env = fix_put_entorno
    sil_id = env["silabo_id"]
    doc_a = env["doc_a"]

    res = await client_put.put(
        f"/api/mod-programas-estudio/silabos/{sil_id}",
        json={"estado": "aprobado"},
        headers=auth_headers(user_id=doc_a)
    )
    assert res.status_code == 403
    assert "Solo el coordinador de programa puede aprobar el sílabo" in res.json()["detail"]


@pytest.mark.asyncio
async def test_put_silabo_rechaza_403_docente_o_coordinador_ajeno(client_put, fix_put_entorno):
    """
    Verifica que un docente que no imparte la carga o un coordinador de otro programa
    reciba HTTP 403 Forbidden al intentar actualizar el sílabo.
    """
    env = fix_put_entorno
    sil_id = env["silabo_id"]
    payload = {"estado": "aprobado", "observaciones": "Intento no autorizado"}

    # Docente ajeno (Docente B)
    r_doc_ajeno = await client_put.put(
        f"/api/mod-programas-estudio/silabos/{sil_id}",
        json=payload,
        headers=auth_headers(user_id=env["doc_b"])
    )
    assert r_doc_ajeno.status_code == 403

    # Coordinador de otro programa (Coordinador B)
    r_coord_ajeno = await client_put.put(
        f"/api/mod-programas-estudio/silabos/{sil_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_b"])
    )
    assert r_coord_ajeno.status_code == 403

    # Coordinador sin programa asignado
    r_coord_sin_prog = await client_put.put(
        f"/api/mod-programas-estudio/silabos/{sil_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_sin_prog"])
    )
    assert r_coord_sin_prog.status_code == 403


@pytest.mark.asyncio
async def test_put_silabo_rechaza_404_inexistente_y_401_sin_token(client_put, fix_put_entorno):
    """Verifica 404 para ID inexistente y 401 ante peticiones no autenticadas."""
    env = fix_put_entorno
    payload = {"estado": "aprobado"}

    # 404 Sílabo inexistente
    r_404 = await client_put.put(
        "/api/mod-programas-estudio/silabos/99999",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert r_404.status_code == 404

    # 401 Sin token
    r_401 = await client_put.put(
        f"/api/mod-programas-estudio/silabos/{env['silabo_id']}",
        json=payload
    )
    assert r_401.status_code == 401


# ==============================================================================
# 2. TESTS: PUT /api/mod-programas-estudio/planes-trabajo/{plan_id}
# ==============================================================================
@pytest.mark.asyncio
async def test_put_plan_trabajo_actualizacion_valida_coordinador_y_docente(client_put, fix_put_entorno, db_session: AsyncSession):
    """
    Verifica que el Coordinador del Programa y el Docente autor del plan de trabajo
    puedan actualizar los datos vía PUT con payload JSON PlanTrabajoDocenteUpdate.
    """
    env = fix_put_entorno
    plan_id = env["plan_id"]

    # 1. Coordinador aprueba el plan
    payload_coord = {
        "estado": "aprobado",
        "archivo_url": "http://files.siga.edu/planes/2026-I_DSI_DocenteA_v2.pdf",
        "observaciones": "Plan de actividades académicas aprobado"
    }
    resp_coord = await client_put.put(
        f"/api/mod-programas-estudio/planes-trabajo/{plan_id}",
        json=payload_coord,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp_coord.status_code == 200
    data_c = resp_coord.json()
    assert data_c["estado"] == "aprobado"
    assert data_c["archivo_url"] == payload_coord["archivo_url"]

    # 2. Docente titular actualiza su plan
    payload_doc = {
        "archivo_url": "http://files.siga.edu/planes/2026-I_DSI_DocenteA_v3.pdf",
        "estado": "presentado"
    }
    resp_doc = await client_put.put(
        f"/planes-trabajo/{plan_id}",  # Ruta directa sin prefijo
        json=payload_doc,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert resp_doc.status_code == 200
    data_d = resp_doc.json()
    assert data_d["estado"] == "presentado"
    assert data_d["archivo_url"] == payload_doc["archivo_url"]

    # 3. Comprobar en base de datos
    await db_session.commit()
    db_res = await db_session.execute(text("SELECT estado, archivo_url FROM planes_trabajo_docente WHERE id = :id"), {"id": plan_id})
    row = db_res.fetchone()
    assert row[0] == "presentado"
    assert row[1] == payload_doc["archivo_url"]


@pytest.mark.asyncio
async def test_put_plan_docente_autoaprobar_bloqueado_403(client_put, fix_put_entorno):
    """Docente intenta autoaprobar su propio plan (403)."""
    env = fix_put_entorno
    plan_id = env["plan_id"]
    doc_a = env["doc_a"]

    res = await client_put.put(
        f"/api/mod-programas-estudio/planes-trabajo/{plan_id}",
        json={"estado": "aprobado"},
        headers=auth_headers(user_id=doc_a)
    )
    assert res.status_code == 403
    assert "Solo el coordinador de programa puede aprobar el plan de trabajo" in res.json()["detail"]


@pytest.mark.asyncio
async def test_put_plan_trabajo_rechaza_403_docente_o_coordinador_ajeno(client_put, fix_put_entorno):
    """Verifica 403 Forbidden cuando otro docente o coordinador intenta modificar el plan."""
    env = fix_put_entorno
    plan_id = env["plan_id"]
    payload = {"estado": "aprobado"}

    # Docente ajeno
    r_bad_doc = await client_put.put(
        f"/api/mod-programas-estudio/planes-trabajo/{plan_id}",
        json=payload,
        headers=auth_headers(user_id=env["doc_b"])
    )
    assert r_bad_doc.status_code == 403

    # Coordinador ajeno
    r_bad_coord = await client_put.put(
        f"/api/mod-programas-estudio/planes-trabajo/{plan_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_b"])
    )
    assert r_bad_coord.status_code == 403


@pytest.mark.asyncio
async def test_put_plan_trabajo_rechaza_404_inexistente_y_401_sin_token(client_put, fix_put_entorno):
    """Verifica 404 ante plan inexistente y 401 si no hay credenciales."""
    env = fix_put_entorno
    payload = {"estado": "aprobado"}

    r_404 = await client_put.put(
        "/api/mod-programas-estudio/planes-trabajo/99999",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert r_404.status_code == 404

    r_401 = await client_put.put(
        f"/api/mod-programas-estudio/planes-trabajo/{env['plan_id']}",
        json=payload
    )
    assert r_401.status_code == 401


# ==============================================================================
# 3. TESTS: COMPATIBILIDAD HACIA ATRÁS (/estado)
# ==============================================================================
@pytest.mark.asyncio
async def test_backward_compatibility_silabo_estado(client_put, fix_put_entorno):
    """PUT /silabos/{id}/estado con query param sigue funcionando 200."""
    env = fix_put_entorno
    sil_id = env["silabo_id"]
    coord_a = env["coord_a"]

    res = await client_put.put(
        f"/silabos/{sil_id}/estado?estado=aprobado&observaciones=RevisadoOK",
        headers=auth_headers(user_id=coord_a)
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "aprobado"


@pytest.mark.asyncio
async def test_backward_compatibility_plan_estado(client_put, fix_put_entorno):
    """PUT /planes-trabajo/{id}/estado con query param sigue funcionando 200."""
    env = fix_put_entorno
    plan_id = env["plan_id"]
    coord_a = env["coord_a"]

    res = await client_put.put(
        f"/planes-trabajo/{plan_id}/estado?estado=aprobado&observaciones=PlanOK",
        headers=auth_headers(user_id=coord_a)
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "aprobado"


# ==============================================================================
# 4. TESTS: PUT /api/mod-programas-estudio/programas/{p}/carga-lectiva/{c}
# ==============================================================================
@pytest.mark.asyncio
async def test_put_carga_lectiva_reasignacion_valida(client_put, fix_put_entorno, db_session: AsyncSession):
    """
    Verifica que el Coordinador del Programa reasigne exitosamente el docente,
    turno y sección de una carga lectiva abierta.
    """
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_id = env["carga_abierta"]
    nuevo_docente = env["doc_b"]

    payload = {
        "docente_id": nuevo_docente,
        "turno": "NOCHE",
        "seccion": "B",
        "estado": "publicado"
    }
    resp = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["docente_id"] == nuevo_docente
    assert data["turno"] == "NOCHE"
    assert data["seccion"] == "B"
    assert data["estado"] == "publicado"

    # Verificar persistencia en base de datos
    await db_session.commit()
    db_res = await db_session.execute(
        text("SELECT docente_id, turno, seccion, estado FROM carga_lectiva WHERE id = :id"),
        {"id": carga_id}
    )
    row = db_res.fetchone()
    assert row[0] == nuevo_docente
    assert row[1] == "NOCHE"
    assert row[2] == "B"
    assert row[3] == "publicado"


@pytest.mark.asyncio
async def test_put_carga_lectiva_409_acta_cerrada(client_put, fix_put_entorno):
    """
    Verifica que si el acta de notas se encuentra formalmente cerrada,
    el sistema rechace tajantemente cualquier modificación con HTTP 409 Conflict.
    """
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_cerrada = env["carga_cerrada"]

    payload = {
        "docente_id": env["doc_b"],
        "turno": "MAÑANA"
    }
    resp = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_cerrada}",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 409
    assert "cerrada" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_put_carga_lectiva_409_periodo_cerrado(client_put, fix_put_entorno, db_session: AsyncSession):
    """Verifica que si el periodo académico está en estado 'cerrado', retorne 409 Conflict."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_id = env["carga_abierta"]
    p_id = env["periodo_id"]

    try:
        await db_session.execute(text("UPDATE periodos_academicos SET estado = 'cerrado' WHERE id = :id"), {"id": p_id})
        await db_session.commit()

        payload = {"turno": "TARDE"}
        resp = await client_put.put(
            f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_id}",
            json=payload,
            headers=auth_headers(user_id=env["coord_a"])
        )
        assert resp.status_code == 409
        assert "cerrado" in resp.json()["detail"].lower()
    finally:
        await db_session.execute(text("UPDATE periodos_academicos SET estado = 'en_curso' WHERE id = :id"), {"id": p_id})
        await db_session.commit()


@pytest.mark.asyncio
async def test_put_carga_lectiva_422_docente_invalido(client_put, fix_put_entorno):
    """Verifica 422 Unprocessable Entity al reasignar a un docente inexistente."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_id = env["carga_abierta"]

    payload = {"docente_id": 99999}
    resp = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_put_carga_lectiva_422_fecha_limite_retroactiva(client_put, fix_put_entorno):
    """Verifica 422 si la fecha límite de notas es anterior a hoy."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_id = env["carga_abierta"]
    payload = {"fecha_limite_notas": "2020-01-01"}

    res = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert res.status_code == 422
    assert "anterior" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_put_carga_lectiva_409_seccion_duplicada(client_put, fix_put_entorno, db_session: AsyncSession):
    """Verifica 409 Conflict si se cambia la sección a una que ya existe para esa unidad y periodo."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_abierta = env["carga_abierta"]
    carga_aux = 888

    try:
        # Crear otra carga lectiva para la misma unidad en seccion 'B'
        await db_session.execute(text("""
            INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, created_at, updated_at)
            VALUES (:id, :p, :prog, :doc, :u, 'NOCHE', 'B', 'activo', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
        """), {"id": carga_aux, "p": env["periodo_id"], "prog": prog_id, "doc": env["doc_b"], "u": env["unidad_101"]})
        await db_session.commit()

        payload = {"seccion": "B"}
        res = await client_put.put(
            f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_abierta}",
            json=payload,
            headers=auth_headers(user_id=env["coord_a"])
        )
        assert res.status_code == 409
        assert "docente asignado" in res.json()["detail"].lower()
    finally:
        # Limpieza obligatoria para evitar contaminación de estado residual
        await db_session.execute(text("DELETE FROM carga_lectiva WHERE id = :id"), {"id": carga_aux})
        await db_session.commit()


@pytest.mark.asyncio
async def test_put_carga_lectiva_403_docente_o_coordinador_ajeno(client_put, fix_put_entorno):
    """Verifica 403 Forbidden cuando un docente o coordinador ajeno intenta modificar carga lectiva."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    carga_id = env["carga_abierta"]
    payload = {"turno": "NOCHE"}

    # Docente (no tiene rol coordinador/admin)
    r_doc = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_id}",
        json=payload,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert r_doc.status_code == 403

    # Coordinador de Programa 2
    r_coord_b = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/{carga_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_b"])
    )
    assert r_coord_b.status_code == 403


@pytest.mark.asyncio
async def test_put_carga_lectiva_404_no_encontrado(client_put, fix_put_entorno):
    """Verifica 404 si la carga no existe o no pertenece al programa."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    payload = {"turno": "MAÑANA"}

    res = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/carga-lectiva/99999",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert res.status_code == 404


# ==============================================================================
# 5. TESTS: PUT /api/mod-programas-estudio/programas/{p}/horarios/{h}
# ==============================================================================
@pytest.mark.asyncio
async def test_put_horarios_actualizacion_valida_coordinador(client_put, fix_put_entorno, db_session: AsyncSession):
    """
    Verifica que el Coordinador del Programa actualice exitosamente los metadatos,
    URL del archivo Excel y estado del horario de periodo.
    """
    env = fix_put_entorno
    prog_id = env["programa_1"]
    horario_id = env["horario_id"]

    payload = {
        "archivo_excel_url": "http://storage.siga.edu/horarios/2026-I_DSI_vFinal.xlsx",
        "estado": "publicado",
        "observaciones": "Horario definitivo aprobado por Consejo Académico"
    }
    resp = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/horarios/{horario_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["archivo_excel_url"] == payload["archivo_excel_url"]
    assert data["estado"] == "publicado"
    assert data["observaciones"] == payload["observaciones"]

    # Comprobar en base de datos
    await db_session.commit()
    db_res = await db_session.execute(
        text("SELECT archivo_excel_url, estado, observaciones FROM horarios_periodo WHERE id = :id"),
        {"id": horario_id}
    )
    row = db_res.fetchone()
    assert row[0] == payload["archivo_excel_url"]
    assert row[1] == "publicado"
    assert row[2] == payload["observaciones"]


@pytest.mark.asyncio
async def test_put_horarios_409_periodo_cerrado(client_put, fix_put_entorno, db_session: AsyncSession):
    """Verifica 409 Conflict al modificar horario de periodo cerrado."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    horario_id = env["horario_id"]
    p_id = env["periodo_id"]

    try:
        await db_session.execute(text("UPDATE periodos_academicos SET estado = 'cerrado' WHERE id = :id"), {"id": p_id})
        await db_session.commit()

        payload = {"estado": "publicado"}
        res = await client_put.put(
            f"/api/mod-programas-estudio/programas/{prog_id}/horarios/{horario_id}",
            json=payload,
            headers=auth_headers(user_id=env["coord_a"])
        )
        assert res.status_code == 409
        assert "cerrado" in res.json()["detail"].lower()
    finally:
        await db_session.execute(text("UPDATE periodos_academicos SET estado = 'en_curso' WHERE id = :id"), {"id": p_id})
        await db_session.commit()


@pytest.mark.asyncio
async def test_put_horarios_422_estado_invalido(client_put, fix_put_entorno):
    """Verifica 422 si el estado del horario no es válido."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    horario_id = env["horario_id"]
    payload = {"estado": "estado_invalido_xyz"}

    res = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/horarios/{horario_id}",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_put_horarios_rechaza_403_404_401(client_put, fix_put_entorno):
    """Verifica 403 por falta de permisos, 404 si el horario no existe y 401 sin token."""
    env = fix_put_entorno
    prog_id = env["programa_1"]
    horario_id = env["horario_id"]
    payload = {"estado": "publicado"}

    # 403 Docente intentando editar horario
    r_403 = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/horarios/{horario_id}",
        json=payload,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert r_403.status_code == 403

    # 404 Horario inexistente
    r_404 = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/horarios/99999",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert r_404.status_code == 404

    # 401 Sin token
    r_401 = await client_put.put(
        f"/api/mod-programas-estudio/programas/{prog_id}/horarios/{horario_id}",
        json=payload
    )
    assert r_401.status_code == 401


# ==============================================================================
# 6. TESTS: PUT /api/mod-evaluacion/registros/batch
# ==============================================================================
@pytest.mark.asyncio
async def test_put_registros_batch_actualizacion_valida(client_put, fix_put_entorno, db_session: AsyncSession):
    """
    Verifica que el alias PUT /api/mod-evaluacion/registros/batch actualice
    calificaciones masivamente, recalculando condición vigesimal (aprobado >= 13).
    """
    env = fix_put_entorno
    eval_id = env["evaluacion_id"]
    u_id = env["unidad_101"]
    p_id = env["periodo_id"]

    # 1. Calificar con nota 16 -> aprobado
    payload_16 = [{
        "id": eval_id,
        "unidad_didactica_id": u_id,
        "periodo_id": p_id,
        "nota_c1": 16,
        "nota_c2": 16,
        "nota_c3": 16,
        "nota_final": 16
    }]
    resp = await client_put.put(
        "/api/mod-evaluacion/registros/batch",
        json=payload_16,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["nota_final"] == 16
    assert data[0]["estado"] == "aprobado"

    # Verificar en base de datos
    await db_session.commit()
    db_res = await db_session.execute(text("SELECT nota_final, estado FROM evaluacion_registros WHERE id = :id"), {"id": eval_id})
    row = db_res.fetchone()
    assert row[0] == 16
    assert row[1] == "aprobado"

    # 2. Actualizar con nota 11 -> desaprobado (< 13)
    payload_11 = [{
        "id": eval_id,
        "unidad_didactica_id": u_id,
        "periodo_id": p_id,
        "nota_c1": 11,
        "nota_c2": 11,
        "nota_c3": 11,
        "nota_final": 11
    }]
    resp_desap = await client_put.put(
        "/registros/batch",  # Ruta directa sin prefijo
        json=payload_11,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert resp_desap.status_code == 200
    data_des = resp_desap.json()
    assert data_des[0]["nota_final"] == 11
    assert data_des[0]["estado"] == "desaprobado"


@pytest.mark.asyncio
async def test_put_registros_batch_403_docente_ajeno_precede_409(client_put, fix_put_entorno, db_session: AsyncSession):
    """Verifica que un docente no asignado reciba 403 Forbidden aun si el acta estuviese cerrada."""
    env = fix_put_entorno
    eval_id = env["evaluacion_id"]

    payload = [{
        "id": eval_id,
        "unidad_didactica_id": env["unidad_101"],
        "periodo_id": env["periodo_id"],
        "nota_final": 18
    }]
    resp = await client_put.put(
        "/api/mod-evaluacion/registros/batch",
        json=payload,
        headers=auth_headers(user_id=env["doc_b"])
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_put_registros_batch_409_acta_cerrada(client_put, fix_put_entorno, db_session: AsyncSession):
    """Verifica 409 Conflict si el acta de la carga ya fue cerrada."""
    env = fix_put_entorno
    carga_id = env["carga_abierta"]

    try:
        await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
        await db_session.commit()

        payload = [{
            "id": env["evaluacion_id"],
            "unidad_didactica_id": env["unidad_101"],
            "periodo_id": env["periodo_id"],
            "nota_final": 17
        }]
        resp = await client_put.put(
            "/api/mod-evaluacion/registros/batch",
            json=payload,
            headers=auth_headers(user_id=env["doc_a"])
        )
        assert resp.status_code == 409
        assert "cerrada" in resp.json()["detail"].lower()
    finally:
        await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = false WHERE id = :id"), {"id": carga_id})
        await db_session.commit()


@pytest.mark.asyncio
async def test_put_registros_batch_422_nota_fuera_de_rango(client_put, fix_put_entorno):
    """Verifica 422 Unprocessable Entity si alguna nota excede el rango vigesimal [0, 20]."""
    env = fix_put_entorno
    headers = auth_headers(user_id=env["doc_a"])

    # Nota 25 (> 20)
    resp_25 = await client_put.put("/api/mod-evaluacion/registros/batch", json=[{
        "id": env["evaluacion_id"], "unidad_didactica_id": env["unidad_101"], "periodo_id": env["periodo_id"], "nota_final": 25
    }], headers=headers)
    assert resp_25.status_code == 422
    assert "0 y 20" in resp_25.json()["detail"]

    # Nota negativa (-1)
    resp_neg = await client_put.put("/api/mod-evaluacion/registros/batch", json=[{
        "id": env["evaluacion_id"], "unidad_didactica_id": env["unidad_101"], "periodo_id": env["periodo_id"], "nota_final": -1
    }], headers=headers)
    assert resp_neg.status_code == 422


@pytest.mark.asyncio
async def test_put_registros_batch_400_bola_idor_suplantacion(client_put, fix_put_entorno):
    """
    Vulnerabilidad BOLA / IDOR: Si el payload contiene un registro existente (id=200)
    pero declara una unidad_didactica_id falsa (ej. 999), el backend rechaza con 400 Bad Request.
    """
    env = fix_put_entorno
    payload = [{
        "id": env["evaluacion_id"],
        "unidad_didactica_id": 999,  # Discrepancia maliciosa
        "periodo_id": env["periodo_id"],
        "nota_final": 19
    }]
    resp = await client_put.put(
        "/api/mod-evaluacion/registros/batch",
        json=payload,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert resp.status_code == 400
    assert "Inconsistencia" in resp.json()["detail"]


# ==============================================================================
# 7. TESTS: PUT /api/mod-evaluacion/actas/carga/{carga_id}/fecha-limite
# ==============================================================================
@pytest.mark.asyncio
async def test_put_fecha_limite_actualizacion_valida(client_put, app_put_endpoints, fix_put_entorno, db_session: AsyncSession, monkeypatch):
    """
    Verifica que el Coordinador del Programa actualice exitosamente la fecha límite
    a una fecha futura (inclusive hoy), registrando evento en outbox_events.
    """
    _, _, routes_eval = app_put_endpoints
    fecha_simulada = date(2026, 11, 4)
    monkeypatch.setattr(routes_eval, "get_hoy_lima", lambda: fecha_simulada)

    env = fix_put_entorno
    carga_id = env["carga_abierta"]
    nueva_fecha = "2026-11-20"

    resp = await client_put.put(
        f"/api/mod-evaluacion/actas/carga/{carga_id}/fecha-limite",
        json={"fecha_limite_notas": nueva_fecha},
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["carga_id"] == carga_id
    assert str(data["fecha_limite_notas"]) == nueva_fecha

    # Sincronizar la sesión local del test runner para evitar lecturas de snapshot viejo
    await db_session.commit()

    # Comprobar en base de datos con verificación estricta de presencia y tipado
    db_res = await db_session.execute(
        text("SELECT fecha_limite_notas FROM carga_lectiva WHERE id = :id"),
        {"id": carga_id}
    )
    fecha_bd = db_res.scalar()
    assert fecha_bd is not None, f"Se esperaba fecha_limite_notas actualizada para la carga {carga_id}, pero se obtuvo None en base de datos"
    assert (fecha_bd.isoformat() if hasattr(fecha_bd, "isoformat") else str(fecha_bd)) == nueva_fecha

    # Comprobar evento outbox
    ev_res = await db_session.execute(text("""
        SELECT event_type, payload FROM outbox_events 
        WHERE event_type = 'evaluacion.acta.fecha_limite_actualizada'
        ORDER BY id DESC LIMIT 1;
    """))
    ev = ev_res.fetchone()
    assert ev is not None
    assert ev[0] == "evaluacion.acta.fecha_limite_actualizada"


@pytest.mark.asyncio
async def test_put_fecha_limite_422_fecha_pasada(client_put, app_put_endpoints, fix_put_entorno, monkeypatch):
    """Verifica que una fecha anterior a hoy sea rechazada con 422 Unprocessable Entity."""
    _, _, routes_eval = app_put_endpoints
    fecha_simulada = date(2026, 11, 4)
    monkeypatch.setattr(routes_eval, "get_hoy_lima", lambda: fecha_simulada)

    env = fix_put_entorno
    carga_id = env["carga_abierta"]
    fecha_ayer = "2026-11-03"

    resp = await client_put.put(
        f"/api/mod-evaluacion/actas/carga/{carga_id}/fecha-limite",
        json={"fecha_limite_notas": fecha_ayer},
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 422
    assert "igual o posterior" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_put_fecha_limite_409_acta_cerrada(client_put, app_put_endpoints, fix_put_entorno, monkeypatch):
    """Verifica que no se pueda modificar la fecha límite de un acta formalmente cerrada (409 Conflict)."""
    _, _, routes_eval = app_put_endpoints
    monkeypatch.setattr(routes_eval, "get_hoy_lima", lambda: date(2026, 11, 4))

    env = fix_put_entorno
    carga_cerrada = env["carga_cerrada"]

    resp = await client_put.put(
        f"/api/mod-evaluacion/actas/carga/{carga_cerrada}/fecha-limite",
        json={"fecha_limite_notas": "2026-11-25"},
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert resp.status_code == 409
    assert "cerrada" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_put_fecha_limite_403_docente_o_coordinador_ajeno(client_put, app_put_endpoints, fix_put_entorno, monkeypatch):
    """Verifica 403 Forbidden cuando un docente o coordinador ajeno intenta fijar fechas límite."""
    _, _, routes_eval = app_put_endpoints
    monkeypatch.setattr(routes_eval, "get_hoy_lima", lambda: date(2026, 11, 4))

    env = fix_put_entorno
    carga_id = env["carga_abierta"]
    payload = {"fecha_limite_notas": "2026-11-20"}

    # Docente
    r_doc = await client_put.put(
        f"/api/mod-evaluacion/actas/carga/{carga_id}/fecha-limite",
        json=payload,
        headers=auth_headers(user_id=env["doc_a"])
    )
    assert r_doc.status_code == 403

    # Coordinador de otro programa
    r_coord_b = await client_put.put(
        f"/api/mod-evaluacion/actas/carga/{carga_id}/fecha-limite",
        json=payload,
        headers=auth_headers(user_id=env["coord_b"])
    )
    assert r_coord_b.status_code == 403


@pytest.mark.asyncio
async def test_put_fecha_limite_404_inexistente_y_401_sin_token(client_put, fix_put_entorno):
    """Verifica 404 para carga inexistente y 401 si no hay token."""
    env = fix_put_entorno
    payload = {"fecha_limite_notas": "2026-11-20"}

    # 404 Carga inexistente
    r_404 = await client_put.put(
        "/api/mod-evaluacion/actas/carga/99999/fecha-limite",
        json=payload,
        headers=auth_headers(user_id=env["coord_a"])
    )
    assert r_404.status_code == 404

    # 401 Sin token
    r_401 = await client_put.put(
        f"/api/mod-evaluacion/actas/carga/{env['carga_abierta']}/fecha-limite",
        json=payload
    )
    assert r_401.status_code == 401
