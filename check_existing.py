import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
cur = conn.cursor()
cur.execute("SELECT email FROM core_users WHERE email LIKE '%@siga.edu'")
emails = [r[0] for r in cur.fetchall()]
for e in emails:
    print(e)
cur.close()
conn.close()