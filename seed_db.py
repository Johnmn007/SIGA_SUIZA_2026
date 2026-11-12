import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='postgres',
    password='admin123',
    database='siga_local'
)
conn.autocommit = True
cur = conn.cursor()

print('Creando roles del sistema...')
try:
    cur.execute("""INSERT INTO core_roles (id, name, description) VALUES
    (1, 'superadmin', 'Super Administrador del Sistema'),
    (2, 'caja_tesoreria', 'Caja y Tesorería'),
    (3, 'secretaria_academica', 'Secretaría Académica'),
    (4, 'coordinador_programa', 'Coordinador Programa'),
    (5, 'oficina_admision', 'Oficina Admisión'),
    (6, 'docente', 'Docente'),
    (7, 'estudiante', 'Estudiante'),
    (8, 'secretaria_programa', 'Secretaría de Programa')
    ON CONFLICT (id) DO NOTHING;""")
    print('[OK] Roles creados')
except Exception as e:
    print(f'Error: {e}')

print('Creando usuarios del sistema...')
try:
    cur.execute("""INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser) VALUES
    (1, 'admin@siga.edu', 'Super Admin', crypt('admin123', gen_salt('bf')), true, true),
    (2, 'tesoreria@siga.edu', 'Caja y Tesorería', crypt('tesoreria123', gen_salt('bf')), true, false),
    (3, 'secretaria@siga.edu', 'Secretaría Académica', crypt('secretaria123', gen_salt('bf')), true, false),
    (4, 'coordinador@siga.edu', 'Coordinador Programa', crypt('coordinador123', gen_salt('bf')), true, false),
    (5, 'admision@siga.edu', 'Oficina Admisión', crypt('admision123', gen_salt('bf')), true, false),
    (6, 'docente@siga.edu', 'Docente', crypt('docente123', gen_salt('bf')), true, false),
    (7, 'estudiante@siga.edu', 'Estudiante', crypt('estudiante123', gen_salt('bf')), true, false),
    (8, 'secretaria_prog@siga.edu', 'Secretaría de Programa', crypt('secretariaprog123', gen_salt('bf')), true, false)
    ON CONFLICT (id) DO NOTHING;""")
    print('[OK] Usuarios creados')
except Exception as e:
    print(f'Error: {e}')

print('Asociando usuarios con roles...')
try:
    cur.execute("""INSERT INTO core_user_roles (user_id, role_id) VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7), (8, 8)
    ON CONFLICT DO NOTHING;""")
    print('[OK] Roles asociados')
except Exception as e:
    print(f'Error: {e}')

print('Creando permisos base...')
try:
    cur.execute("""INSERT INTO core_permissions (id, name, description) VALUES
    (1, 'mod-programas-estudio:read', 'Lectura de Programas y Periodos'),
    (2, 'mod-programas-estudio:write', 'Escritura de Programas y Periodos'),
    (3, 'mod-usuarios:read', 'Lectura de Usuarios'),
    (4, 'mod-evaluacion:read', 'Lectura Evaluaciones'),
    (5, 'mod-evaluacion:write', 'Escritura Evaluaciones'),
    (6, 'mod-gestion-academica:read', 'Lectura Gestion Academica'),
    (7, 'mod-gestion-academica:write', 'Escritura Gestion Academica'),
    (8, 'mod-planes-estudio:read', 'Lectura Planes Estudio'),
    (9, 'mod-planes-estudio:write', 'Escritura Planes Estudio'),
    (10, 'mod-usuarios:write', 'Escritura de Usuarios'),
    (11, 'mod-usuarios:admin', 'Admin de Usuarios'),
    (12, 'core:user:manage', 'Gestionar usuarios'),
    (13, 'core:module:manage', 'Gestionar modulos'),
    (14, 'core:access', 'Acceder al sistema'),
    (15, 'core:config:manage', 'Gestionar configuracion')
    ON CONFLICT (id) DO NOTHING;""")
    print('[OK] Permisos creados')
except Exception as e:
    print(f'Error: {e}')

print('Asociando permisos a roles...')
try:
    cur.execute("""INSERT INTO core_role_permissions (role_id, permission_id) VALUES
    (2, 6), (2, 7),
    (3, 1), (3, 2), (3, 3), (3, 6), (3, 7), (3, 8), (3, 9),
    (4, 1), (4, 2), (4, 3), (4, 4), (4, 6),
    (6, 1), (6, 4), (6, 5), (6, 6),
    (7, 1), (7, 4), (7, 6),
    (5, 1), (5, 6), (5, 7),
    (8, 1), (8, 6), (8, 7),
    (1, 12), (1, 13), (1, 14), (1, 15),
    (3, 10), (3, 11),
    (2, 12), (2, 13),
    (4, 10), (4, 11), (4, 12)
    ON CONFLICT DO NOTHING;""")
    print('[OK] Permisos asociados')
except Exception as e:
    print(f'Error: {e}')

print('Creando programas de estudio (11 carreras)...')
try:
    cur.execute("""INSERT INTO programas_estudio (id, codigo, nombre, creditos_totales, duracion_periodos, modalidad, estado) VALUES
    (1, 'ENF', 'Enfermería Técnica', 30, 6, 'presencial', 'activo'),
    (2, 'CON', 'Contabilidad', 29, 6, 'presencial', 'activo'),
    (3, 'MET', 'Mecatrónica Automotriz', 0, 6, 'presencial', 'activo'),
    (4, 'GAS-ADM', 'Gestión Administrativa', 0, 6, 'presencial', 'activo'),
    (5, 'PRO-AG', 'Producción Agropecuaria', 0, 6, 'presencial', 'activo'),
    (6, 'CON-CIV', 'Construcción Civil', 0, 6, 'presencial', 'activo'),
    (7, 'DSI', 'Desarrollo de Sistemas de Información', 28, 6, 'presencial', 'activo'),
    (8, 'ELT', 'Electricidad Industrial', 27, 6, 'presencial', 'activo'),
    (9, 'AOT', 'Administración de Operaciones Turísticas', 0, 6, 'presencial', 'activo'),
    (10, 'MAN-FOR', 'Manejo Forestal', 0, 6, 'presencial', 'activo'),
    (11, 'ASI-ADM', 'Asistencia Administrativa', 0, 6, 'presencial', 'activo')
    ON CONFLICT (id) DO NOTHING;""")
    print('[OK] Programas creados')
except Exception as e:
    print(f'Error: {e}')

print('\n=== VERIFICACION ===')
try:
    cur.execute('SELECT (SELECT COUNT(*) FROM core_users) as users, (SELECT COUNT(*) FROM programas_estudio) as programas, (SELECT COUNT(*) FROM core_roles) as roles, (SELECT COUNT(*) FROM core_permissions) as permisos;')
    users, programas, roles, permisos = cur.fetchone()
    print(f'  core_users: {users}')
    print(f'  programas_estudio: {programas}')
    print(f'  core_roles: {roles}')
    print(f'  core_permissions: {permisos}')
except Exception as e:
    print(f'Error verificando: {e}')

cur.close()
conn.close()
print('\n[OK] Base de datos inicializada')