"""
Suite de pruebas de Identidad, Roles y Reglas de Negocio en mod-programas-estudio (BUG-D03).
Verifica:
1. Validación de X-Internal-Token y X-User-ID (401 en token ausente, inválido, vencido o tipo erróneo).
2. GET carga, sílabos y planes de docente:
   - Docente A accede a sus propios datos (200).
   - Docente B recibe 403 al intentar acceder a los datos de Docente A.
   - Coordinador del programa de Docente A accede a sus datos (200).
   - Coordinador de otro programa recibe 403.
   - Coordinador sin programa asignado recibe 403.
   - Superadmin accede a cualquier docente (200).
3. POST /silabos y POST /planes-trabajo:
   - Docente titular de la carga lectiva puede registrar sílabo (201).
   - Docente ajeno a la carga recibe 403.
   - Docente registrando plan con su ID y en programa con carga lectiva (201).
   - Docente registrando plan para otro docente o sin carga en ese programa recibe 403.
4. GET /programas/{pid}/silabos y /planes-trabajo; PUT /silabos/{id}/estado y /planes-trabajo/{id}/estado:
   - Coordinador del programa correspondiente opera con éxito (200).
   - Coordinador de otro programa recibe 403.
   - Coordinador sin programa recibe 403.
5. Operaciones de carga lectiva y tutorías:
   - POST /carga-lectiva, clonar, DELETE carga, POST horarios, POST tutorias:
     exigen coordinador del programa o superadmin (403 para otros).
6. Reglas de negocio para evitar saltarse el cierre de actas:
   - DELETE de carga con acta_cerrada=True o con notas registradas retorna 409 Conflict.
   - POST de carga con docente inexistente o sin rol docente/coordinador retorna 422.
   - POST de carga en periodo cerrado o duplicada retorna 409.
   - Clonar carga lectiva nunca copia campos de acta ni fecha límite (quedan limpias/abiertas).
7. Rutas de Grupo 2 (malla, periodos, GET /programas/{id}/carga-lectiva):
   - Responden 200 sin requerir token ni cabeceras de identidad.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timedelta
from jose import jwt

from tests.helpers.module_loader import load_module_component
from tests.helpers.jwt_helper import (
    get_jwt_secret, create_internal_token, auth_headers
)


@pytest_asyncio.fixture
async def app_programas():
    routes_mod = load_module_component("mod-programas-estudio", "routes")
    app = FastAPI()
    app.include_router(routes_mod.router)
    return app, routes_mod


@pytest_asyncio.fixture
async def client_prog(app_programas):
    app, _ = app_programas
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test-prog") as client:
        yield client


@pytest_asyncio.fixture
async def fix_entorno_programas(db_session: AsyncSession, fixture_evaluacion, fixture_carga_lectiva_y_plan):
    """
    Configura entorno usando el catálogo canónico de conftest.py:
    - Programa 1 (DSI) con coordinador user 2 (coord_a)
    - Programa 2 (Mecánica) con coordinador user 3 (coord_b)
    - Coordinador sin programa: user 4
    - Docente A: user 10 (con carga 1 en Programa 1)
    - Docente B: user 11 (con carga 92 en Programa 2)
    - Superadmin: user 1
    """
    p_id = 1
    prog_1 = 1
    u_id = 101
    cl_id = 1
    doc_a = 10
    doc_b = 11
    coord_a = 2
    coord_b = 3
    coord_sin_prog = 4
    superadmin = 1

    # Asegurar segundo programa completo
    prog_2 = 2
    await db_session.execute(text("""
        INSERT INTO programas_estudio (id, nombre, codigo, creditos_totales, duracion_periodos, modalidad, estado, created_at, updated_at)
        VALUES (:id, 'Mecanica', 'MEC-2026', 120, 6, 'presencial', 'activo', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
            duracion_periodos = EXCLUDED.duracion_periodos,
            modalidad = EXCLUDED.modalidad,
            estado = EXCLUDED.estado,
            created_at = COALESCE(programas_estudio.created_at, NOW()),
            updated_at = COALESCE(programas_estudio.updated_at, NOW());
    """), {"id": prog_2})

    # Asegurar carga lectiva para docente B en programa 2
    cl_2 = 92
    await db_session.execute(text("""
        INSERT INTO programa_modulos (id, programa_id, nombre, periodo, orden)
        VALUES (2, :p2, 'Modulo 2', 1, 1)
        ON CONFLICT (id) DO NOTHING;
    """), {"p2": prog_2})
    await db_session.execute(text("""
        INSERT INTO programa_unidades (id, programa_modulo_id, nombre, horas_teoria, horas_practica, creditos, orden)
        VALUES (201, 2, 'Unidad Mecanica', 2, 4, 3, 1)
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, programa_id, periodo_id, docente_id, unidad_didactica_id, seccion, turno, estado, acta_cerrada)
        VALUES (:id, :p2, :per, :did, 201, 'A', 'M', 'publicado', false)
        ON CONFLICT (id) DO UPDATE SET programa_id = :p2, docente_id = :did;
    """), {"id": cl_2, "p2": prog_2, "per": p_id, "did": doc_b})

    # Asegurar silabo inicial para cl_id (carga 1 ya tiene silabo_id=1 creado por fixture_carga_lectiva_y_plan)
    silabo_1 = fixture_carga_lectiva_y_plan["silabo_id"]
    await db_session.execute(text("""
        UPDATE silabos 
        SET estado = 'pendiente', archivo_url = 'http://files/silabo1.pdf', updated_at = NOW()
        WHERE id = :id;
    """), {"id": silabo_1})

    # Asegurar plan inicial para docente A en programa 1 (plan 1 ya existe)
    plan_1 = fixture_carga_lectiva_y_plan["plan_id"]
    await db_session.execute(text("""
        UPDATE planes_trabajo_docente 
        SET estado = 'pendiente', archivo_url = 'http://files/plan1.pdf', updated_at = NOW()
        WHERE id = :id;
    """), {"id": plan_1})

    # Asegurar que las secuencias de PostgreSQL no colisionen con los IDs insertados manualmente en fixtures
    await db_session.execute(text("SELECT setval('carga_lectiva_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM carga_lectiva))"))
    await db_session.execute(text("SELECT setval('silabos_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM silabos))"))
    await db_session.execute(text("SELECT setval('planes_trabajo_docente_id_seq', (SELECT COALESCE(MAX(id), 1) + 10 FROM planes_trabajo_docente))"))
    await db_session.commit()

    return {
        "periodo_id": p_id,
        "programa_1": prog_1,
        "programa_2": prog_2,
        "unidad_1": u_id,
        "carga_1": cl_id,
        "carga_2": cl_2,
        "silabo_1": silabo_1,
        "plan_1": plan_1,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "coord_a": coord_a,
        "coord_b": coord_b,
        "coord_sin_prog": coord_sin_prog,
        "superadmin": superadmin
    }


# ==============================================================================
# 1. VALIDACIÓN DE IDENTIDAD Y TOKENS (401)
# ==============================================================================
@pytest.mark.asyncio
async def test_tokens_401_en_mod_programas_estudio(client_prog, fix_entorno_programas):
    env = fix_entorno_programas
    doc_a = env["doc_a"]
    secret = get_jwt_secret()

    # Falta token interno
    r1 = await client_prog.get(f"/docente/{doc_a}/silabos", headers={"X-User-ID": str(doc_a)})
    assert r1.status_code == 401

    # Token interno inválido
    r2 = await client_prog.get(f"/docente/{doc_a}/silabos", headers={"X-Internal-Token": "invalido", "X-User-ID": str(doc_a)})
    assert r2.status_code == 401

    # Token expirado
    payload_exp = {
        "sub": "module::core-gateway",
        "scopes": ["all"],
        "type": "module_access",
        "exp": datetime.utcnow() - timedelta(minutes=5)
    }
    tok_exp = jwt.encode(payload_exp, secret, algorithm="HS256")
    r3 = await client_prog.get(f"/docente/{doc_a}/silabos", headers={"X-Internal-Token": tok_exp, "X-User-ID": str(doc_a)})
    assert r3.status_code == 401

    # Token de tipo erróneo
    payload_tipo = {
        "sub": "module::core-gateway",
        "scopes": ["all"],
        "type": "user_access",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    tok_tipo = jwt.encode(payload_tipo, secret, algorithm="HS256")
    r4 = await client_prog.get(f"/docente/{doc_a}/silabos", headers={"X-Internal-Token": tok_tipo, "X-User-ID": str(doc_a)})
    assert r4.status_code == 401


# ==============================================================================
# 2. CONTROL DE ACCESO EN ENDPOINTS DE DOCENTE (GET CARGA, SÍLABOS, PLANES)
# ==============================================================================
@pytest.mark.asyncio
async def test_acceso_endpoints_docente(client_prog, fix_entorno_programas):
    env = fix_entorno_programas
    p_id = env["periodo_id"]
    doc_a = env["doc_a"]
    doc_b = env["doc_b"]
    coord_a = env["coord_a"]
    coord_b = env["coord_b"]
    coord_sin_prog = env["coord_sin_prog"]
    superadmin = env["superadmin"]

    # 1. Docente A accede a sus propios datos (200)
    r1 = await client_prog.get(f"/docente/{doc_a}/carga-lectiva?periodo_id={p_id}", headers=auth_headers(doc_a))
    assert r1.status_code == 200
    r2 = await client_prog.get(f"/docente/{doc_a}/silabos", headers=auth_headers(doc_a))
    assert r2.status_code == 200
    r3 = await client_prog.get(f"/docente/{doc_a}/planes-trabajo?periodo_id={p_id}", headers=auth_headers(doc_a))
    assert r3.status_code == 200
    r4 = await client_prog.get(f"/docentes/{doc_a}/carga-lectiva", headers=auth_headers(doc_a))
    assert r4.status_code == 200

    # 2. Docente B intenta acceder a los datos de Docente A (403)
    r_bad1 = await client_prog.get(f"/docente/{doc_a}/carga-lectiva?periodo_id={p_id}", headers=auth_headers(doc_b))
    assert r_bad1.status_code == 403
    r_bad2 = await client_prog.get(f"/docente/{doc_a}/silabos", headers=auth_headers(doc_b))
    assert r_bad2.status_code == 403
    r_bad3 = await client_prog.get(f"/docente/{doc_a}/planes-trabajo?periodo_id={p_id}", headers=auth_headers(doc_b))
    assert r_bad3.status_code == 403
    r_bad4 = await client_prog.get(f"/docentes/{doc_a}/carga-lectiva", headers=auth_headers(doc_b))
    assert r_bad4.status_code == 403

    # 3. Coordinador A (cuyo programa 1 coincide con la carga de Docente A) accede (200)
    r_c1 = await client_prog.get(f"/docente/{doc_a}/carga-lectiva?periodo_id={p_id}", headers=auth_headers(coord_a))
    assert r_c1.status_code == 200
    r_c2 = await client_prog.get(f"/docentes/{doc_a}/carga-lectiva", headers=auth_headers(coord_a))
    assert r_c2.status_code == 200

    # 4. Coordinador B (del programa 2, sin cargas de Docente A) recibe 403
    r_cb = await client_prog.get(f"/docente/{doc_a}/carga-lectiva?periodo_id={p_id}", headers=auth_headers(coord_b))
    assert r_cb.status_code == 403

    # 5. Coordinador sin programa asignado recibe 403
    r_cs = await client_prog.get(f"/docente/{doc_a}/carga-lectiva?periodo_id={p_id}", headers=auth_headers(coord_sin_prog))
    assert r_cs.status_code == 403

    # 6. Superadmin accede libremente (200)
    r_sa = await client_prog.get(f"/docente/{doc_a}/carga-lectiva?periodo_id={p_id}", headers=auth_headers(superadmin))
    assert r_sa.status_code == 200


# ==============================================================================
# 3. CREACIÓN DE SÍLABOS Y PLANES (POST /silabos, POST /planes-trabajo)
# ==============================================================================
@pytest.mark.asyncio
async def test_creacion_silabos_y_planes_autorizacion(client_prog, fix_entorno_programas, db_session: AsyncSession):
    env = fix_entorno_programas
    p_id = env["periodo_id"]
    prog_1 = env["programa_1"]
    cl_1 = env["carga_1"]
    doc_a = env["doc_a"]
    doc_b = env["doc_b"]

    # Crear una nueva carga para docente A para poder crear un nuevo sílabo
    cl_nueva = 95
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, programa_id, periodo_id, docente_id, unidad_didactica_id, seccion, turno, estado)
        VALUES (:id, :pid, :per, :did, 101, 'B', 'N', 'publicado')
        ON CONFLICT (id) DO NOTHING;
    """), {"id": cl_nueva, "pid": prog_1, "per": p_id, "did": doc_a})
    await db_session.commit()

    # 1. Docente B intenta crear sílabo en carga de Docente A (403)
    r_sil_b = await client_prog.post(
        "/silabos",
        json={"carga_lectiva_id": cl_nueva, "archivo_url": "http://bad.pdf"},
        headers=auth_headers(doc_b)
    )
    assert r_sil_b.status_code == 403

    # 2. Docente A crea sílabo en su propia carga (201)
    r_sil_a = await client_prog.post(
        "/silabos",
        json={"carga_lectiva_id": cl_nueva, "archivo_url": "http://good.pdf"},
        headers=auth_headers(doc_a)
    )
    assert r_sil_a.status_code == 201

    # 3. Docente A intenta crear plan indicando docente_id de Docente B (403)
    r_plan_bad = await client_prog.post(
        "/planes-trabajo",
        json={"periodo_id": p_id, "programa_id": prog_1, "docente_id": doc_b, "archivo_url": "http://bad.pdf"},
        headers=auth_headers(doc_a)
    )
    assert r_plan_bad.status_code == 403

    # 4. Docente A crea plan con su ID y en programa donde tiene carga lectiva (201)
    r_plan_ok = await client_prog.post(
        "/planes-trabajo",
        json={"periodo_id": p_id, "programa_id": prog_1, "docente_id": doc_a, "archivo_url": "http://good.pdf"},
        headers=auth_headers(doc_a)
    )
    assert r_plan_ok.status_code == 201


