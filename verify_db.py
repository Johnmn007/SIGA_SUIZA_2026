import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='postgres',
    password='admin123',
    database='siga_local'
)
cur = conn.cursor()

print('=== VERIFICACION FINAL ===')
cur.execute("""
    SELECT 'core_users' AS tabla, COUNT(*) AS registros FROM core_users
    UNION ALL
    SELECT 'estudiantes', COUNT(*) FROM estudiantes
    UNION ALL
    SELECT 'programas_estudio', COUNT(*) FROM programas_estudio
    UNION ALL
    SELECT 'core_roles', COUNT(*) FROM core_roles
    UNION ALL
    SELECT 'core_permissions', COUNT(*) FROM core_permissions;
""")
for tabla, registros in cur.fetchall():
    print(f'  {tabla}: {registros}')

cur.close()
conn.close()