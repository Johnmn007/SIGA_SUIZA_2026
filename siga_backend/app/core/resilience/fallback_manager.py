import logging
import asyncio
from typing import Any, Dict, Optional, Callable, List
from enum import Enum

from .health_monitor import HealthStatus
from .cache_manager import cache_manager

logger = logging.getLogger(__name__)

class FallbackStrategy(str, Enum):
    CACHE_ONLY = "cache_only"
    STATIC_DATA = "static_data" 
    DEGRADE_FUNCTIONALITY = "degrade_functionality"
    QUEUE_AND_RETRY = "queue_and_retry"

class FallbackManager:
    """Gestor de fallback elegante para módulos offline"""
    
    def __init__(self):
        self.fallback_handlers: Dict[str, Callable] = {}
        self.static_fallbacks: Dict[str, Dict[str, Any]] = {}
        self.setup_default_fallbacks()
    
    def setup_default_fallbacks(self):
        """Configura fallbacks por defecto para módulos críticos"""
        
        # Fallback para mod-planes-estudio
        self.static_fallbacks["mod-planes-estudio"] = {
            "planes_vigentes": {
                "status": "degraded",
                "message": "Servicio temporalmente no disponible - Usando datos cacheados",
                "data": [
                    {
                        "id": 1,
                        "nombre": "Plan 2023 - Datos de respaldo",
                        "estado": "vigente",
                        "carrera": "Ingeniería de Sistemas"
                    }
                ],
                "timestamp": None
            },
            "carreras": {
                "status": "degraded", 
                "message": "Servicio temporalmente no disponible",
                "data": [
                    {
                        "id": 1,
                        "nombre": "Ingeniería de Sistemas",
                        "codigo": "IS-2023"
                    }
                ],
                "timestamp": None
            },
            "materias": {
                "status": "degraded",
                "message": "Servicio de materias no disponible",
                "data": [
                    {
                        "id": 1,
                        "nombre": "Programación I",
                        "codigo": "PROG1"
                    }
                ],
                "timestamp": None
            }
        }
        
        # Fallback para mod-usuarios
        self.static_fallbacks["mod-usuarios"] = {
            "perfiles": {
                "status": "degraded",
                "message": "Servicio de usuarios no disponible",
                "data": [
                    {
                        "id": 1,
                        "nombre": "Usuario Demo",
                        "email": "demo@siga.edu",
                        "rol": "estudiante"
                    }
                ],
                "timestamp": None
            },
            "estudiantes": {
                "status": "degraded",
                "message": "Servicio de estudiantes no disponible", 
                "data": [
                    {
                        "id": 1,
                        "nombre": "Estudiante Demo",
                        "matricula": "20230001"
                    }
                ],
                "timestamp": None
            },
            "profesores": {
                "status": "degraded",
                "message": "Servicio de profesores no disponible",
                "data": [
                    {
                        "id": 1,
                        "nombre": "Profesor Demo",
                        "especialidad": "Sistemas"
                    }
                ],
                "timestamp": None
            }
        }
        
        # Fallback para mod-academico
        self.static_fallbacks["mod-academico"] = {
            "cursos": {
                "status": "degraded",
                "message": "Servicio académico no disponible",
                "data": [
                    {
                        "id": 1,
                        "nombre": "Curso de Programación",
                        "semestre": "2024-1"
                    }
                ],
                "timestamp": None
            },
            "inscripciones": {
                "status": "degraded",
                "message": "Servicio de inscripciones no disponible",
                "data": [
                    {
                        "id": 1,
                        "estudiante_id": 1,
                        "curso_id": 1,
                        "estado": "pendiente"
                    }
                ],
                "timestamp": None
            }
        }
    
    async def handle_module_request(self, 
                                  module_name: str, 
                                  endpoint: str,
                                  request_data: Dict = None) -> Dict[str, Any]:
        """
        Maneja solicitudes a módulos con fallback automático
        """
        # 1. Verificar si hay un handler personalizado
        if module_name in self.fallback_handlers:
            try:
                result = await self.fallback_handlers[module_name](module_name, endpoint, request_data)
                if result:
                    return result
            except Exception as e:
                logger.error(f"❌ Error en handler de fallback para {module_name}: {e}")

        # 2. Intentar obtener datos del cache primero
        cache_key = self._build_cache_key(module_name, endpoint)
        cached_data = await cache_manager.get(cache_key)
        
        if cached_data is not None:
            logger.info(f"📦 Fallback exitoso: Cache para {module_name}/{endpoint}")
            return {
                "status": "cached",
                "data": cached_data,
                "message": "Datos cacheados (módulo offline)",
                "timestamp": asyncio.get_event_loop().time()
            }
        
        # 3. Usar datos estáticos como último recurso
        static_fallback = self.get_static_fallback(module_name, endpoint)
        if static_fallback:
            logger.info(f"🔄 Fallback estático para {module_name}/{endpoint}")
            # Actualizar timestamp
            static_fallback["timestamp"] = asyncio.get_event_loop().time()
            return {
                "status": "fallback",
                "data": static_fallback,
                "message": "Servicio degradado - Datos limitados disponibles",
                "timestamp": static_fallback["timestamp"]
            }
        
        # 4. No hay fallback disponible
        logger.error(f"❌ Sin fallback disponible para {module_name}/{endpoint}")
        return {
            "status": "unavailable",
            "data": None,
            "message": "Servicio no disponible y sin datos de fallback",
            "timestamp": asyncio.get_event_loop().time()
        }
    
    def _build_cache_key(self, module_name: str, endpoint: str) -> str:
        """Construye clave de cache para un endpoint específico"""
        # Normalizar endpoint (remover parámetros de query, etc.)
        clean_endpoint = endpoint.split('?')[0].replace('/', '_')
        return f"{module_name}:{clean_endpoint}"
    
    def get_static_fallback(self, module_name: str, endpoint: str) -> Optional[Dict]:
        """Obtiene fallback estático para un endpoint específico"""
        module_fallbacks = self.static_fallbacks.get(module_name, {})
        
        # Buscar coincidencia por clave en el endpoint
        endpoint_key = endpoint.strip('/').split('/')[-1] if '/' in endpoint else endpoint
        
        for key, fallback_data in module_fallbacks.items():
            if key in endpoint or endpoint.endswith(key) or endpoint_key == key:
                return fallback_data.copy()  # Retornar copia para no modificar el original
        
        # Buscar por patrones comunes
        common_patterns = {
            "planes": "planes_vigentes",
            "carrera": "carreras", 
            "materia": "materias",
            "usuario": "perfiles",
            "estudiante": "estudiantes",
            "profesor": "profesores",
            "curso": "cursos",
            "inscripcion": "inscripciones"
        }
        
        for pattern, fallback_key in common_patterns.items():
            if pattern in endpoint and fallback_key in module_fallbacks:
                return module_fallbacks[fallback_key].copy()
        
        return None
    
    def register_fallback_handler(self, module_name: str, handler: Callable):
        """Registra un manejador de fallback personalizado"""
        self.fallback_handlers[module_name] = handler
        logger.info(f"✅ Handler de fallback registrado para {module_name}")
    
    async def cache_successful_response(self, module_name: str, endpoint: str, data: Any):
        """Cachea respuestas exitosas para usar como fallback futuro"""
        cache_key = self._build_cache_key(module_name, endpoint)
        success = await cache_manager.set(cache_key, data, ttl=600)  # 10 minutos
        
        if success:
            logger.debug(f"📦 Respuesta cacheada para {module_name}{endpoint}")
        else:
            logger.debug(f"⚠️  No se pudo cachear respuesta para {module_name}{endpoint}")
    
    def add_static_fallback(self, module_name: str, endpoint_key: str, fallback_data: Dict):
        """Agrega o actualiza un fallback estático"""
        if module_name not in self.static_fallbacks:
            self.static_fallbacks[module_name] = {}
        
        self.static_fallbacks[module_name][endpoint_key] = {
            "status": "degraded",
            "message": fallback_data.get("message", "Servicio temporalmente no disponible"),
            "data": fallback_data.get("data", []),
            "timestamp": None
        }
        logger.info(f"✅ Fallback estático agregado para {module_name}/{endpoint_key}")
    
    def get_available_fallbacks(self) -> Dict[str, List[str]]:
        """Obtiene lista de fallbacks disponibles por módulo"""
        return {
            module: list(fallbacks.keys()) 
            for module, fallbacks in self.static_fallbacks.items()
        }

# Instancia global
fallback_manager = FallbackManager()