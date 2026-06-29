import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

async def test_core():
    """Prueba mínima de inicialización del Core"""
    try:
        from app.core.identity.database import AsyncSessionLocal
        from app.core.identity.auth_service import AuthService
        from app.core.gateway.security_middleware import SecurityMiddleware
        
        print("[TEST] Probando inicializacion del Core...")
        
        async with AsyncSessionLocal() as db:
            print("[OK] Sesion de BD creada")
            
            auth_service = AuthService(db)
            print("[OK] AuthService creado")
            
            security_middleware = SecurityMiddleware(auth_service)
            print("[OK] SecurityMiddleware creado")
            
            # Probar seeders
            from app.core.identity.seeds.seeder_runner import SeederRunner
            seeder_runner = SeederRunner(db)
            
            # Solo mostrar estado, no ejecutar
            status = await seeder_runner.status()
            print(f"[OK] Seeders disponibles: {len(status)}")
            
            print("\n[OK] Todas las correcciones funcionan!")
            return True
            
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_core())
    if success:
        print("\n[OK] El Core esta listo para iniciar:")
        print("   python -m uvicorn app.main:app --reload")