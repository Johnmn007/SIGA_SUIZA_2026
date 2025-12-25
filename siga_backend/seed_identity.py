#!/usr/bin/env python3
"""Script para ejecutar seeders manualmente"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(__file__))

from app.core.identity.database import get_identity_db
from app.core.identity.seeds.seeder_runner import SeederRunner

async def main():
    """Función principal"""
    print("🌱 Ejecutando seeders manualmente...")
    
    async for db in get_identity_db():
        seeder_runner = SeederRunner(db)
        
        # Mostrar estado antes
        print("\n📊 Estado inicial:")
        status = await seeder_runner.status()
        for seeder_name, info in status.items():
            print(f"  {seeder_name}: ejecutado={info['ejecutado']}, debe_ejecutarse={info['debe_ejecutarse']}")
        
        # Ejecutar seeders
        print("\n🚀 Ejecutando seeders...")
        executed = await seeder_runner.run_all()
        
        # Mostrar estado después
        print(f"\n✅ Seeders ejecutados: {len(executed)}")
        for seeder in executed:
            print(f"  ✅ {seeder}")
        
        break

if __name__ == "__main__":
    asyncio.run(main())