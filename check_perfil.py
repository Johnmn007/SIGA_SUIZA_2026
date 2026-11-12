import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='perfiles_personal' ORDER BY ordinal_position;")
cols = cur.fetchall()
print('Columnas perfiles_personal:')
for c in cols:
    print(f'  - {c[0]}')
cur.close()
conn.close()