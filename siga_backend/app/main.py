from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging
import uuid

from .core.config import settings
from .core.registry.runtime import module_runtime
from .core.gateway.http_proxy import http_gateway
from .core.gateway.websocket_proxy import ws_gateway
from .core.gateway.event_bus import event_bus, EventFactory
from .core.gateway.event_schemas import EventType
from .core.gateway.security_middleware import SecurityMiddleware
from .core.identity.auth_service import AuthService
from .core.identity.database import get_identity_db

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="SIGA Core - Sistema Modular Ultraligero",
    debug=settings.debug,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:3000", "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === MIDDLEWARE PARA LOGGING Y TRACING ===
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Agrega ID de request para tracing"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    
    logger.info(f"🌐 {request.method} {request.url.path} - {response.status_code}")
    return response

# === INCLUIR COMPONENTES DEL CORE ===
app.include_router(module_runtime.get_module_router())

# === RUTAS DEL CORE ===
@app.get("/")
async def root():
    return {
        "message": "🚀 SIGA Core - Gateway Centralizado",
        "version": "1.0.0",
        "status": "active",
        "environment": settings.environment,
        "modules_registered": len(module_runtime.modules),
        "gateway": "active"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "core": "running",
        "gateway": "active",
        "environment": settings.environment
    }

@app.get("/core/status")
async def core_status():
    healthy_modules = len([m for m in module_runtime.modules.values() if m.status.value == "healthy"])
    
    return {
        "core_version": "1.0.0",
        "environment": settings.environment,
        "modules": {
            "total": len(module_runtime.modules),
            "healthy": healthy_modules,
            "unhealthy": len(module_runtime.modules) - healthy_modules
        },
        "gateway": {
            "http": "active",
            "websocket": "active"
        }
    }

# === ENDPOINTS DE AUTENTICACIÓN ===
@app.post("/auth/register")
async def register_user(email: str, password: str, full_name: str = None, 
                       db: AsyncSession = Depends(get_identity_db)):
    """Endpoint para registro de usuarios"""
    auth_service = AuthService(db)
    result = await auth_service.register_user(email, password, full_name)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"message": "Usuario registrado exitosamente", "user": result["user"]}

@app.post("/auth/login")
async def login_user(email: str, password: str, db: AsyncSession = Depends(get_identity_db)):
    """Endpoint para login de usuarios"""
    auth_service = AuthService(db)
    result = await auth_service.authenticate_user(email, password)
    
    if not result:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    return result

@app.get("/auth/me")
async def get_current_user_info(authorization: Optional[str] = Header(None),
                               db: AsyncSession = Depends(get_identity_db)):
    """Endpoint para obtener información del usuario actual"""
    auth_service = AuthService(db)
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Token requerido")
    
    # Extraer token del header "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Esquema de autenticación inválido")
    except ValueError:
        raise HTTPException(status_code=401, detail="Formato de autorización inválido")
    
    user = await auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    return user

