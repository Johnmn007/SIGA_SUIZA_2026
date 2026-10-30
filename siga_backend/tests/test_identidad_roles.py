"""
Suite de pruebas de Identidad y Autorización por Roles en mod-evaluacion (BUG-D02).
Verifica:
1. Validación de X-Internal-Token y X-User-ID (401 en token ausente, inválido, vencido o tipo erróneo).
2. Verificación de usuario activo en core_users (401 si no existe o está inactivo).
3. Autorización de Docentes: Docente asignado califica (200), no asignado recibe 403.
4. Unidad sin carga lectiva: 403 informativo para docente, permitido para superadmin.
5. Protección contra IDOR en PUT y GET de registros y actas.
6. Autorización de Coordinación: Coordinador de programa gestiona actas (200), otro programa / sin programa / docente / estudiante reciben 403.
7. Usuario con doble rol (coordinador y docente) funciona en ambas capacidades.
8. Prioridad de autorización: 403 se evalúa y retorna antes que cualquier conflicto de negocio (409).
9. Matrícula calificable: detalle 'retirado' no cuenta como faltante ni como calificable.
10. unidades_solo_pendientes: unidades sin confirmadas pero con pendientes van a la nueva lista.
11. Rutas de Grupo 2 (sync-matricula): preservadas intactas sin regresión.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timedelta

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import (
    get_jwt_secret, create_internal_token, auth_headers
)


@pytest_asyncio.fixture
async def app_evaluacion():
    routes_mod = load_module_component("mod-evaluacion", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    return app, routes_mod


@pytest_asyncio.fixture
async def client_eval(app_evaluacion):
    app, _ = app_evaluacion
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test-eval") as client:
        yield client


@pytest_asyncio.fixture
async def fix_entorno_evaluacion(db_session: AsyncSession, fixture_evaluacion, fixture_carga_lectiva_y_plan):
    """
    Configura el entorno de prueba con:
    - Programa 1 (DSI) con unidad 101
    - Periodo 1 (2026-I, en_curso)
    - Carga lectiva 1: unidad 101, periodo 1, programa 1, docente 10
    - Registro de evaluación 200 (detalle 80, estudiante 100, unidad 101, periodo 1)
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
        "docente_asig_id": 10,
        "docente_noasig_id": 11,
        "coord_a_id": 2,
        "coord_b_id": 3,
        "coord_sin_prog_id": 4,
        "coord_docente_id": 12,
        "estudiante_id": 20,
        "inactivo_id": 30,
        "superadmin_id": 1,
        "evaluacion_id": 200
    }


# ==============================================================================
# 1. PRUEBAS DE TOKEN INTERNO (401 EN CADA CASO)
# ==============================================================================
@pytest.mark.asyncio
async def test_token_faltante_invalido_vencido_o_tipo_equivocado(client_eval, fix_entorno_evaluacion):
    carga_id = fix_entorno_evaluacion["carga_id"]
    eval_id = fix_entorno_evaluacion["evaluacion_id"]

    # A) Token faltante
    r_sin_token = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers={"X-User-ID": "10"})
    assert r_sin_token.status_code == 401
    assert r_sin_token.json()["detail"] == "No autenticado"

    # B) Token inválido (firmado con clave equivocada)
    tok_invalido = create_internal_token(secret_key="clave_falsa_completamente_invalida")
    r_tok_inv = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers=auth_headers(10, tok_invalido))
    assert r_tok_inv.status_code == 401
    assert r_tok_inv.json()["detail"] == "No autenticado"

    # C) Token vencido
    tok_vencido = create_internal_token(expires_delta=-timedelta(hours=1))
    r_vencido = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers=auth_headers(10, tok_vencido))
    assert r_vencido.status_code == 401
    assert r_vencido.json()["detail"] == "No autenticado"

    # D) Token de tipo equivocado (type="user_access" en vez de "module_access")
    tok_tipo_err = create_internal_token(token_type="user_access")
    r_tipo_err = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers=auth_headers(10, tok_tipo_err))
    assert r_tipo_err.status_code == 401
    assert r_tipo_err.json()["detail"] == "No autenticado"

    # E) X-User-ID faltante
    tok_ok = create_internal_token()
    r_sin_uid = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers={"X-Internal-Token": tok_ok})
    assert r_sin_uid.status_code == 401
    assert r_sin_uid.json()["detail"] == "No autenticado"

    # F) X-User-ID no numérico
    r_uid_str = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers={"X-Internal-Token": tok_ok, "X-User-ID": "abc"})
    assert r_uid_str.status_code == 401
    assert r_uid_str.json()["detail"] == "No autenticado"


