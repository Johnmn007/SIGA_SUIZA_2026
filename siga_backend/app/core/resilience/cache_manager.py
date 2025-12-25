# app/core/resilience/cache_manager.py
import asyncio
import json
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timedelta

# Import condicional de Redis
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False
    logging.warning("⚠️  Redis no disponible - Cache deshabilitado")

from ..config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    """Gestor de cache distribuido para resiliencia"""
    
    def __init__(self):
        self.redis_client = None
        self.enabled = getattr(settings, 'cache_enabled', True) and REDIS_AVAILABLE
        self.default_ttl = getattr(settings, 'cache_default_ttl', 300)
        
    async def connect(self) -> bool:
        """Conecta a Redis si está habilitado"""
        if not self.enabled:
            logger.info("⚠️  Cache deshabilitado")
            return False
            
        try:
            self.redis_client = redis.Redis(
                host=getattr(settings, 'redis_host', 'localhost'),
                port=getattr(settings, 'redis_port', 6379),
                password=getattr(settings, 'redis_password', None),
                decode_responses=True,
                socket_connect_timeout=5,
                retry_on_timeout=True
            )
            await self.redis_client.ping()
            logger.info("✅ Cache distribuido conectado")
            return True
            
        except Exception as e:
            logger.warning(f"⚠️  Cache no disponible: {e}")
            self.redis_client = None
            return False
    
    async def get_with_fallback(self, 
                              module_name: str, 
                              key: str, 
                              fallback_data: Any,
                              ttl: int = None) -> Any:
        """
        Obtiene datos con fallback elegante si el módulo está offline
        """
        cache_key = f"{module_name}:{key}"
        
        # 1. Intentar obtener del cache
        cached_data = await self.get(cache_key)
        if cached_data is not None:
            logger.debug(f"📦 Datos cacheados usados para {module_name}/{key}")
            return cached_data
        
        # 2. Si no hay cache, usar fallback
        logger.info(f"🔄 Usando datos de fallback para {module_name} - Módulo offline")
        return fallback_data
    
    async def get(self, key: str) -> Any:
        """Obtiene datos del cache"""
        if not self.redis_client:
            return None
            
        try:
            data = await self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning(f"⚠️  Error leyendo cache: {e}")
            return None
    
    async def set(self, key: str, data: Any, ttl: int = None) -> bool:
        """Guarda datos en cache"""
        if not self.redis_client:
            return False
            
        try:
            ttl = ttl or self.default_ttl
            await self.redis_client.setex(
                key, 
                ttl, 
                json.dumps(data, default=str)
            )
            return True
        except Exception as e:
            logger.warning(f"⚠️  Error guardando en cache: {e}")
            return False
    
    async def cache_module_data(self, module_name: str, data_type: str, data: Any) -> bool:
        """Cachea datos críticos de módulos para resiliencia"""
        cache_key = f"module:{module_name}:{data_type}"
        return await self.set(cache_key, data, ttl=300)  # 5 minutos
    
    async def get_module_data(self, module_name: str, data_type: str) -> Any:
        """Obtiene datos cacheados de módulos"""
        cache_key = f"module:{module_name}:{data_type}"
        return await self.get(cache_key)
    
    async def invalidate_module_cache(self, module_name: str):
        """Invalida cache de un módulo específico"""
        if not self.redis_client:
            return
            
        try:
            pattern = f"module:{module_name}:*"
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
                logger.info(f"🗑️  Cache invalidado para módulo: {module_name}")
        except Exception as e:
            logger.warning(f"⚠️  Error invalidando cache: {e}")

# Instancia global
cache_manager = CacheManager()