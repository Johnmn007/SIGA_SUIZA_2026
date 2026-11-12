import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
cur = conn.cursor()
cur.execute("SELECT email, full_name FROM core_users WHERE email LIKE '%@siga.edu' AND (email LIKE 'jefe.%' OR email LIKE 'secretaria.%' OR email LIKE 'docente.%') ORDER BY email;")
for email, name in cur.fetchall():
    print(f'{email} -> {name}')
cur.close()
conn.close()