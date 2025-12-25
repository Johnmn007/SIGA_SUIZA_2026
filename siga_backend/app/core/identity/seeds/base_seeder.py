from abc import ABC, abstractmethod
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class BaseSeeder(ABC):
    """Clase base abstracta para todos los seeders"""
    
    def __init__(self, db):
        self.db = db
        self.seeder_name = self.__class__.__name__
    
    @abstractmethod
    async def run(self):
        """Método principal que debe implementar cada seeder"""
        pass
    
    @abstractmethod
    def get_dependencies(self) -> List[str]:
        """Retorna los seeders de los que depende"""
        return []
    
    async def should_run(self) -> bool:
        """Determina si el seeder debe ejecutarse"""
        # Por defecto siempre se ejecuta, se puede sobreescribir
        return True
    
    def log_success(self, message: str):
        """Log de éxito estandarizado"""
        logger.info(f"✅ [{self.seeder_name}] {message}")
    
    def log_warning(self, message: str):
        """Log de advertencia estandarizado"""
        logger.warning(f"⚠️  [{self.seeder_name}] {message}")
    
    def log_error(self, message: str):
        """Log de error estandarizado"""
        logger.error(f"❌ [{self.seeder_name}] {message}")