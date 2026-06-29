# app/core/resilience/circuit_breaker.py
import time
import asyncio
import logging
from enum import Enum
from typing import Dict, Optional, Any, Callable

logger = logging.getLogger(__name__)

class CircuitBreakerState(str, Enum):
    CLOSED = "closed"       # Tráfico fluye normalmente
    OPEN = "open"           # Falla rápida, circuito bloqueado
    HALF_OPEN = "half_open" # Probando recuperación, deja pasar 1 request

class CircuitBreaker:
    """Implementación del patrón Circuit Breaker por módulo"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout_seconds: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.half_open_in_flight = False

    def is_allowed(self) -> bool:
        """Determina si se debe permitir el request"""
        if self.state == CircuitBreakerState.CLOSED:
            return True
            
        if self.state == CircuitBreakerState.OPEN:
            # Check si ya pasó el timeout para pasar a HALF_OPEN
            now = time.time()
            if now - self.last_failure_time > self.recovery_timeout_seconds:
                self.state = CircuitBreakerState.HALF_OPEN
                self.half_open_in_flight = True
                logger.warning("Circuit breaker pasando a HALF_OPEN, probando recuperación")
                return True
            return False
            
        if self.state == CircuitBreakerState.HALF_OPEN:
            # En HALF_OPEN solo permitimos un request a la vez (si half_open_in_flight es True)
            if self.half_open_in_flight:
                self.half_open_in_flight = False # Ya tomamos el request de prueba
                return True
            return False
            
        return False

    def on_success(self):
        """Llamado cuando un request tiene éxito"""
        if self.state != CircuitBreakerState.CLOSED:
            logger.info("Circuit breaker recuperado, pasando a CLOSED")
            self.state = CircuitBreakerState.CLOSED
            self.failure_count = 0

    def on_failure(self):
        """Llamado cuando un request falla (timeout, error 500, etc)"""
        self.last_failure_time = time.time()
        
        if self.state == CircuitBreakerState.HALF_OPEN:
            # Falló la prueba de recuperación, de vuelta a OPEN
            logger.error("Circuit breaker falló en HALF_OPEN, regresando a OPEN")
            self.state = CircuitBreakerState.OPEN
            return

        if self.state == CircuitBreakerState.CLOSED:
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                logger.error(f"Circuit breaker pasando a OPEN tras {self.failure_count} fallos consecutivos")
                self.state = CircuitBreakerState.OPEN

class CircuitBreakerManager:
    """Administra Circuit Breakers individuales por módulo"""
    
    def __init__(self):
        self.breakers: Dict[str, CircuitBreaker] = {}
        
    def get_breaker(self, module_name: str) -> CircuitBreaker:
        if module_name not in self.breakers:
            self.breakers[module_name] = CircuitBreaker()
        return self.breakers[module_name]
        
    async def call_with_circuit_breaker(
        self, 
        module_name: str, 
        func: Callable, 
        *args, 
        **kwargs
    ) -> Any:
        """
        Envuelve una llamada asíncrona usando Circuit Breaker.
        Lanza CircuitBreakerOpenException si está abierto.
        """
        breaker = self.get_breaker(module_name)
        
        if not breaker.is_allowed():
            raise CircuitBreakerOpenException(f"El Circuit Breaker para {module_name} está ABIERTO")
            
        try:
            result = await func(*args, **kwargs)
            breaker.on_success()
            return result
        except Exception as e:
            # Solo consideramos fallos de comunicación/servidor como errores del circuit breaker
            # (Si es httpx.TimeoutException, httpx.ConnectError, o un error 5xx, se cuenta como fallo)
            breaker.on_failure()
            raise e

class CircuitBreakerOpenException(Exception):
    """Excepción lanzada cuando el circuito está abierto (Fail-Fast)"""
    pass

# Instancia global
circuit_breaker_manager = CircuitBreakerManager()