# ==============================================================================
# 2. PRUEBAS DE USUARIO INACTIVO O INEXISTENTE EN CORE_USERS (401)
# ==============================================================================
@pytest.mark.asyncio
async def test_usuario_inactivo_o_inexistente_retorna_401(client_eval, fix_entorno_evaluacion):
    eval_id = fix_entorno_evaluacion["evaluacion_id"]

    # Usuario inexistente
    r_no_existe = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers=auth_headers(99999))
    assert r_no_existe.status_code == 401
    assert r_no_existe.json()["detail"] == "No autenticado"

    # Usuario inactivo (is_active=false, user_id=30)
    r_inactivo = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 15}, headers=auth_headers(30))
    assert r_inactivo.status_code == 401
    assert r_inactivo.json()["detail"] == "No autenticado"


# ==============================================================================
# 3. DOCENTE ASIGNADO CALIFICA (200), DOCENTE NO ASIGNADO RECIBE 403 (BUG-D02)
# ==============================================================================
@pytest.mark.asyncio
async def test_docente_asignado_califica_y_no_asignado_recibe_403(client_eval, fix_entorno_evaluacion):
    eval_id = fix_entorno_evaluacion["evaluacion_id"]
    doc_asig = fix_entorno_evaluacion["docente_asig_id"]
    doc_noasig = fix_entorno_evaluacion["docente_noasig_id"]

    # Docente no asignado intenta calificar vía PUT -> 403
    r_noasig = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 16}, headers=auth_headers(doc_noasig))
    assert r_noasig.status_code == 403
    assert r_noasig.json()["detail"] == "No tiene permisos para esta operación"

    # Docente asignado califica vía PUT -> 200
    r_asig = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 16}, headers=auth_headers(doc_asig))
    assert r_asig.status_code == 200
    assert r_asig.json()["nota_final"] == 16


# ==============================================================================
# 4. UNIDAD SIN CARGA LECTIVA: 403 INFORMATIVO SALVO SUPERADMIN
# ==============================================================================
@pytest.mark.asyncio
async def test_unidad_sin_carga_lectiva_retorna_403_informativo(client_eval, fix_entorno_evaluacion):
    doc_asig = fix_entorno_evaluacion["docente_asig_id"]
    admin = fix_entorno_evaluacion["superadmin_id"]

    # Intentar POST para una unidad sin carga (ej. unidad 888)
    payload = {
        "matricula_detalle_id": 999,
        "estudiante_id": 100,
        "unidad_didactica_id": 888,
        "periodo_id": 1,
        "nota_final": 15
    }

    # Docente recibe 403 con mensaje de solicitud de carga
    r_doc = await client_eval.post("/registros", json=payload, headers=auth_headers(doc_asig))
    assert r_doc.status_code == 403
    assert "La unidad no tiene docente asignado. Solicite la asignación de carga lectiva al coordinador." in r_doc.json()["detail"]

    # Superadmin no recibe 403 (avanza a validar existencia de matrícula -> 404)
    r_admin = await client_eval.post("/registros", json=payload, headers=auth_headers(admin))
    assert r_admin.status_code == 404


