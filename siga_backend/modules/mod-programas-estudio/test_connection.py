import asyncio
import asyncpg
import os

async def test_postgres_connection():
    print("🔍 Probando conexión a PostgreSQL...")
    
    try:
        # Parámetros de conexión
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_PORT = os.getenv("DB_PORT", "5432") 
        DB_USER = os.getenv("DB_USER", "postgres")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "john.007")
        DB_NAME = os.getenv("DB_NAME", "mod_programas_estudio")
        
        print(f"📊 Configuración:")
        print(f"   Host: {DB_HOST}")
        print(f"   Puerto: {DB_PORT}")
        print(f"   Usuario: {DB_USER}")
        print(f"   Base de datos: {DB_NAME}")
        
        # Intentar conectar
        print("🔄 Conectando...")
        conn = await asyncpg.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        
        print("✅ ¡CONEXIÓN EXITOSA!")
        
        # Verificar si la base de datos existe
        result = await conn.fetchval("SELECT 1")
        print(f"✅ Consulta de prueba: {result}")
        
        # Verificar tablas existentes
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        
        print(f"📋 Tablas existentes: {len(tables)}")
        for table in tables:
            print(f"   - {table['table_name']}")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ ERROR DE CONEXIÓN: {e}")
        print("\n💡 SOLUCIONES:")
        print("1. Verificar que PostgreSQL esté ejecutándose")
        print("2. Verificar usuario/contraseña")
        print("3. Verificar que la base de datos exista")
        return False

# Ejecutar prueba
if __name__ == "__main__":
    asyncio.run(test_postgres_connection())