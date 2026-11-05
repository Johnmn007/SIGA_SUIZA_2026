import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='postgres',
    password='admin123',
    database='siga_local'
)
cur = conn.cursor()

print('=== ESTRUCTURA DE TABLAS ===')

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='programas_estudio' ORDER BY ordinal_position;")
print('programas_estudio:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='core_role_permissions' ORDER BY ordinal_position;")
print('core_role_permissions:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='core_permissions' ORDER BY ordinal_position;")
print('core_permissions:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='core_user_roles' ORDER BY ordinal_position;")
print('core_user_roles:', [r[0] for r in cur.fetchall()])

cur.close()
conn.close()