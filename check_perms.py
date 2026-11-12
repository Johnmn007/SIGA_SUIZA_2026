import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
cur = conn.cursor()
# Verificar permisos de secretaria_programa
cur.execute("SELECT permission_id FROM core_role_permissions WHERE role_id = (SELECT id FROM core_roles WHERE name = 'secretaria_programa')")
permisos = cur.fetchall()
print('Permisos de secretaria_programa:', [p[0] for p in permisos])
# Verificar todos los permisos
cur.execute('SELECT id, name FROM core_permissions ORDER BY id')
all_perm = cur.fetchall()
print('Todos los permisos:')
for p in all_perm:
    print(f'  {p[0]}: {p[1]}')
cur.close()
conn.close()