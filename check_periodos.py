import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='periodos_academicos' ORDER BY ordinal_position;")
cols = cur.fetchall()
print('Columnas periodos_academicos:', [c[0] for c in cols])
cur.close()
conn.close()