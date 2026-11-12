import psycopg2
from psycopg2 import sql
import os

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'admin123')
DB_NAME = os.getenv('DB_NAME', 'siga_local')

print("=== SIGA: Reset y Siembra de Base de Datos ===")
print(f"Conectando a {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}...")

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("[OK] Conexion exitosa")
    
    # Habilitar extension pgcrypto
    print("\n1. Habilitando extension pgcrypto...")
    cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    
    # Limpiar tablas
    print("2. Limpiando tablas existentes...")
    tables_to_truncate = [
        'core_audit_logs', 'core_user_roles', 'core_users',
        'periodos_academicos', 'planes_estudio', 'programas_estudio', 
        'estudiantes', 'matriculas', 'historial_academico', 
        'evaluacion_registros', 'registros_practicas', 
        'resoluciones_convalidacion', 'solicitudes_tramites', 
        'beneficios_estudiante', 'outbox_events', 'perfiles_personal',
        'planes_trabajo_docente', 'silabos', 'tutorias', 'carga_lectiva',
        'horarios_periodo', 'convalidaciones_detalle', 'matricula_detalles',
        'modulos_plan', 'unidades_plan', 'programa_modulos', 'programa_unidades',
        'programa_requisitos', 'programa_configuraciones'
    ]
    
    for table in tables_to_truncate:
        try:
            cur.execute(f"TRUNCATE TABLE IF EXISTS {table} CASCADE;")
        except Exception as e:
            print(f"  - {table}: {e}")
    
    print("[OK] Tablas limpiadas")
    
    # Reiniciar secuencias
    print("3. Reiniciando secuencias...")
    cur.execute("ALTER SEQUENCE IF EXISTS core_users_id_seq RESTART WITH 1;")
    
    # Crear roles
    print("4. Creando roles del sistema...")
    roles_sql = """
    INSERT INTO core_roles (id, name, description) VALUES
    (1, 'superadmin', 'Super Administrador del Sistema'),
    (2, 'caja_tesoreria', 'Caja y Tesorería'),
    (3, 'secretaria_academica', 'Secretaría Académica'),
    (4, 'coordinador_programa', 'Coordinador Programa'),
    (5, 'oficina_admision', 'Oficina Admisión'),
    (6, 'docente', 'Docente'),
    (7, 'estudiante', 'Estudiante'),
    (8, 'secretaria_programa', 'Secretaría de Programa')
    ON CONFLICT (id) DO NOTHING;
    """
    cur.execute(roles_sql)
    
    # Crear usuarios
    print("5. Creando usuarios del sistema...")
    users_sql = """
    INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser) VALUES
    (1, 'admin@siga.edu', 'Super Admin', crypt('admin123', gen_salt('bf')), true, true),
    (2, 'tesoreria@siga.edu', 'Caja y Tesorería', crypt('tesoreria123', gen_salt('bf')), true, false),
    (3, 'secretaria@siga.edu', 'Secretaría Académica', crypt('secretaria123', gen_salt('bf')), true, false),
    (4, 'coordinador@siga.edu', 'Coordinador Programa', crypt('coordinador123', gen_salt('bf')), true, false),
    (5, 'admision@siga.edu', 'Oficina Admisión', crypt('admision123', gen_salt('bf')), true, false),
    (6, 'docente@siga.edu', 'Docente', crypt('docente123', gen_salt('bf')), true, false),
    (7, 'estudiante@siga.edu', 'Estudiante', crypt('estudiante123', gen_salt('bf')), true, false),
    (8, 'secretaria_prog@siga.edu', 'Secretaría de Programa', crypt('secretariaprog123', gen_salt('bf')), true, false)
    ON CONFLICT (id) DO NOTHING;
    """
    cur.execute(users_sql)
    
    # Asociar usuarios con roles
    print("6. Asociando usuarios con roles...")
    user_roles_sql = """
    INSERT INTO core_user_roles (user_id, role_id) VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7), (8, 8)
    ON CONFLICT DO NOTHING;
    """
    cur.execute(user_roles_sql)
    
    # Crear permisos
    print("7. Creando permisos base...")
    perms_sql = """
    INSERT INTO core_permissions (id, name, description) VALUES
    (1, 'mod-programas-estudio:read', 'Lectura de Programas y Periodos'),
    (2, 'mod-programas-estudio:write', 'Escritura de Programas y Periodos'),
    (3, 'mod-usuarios:read', 'Lectura de Usuarios'),
    (4, 'mod-evaluacion:read', 'Lectura Evaluaciones'),
    (5, 'mod-evaluacion:write', 'Escritura Evaluaciones'),
    (6, 'mod-gestion-academica:read', 'Lectura Gestion Academica'),
    (7, 'mod-gestion-academica:write', 'Escritura Gestion Academica'),
    (8, 'mod-planes-estudio:read', 'Lectura Planes Estudio'),
    (9, 'mod-planes-estudio:write', 'Escritura Planes Estudio')
    ON CONFLICT (id) DO NOTHING;
    """
    cur.execute(perms_sql)
    
    # Asociar permisos a roles
    print("8. Asociando permisos a roles...")
    role_perms_sql = """
    INSERT INTO core_role_permissions (role_id, permission_id) VALUES
    (2, 6), (2, 7),
    (3, 1), (3, 2), (3, 3), (3, 6), (3, 7), (3, 8), (3, 9),
    (4, 1), (4, 2), (4, 3), (4, 4), (4, 6),
    (6, 1), (6, 4), (6, 5), (6, 6),
    (7, 1), (7, 4), (7, 6),
    (5, 1), (5, 6), (5, 7),
    (8, 1), (8, 6), (8, 7)
    ON CONFLICT DO NOTHING;
    """
    cur.execute(role_perms_sql)
    
    # Crear programas de estudio
    print("9. Creando programas de estudio (11 carreras)...")
    programas_sql = """
    INSERT INTO programas_estudio (id, codigo, nombre, creditos_totales, duracion_periodos, duracion_anios, modalidad, estado) VALUES
    (1, 'ENF', 'Enfermería Técnica', 30, 6, 3, 'presencial', 'activo'),
    (2, 'CON', 'Contabilidad', 29, 6, 3, 'presencial', 'activo'),
    (3, 'MET', 'Mecatrónica Automotriz', 0, 6, 3, 'presencial', 'activo'),
    (4, 'GAS-ADM', 'Gestión Administrativa', 0, 6, 3, 'presencial', 'activo'),
    (5, 'PRO-AG', 'Producción Agropecuaria', 0, 6, 3, 'presencial', 'activo'),
    (6, 'CON-CIV', 'Construcción Civil', 0, 6, 3, 'presencial', 'activo'),
    (7, 'DSI', 'Desarrollo de Sistemas de Información', 28, 6, 3, 'presencial', 'activo'),
    (8, 'ELT', 'Electricidad Industrial', 27, 6, 3, 'presencial', 'activo'),
    (9, 'AOT', 'Administración de Operaciones Turísticas', 0, 6, 3, 'presencial', 'activo'),
    (10, 'MAN-FOR', 'Manejo Forestal', 0, 6, 3, 'presencial', 'activo'),
    (11, 'ASI-ADM', 'Asistencia Administrativa', 0, 6, 3, 'presencial', 'activo')
    ON CONFLICT (id) DO NOTHING;
    """
    cur.execute(programas_sql)
    
    # Crear periodo académico
    print("10. Creando periodo académico 2026-I...")
    periodo_sql = """
    INSERT INTO periodos_academicos (id, programa_id, nombre, codigo, ciclo_numero, fechaInicio, fechaFin, estado) VALUES
    (1, 1, '2026-I', '2026-I-ENF', 1, '2026-03-01', '2026-07-31', 'planificado')
    ON CONFLICT DO NOTHING;
    """
    try:
        cur.execute(periodo_sql)
    except Exception as e:
        print(f"  - Periodo: {e}")
    
    # Verificar resultados
    print("\n=== VERIFICACIÓN DE DATOS ===")
    cur.execute("""
        SELECT 'core_users' AS tabla, COUNT(*) AS registros FROM core_users
        UNION ALL
        SELECT 'estudiantes', COUNT(*) FROM estudiantes
        UNION ALL
        SELECT 'programas_estudio', COUNT(*) FROM programas_estudio
        UNION ALL
        SELECT 'core_roles', COUNT(*) FROM core_roles;
    """)
    
    for tabla, registros in cur.fetchall():
        print(f"  {tabla}: {registros}")
    
    print("\n[OK] Base de datos inicializada correctamente!")
    print("\nCredenciales de acceso:")
    print("  admin@siga.edu / admin123")
    print("  secretaria@siga.edu / secretaria123")
    print("  coordinador@siga.edu / coordinador123")
    print("  docente@siga.edu / docente123")
    print("  estudiante@siga.edu / estudiante123")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
