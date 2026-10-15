import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os, sys

def setup_local_postgres():
    user = "postgres"
    password = "admin123"
    host = "localhost"
    port = 5432
    dbname = "siga_core"
    
    print(f"1. Conectando a PostgreSQL en {host}:{port} como '{user}'...")
    try:
        conn = psycopg2.connect(user=user, password=password, host=host, port=port, dbname="postgres")
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print("   [OK] Conexión establecida con éxito.")
    except Exception as e:
        print(f"   [ERROR] No se pudo conectar a PostgreSQL: {e}")
        return False
        
    # Verificar si siga_core existe
    print("2. Verificando base de datos 'siga_core'...")
    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (dbname,))
    exists = cursor.fetchone()
    if not exists:
        print("   Base de datos 'siga_core' no existe. Creándola...")
        cursor.execute(f"CREATE DATABASE {dbname};")
        print("   [OK] Base de datos 'siga_core' creada.")
    else:
        print("   [OK] Base de datos 'siga_core' ya existe.")
    
    cursor.close()
    conn.close()
    return True

if __name__ == "__main__":
    setup_local_postgres()
