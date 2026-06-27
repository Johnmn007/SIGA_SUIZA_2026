import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
import httpx
import logging
from datetime import datetime
from pathlib import Path
import yaml

from .schemas import ModuleStatus
from .validator import manifest_validator
from ..config import settings
from ..gateway.event_bus import event_bus, EventFactory
from ..gateway.event_schemas import EventType

logger = logging.getLogger(__name__)

class ModuleInfo:
    """Información de un módulo registrado"""
    
    def __init__(self, manifest: Dict[str, Any], compliance_result: Dict[str, Any] = None):
        self.name = manifest["name"]
        self.version = manifest["version"]
        self.api_version = manifest["api_version"]
        self.description = manifest.get("description", "")
        self.endpoints = manifest["endpoints"]
        self.events = manifest.get("events", {"publishes": [], "subscribes": []})
        self.permissions = manifest.get("permissions", [])
        self.health_check = manifest.get("health_check", "/health")
        self.config = manifest.get("config", {})
        
        self.registered_at = datetime.now()
        self.status = ModuleStatus.DISCOVERED
        self.last_health_check = None
        self.compliance_result = compliance_result
        
    async def check_health(self) -> bool:
        """Realiza health check al módulo"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.endpoints['http']}{self.health_check}",
                    timeout=10.0
                )
                
                is_healthy = response.status_code == 200
                self.status = ModuleStatus.HEALTHY if is_healthy else ModuleStatus.UNHEALTHY
                self.last_health_check = datetime.now()
                
                return is_healthy
                
        except Exception as e:
            logger.warning(f"Health check failed for {self.name}: {e}")
            self.status = ModuleStatus.OFFLINE
            self.last_health_check = datetime.now()
            return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte a diccionario para API"""
        result = {
            "name": self.name,
            "version": self.version,
            "api_version": self.api_version,
            "description": self.description,
            "status": self.status.value,
            "endpoints": self.endpoints,
            "registered_at": self.registered_at.isoformat(),
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "config": self.config
        }
        
        if self.compliance_result:
            result["compliance"] = {
                "standard": self.compliance_result.get("standard_version"),
                "compliant": self.compliance_result.get("compliant"),
                "validation_date": self.compliance_result.get("validation_date")
            }
        
        return result

