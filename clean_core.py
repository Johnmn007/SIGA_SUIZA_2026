import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='postgres',
    password='admin123',
    database='siga_local'
)
cur = conn.cursor()

tables_to_drop = [
    'core_audit_logs', 'core_user_roles', 'core_users', 'core_permissions',
    'core_roles', 'core_sessions', 'core_config', 'core_rate_limits',
    'core_modules', 'core_module_endpoints', 'core_module_events',
    'core_audit_retention', 'core_role_permissions'
]

print('Limpiando tablas del Core...')
for table in tables_to_drop:
    try:
        cur.execute(f'DROP TABLE IF EXISTS {table} CASCADE;')
        print(f'  {table}: OK')
    except Exception as e:
        print(f'  {table}: {e}')

conn.commit()
cur.close()
conn.close()
print('\n[OK] Tablas del Core limpiadas')