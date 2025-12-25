from typing import List, Dict, Type
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from .base_seeder import BaseSeeder
from .role_seeder import RoleSeeder
from .user_seeder import UserSeeder

logger = logging.getLogger(__name__)

class SeederRunner:
    """Ejecutor profesional de seeders con manejo de dependencias"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.seeders: Dict[str, BaseSeeder] = {}
        self.executed_seeders: List[str] = []
        self._register_seeders()
    
    def _register_seeders(self):
        """Registra todos los seeders disponibles"""
        self.seeders = {
            "RoleSeeder": RoleSeeder(self.db),
            "UserSeeder": UserSeeder(self.db)
        }
    
    async def run_all(self):
        """Ejecuta todos los seeders en orden correcto"""
        logger.info("🌱 Iniciando proceso de seeding...")
        
        max_iterations = 10
        iteration = 0
        
        while len(self.executed_seeders) < len(self.seeders) and iteration < max_iterations:
            iteration += 1
            executed_this_round = 0
            
            for seeder_name, seeder in self.seeders.items():
                if seeder_name in self.executed_seeders:
                    continue
                
                # Verificar dependencias
                dependencies_met = all(
                    dep in self.executed_seeders 
                    for dep in seeder.get_dependencies()
                )
                
                if dependencies_met:
                    logger.info(f"🚀 Ejecutando seeder: {seeder_name}")
                    try:
                        await seeder.run()
                        self.executed_seeders.append(seeder_name)
                        executed_this_round += 1
                    except Exception as e:
                        logger.error(f"❌ Error en seeder {seeder_name}: {e}")
                        # Continuar con otros seeders
                        self.executed_seeders.append(seeder_name)  # Marcar como ejecutado para evitar loops
            
            if executed_this_round == 0:
                logger.warning("⚠️  No se pudieron ejecutar más seeders - posibles dependencias circulares")
                break
        
        logger.info(f"✅ Proceso de seeding completado: {len(self.executed_seeders)}/{len(self.seeders)} seeders ejecutados")
        return self.executed_seeders
    
    async def run_specific(self, seeder_names: List[str]):
        """Ejecuta seeders específicos"""
        for seeder_name in seeder_names:
            if seeder_name in self.seeders:
                logger.info(f"🚀 Ejecutando seeder específico: {seeder_name}")
                await self.seeders[seeder_name].run()
            else:
                logger.error(f"❌ Seeder no encontrado: {seeder_name}")
    
    async def status(self):
        """Muestra estado de los seeders"""
        status_info = {}
        for seeder_name, seeder in self.seeders.items():
            status_info[seeder_name] = {
                "ejecutado": seeder_name in self.executed_seeders,
                "dependencias": seeder.get_dependencies(),
                "debe_ejecutarse": await seeder.should_run()
            }
        return status_info