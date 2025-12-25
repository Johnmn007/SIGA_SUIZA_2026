# app/core/resilience/health_monitor.py
import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import httpx

# Importar desde ubicaciones correctas
from ..registry.runtime import module_runtime
from ..gateway.event_bus import event_bus
from ..gateway.event_schemas import EventType, EventFactory
from .cache_manager import cache_manager

logger = logging.getLogger(__name__)

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded" 
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"

class ModuleHealth:
    """Estado de salud de un módulo"""
    
    def __init__(self, module_name: str):
        self.module_name = module_name
        self.status = HealthStatus.HEALTHY
        self.last_check = None
        self.response_time = None
        self.error_count = 0
        self.last_error = None
        self.degraded_since = None
        
    def update(self, status: HealthStatus, response_time: float = None, error: str = None):
        """Actualiza estado de salud"""
        self.status = status
        self.last_check = datetime.now()
        self.response_time = response_time
        
        if status in [HealthStatus.UNHEALTHY, HealthStatus.OFFLINE]:
            self.error_count += 1
            self.last_error = error
            if status == HealthStatus.UNHEALTHY and not self.degraded_since:
                self.degraded_since = datetime.now()
        else:
            self.error_count = 0
            self.last_error = None
            self.degraded_since = None

class HealthMonitor:
    """Monitor de salud avanzado para módulos"""
    
    def __init__(self):
        self.module_health: Dict[str, ModuleHealth] = {}
        self.monitoring_task: Optional[asyncio.Task] = None
        self.is_monitoring = False
        
    async def start_monitoring(self):
        """Inicia monitoreo continuo de salud"""
        if self.is_monitoring:
            return
            
        self.is_monitoring = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("🔍 Monitoreo de salud iniciado")
    
    async def stop_monitoring(self):
        """Detiene monitoreo"""
        self.is_monitoring = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("🔍 Monitoreo de salud detenido")
    
    async def _monitoring_loop(self):
        """Loop principal de monitoreo"""
        while self.is_monitoring:
            try:
                await self._check_all_modules()
                await asyncio.sleep(30)  # Check cada 30 segundos
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error en loop de monitoreo: {e}")
                await asyncio.sleep(60)
    
    async def _check_all_modules(self):
        """Verifica salud de todos los módulos registrados"""
        modules = module_runtime.modules
        
        for module_name, module in modules.items():
            try:
                await self._check_module_health(module_name, module)
            except Exception as e:
                logger.error(f"❌ Error verificando {module_name}: {e}")
    
    async def _check_module_health(self, module_name: str, module):
        """Verifica salud de un módulo específico"""
        if module_name not in self.module_health:
            self.module_health[module_name] = ModuleHealth(module_name)
        
        health = self.module_health[module_name]
        start_time = datetime.now()
        
        try:
            # Usar el health_check del módulo o default
            health_path = getattr(module, 'health_check', '/health')
            health_url = f"{module.endpoints['http']}{health_path}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(health_url)
                
                response_time = (datetime.now() - start_time).total_seconds()
                
                if response.status_code == 200:
                    health_data = response.json()
                    
                    if health_data.get('status') == 'healthy':
                        health.update(HealthStatus.HEALTHY, response_time)
                        logger.debug(f"✅ {module_name} saludable - {response_time:.2f}s")
                    else:
                        health.update(HealthStatus.DEGRADED, response_time, 
                                    health_data.get('message', 'Status no healthy'))
                        logger.warning(f"⚠️  {module_name} degradado")
                else:
                    health.update(HealthStatus.UNHEALTHY, response_time, 
                                f"HTTP {response.status_code}")
                    logger.warning(f"🔶 {module_name} no saludable: {response.status_code}")
        
        except httpx.TimeoutException:
            response_time = (datetime.now() - start_time).total_seconds()
            health.update(HealthStatus.UNHEALTHY, response_time, "Timeout")
            logger.warning(f"⏰ {module_name} timeout")
            
        except httpx.ConnectError:
            health.update(HealthStatus.OFFLINE, None, "Connection error")
            logger.error(f"🔌 {module_name} offline - Error de conexión")
            
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds()
            health.update(HealthStatus.UNHEALTHY, response_time, str(e))
            logger.error(f"❌ Error health check {module_name}: {e}")
        
        # Emitir evento si el estado cambió
        await self._emit_health_event(module_name, health)
        
        # Cachear datos críticos si el módulo está saludable
        if health.status == HealthStatus.HEALTHY:
            await self._cache_critical_data(module_name)
    
    async def _emit_health_event(self, module_name: str, health: ModuleHealth):
        """Emite evento cuando cambia el estado de salud"""
        try:
            event_data = {
                "module": module_name,
                "status": health.status.value,
                "response_time": health.response_time,
                "last_check": health.last_check.isoformat() if health.last_check else None,
                "error_count": health.error_count
            }
            
            # Usar EventFactory correctamente
            event = EventFactory.create_event(
                event_type=EventType.MODULE_HEALTH_CHANGED,
                source="core-health-monitor",
                data=event_data
            )
            
            await event_bus.publish(event)
            logger.debug(f"📨 Evento de salud publicado para {module_name}")
            
        except Exception as e:
            logger.debug(f"⚠️  No se pudo emitir evento de salud: {e}")
    
    async def _cache_critical_data(self, module_name: str):
        """Cachea datos críticos de módulos saludables"""
        try:
            # Para mod-planes-estudio, cachear planes vigentes
            if module_name == "mod-planes-estudio":
                async with httpx.AsyncClient(timeout=10.0) as client:
                    module = module_runtime.get_module(module_name)
                    if not module:
                        return
                        
                    url = f"{module.endpoints['http']}/api/v1/planes-estudio/estado/vigentes"
                    response = await client.get(url)
                    
                    if response.status_code == 200:
                        planes_vigentes = response.json()
                        await cache_manager.cache_module_data(
                            module_name, 
                            "planes_vigentes", 
                            planes_vigentes
                        )
                        logger.debug(f"📦 Planes vigentes cacheados para {module_name}")
        
        except Exception as e:
            logger.debug(f"⚠️  Error cacheando datos de {module_name}: {e}")
    
    def get_module_health(self, module_name: str) -> Optional[ModuleHealth]:
        """Obtiene estado de salud de un módulo"""
        return self.module_health.get(module_name)
    
    def get_system_health(self) -> Dict:
        """Obtiene estado de salud del sistema completo"""
        healthy_count = sum(1 for h in self.module_health.values() 
                          if h.status == HealthStatus.HEALTHY)
        total_count = len(self.module_health)
        
        return {
            "overall_status": "healthy" if healthy_count == total_count else "degraded",
            "healthy_modules": healthy_count,
            "total_modules": total_count,
            "modules": {
                name: {
                    "status": health.status.value,
                    "last_check": health.last_check.isoformat() if health.last_check else None,
                    "response_time": health.response_time,
                    "error_count": health.error_count
                }
                for name, health in self.module_health.items()
            }
        }

# Instancia global
health_monitor = HealthMonitor()