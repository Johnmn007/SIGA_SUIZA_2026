import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
conn.autocommit = True
cur = conn.cursor()

# Columnas de core_user_roles
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='core_user_roles' ORDER BY ordinal_position;")
cols = cur.fetchall()
print('Columnas core_user_roles:', [c[0] for c in cols])

# Datos de secretario con programa
cur.execute("SELECT u.email, r.name, cr.programa_id FROM core_users u JOIN core_user_roles cr ON u.id = cr.user_id JOIN core_roles r ON cr.role_id = r.id WHERE u.email LIKE 'secretaria.%' LIMIT 5;")
rows = cur.fetchall()
print('Secretarias y sus programas:', rows)

# Perfiles
cur.execute("SELECT email, programa_estudio_id FROM perfiles_personal LIMIT 5;")
rows2 = cur.fetchall()
print('Perfiles y programa_estudio_id:', rows2)

cur.close()
conn.close()