class ModuleRuntime:
    """Runtime principal para gestión de módulos"""
    
    def __init__(self):
        self.modules: Dict[str, ModuleInfo] = {}
        self.router = APIRouter()
        self._setup_core_routes()
    
    def _setup_core_routes(self):
        """Configura rutas del core para gestión de módulos"""
        
        @self.router.get("/core/modules")
        async def list_modules():
            return {
                "modules": [module.to_dict() for module in self.modules.values()],
                "total": len(self.modules),
                "healthy": len([m for m in self.modules.values() if m.status == ModuleStatus.HEALTHY]),
                "compliant": len([m for m in self.modules.values() if m.compliance_result and m.compliance_result.get("compliant", False)])
            }
        
        @self.router.post("/core/modules/register")
        async def register_module(manifest: Dict[str, Any]):
            """Endpoint para registrar módulos via API"""
            return await self.register_module_from_manifest(manifest)
        
        @self.router.get("/core/modules/{module_name}/health")
        async def get_module_health(module_name: str):
            """Health check de un módulo específico"""
            module = self.modules.get(module_name)
            if not module:
                raise HTTPException(404, "Módulo no encontrado")
            
            is_healthy = await module.check_health()
            return {
                "module": module_name,
                "healthy": is_healthy,
                "status": module.status.value
            }
        
        @self.router.get("/core/modules/{module_name}/compliance")
        async def get_module_compliance(module_name: str):
            """Obtiene resultado de validación de estándar"""
            module = self.modules.get(module_name)
            if not module:
                raise HTTPException(404, "Módulo no encontrado")
            
            if not module.compliance_result:
                raise HTTPException(404, "No hay datos de validación")
            
            return module.compliance_result
    
    async def discover_modules(self) -> List[str]:
        """Descubre y registra módulos automáticamente basado en estándar"""
        discovered = []
        
        logger.info("🔍 Iniciando descubrimiento automático de módulos...")
        
        # 1. Descubrimiento local en carpeta modules/
        local_modules = await self._discover_local_modules()
        discovered.extend(local_modules)
        
        logger.info(f"📦 Módulos descubiertos: {len(discovered)}")
        
        # Mostrar resumen detallado
        for module_name in discovered:
            module = self.modules.get(module_name)
            if module:
                status_icon = "✅" if module.status == ModuleStatus.HEALTHY else "⚠️"
                compliant_icon = "✓" if module.compliance_result and module.compliance_result.get("compliant") else "✗"
                logger.info(f"   {status_icon} {module_name} v{module.version} - {module.status.value} [Std: {compliant_icon}]")
        
        return discovered
    
    async def _discover_local_modules(self) -> List[str]:
        """Descubre módulos en la carpeta local modules/"""
        local_discovered = []
        modules_dir = Path("modules")
        
        if not modules_dir.exists():
            logger.warning("📁 Carpeta 'modules' no existe")
            return local_discovered
        
        logger.info(f"📁 Escaneando: {modules_dir.absolute()}")
        
        for item in modules_dir.iterdir():
            if item.is_dir() and not item.name.startswith("_"):
                try:
                    # Omitir TEMPLATE
                    if item.name == "TEMPLATE":
                        continue
                    
                    result = await self._process_module_directory(item)
                    if result["success"]:
                        local_discovered.append(item.name)
                    else:
                        logger.warning(f"📛 {item.name}: {result.get('error', 'Error desconocido')}")
                        
                except Exception as e:
                    logger.error(f"❌ Error procesando {item.name}: {e}")
        
        return local_discovered
    
    async def _process_module_directory(self, module_path: Path) -> Dict[str, Any]:
        """Procesa un directorio de módulo"""
        module_name = module_path.name
        
        # 1. Cargar manifest
        logger.info(f"🔍 [RUNTIME] Procesando módulo: {module_name}")
        manifest = await self._load_module_manifest(module_path)
        if not manifest:
            logger.error(f"❌ [RUNTIME] No se pudo cargar manifest para {module_name}")
            return {
                "success": False,
                "error": "No se encontró manifest.yaml válido"
            }
        
        logger.info(f"✅ [RUNTIME] Manifest cargado para {module_name}")
        
        # 2. Validar cumplimiento del estándar
        logger.info(f"🔍 [RUNTIME] Validando cumplimiento...")
        compliance_result = await manifest_validator.validate_compliance(module_path, manifest)
        
        # 🆕 DEBUG: Ver el resultado
        logger.info(f"🔍 [RUNTIME] Resultado de validación: {compliance_result.get('compliant')}")
        logger.info(f"🔍 [RUNTIME] Pasos validados: {len(compliance_result.get('steps', []))}")
        
        # 3. Verificar si ya está registrado
        if manifest["name"] in self.modules:
            logger.warning(f"⚠️  [RUNTIME] Módulo {manifest['name']} ya registrado")
            return {
                "success": False,
                "error": f"Módulo {manifest['name']} ya registrado"
            }
        
        logger.info(f"🔍 [RUNTIME] Intentando registrar módulo: {manifest['name']}")
        
        # 4. Registrar el módulo
        result = await self.register_module_from_manifest(manifest, compliance_result)
        
        if result["success"]:
            # Log detallado del resultado de validación
            if compliance_result.get("compliant", False):
                logger.info(f"✅ {module_name}: Cumple estándar MODULE-STD-{compliance_result.get('standard_version', '1.0')}")
            else:
                logger.warning(f"⚠️  {module_name}: Registrado pero NO cumple estándar completo")
                
                # Mostrar errores de validación
                for step in compliance_result.get("steps", []):
                    if not step.get("valid", True):
                        logger.debug(f"   • {step.get('step')}: {step.get('details')}")
        
        logger.info(f"🔍 [RUNTIME] Resultado registro: {result.get('success', False)}")
        
        return result
    
    async def _load_module_manifest(self, module_path: Path) -> Optional[Dict[str, Any]]:
        """Carga manifest.yaml de un módulo"""
        manifest_paths = [
            module_path / "manifest.yaml",
            module_path / "manifest.yml",
            module_path / "module.yaml",
            module_path / "module.yml"
        ]
        
        for manifest_path in manifest_paths:
            if manifest_path.exists():
                try:
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        manifest = yaml.safe_load(f)
                    
                    if isinstance(manifest, dict) and "name" in manifest:
                        logger.info(f"✅ [RUNTIME] Manifest encontrado: {manifest_path}")
                        return manifest
                        
                except Exception as e:
                    logger.error(f"❌ [RUNTIME] Error leyendo {manifest_path}: {e}")
        
        logger.warning(f"⚠️  [RUNTIME] No se encontró manifest en {module_path}")
        return None
    
    async def register_module_from_manifest(self, manifest_data: Dict[str, Any], compliance_result: Dict[str, Any] = None) -> Dict[str, Any]:
        """Registra un módulo usando manifiesto"""
        
        # 🆕 DEBUG
        logger.info(f"🔍 [REGISTER] Llamando register_module_from_manifest")
        logger.info(f"🔍 [REGISTER] Nombre: {manifest_data.get('name')}")
        
        # Usar el validador existente para validación básica
        validation = manifest_validator.validate_manifest(manifest_data)
        
        logger.info(f"🔍 [REGISTER] Validación básica: {validation['valid']}")
        if not validation["valid"]:
            logger.error(f"❌ [REGISTER] Módulo rechazado: {validation['errors']}")
            return {
                "success": False,
                "errors": validation["errors"],
                "compliance": compliance_result
            }
        
        manifest = validation["manifest"]
        name = manifest["name"]
        
        if name in self.modules:
            logger.warning(f"⚠️  [REGISTER] Módulo {name} ya registrado")
            return {
                "success": False,
                "error": f"Módulo {name} ya registrado",
                "compliance": compliance_result
            }
        
        # 🆕 TEMPORAL: Si el módulo no está corriendo, podemos usar una configuración especial
        # para pruebas sin health check
        logger.info(f"🔍 [REGISTER] Creando ModuleInfo para {name}")
        
        try:
            # Crear y registrar módulo con resultado de validación
            module = ModuleInfo(manifest, compliance_result)
            self.modules[name] = module
            
            logger.info(f"✅ [REGISTER] ModuleInfo creado exitosamente")
            
            # Health check inicial - SOLO si el módulo está corriendo
            # Podemos verificar primero si responde
            if settings.modules_validate_on_start:
                logger.info(f"🔍 [REGISTER] Intentando health check...")
                try:
                    async with httpx.AsyncClient(timeout=2.0) as client:
                        health_url = f"{manifest['endpoints']['http']}{manifest.get('health_check', '/health')}"
                        response = await client.get(health_url)
                        
                        if response.status_code == 200:
                            is_healthy = True
                            logger.info(f"✅ [REGISTER] Módulo {name} está corriendo")
                        else:
                            is_healthy = False
                            logger.warning(f"⚠️  [REGISTER] Módulo {name} no responde (HTTP {response.status_code})")
                except Exception as e:
                    is_healthy = False
                    logger.warning(f"⚠️  [REGISTER] Módulo {name} no está corriendo o no accesible: {type(e).__name__}")
                    logger.info(f"ℹ️  [REGISTER] Registrando módulo {name} como OFFLINE (puede iniciarse después)")
                
                if not is_healthy:
                    module.status = ModuleStatus.OFFLINE
            
            logger.info(f"✅ Módulo registrado: {name} v{manifest['version']}")
            
            # 🆕 NOTIFICAR AL EVENT BUS
            if settings.enable_nats and event_bus.connected:
                try:
                    event = EventFactory.module_registered({
                        "module_name": name,
                        "version": manifest['version'],
                        "api_version": manifest['api_version'],
                        "endpoints": manifest['endpoints'],
                        "events": manifest.get('events', {}),
                        "status": module.status.value
                    })
                    await event_bus.publish(event)
                    logger.info(f"📢 Evento module.registered publicado para {name}")
                except Exception as e:
                    logger.error(f"❌ Error publicando evento de registro para {name}: {e}")
            
            return {
                "success": True,
                "module": module.to_dict(),
                "compliance": compliance_result
            }
            
        except Exception as e:
            logger.error(f"❌ [REGISTER] Error registrando módulo {name}: {e}")
            import traceback
            logger.error(f"❌ [REGISTER] Traceback: {traceback.format_exc()}")
            
            return {
                "success": False,
                "error": f"Error interno registrando módulo: {str(e)}",
                "compliance": compliance_result
            }
    
    def get_module(self, module_name: str) -> Optional[ModuleInfo]:
        """Obtiene información de un módulo"""
        return self.modules.get(module_name)
    
    def get_module_router(self) -> APIRouter:
        """Retorna el router con rutas del core"""
        return self.router

# Instancia global
module_runtime = ModuleRuntime()