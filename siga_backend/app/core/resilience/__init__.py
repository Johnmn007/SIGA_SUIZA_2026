# app/core/resilience/__init__.py
from .cache_manager import cache_manager
from .health_monitor import health_monitor
from .fallback_manager import fallback_manager

async def initialize_resilience():
    """Inicializa todos los componentes de resiliencia"""
    # 1. Conectar cache
    await cache_manager.connect()
    
    # 2. Iniciar monitoreo de salud
    await health_monitor.start_monitoring()
    
    print("✅ Sistema de resiliencia inicializado")

async def shutdown_resilience():
    """Apaga componentes de resiliencia"""
    await health_monitor.stop_monitoring()
    await cache_manager.close()
    print("🔌 Sistema de resiliencia apagado")