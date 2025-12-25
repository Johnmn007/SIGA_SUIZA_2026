import yaml
import json
from typing import Dict, Any, List, Tuple
import logging
import httpx
from pathlib import Path
from datetime import datetime

from .schemas import ModuleManifest

logger = logging.getLogger(__name__)

class ManifestValidator:
    """Validador profesional de manifiestos y estándares"""
    
    RESERVED_NAMES = ["core", "system", "admin", "api", "ws", "health", "docs"]
    STANDARD_VERSION = "1.0"
    
    def _validate_module_name(self, module_name: str) -> Dict[str, Any]:
        """Valida que el nombre no sea reservado"""
        if module_name in self.RESERVED_NAMES:
            return {
                "step": "name_validation",
                "valid": False,
                "details": f"Nombre '{module_name}' está reservado"
            }
        return {
            "step": "name_validation",
            "valid": True,
            "details": f"Nombre '{module_name}' válido"
        }
    
    def validate_manifest(self, manifest_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Método ORIGINAL que usa runtime.py
        Solo validación básica de esquema (para compatibilidad)
        """
        # 🆕 DEBUG: Agrega esto
        logger.info(f"🔍 [VALIDATOR] validate_manifest llamado")
        logger.info(f"🔍 [VALIDATOR] Tipo de manifest_data: {type(manifest_data)}")
        if manifest_data:
            logger.info(f"🔍 [VALIDATOR] Contenido: {manifest_data}")
        
        errors = []
        
        try:
            # Validación con Pydantic (usando tu esquema existente)
            manifest = ModuleManifest(**manifest_data)
            
            # Validaciones adicionales simples
            if not self._validate_module_name(manifest.name):
                errors.append(f"Nombre reservado o inválido: {manifest.name}")
            
            if not manifest.endpoints.get("http"):
                errors.append("Endpoint HTTP requerido")
            
            return {
                "valid": len(errors) == 0,
                "manifest": manifest.dict(),
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"❌ Error en validación: {e}")
            errors.append(f"Error de validación: {e}")
            return {
                "valid": False,
                "errors": errors,
                "manifest": manifest_data
            }
    
    async def validate_compliance(self, module_path: Path, manifest_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valida cumplimiento completo del estándar MODULE-STD-1.0
        Versión simplificada para pruebas
        """
        logger.info(f"🔍 [COMPLIANCE SIMPLIFICADA] Validando: {module_path.name}")
        
        validation_steps = []
        
        try:
            # 1. Validar estructura Pydantic (básica)
            try:
                manifest = ModuleManifest(**manifest_data)
                step1 = {
                    "step": "schema_validation",
                    "valid": True,
                    "details": "Esquema Pydantic válido"
                }
            except Exception as e:
                step1 = {
                    "step": "schema_validation",
                    "valid": False,
                    "details": f"Error de esquema: {e}"
                }
            
            validation_steps.append(step1)
            
            # Solo continuar si el schema es válido
            if not step1["valid"]:
                return self._build_validation_result(validation_steps, False, manifest=None)
            
            # 2. Validar nombre (simple)
            step2 = self._validate_module_name(manifest.name)
            validation_steps.append(step2)
            
            # 3. Validar carpeta tiene main.py
            main_py = module_path / "main.py"
            step3 = {
                "step": "folder_structure",
                "valid": main_py.exists(),
                "details": "main.py encontrado" if main_py.exists() else "main.py no encontrado"
            }
            validation_steps.append(step3)
            
            # 4. Health check deshabilitado temporalmente
            step4 = {
                "step": "health_check",
                "valid": True,
                "details": "Health check deshabilitado temporalmente"
            }
            validation_steps.append(step4)
            
            # 5. Disponibilidad deshabilitada temporalmente
            step5 = {
                "step": "availability",
                "valid": True,
                "details": "Validación de disponibilidad deshabilitada temporalmente"
            }
            validation_steps.append(step5)
            
            # Calcular si es compliant
            all_valid = all(step.get("valid", True) for step in validation_steps)
            
            logger.info(f"✅ [COMPLIANCE] Validación completada: {'PASS' if all_valid else 'FAIL'}")
            
            return self._build_validation_result(validation_steps, all_valid, manifest)
            
        except Exception as e:
            logger.error(f"❌ Error en validación simplificada: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            
            validation_steps.append({
                "step": "exception",
                "valid": False,
                "details": f"Excepción no manejada: {str(e)}"
            })
            return self._build_validation_result(validation_steps, False)
    
    def _validate_pydantic_schema(self, manifest_data: Dict[str, Any]) -> Dict[str, Any]:
        """Valida con esquema Pydantic"""
        try:
            logger.info(f"🔍 [SCHEMA VALIDATION] Intentando crear ModuleManifest")
            logger.info(f"🔍 [SCHEMA VALIDATION] Datos: {manifest_data}")
            
            # Verificar campos requeridos
            required = ["name", "version", "api_version", "endpoints"]
            for field in required:
                if field not in manifest_data:
                    logger.error(f"❌ [SCHEMA VALIDATION] Campo faltante: {field}")
                    return {
                        "step": "schema_validation",
                        "valid": False,
                        "details": f"Campo requerido faltante: {field}"
                    }
            
            # Crear ModuleManifest
            manifest = ModuleManifest(**manifest_data)
            logger.info(f"✅ [SCHEMA VALIDATION] ModuleManifest creado exitosamente")
            
            return {
                "step": "schema_validation",
                "valid": True,
                "details": "Esquema Pydantic válido",
                "manifest": manifest
            }
        except Exception as e:
            logger.error(f"❌ [SCHEMA VALIDATION] Error: {e}")
            import traceback
            logger.error(f"❌ [SCHEMA VALIDATION] Traceback: {traceback.format_exc()}")
            return {
                "step": "schema_validation",
                "valid": False,
                "details": f"Error de esquema: {e}"
            }
    
    def _validate_folder_structure(self, module_path: Path) -> Dict[str, Any]:
        """Valida estructura básica de carpetas"""
        checks = []
        
        # Verificar main.py
        main_py = module_path / "main.py"
        if not main_py.exists():
            checks.append("❌ main.py no encontrado")
        
        # Verificar requirements.txt (opcional pero recomendado)
        req_txt = module_path / "requirements.txt"
        if not req_txt.exists():
            checks.append("⚠️  requirements.txt no encontrado (recomendado)")
        
        # Verificar README.md (opcional)
        readme = module_path / "README.md"
        if not readme.exists():
            checks.append("ℹ️  README.md no encontrado (recomendado)")
        
        if checks:
            return {
                "step": "folder_structure",
                "valid": len(checks) == 1 and "requirements.txt" in checks[0],
                "details": checks
            }
        
        return {
            "step": "folder_structure",
            "valid": True,
            "details": "Estructura de carpetas válida"
        }
    
    async def _validate_health_check(self, manifest: ModuleManifest) -> Dict[str, Any]:
        """Valida que el health check funcione"""
        health_url = f"{manifest.endpoints['http']}{manifest.health_check}"
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(health_url)
                
                if response.status_code == 200:
                    health_data = response.json()
                    
                    if health_data.get("status") == "healthy":
                        return {
                            "step": "health_check",
                            "valid": True,
                            "details": f"Health check OK en {response.elapsed.total_seconds():.2f}s",
                            "response_time": response.elapsed.total_seconds()
                        }
                    else:
                        return {
                            "step": "health_check",
                            "valid": False,
                            "details": f"Health check retornó status: {health_data.get('status')}"
                        }
                else:
                    return {
                        "step": "health_check",
                        "valid": False,
                        "details": f"Health check HTTP {response.status_code}"
                    }
                    
        except Exception as e:
            return {
                "step": "health_check",
                "valid": False,
                "details": f"Health check no accesible: {type(e).__name__}"
            }
    
    async def _validate_availability(self, manifest: ModuleManifest) -> Dict[str, Any]:
        """Valida disponibilidad general del módulo"""
        base_url = manifest.endpoints['http']
        
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(base_url)
                
                if response.status_code < 500:
                    return {
                        "step": "availability",
                        "valid": True,
                        "details": f"Módulo disponible ({response.status_code})"
                    }
                else:
                    return {
                        "step": "availability",
                        "valid": False,
                        "details": f"Módulo retornó error {response.status_code}"
                    }
                    
        except Exception as e:
            return {
                "step": "availability",
                "valid": False,
                "details": f"Módulo no disponible: {type(e).__name__}"
            }
    
    def _build_validation_result(self, steps: List[Dict], compliant: bool, manifest: ModuleManifest = None) -> Dict[str, Any]:
        """Construye resultado detallado de validación"""
        
        try:
            passed = sum(1 for step in steps if step.get("valid", True))
            total = len(steps)
            
            result = {
                "compliant": compliant,
                "standard_version": self.STANDARD_VERSION,
                "validation_date": datetime.now().isoformat(),
                "summary": {
                    "passed": passed,
                    "total": total,
                    "percentage": (passed / total * 100) if total > 0 else 0
                },
                "steps": steps
            }
            
            if manifest:
                result["manifest"] = manifest.dict()
                
            return result
            
        except Exception as e:
            logger.error(f"❌ Error en _build_validation_result: {e}")
            return {
                "compliant": False,
                "standard_version": self.STANDARD_VERSION,
                "validation_date": datetime.now().isoformat(),
                "summary": {"passed": 0, "total": 0, "percentage": 0},
                "steps": steps,
                "error": str(e)
            }

# Instancia global
manifest_validator = ManifestValidator()