import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT u.email, pp.programa_estudio_id FROM core_users u JOIN perfiles_personal pp ON u.id = pp.user_id WHERE u.email LIKE 'secretaria.%' LIMIT 10;")
rows = cur.fetchall()
for row in rows:
    print(f'{row[0]} -> programa_id: {row[1]}')
cur.close()
conn.close()