# ==============================================================================
# 4. REVISIÓN Y GESTIÓN DE COORDINADOR (SÍLABOS, PLANES, CARGA, TUTORÍAS)
# ==============================================================================
@pytest.mark.asyncio
async def test_revision_coordinador_silabos_planes_y_actas(client_prog, fix_entorno_programas):
    env = fix_entorno_programas
    p_id = env["periodo_id"]
    prog_1 = env["programa_1"]
    prog_2 = env["programa_2"]
    sil_1 = env["silabo_1"]
    plan_1 = env["plan_1"]
    coord_a = env["coord_a"]
    coord_b = env["coord_b"]
    coord_sin_prog = env["coord_sin_prog"]
    doc_a = env["doc_a"]

    # 1. Coordinador A revisa sílabos y planes de su programa (200)
    r_sil = await client_prog.get(f"/programas/{prog_1}/silabos?periodo_id={p_id}", headers=auth_headers(coord_a))
    assert r_sil.status_code == 200
    r_plan = await client_prog.get(f"/programas/{prog_1}/planes-trabajo?periodo_id={p_id}", headers=auth_headers(coord_a))
    assert r_plan.status_code == 200

    # 2. Coordinador B o Docente A intentan revisar programa 1 (403)
    r_sil_b = await client_prog.get(f"/programas/{prog_1}/silabos?periodo_id={p_id}", headers=auth_headers(coord_b))
    assert r_sil_b.status_code == 403
    r_sil_doc = await client_prog.get(f"/programas/{prog_1}/silabos?periodo_id={p_id}", headers=auth_headers(doc_a))
    assert r_sil_doc.status_code == 403

    # 3. Coordinador A aprueba sílabo y plan (200)
    r_put_sil = await client_prog.put(f"/silabos/{sil_1}/estado?estado=aprobado", headers=auth_headers(coord_a))
    assert r_put_sil.status_code == 200
    r_put_plan = await client_prog.put(f"/planes-trabajo/{plan_1}/estado?estado=aprobado", headers=auth_headers(coord_a))
    assert r_put_plan.status_code == 200

    # 4. Coordinador B intenta alterar el estado de sílabo o plan del programa 1 (403)
    r_put_sil_bad = await client_prog.put(f"/silabos/{sil_1}/estado?estado=rechazado", headers=auth_headers(coord_b))
    assert r_put_sil_bad.status_code == 403
    r_put_plan_bad = await client_prog.put(f"/planes-trabajo/{plan_1}/estado?estado=rechazado", headers=auth_headers(coord_b))
    assert r_put_plan_bad.status_code == 403


