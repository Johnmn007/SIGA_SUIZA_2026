import httpx
import json
import asyncio
from fastapi import Request, HTTPException
from fastapi.responses import Response
from typing import Dict, Optional, Any
import logging
from urllib.parse import urljoin

from ..registry.runtime import module_runtime
from ..identity.tokens import token_service
from ..config import settings

# Importar componentes de resiliencia
try:
    from ..resilience.health_monitor import health_monitor, HealthStatus
    from ..resilience.fallback_manager import fallback_manager
    RESILIENCE_AVAILABLE = True
except ImportError as e:
    logging.warning(f"⚠️  Resiliencia no disponible: {e}")
    RESILIENCE_AVAILABLE = False
    health_monitor = None
    fallback_manager = None

logger = logging.getLogger(__name__)

class HTTPGateway:
    """Gateway HTTP inteligente con resiliencia integrada"""
    
    def __init__(self):
        self.timeout = settings.http_proxy_timeout
        self._client: Optional[httpx.AsyncClient] = None
        self.resilience_enabled = getattr(settings, 'fallback_enabled', True) and RESILIENCE_AVAILABLE
    
    async def get_client(self) -> httpx.AsyncClient:
        """Obtiene cliente HTTP reutilizable"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    async def proxy_to_module(self, request: Request, module_name: str, path: str, user: Dict[str, Any] = None) -> Response:
        """Proxy inteligente que redirige a módulos externos con resiliencia"""
        
        # 1. Verificar si el módulo existe
        module = module_runtime.get_module(module_name)
        if not module:
            raise HTTPException(404, detail=f"Módulo '{module_name}' no encontrado")
        
        # 2. VERIFICACIÓN DE RESILIENCIA (si está habilitada)
        if self.resilience_enabled:
            resilience_result = await self._check_resilience_fallback(module_name, path, request, user)
            if resilience_result:
                return resilience_result
        
        # 3. Módulo saludable - proceder normalmente
        target_url = self._build_target_url(module, path)
        headers = self._prepare_forward_headers(request, module_name, user)
        
        try:
            client = await self.get_client()
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=await request.body(),
                follow_redirects=False
            )
            
            # 4. CACHEAR RESPUESTAS EXITOSAS PARA FALLBACK FUTURO
            if self.resilience_enabled and response.status_code == 200 and request.method == "GET":
                await self._cache_successful_response(module_name, path, response)
            
            # 5. Retornar respuesta al cliente (frontend)
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
            
        except httpx.TimeoutException:
            logger.error(f"⏰ Timeout comunicando con {module_name}")
            
            # Aplicar fallback en caso de timeout
            if self.resilience_enabled:
                fallback_result = await self._execute_fallback(module_name, path, request, "timeout")
                if fallback_result:
                    return fallback_result
            
            raise HTTPException(504, detail=f"Timeout del módulo {module_name}")
            
        except httpx.ConnectError:
            logger.error(f"🔌 Error de conexión con {module_name}")
            
            # Aplicar fallback en caso de error de conexión
            if self.resilience_enabled:
                fallback_result = await self._execute_fallback(module_name, path, request, "connection_error")
                if fallback_result:
                    return fallback_result
            
            raise HTTPException(502, detail=f"Módulo {module_name} no responde")
            
        except Exception as e:
            logger.error(f"❌ Error comunicando con {module_name}: {e}")
            
            # Aplicar fallback en caso de error genérico
            if self.resilience_enabled:
                fallback_result = await self._execute_fallback(module_name, path, request, "internal_error")
                if fallback_result:
                    return fallback_result
            
            raise HTTPException(500, detail=f"Error interno del gateway")
    
    async def _check_resilience_fallback(self, module_name: str, path: str, request: Request, user: Dict[str, Any] = None) -> Optional[Response]:
        """Verifica y aplica fallback de resiliencia si es necesario"""
        if not self.resilience_enabled or not health_monitor:
            return None
        
        # Verificar salud del módulo
        health = health_monitor.get_module_health(module_name)
        
        if health and health.status in [HealthStatus.UNHEALTHY, HealthStatus.OFFLINE]:
            logger.warning(f"🔄 Módulo {module_name} no saludable ({health.status}) - Aplicando fallback")
            
            # Preparar datos de request para fallback
            request_data = None
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    request_data = await request.json()
                except:
                    request_data = {}
            
            # Ejecutar estrategia de fallback
            fallback_result = await fallback_manager.handle_module_request(
                module_name, 
                path, 
                request_data
            )
            
            return self._create_fallback_response(fallback_result)
        
        return None
    
    async def _execute_fallback(self, module_name: str, path: str, request: Request, error_type: str) -> Optional[Response]:
        """Ejecuta fallback después de un error en tiempo real"""
        if not self.resilience_enabled or not fallback_manager:
            return None
            
        logger.info(f"🔄 Ejecutando fallback para {module_name} después de {error_type}")
        
        # Preparar datos de request para fallback
        request_data = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                request_data = await request.json()
            except:
                request_data = {}
        
        # Ejecutar estrategia de fallback
        fallback_result = await fallback_manager.handle_module_request(
            module_name, 
            path, 
            request_data
        )
        
        return self._create_fallback_response(fallback_result)
    
    def _create_fallback_response(self, fallback_result: Dict[str, Any]) -> Response:
        """Crea respuesta HTTP a partir del resultado de fallback"""
        
        status_mapping = {
            "cached": 200,
            "fallback": 206,  # Partial Content
            "unavailable": 503
        }
        
        status_code = status_mapping.get(fallback_result["status"], 503)
        
        # Preparar headers
        headers = {
            "Content-Type": "application/json",
            "X-Fallback": "true",
            "X-Fallback-Type": fallback_result["status"]
        }
        
        if "message" in fallback_result:
            headers["X-Fallback-Message"] = fallback_result["message"]
        
        # Crear respuesta
        response_data = {
            "status": fallback_result["status"],
            "data": fallback_result.get("data"),
            "message": fallback_result.get("message", ""),
            "timestamp": asyncio.get_event_loop().time()
        }
        
        return Response(
            content=json.dumps(response_data, default=str).encode(),
            status_code=status_code,
            headers=headers
        )
    
    async def _cache_successful_response(self, module_name: str, path: str, response: httpx.Response):
        """Cachea respuestas exitosas para usar como fallback futuro"""
        if not self.resilience_enabled or not fallback_manager:
            return
            
        try:
            if response.headers.get("content-type", "").startswith("application/json"):
                response_data = response.json()
                await fallback_manager.cache_successful_response(module_name, path, response_data)
                logger.debug(f"📦 Respuesta cacheada para {module_name}{path}")
        except Exception as e:
            logger.debug(f"⚠️  No se pudo cachear respuesta: {e}")
    
    def _build_target_url(self, module, path: str) -> str:
        """Construye URL destino basado en endpoints del módulo"""
        base_url = module.endpoints.get("http", f"http://{module.name}:8000")
        
        # Asegurar que el path comience con /
        clean_path = f"/{path.lstrip('/')}" if path else "/"
        
        return urljoin(base_url, clean_path)
    
    def _prepare_forward_headers(self, request: Request, module_name: str, user: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Prepara headers para forward con seguridad, tracing y contexto de usuario"""
        headers = {}
        
        # Headers útiles para forward (white list)
        useful_headers = [
            "content-type", "accept", "accept-encoding", 
            "user-agent", "authorization", "content-length"
        ]
        
        for header in useful_headers:
            if header in request.headers:
                headers[header] = request.headers[header]
        
        # Headers de seguridad, tracing y auditoría
        if request.client and request.client.host:
            headers["X-Forwarded-For"] = request.client.host
            headers["X-Real-IP"] = request.client.host
        
        headers["X-Module-Target"] = module_name
        headers["X-Request-ID"] = request.headers.get("X-Request-ID", "")
        headers["X-Gateway-Version"] = "2.0.0"  # Versión con resiliencia
        
        # Agregar contexto de usuario para módulos (si está autenticado)
        if user:
            headers["X-User-ID"] = str(user["id"])
            headers["X-User-Email"] = user["email"]
            headers["X-User-Permissions"] = ",".join(user["permissions"])
            logger.debug(f"👤 Contexto de usuario enviado a {module_name}: {user['email']}")
        
        # Token interno para comunicación entre servicios
        module_token = token_service.create_module_token(
            "core-gateway", 
            ["gateway:forward", f"{module_name}:proxy"]
        )
        headers["X-Internal-Token"] = module_token
        
        # Limpiar headers sensibles que no deben propagarse
        sensitive_headers = ["cookie", "host"]
        for header in sensitive_headers:
            headers.pop(header, None)
        
        return headers
    
    async def close(self):
        """Cierra el cliente HTTP"""
        if self._client:
            await self._client.aclose()
            self._client = None

# Instancia global del gateway
http_gateway = HTTPGateway()