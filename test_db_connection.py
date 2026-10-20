import os

import psycopg2

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', '5432')),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', ''),
        dbname=os.getenv('DB_NAME', 'siga_core')
    )
    cur = conn.cursor()

    cur.execute('SELECT version()')
    print('Conexion OK:', cur.fetchone()[0])

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
    tables = [r[0] for r in cur.fetchall()]
    print(f'Tablas encontradas: {len(tables)}')
    for t in tables:
        print(f'  - {t}')

    cur.close()
    conn.close()
    print('\nConexion cerrada correctamente.')
except Exception as e:
    print(f'Error de conexion: {e}')
