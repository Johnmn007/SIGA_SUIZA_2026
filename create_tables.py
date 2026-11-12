import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port='5432',
    user='postgres',
    password='admin123',
    database='siga_local'
)
cur = conn.cursor()

# Crear core_role_permissions
print('Creando tabla core_role_permissions...')
try:
    cur.execute('''
    CREATE TABLE IF NOT EXISTS core_role_permissions (
        role_id INTEGER REFERENCES core_roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES core_permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (role_id, permission_id)
    );
    ''')
    conn.commit()
    print('[OK] Tabla core_role_permissions creada')
except Exception as e:
    print(f'Error creando tabla: {e}')
    conn.rollback()

# Insertar permisos faltantes
print('Creando permisos faltantes...')
try:
    cur.execute('''INSERT INTO core_permissions (id, name, description) VALUES
    (10, 'mod-usuarios:write', 'Escritura de Usuarios'),
    (11, 'mod-usuarios:admin', 'Admin de Usuarios'),
    (12, 'core:user:manage', 'Gestionar usuarios'),
    (13, 'core:module:manage', 'Gestionar modulos'),
    (14, 'core:access', 'Acceder al sistema'),
    (15, 'core:config:manage', 'Gestionar configuracion')
    ON CONFLICT (id) DO NOTHING;''')
    conn.commit()
    print('[OK] Permisos faltantes creados')
except Exception as e:
    print(f'Error creando permisos: {e}')
    conn.rollback()

cur.close()
conn.close()