# === GATEWAY HTTP - ROUTING DINÁMICO A MÓDULOS ===
@app.api_route("/api/{module_name}/{path:path}", 
               methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def module_proxy(request: Request, module_name: str, path: str = "", 
                      authorization: Optional[str] = Header(None)):
    """
    🔀 Proxy dinámico que redirige todas las rutas /api/{modulo}/* 
    a los módulos correspondientes con autenticación y autorización.
    
    Frontend → Core (Gateway) → Módulo Externo → Core → Frontend
    """
    # Autenticar request
    user = await security_middleware.authenticate_request(request, authorization)
    
    logger.info(f"🔀 Proxy: {request.method} /api/{module_name}/{path} - User: {user['email'] if user else 'Anonymous'}")
    return await http_gateway.proxy_to_module(request, module_name, path, user)

# === GATEWAY WEBSOCKET ===
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket para conexiones en tiempo real"""
    client_id = f"client_{uuid.uuid4().hex[:8]}"
    
    await ws_gateway.connect(websocket, client_id)
    
    try:
        while True:
            # Escuchar mensajes del cliente
            data = await websocket.receive_text()
            logger.info(f"📨 WS [{client_id}]: {data}")
            
            # Procesar mensaje (ejemplo simple)
            if data == "ping":
                await ws_gateway.send_personal_message("pong", client_id)
            else:
                # Broadcast a todos los clientes
                await ws_gateway.broadcast(f"Client {client_id}: {data}")
                
    except WebSocketDisconnect:
        ws_gateway.disconnect(client_id)
        await ws_gateway.broadcast(f"Client {client_id} disconnected")

# === MANEJO DE ERRORES GLOBAL ===
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Error no manejado en {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "request_id": getattr(request.state, 'request_id', 'unknown')
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"⚠️  HTTP Error {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "request_id": getattr(request.state, 'request_id', 'unknown')
        }
    )

# === MANEJADORES DE EVENTOS ===
async def handle_user_created(event):
    """Maneja eventos de usuario creado"""
    logger.info(f"👤 Usuario creado: {event.data}")
    # Notificar via WebSocket
    await ws_gateway.broadcast(f"Usuario creado: {event.data.get('email', 'Unknown')}")

async def handle_module_registered(event):
    """Maneja eventos de módulo registrado"""
    logger.info(f"📦 Módulo registrado: {event.data['module_name']} v{event.data['version']}")
    # Notificar via WebSocket
    await ws_gateway.broadcast(f"Módulo {event.data['module_name']} registrado")

# === INICIALIZACIÓN DEL CORE ===
async def initialize_core():
    """Inicializa el Core al arrancar"""
    logger.info(f"🚀 Iniciando {settings.app_name} en modo {settings.environment}")
    
    # 1. Inicializar servicios de Identity - CORREGIDO
    logger.info("🔐 Inicializando sistema de identidad...")
    
    # Crear una sesión manualmente, no usar el generador
    from .core.identity.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        auth_service = AuthService(db)
        global security_middleware
        security_middleware = SecurityMiddleware(auth_service)
        
        # 🆕 SISTEMA DE SEEDING PROFESIONAL
        from .core.identity.seeds.seeder_runner import SeederRunner
        seeder_runner = SeederRunner(db)
        await seeder_runner.run_all()
    
    # 2. Conectar Event Bus si está habilitado
    if settings.enable_nats:
        nats_connected = await event_bus.connect()
        if nats_connected:
            logger.info("✅ NATS Event Bus inicializado")
            
            # Suscribir a eventos del sistema
            await event_bus.subscribe("user.created", handle_user_created)
            await event_bus.subscribe("module.registered", handle_module_registered)
        else:
            logger.warning("⚠️  NATS no disponible - Continuando sin Event Bus")
    
    # 3. Descubrir módulos si está habilitado
    if settings.modules_auto_discover:
        discovered = await module_runtime.discover_modules()
        logger.info(f"📦 Módulos descubiertos: {len(discovered)}")
    
   
    
    # 5. Publicar evento de core iniciado
    if settings.enable_nats and event_bus.connected:
        core_event = EventFactory.create_event(
            event_type=EventType.CORE_STARTED,
            source="core-system",
            data={"version": "1.0.0", "environment": settings.environment}
        )
        await event_bus.publish(core_event)
    
    logger.info("🎯 Core inicializado correctamente")
    logger.info(f"   • Módulos registrados: {len(module_runtime.modules)}")
    logger.info(f"   • Gateway HTTP: ACTIVO")
    logger.info(f"   • Gateway WebSocket: ACTIVO")
    logger.info(f"   • Event Bus: {'ACTIVO' if event_bus.connected else 'INACTIVO'}")
    logger.info(f"   • Sistema de Identidad: ACTIVO")
    logger.info(f"   • Environment: {settings.environment}")

# Eventos de startup/shutdown
@app.on_event("startup")
async def startup_event():
    await initialize_core()

@app.on_event("shutdown") 
async def shutdown_event():
    logger.info("🛑 Cerrando gateway HTTP...")
    await http_gateway.close()
    
    logger.info("🛑 Cerrando Event Bus...")
    await event_bus.close()
    
    logger.info("🛑 Core deteniéndose...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0", 
        port=8000,
        reload=settings.debug,
        log_level="info"
    )