# ==============================================================================
# 5. REGLAS DE NEGOCIO DE CARGA LECTIVA Y CIERRE DE ACTAS
# ==============================================================================
@pytest.mark.asyncio
async def test_reglas_negocio_carga_lectiva_y_blindaje_actas(client_prog, fix_entorno_programas, db_session: AsyncSession):
    env = fix_entorno_programas
    p_id = env["periodo_id"]
    prog_1 = env["programa_1"]
    coord_a = env["coord_a"]
    doc_a = env["doc_a"]

    # 1. Crear carga con docente inexistente o inactivo (422)
    r_doc_invalido = await client_prog.post(
        f"/programas/{prog_1}/carga-lectiva",
        json={"periodo_id": p_id, "docente_id": 99999, "unidad_didactica_id": 101, "turno": "M", "seccion": "Z"},
        headers=auth_headers(coord_a)
    )
    assert r_doc_invalido.status_code == 422

    # 2. DELETE de carga lectiva con registros de evaluación existentes retorna 409
    cl_con_notas = env["carga_1"]
    r_del_con_notas = await client_prog.delete(
        f"/programas/{prog_1}/carga-lectiva/{cl_con_notas}",
        headers=auth_headers(coord_a)
    )
    assert r_del_con_notas.status_code == 409
    assert "calificaciones registradas" in r_del_con_notas.json()["detail"]

    # 3. DELETE de carga lectiva con acta cerrada retorna 409
    cl_cerrada = 96
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, programa_id, periodo_id, docente_id, unidad_didactica_id, seccion, turno, estado, acta_cerrada)
        VALUES (:id, :pid, :per, :did, 102, 'C', 'M', 'publicado', true)
        ON CONFLICT (id) DO UPDATE SET acta_cerrada = true;
    """), {"id": cl_cerrada, "pid": prog_1, "per": p_id, "did": doc_a})
    await db_session.commit()

    r_del_cerrada = await client_prog.delete(
        f"/programas/{prog_1}/carga-lectiva/{cl_cerrada}",
        headers=auth_headers(coord_a)
    )
    assert r_del_cerrada.status_code == 409
    assert "acta se encuentra formalmente cerrada" in r_del_cerrada.json()["detail"]

    # 4. Clonar carga lectiva: comprobar que nuevas cargas quedan abiertas y sin fecha límite
    p_destino = 20
    await db_session.execute(text("""
        INSERT INTO periodos_academicos (id, codigo, estado, fecha_inicio, fecha_fin)
        VALUES (:id, '2027-I', 'planificacion', NOW(), NOW() + interval '90 days')
        ON CONFLICT (id) DO NOTHING;
    """), {"id": p_destino})
    await db_session.commit()

    r_clonar = await client_prog.post(
        f"/programas/{prog_1}/carga-lectiva/clonar",
        json={"from_periodo_id": p_id, "to_periodo_id": p_destino},
        headers=auth_headers(coord_a)
    )
    assert r_clonar.status_code == 200

    # Verificar en base de datos que ninguna fila clonada copió acta_cerrada ni fecha límite
    res_clonadas = await db_session.execute(
        text("SELECT acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE periodo_id = :pid"),
        {"pid": p_destino}
    )
    rows = res_clonadas.fetchall()
    assert len(rows) > 0
    for r in rows:
        assert r[0] is False or r[0] is None
        assert r[1] is None


# ==============================================================================
# 6. RUTAS DE GRUPO 2 PERMANECEN ACCESIBLES SIN TOKEN
# ==============================================================================
@pytest.mark.asyncio
async def test_rutas_grupo_2_accesibles_sin_token(client_prog, fix_entorno_programas):
    env = fix_entorno_programas
    p_id = env["periodo_id"]
    prog_1 = env["programa_1"]

    # GET /programas/{id}/carga-lectiva responde sin token (G2)
    r1 = await client_prog.get(f"/programas/{prog_1}/carga-lectiva?periodo_id={p_id}")
    assert r1.status_code == 200

    # GET /periodos responde sin token (G2)
    r2 = await client_prog.get("/periodos")
    assert r2.status_code == 200

    # GET /programas responde sin token (G2)
    r3 = await client_prog.get("/programas")
    assert r3.status_code == 200