# ==============================================================================
# 5. GET DE REGISTROS Y ACTAS: SOLO DOCENTE ASIGNADO, COORD DEL PROGRAMA O SUPERADMIN
# ==============================================================================
@pytest.mark.asyncio
async def test_get_registros_y_actas_autorizacion(client_eval, fix_entorno_evaluacion):
    u_id = fix_entorno_evaluacion["unidad_id"]
    p_id = fix_entorno_evaluacion["periodo_id"]
    doc_asig = fix_entorno_evaluacion["docente_asig_id"]
    doc_noasig = fix_entorno_evaluacion["docente_noasig_id"]
    coord_a = fix_entorno_evaluacion["coord_a_id"]
    coord_b = fix_entorno_evaluacion["coord_b_id"]
    est = fix_entorno_evaluacion["estudiante_id"]
    admin = fix_entorno_evaluacion["superadmin_id"]

    # 1. GET /registros/unidad/{u}/periodo/{p}
    # Docente asignado: 200
    r1 = await client_eval.get(f"/registros/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(doc_asig))
    assert r1.status_code == 200

    # Coordinador del programa (prog 1): 200
    r2 = await client_eval.get(f"/registros/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(coord_a))
    assert r2.status_code == 200

    # Superadmin: 200
    r3 = await client_eval.get(f"/registros/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(admin))
    assert r3.status_code == 200

    # Docente no asignado: 403
    r4 = await client_eval.get(f"/registros/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(doc_noasig))
    assert r4.status_code == 403

    # Coordinador de otro programa (prog 2): 403
    r5 = await client_eval.get(f"/registros/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(coord_b))
    assert r5.status_code == 403

    # Estudiante: 403
    r6 = await client_eval.get(f"/registros/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(est))
    assert r6.status_code == 403

    # 2. GET /actas/unidad/{u}/periodo/{p}
    assert (await client_eval.get(f"/actas/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(doc_asig))).status_code == 200
    assert (await client_eval.get(f"/actas/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(coord_a))).status_code == 200
    assert (await client_eval.get(f"/actas/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(doc_noasig))).status_code == 403
    assert (await client_eval.get(f"/actas/unidad/{u_id}/periodo/{p_id}", headers=auth_headers(coord_b))).status_code == 403


# ==============================================================================
# 6. OPERACIONES DE COORDINACIÓN EN ACTAS (CERRAR, REABRIR, FECHA LÍMITE)
# ==============================================================================
@pytest.mark.asyncio
async def test_operaciones_actas_coordinador_programa_y_bloqueo_ajenos(client_eval, db_session: AsyncSession, fix_entorno_evaluacion):
    carga_id = fix_entorno_evaluacion["carga_id"]
    p_id = fix_entorno_evaluacion["periodo_id"]
    prog_id = fix_entorno_evaluacion["programa_id"]
    coord_a = fix_entorno_evaluacion["coord_a_id"]
    coord_b = fix_entorno_evaluacion["coord_b_id"]
    coord_sin_prog = fix_entorno_evaluacion["coord_sin_prog_id"]
    doc = fix_entorno_evaluacion["docente_asig_id"]
    est = fix_entorno_evaluacion["estudiante_id"]

    fecha_nueva = (date.today() + timedelta(days=5)).isoformat()

    # A) Coordinador de otro programa (B) recibe 403
    r_b = await client_eval.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(coord_b))
    assert r_b.status_code == 403

    # B) Coordinador sin programa recibe 403
    r_sin_prog = await client_eval.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(coord_sin_prog))
    assert r_sin_prog.status_code == 403

    # C) Docente y Estudiante reciben 403
    assert (await client_eval.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(doc))).status_code == 403
    assert (await client_eval.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(est))).status_code == 403

    # D) Coordinador del programa A actualiza fecha límite -> 200
    r_ok = await client_eval.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(coord_a))
    assert r_ok.status_code == 200

    # E) Fecha masiva por programa:
    assert (await client_eval.post(f"/actas/programa/{prog_id}/periodo/{p_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(coord_b))).status_code == 403
    assert (await client_eval.post(f"/actas/programa/{prog_id}/periodo/{p_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(coord_a))).status_code == 200

    # F) Cierre de acta por coordinador A -> 200, y acta_cerrada_por se graba con su user_id
    r_cerrar = await client_eval.post(f"/actas/carga/{carga_id}/cerrar", headers=auth_headers(coord_a))
    assert r_cerrar.status_code == 200
    assert r_cerrar.json()["acta_cerrada_por"] == coord_a

    db_res = await db_session.execute(text("SELECT acta_cerrada_por FROM carga_lectiva WHERE id = :id"), {"id": carga_id})
    assert db_res.scalar() == coord_a

    # G) Reapertura por coordinador A -> 200
    r_reabrir = await client_eval.post(
        f"/actas/carga/{carga_id}/reabrir",
        json={"motivo": "Reapertura formal justificada por el comité", "nueva_fecha_limite": fecha_nueva},
        headers=auth_headers(coord_a)
    )
    assert r_reabrir.status_code == 200
    assert r_reabrir.json()["acta_cerrada"] is False


# ==============================================================================
# 7. USUARIO CON DOS ROLES (COORDINADOR Y DOCENTE) FUNCIONA EN AMBOS
# ==============================================================================
@pytest.mark.asyncio
async def test_usuario_con_dos_roles_coordinador_y_docente(client_eval, db_session: AsyncSession, fix_entorno_evaluacion):
    user_dual = fix_entorno_evaluacion["coord_docente_id"]
    carga_id = fix_entorno_evaluacion["carga_id"]
    eval_id = fix_entorno_evaluacion["evaluacion_id"]

    # Como coordinador del programa 1: puede gestionar actas
    fecha_nueva = (date.today() + timedelta(days=10)).isoformat()
    r_coord = await client_eval.put(f"/actas/carga/{carga_id}/fecha-limite", json={"fecha_limite_notas": fecha_nueva}, headers=auth_headers(user_dual))
    assert r_coord.status_code == 200

    # Asignamos al docente dual la carga lectiva para probar su rol docente
    await db_session.execute(text("UPDATE carga_lectiva SET docente_id = :uid WHERE id = :cid"), {"uid": user_dual, "cid": carga_id})
    await db_session.commit()

    # Como docente asignado: puede calificar
    r_doc = await client_eval.put(f"/registros/{eval_id}", json={"nota_final": 18}, headers=auth_headers(user_dual))
    assert r_doc.status_code == 200
    assert r_doc.json()["nota_final"] == 18


# ==============================================================================
# 8. LA AUTORIZACIÓN (403) SE EVALÚA ANTES QUE CONFLICTOS DE NEGOCIO (409)
# ==============================================================================
@pytest.mark.asyncio
async def test_autorizacion_403_precede_a_conflicto_409(client_eval, db_session: AsyncSession, fix_entorno_evaluacion):
    carga_id = fix_entorno_evaluacion["carga_id"]
    eval_id = fix_entorno_evaluacion["evaluacion_id"]
    coord_b = fix_entorno_evaluacion["coord_b_id"]

    # 1. Cerramos el acta institucionalmente
    await db_session.execute(text("UPDATE carga_lectiva SET acta_cerrada = true WHERE id = :id"), {"id": carga_id})
    await db_session.commit()

    # 2. Si un usuario no autorizado intenta cerrar el acta (que ya está cerrada, lo que daría 409):
    # Debe recibir 403 (No tiene permisos) y NO 409 (Acta ya cerrada)
    r_unauth = await client_eval.post(f"/actas/carga/{carga_id}/cerrar", headers=auth_headers(coord_b))
    assert r_unauth.status_code == 403, f"Se esperaba 403 antes que 409, pero se obtuvo {r_unauth.status_code}"


# ==============================================================================
# 9. MATRÍCULA CALIFICABLE: DETALLE 'RETIRADO' NO CUENTA COMO FALTANTE NI CALIFICABLE
# ==============================================================================
@pytest.mark.asyncio
async def test_detalle_retirado_no_cuenta_como_faltante_ni_calificable(client_eval, db_session: AsyncSession, fix_entorno_evaluacion):
    carga_id = fix_entorno_evaluacion["carga_id"]
    coord_a = fix_entorno_evaluacion["coord_a_id"]
    p_id = fix_entorno_evaluacion["periodo_id"]
    u_id = fix_entorno_evaluacion["unidad_id"]

    # Insertamos un segundo estudiante con matrícula 'confirmada' pero detalle 'retirado'
    await db_session.execute(text("""
        INSERT INTO estudiantes (id, codigo_estudiante, dni, nombres, apellidos, programa_id, estado_academico, pago_matricula, documentos_completos, created_at, updated_at)
        VALUES (101, 'TEST-RETIRADO', '00000002', 'Alumno', 'Retirado', 1, 'regular', true, true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, programa_id, periodo_id, estado_matricula, tipo_ingreso, created_at, updated_at)
        VALUES (51, 101, 1, :p_id, 'confirmada', 'Ordinario', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """), {"p_id": p_id})
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (81, 51, :u_id, 4, 'retirado', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """), {"u_id": u_id})
    await db_session.commit()

    # Como el registro 200 del primer estudiante tiene nota (16), y el segundo está 'retirado',
    # el acta debe poder cerrarse con total_calificados = 1 y 0 faltantes.
    r_cerrar = await client_eval.post(f"/actas/carga/{carga_id}/cerrar", headers=auth_headers(coord_a))
    assert r_cerrar.status_code == 200
    assert r_cerrar.json()["total_calificados"] == 1


# ==============================================================================
# 10. UNIDADES_SOLO_PENDIENTES EN RESUMEN DE ACTAS DEL PROGRAMA
# ==============================================================================
@pytest.mark.asyncio
async def test_unidades_solo_pendientes_en_resumen_actas(client_eval, db_session: AsyncSession, fix_entorno_evaluacion):
    p_id = fix_entorno_evaluacion["periodo_id"]
    prog_id = fix_entorno_evaluacion["programa_id"]
    coord_a = fix_entorno_evaluacion["coord_a_id"]

    # Creamos la unidad 102 en el programa pero con una matrícula exclusivamente en estado 'pendiente'
    await db_session.execute(text("""
        INSERT INTO programa_unidades (id, programa_modulo_id, nombre, horas_teoria, horas_practica, creditos, orden)
        VALUES (102, 1, 'Unidad Solo Pendiente', 2, 4, 3, 2)
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, programa_id, periodo_id, estado_matricula, tipo_ingreso, created_at, updated_at)
        VALUES (52, 100, 1, :p_id, 'pendiente', 'Ordinario', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """), {"p_id": p_id})
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (82, 52, 102, 3, 'cursando', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()

    r = await client_eval.get(f"/actas/periodo/{p_id}/programa/{prog_id}", headers=auth_headers(coord_a))
    assert r.status_code == 200
    data = r.json()

    # Unidad 102 no debe estar en unidades_sin_carga (porque no tiene calificables)
    sin_carga_ids = [u["unidad_didactica_id"] for u in data["unidades_sin_carga"]]
    assert 102 not in sin_carga_ids

    # Unidad 102 debe estar en unidades_solo_pendientes
    assert "unidades_solo_pendientes" in data
    pendientes_ids = [u["id"] for u in data["unidades_solo_pendientes"]]
    assert 102 in pendientes_ids


# ==============================================================================
# 11. RUTAS DE GRUPO 2 (SYNC-MATRICULA) PERMANECEN ACCESIBLES SIN CAMBIOS
# ==============================================================================
@pytest.mark.asyncio
async def test_ruta_grupo_2_sync_matricula_responde_sin_token(client_eval):
    payload = {
        "matricula_id": 50,
        "estudiante_id": 100,
        "periodo_id": 1,
        "detalles": []
    }
    # La ruta de sync-matricula no está en Grupo 1; responde 200 sin exigir cabeceras de identidad
    r = await client_eval.post("/registros/sync-matricula", json=payload)
    assert r.status_code == 200
    assert r.json()["message"] == "Sincronización completada"
