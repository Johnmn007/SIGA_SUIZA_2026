# Resiliencia y Tolerancia a Fallos

| Versión | Fecha       | Autor               | Descripción                                      |
|---------|-------------|----------------------|--------------------------------------------------|
| 1.0     | 2026-06-26  | Equipo Arquitectura  | Versión inicial del sistema de resiliencia       |

---

## 1. Filosofía de Resiliencia

### 1.1 Principio Fundamental

> **"Un módulo caído no debe tumbar el sistema."**

El sistema SIGA está diseñado para tolerar fallos de módulos individuales sin afectar la disponibilidad general del sistema. La resiliencia no es un feature opcional — es un requisito arquitectónico fundamental implementado en el Core desde el día uno.

### 1.2 Compromisos de Resiliencia

| Compromiso | Descripción |
|------------|-------------|
 | **Aislamiento de Fallos** | El fallo de un módulo no afecta a otros módulos ni al Core |
| **Degradación Graceful** | Cuando un módulo falla, el sistema responde con datos cacheados o un mensaje de funcionalidad limitada |
| **Auto-recuperación** | Los módulos que se recuperan son reincorporados automáticamente sin intervención manual |
| **Sin Fallos en Cascada** | Circuit Breaker previene que un módulo lento/trabado consuma recursos y afecte a otros |
| **Consistencia Eventual** | Los datos eventualmente se sincronizan cuando los módulos se recuperan |
| **Observabilidad** | Todos los eventos de resiliencia son trazables y auditable |

### 1.3 Niveles de Degradación

| Nivel | Icono | Comportamiento | Experiencia del Usuario | Ejemplo |
|-------|-------|---------------|------------------------|---------|
| ✅ **Normal** | 🟢 | Todos los módulos HEALTHY. Cache como acelerador. | Toda la funcionalidad disponible. Tiempos de respuesta normales. | Matrícula, consulta de notas, registro de estudiantes. |
| ⚠️ **Degradado** | 🟡 | 1-2 módulos en DEGRADED o UNHEALTHY. Fallback activo. | Funcionalidad limitada. Algunas secciones muestran datos cacheados o mensajes "Servicio temporalmente no disponible". | Módulo de estudiantes caído → datos de estudiantes se muestran desde cache (pueden no estar actualizados). |
| 🔶 **Crítico** | 🟠 | Múltiples módulos UNHEALTHY o módulos críticos caídos (auth, registry). | Avisos visibles de servicio no disponible. Operaciones críticas pueden fallar. | Core auth caído → nadie puede loguearse. |
| ❌ **Caída Total** | 🔴 | Core caído o fallo catastrófico. | Página de mantenimiento. Sin acceso al sistema. | Falla de hardware, corte de energía, error de configuración crítico. |

---

## 2. Diagrama de Resiliencia

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SISTEMA DE RESILIENCIA                                  │
│                                                                             │
│  [REQUEST ENTRANTE]                                                         │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      CIRCUIT BREAKER                                    │ │
│  │                                                                         │ │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐                          │ │
│  │  │ CERRADO  │───→│ SEMI-    │───→│ ABIERTO  │                          │ │
│  │  │ (normal) │    │ ABIERTO  │    │ (falla)  │                          │ │
│  │  │          │    │ (prueba) │    │          │                          │ │
│  │  │  Pasa    │    │  Pasa 1  │    │  Bloquea │                          │ │
│  │  │  tráfico │    │  request │    │  tráfico │                          │ │
│  │  └────┬─────┘    └────┬─────┘    └────┬─────┘                          │ │
│  │       │               │               │                                  │ │
│  │       │  5 fallos     │  1 éxito      │  timeout 60s                     │ │
│  │       └───────────────┴───────────────┘                                  │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                   FALLBACK MANAGER                                      │ │
│  │                                                                         │ │
│  │  1. Intentar Cache (Redis) ──→ ¿Hit? ──→ Retornar datos cacheados      │ │
│  │         │ No                                                            │ │
│  │         ▼                                                               │ │
│  │  2. Intentar Datos Estáticos ──→ ¿Existen? ──→ Retornar datos estáticos│ │
│  │         │ No                                                            │ │
│  │         ▼                                                               │ │
│  │  3. Degradar Funcionalidad ──→ Retornar respuesta parcial               │ │
│  │         │                                                                │ │
│  │         ▼                                                               │ │
│  │  4. Encolar y Reintentar ──→ NATS Queue ──→ Procesar cuando se recupere │ │
│  │         │                                                                │ │
│  │         ▼                                                               │ │
│  │  5. Service Unavailable ──→ 503 con mensaje amigable                    │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                   CACHE MANAGER                                         │ │
│  │                                                                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │ │
│  │  │     Redis         │  │   Memoria Local   │  │  Invalidación por    │  │
│  │  │  (Producción)    │  │   (Desarrollo)    │  │  Eventos NATS        │  │
│  │  │                  │  │                   │  │                      │  │
│  │  │  TTL: 5-10 min   │  │  TTL: 5 min       │  │  module.updated →    │  │
│  │  │  Keys: módulo:ruta│  │  Keys: módulo:ruta│  │  invalidar cache     │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                   HEALTH MONITOR                                        │ │
│  │                                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Loop cada {interval} segundos                                    │   │ │
│  │  │                                                                   │   │ │
│  │  │  Por cada módulo activo:                                          │   │ │
│  │  │    ├── GET {module}/health (timeout: {timeout}s)                 │   │ │
│  │  │    ├── ¿Status 200?                                               │   │ │
│  │  │    │   ├── Sí → health_count++, fail_count=0                     │   │ │
│  │  │    │   │        └── ¿estado cambiaba? → evento module.health     │   │ │
│  │  │    │   └── No → fail_count++, health_count=0                     │   │ │
│  │  │    │            └── ¿threshold? → cambiar estado + CB            │   │ │
│  │  │    └── Actualizar ModuleRuntime + BD (si cambió estado)          │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                   TIMEOUT & RETRY                                       │ │
│  │                                                                         │ │
│  │  ┌──────┬──────────────┬─────────────────┬─────────────────────────┐   │ │
│  │  │ Tipo │ Timeout       │ Reintentos       │ Backoff                 │   │ │
│  │  ├──────┼──────────────┼─────────────────┼─────────────────────────┤   │ │
│  │  │ HTTP │ 30s          │ 0 (CB maneja)    │ N/A                     │   │ │
│  │  │ HC   │ 10s          │ 0                │ N/A                     │   │ │
│  │  │ NATS │ 5s           │ 1                │ 1s                      │   │ │
│  │  │ DB   │ 30s          │ 0 (pool maneja)  │ N/A                     │   │ │
│  │  └──────┴──────────────┴─────────────────┴─────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [RESPUESTA AL USUARIO]                                                     │
│  - 200 OK (datos normales o cacheados)                                      │
│  - 200 OK + X-SIGA-Degraded: true (datos degradados)                       │
│  - 503 Service Unavailable (fallback agotado)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Estrategias de Resiliencia

### 3.1 Resumen de Estrategias

| Estrategia | Propósito | Mecanismo | Prioridad |
|------------|-----------|-----------|-----------|
| **Circuit Breaker** | Evitar fallos en cascada | Monitorear fallos, abrir/cerrar circuito | 1 (primera línea) |
| **Health Monitor** | Detección temprana de fallos | Health checks periódicos | 2 |
| **Cache Manager** | Respuestas rápidas + fallback | Redis / Memoria con TTL | 3 |
| **Fallback Manager** | Respuesta degradada cuando módulo caído | Datos cacheados → estáticos → parcial → 503 | 4 |
| **Timeout Management** | Evitar requests colgados | Timeouts configurados por tipo de operación | 5 |
| **Retry Policy** | Reintentar operaciones fallidas recuperables | Backoff exponencial | 6 |
| **Graceful Degradation** | Mantener funcionalidad parcial | Interfaces adaptativas | 7 |
| **Eventual Consistency** | Sincronización post-recuperación | Sagas coreografiadas con NATS | 8 |

### 3.2 Matriz de Decisiones de Resiliencia

| Condición | Acción |
|-----------|--------|
| Módulo responde healthy | Proxy normal, cache de respuesta |
| Módulo responde lento (>5s) | Timeout, marcar degradado, usar cache si existe |
| Módulo no responde (timeout 30s) | Circuit Breaker cuenta fallo, activar fallback |
| 3 fallos consecutivos | Marcar módulo DEGRADED |
| 5 fallos consecutivos | Circuit Breaker OPEN, bloquea tráfico |
| Circuit Breaker OPEN por 60s | Transición a HALF_OPEN, probar 1 request |
| Request en HALF_OPEN exitoso | Circuit Breaker CLOSED, módulo HEALTHY |
| Request en HALF_OPEN falla | Circuit Breaker OPEN nuevamente |
| Cache hit en Redis | Retornar datos cacheados inmediatamente |
| Cache miss en Redis | Intentar datos estáticos |
| Sin datos en cache ni estáticos | Retornar 503 con mensaje amigable |
| NATS event publish falla | Reintentar 1 vez, luego loguear error |
| BD query timeout (>30s) | Retornar error, circuit breaker no aplica (BD local del módulo) |

---

## 4. Circuit Breaker

### 4.1 Definición

El Circuit Breaker es el patrón principal de resiliencia. Monitorea las llamadas a cada módulo y, cuando detecta un número configurable de fallos consecutivos, "abre el circuito": las llamadas fallan inmediatamente sin intentar la conexión. Esto evita:

- **Agotamiento de recursos** (threads, conexiones HTTP, memoria)
- **Fallos en cascada** (un módulo lento afecta a otros que dependen de él)
- **Tiempos de respuesta degradados** (requests esperando timeout)

### 4.2 Diagrama de Estados

```
        ┌─────────────────────────────────────────────────────────────────┐
        │                    CIRCUIT BREAKER                               │
        │                                                                 │
        │                         ┌──────────┐                            │
        │            ┌────────────│ CERRADO  │◄───────────────────────────┐│
        │            │            │ (CLOSED) │                            ││
        │            │            │          │                            ││
        │            │            │ Pasa     │                            ││
        │            │            │ tráfico  │                            ││
        │            │            │ normal   │                            ││
        │            │            └─────┬────┘                            ││
        │            │                  │                                 ││
        │            │           5 fallos│consecutivos                    ││
        │            │                  │                                 ││
        │            │                  ▼                                 ││
        │            │            ┌──────────┐                            ││
        │            │            │ ABIERTO  │────────────────────────────┘│
        │            │            │ (OPEN)   │  3 éxitos consecutivos     ││
        │            │            │          │                            ││
        │            │            │ Bloquea  │                            ││
        │            │            │ tráfico  │                            ││
        │            │            └─────┬────┘                            ││
        │            │                  │                                 ││
        │            │          timeout 60s                               ││
        │            │                  │                                 ││
        │            │                  ▼                                 ││
        │            │            ┌──────────┐                            ││
        │            └────────────│ SEMI-    │                            ││
        │           1 fallo     │ ABIERTO  │                            ││
        │            (vuelve    │ (HALF-   │                            ││
        │            a OPEN)    │  OPEN)   │                            ││
        │                         │          │                            ││
        │                         │ Prueba 1 │                            ││
        │                         │ request  │                            ││
        │                         └──────────┘                            ││
        │                                                                 ││
        └─────────────────────────────────────────────────────────────────┘│
                                                                           │
        Transiciones:                                                      │
        ───────────────────────────────────────────────────────────────    │
        CLOSED  → OPEN:     failure_count >= failure_threshold (5)        ││
        OPEN    → HALF_OPEN: recovery_timeout pasado (60s)                ││
        HALF_OPEN → CLOSED: success_count >= success_threshold (3)        ││
        HALF_OPEN → OPEN:   1 fallo                                       ││
        ───────────────────────────────────────────────────────────────    │
                                                                           │
        NOTA: Cada módulo tiene su propio Circuit Breaker independiente.   │
        Un CB abierto para mod-estudiantes NO afecta a mod-matricula.     │
        └──────────────────────────────────────────────────────────────────┘
```

### 4.3 Implementación

```python
# app/core/resilience/circuit_breaker.py

from enum import Enum
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional, Any, Awaitable
import asyncio
import logging

logger = logging.getLogger(__name__)

class CircuitBreakerState(str, Enum):
    CLOSED = "closed"        # Normal, pasa tráfico
    OPEN = "open"            # Bloquea tráfico, activa fallback
    HALF_OPEN = "half_open"  # Prueba si el módulo se recuperó

class CircuitBreaker:
    """
    Circuit Breaker para un módulo específico.
    Monitorea fallos en la comunicación y abre/cierra el circuito.
    Cada módulo tiene su propia instancia independiente.
    """

    def __init__(
        self,
        module_name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 3,
    ):
        self.module_name = module_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout  # segundos
        self.success_threshold = success_threshold

        # Estado
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.last_state_change: datetime = datetime.now(timezone.utc)

        # Métricas
        self.total_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.rejected_calls = 0  # Llamadas bloqueadas por OPEN

    async def call(
        self,
        func: Callable[[], Awaitable[Any]],
        fallback_func: Optional[Callable[[], Awaitable[Any]]] = None,
    ) -> Any:
        """
        Ejecuta una función con protección de Circuit Breaker.
        
        Args:
            func: Función asíncrona a ejecutar (llamada al módulo)
            fallback_func: Función asíncrona de fallback (opcional)
        
        Returns:
            Resultado de func o fallback_func
        
        Raises:
            Exception: Si no hay fallback y el circuito está abierto
        """
        self.total_calls += 1

        # ── Estado OPEN ─────────────────────────────────
        if self.state == CircuitBreakerState.OPEN:
            if self._recovery_timeout_passed():
                logger.info(f"CB [{self.module_name}]: OPEN → HALF_OPEN (timeout {self.recovery_timeout}s pasado)")
                self._set_state(CircuitBreakerState.HALF_OPEN)
            else:
                self.rejected_calls += 1
                logger.warning(f"CB [{self.module_name}]: OPEN, request rechazado (fail_count={self.failure_count})")
                if fallback_func:
                    return await fallback_func()
                raise CircuitBreakerOpenError(
                    f"Circuit Breaker OPEN para módulo '{self.module_name}'. "
                    f"{self.failure_count} fallos consecutivos."
                )

        # ── Estado HALF_OPEN o CLOSED ──────────────────
        try:
            result = await func()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            if fallback_func:
                logger.info(f"CB [{self.module_name}]: Ejecutando fallback después de error: {e}")
                return await fallback_func()
            raise

    def _on_success(self):
        """Maneja una llamada exitosa."""
        self.successful_calls += 1
        self.failure_count = 0

        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                logger.info(f"CB [{self.module_name}]: HALF_OPEN → CLOSED ({self.success_count} éxitos)")
                self._set_state(CircuitBreakerState.CLOSED)
                self.success_count = 0
        elif self.state == CircuitBreakerState.CLOSED:
            pass  # Se mantiene CLOSED

    def _on_failure(self):
        """Maneja una llamada fallida."""
        self.failed_calls += 1
        self.failure_count += 1
        self.last_failure_time = datetime.now(timezone.utc)

        if self.state == CircuitBreakerState.HALF_OPEN:
            logger.warning(f"CB [{self.module_name}]: HALF_OPEN → OPEN (fallo en prueba)")
            self._set_state(CircuitBreakerState.OPEN)
            self.success_count = 0
        elif self.state == CircuitBreakerState.CLOSED:
            if self.failure_count >= self.failure_threshold:
                logger.error(f"CB [{self.module_name}]: CLOSED → OPEN ({self.failure_count} fallos consecutivos)")
                self._set_state(CircuitBreakerState.OPEN)

    def _recovery_timeout_passed(self) -> bool:
        """Verifica si ha pasado el tiempo de recuperación."""
        if self.last_failure_time is None:
            return True
        elapsed = (datetime.now(timezone.utc) - self.last_failure_time).total_seconds()
        return elapsed >= self.recovery_timeout

    def _set_state(self, new_state: CircuitBreakerState):
        """Cambia el estado y registra el cambio."""
        old_state = self.state
        self.state = new_state
        self.last_state_change = datetime.now(timezone.utc)
        
        if old_state != new_state:
            logger.info(f"CB [{self.module_name}]: {old_state.value} → {new_state.value}")

    def reset(self):
        """Resetea manualmente el Circuit Breaker a CLOSED."""
        logger.info(f"CB [{self.module_name}]: Reset manual → CLOSED")
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None

    @property
    def is_available(self) -> bool:
        """El módulo está disponible para recibir tráfico."""
        return self.state in (CircuitBreakerState.CLOSED, CircuitBreakerState.HALF_OPEN)

    @property
    def summary(self) -> dict:
        """Resumen del estado del Circuit Breaker para métricas."""
        return {
            "module": self.module_name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "rejected_calls": self.rejected_calls,
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None,
        }

class CircuitBreakerOpenError(Exception):
    """Error lanzado cuando el Circuit Breaker está OPEN y no hay fallback."""
    pass

class CircuitBreakerRegistry:
    """
    Registry global de Circuit Breakers.
    Mantiene una instancia de CircuitBreaker por cada módulo.
    """

    def __init__(self):
        self._breakers: dict[str, CircuitBreaker] = {}

    def get(self, module_name: str) -> CircuitBreaker:
        """Obtiene o crea un CircuitBreaker para un módulo."""
        if module_name not in self._breakers:
            from app.core.config import get_settings
            settings = get_settings()
            self._breakers[module_name] = CircuitBreaker(
                module_name=module_name,
                failure_threshold=settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
                recovery_timeout=settings.CIRCUIT_BREAKER_RECOVERY_TIMEOUT,
                success_threshold=settings.CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
            )
        return self._breakers[module_name]

    def remove(self, module_name: str):
        """Elimina el CircuitBreaker de un módulo (cuando se desregistra)."""
        if module_name in self._breakers:
            del self._breakers[module_name]

    def list_all(self) -> list[CircuitBreaker]:
        """Lista todos los Circuit Breakers activos."""
        return list(self._breakers.values())

    def get_all_summaries(self) -> list[dict]:
        """Obtiene resúmenes de todos los CB para métricas."""
        return [cb.summary for cb in self._breakers.values()]

# Singleton global
circuit_breaker_registry = CircuitBreakerRegistry()
```

### 4.4 Configuración

| Parámetro | Variable de Entorno | Default | Descripción |
|-----------|---------------------|---------|-------------|
| `failure_threshold` | `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | 5 | Fallos consecutivos antes de abrir el circuito |
| `recovery_timeout` | `CIRCUIT_BREAKER_RECOVERY_TIMEOUT` | 60 | Segundos antes de pasar de OPEN a HALF_OPEN |
| `success_threshold` | `CIRCUIT_BREAKER_SUCCESS_THRESHOLD` | 3 | Éxitos consecutivos en HALF_OPEN para cerrar el circuito |

### 4.5 Respuesta del Sistema en Cada Estado

| Estado | Request entrante | Frecuencia de Health Check | Mensaje al usuario |
|--------|-----------------|--------------------------|-------------------|
| **CLOSED** | Se envía al módulo normalmente | Cada 30s | Normal |
| **OPEN** (0-60s) | Se ejecuta fallback inmediatamente | Cada 30s (sigue intentando) | "Servicio temporalmente no disponible. Sus datos pueden no estar actualizados." |
| **HALF_OPEN** | Se envía 1 request de prueba | Cada 30s | Normal (si exitoso), degradado (si falla) |

---

## 5. Health Monitor

### 5.1 Definición

El Health Monitor es un loop asíncrono que ejecuta health checks periódicos a todos los módulos registrados. Actualiza el estado en `ModuleRuntime` y, cuando es necesario, en el `CircuitBreaker`.

### 5.2 Implementación

```python
# app/core/resilience/health_monitor.py

import asyncio
from typing import Dict, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
from app.core.config import get_settings
from app.core.registry.runtime import module_runtime
from app.core.registry.schemas import ModuleStatus
from app.core.resilience.circuit_breaker import circuit_breaker_registry
import httpx

settings = get_settings()

@dataclass
class ModuleHealthRecord:
    """Registro de salud de un módulo en un momento dado."""
    timestamp: datetime
    status: str  # healthy, degraded, unhealthy
    response_time: float  # segundos
    error: Optional[str] = None

@dataclass
class ModuleHealth:
    """Estado de salud completo de un módulo."""
    module_name: str
    status: str = "unknown"
    last_check: Optional[datetime] = None
    response_time: float = 0.0
    error_count: int = 0
    last_error: Optional[str] = None
    degraded_since: Optional[datetime] = None
    history: list = field(default_factory=list)  # Últimos 100 registros
    max_history: int = 100

class HealthMonitor:
    """
    Monitorea la salud de todos los módulos registrados.
    Ejecuta health checks periódicos y actualiza el estado global.
    """

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._interval = settings.HEALTH_CHECK_INTERVAL  # 30s
        self._timeout = settings.HEALTH_CHECK_TIMEOUT     # 10s
        self._health_records: Dict[str, ModuleHealth] = {}

    async def start_monitoring(self):
        """Inicia el loop de monitoreo periódico."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._monitoring_loop())
        print(f"✅ HealthMonitor iniciado (intervalo: {self._interval}s, timeout: {self._timeout}s)")

    async def stop_monitoring(self):
        """Detiene el loop de monitoreo."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("✅ HealthMonitor detenido")

    async def _monitoring_loop(self):
        """Loop principal de monitoreo."""
        while self._running:
            try:
                await self._check_all_modules()
            except Exception as e:
                print(f"⚠️ Error en HealthMonitor: {e}")
            await asyncio.sleep(self._interval)

    async def _check_all_modules(self):
        """Ejecuta health check para todos los módulos activos."""
        modules = await module_runtime.list_modules()
        for module in modules:
            # Solo monitorear módulos que están o estuvieron activos
            if module.status in (
                ModuleStatus.HEALTHY,
                ModuleStatus.DEGRADED,
                ModuleStatus.UNHEALTHY,
                ModuleStatus.REGISTERED,
            ):
                await self.check_module(module.name)

    async def check_module(self, module_name: str) -> bool:
        """
        Ejecuta health check para un módulo específico.
        Retorna True si el módulo está healthy, False en caso contrario.
        """
        module = await module_runtime.get_module(module_name)
        if not module:
            return False

        # Inicializar registro de salud si no existe
        if module_name not in self._health_records:
            self._health_records[module_name] = ModuleHealth(module_name=module_name)

        health = self._health_records[module_name]
        start_time = datetime.now(timezone.utc)
        success = False
        error_msg = None
        response_time = 0.0

        try:
            # Ejecutar health check HTTP
            url = module.health_url
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url)

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    success = True
                else:
                    error_msg = f"Módulo reporta estado '{data.get('status')}': {data.get('message', '')}"
            else:
                error_msg = f"HTTP {response.status_code}"

        except httpx.TimeoutException:
            error_msg = f"Timeout después de {self._timeout}s"
        except httpx.ConnectionError:
            error_msg = "Conexión rechazada"
        except Exception as e:
            error_msg = str(e)

        # Actualizar registro de salud
        now = datetime.now(timezone.utc)
        health.last_check = now
        health.response_time = response_time

        if success:
            health.status = "healthy"
            health.error_count = 0
            health.degraded_since = None
        else:
            health.error_count += 1
            health.last_error = error_msg
            if health.error_count >= 3:
                health.status = "unhealthy"
            else:
                health.status = "degraded"
            if health.degraded_since is None:
                health.degraded_since = now

        # Agregar a historial (mantener últimos N)
        record = ModuleHealthRecord(
            timestamp=now,
            status=health.status,
            response_time=response_time,
            error=error_msg if not success else None,
        )
        health.history.append(record)
        if len(health.history) > health.max_history:
            health.history = health.history[-health.max_history:]

        # Actualizar ModuleRuntime
        await module_runtime.check_module_health(module_name, self._timeout)

        return success

    def get_health(self, module_name: str) -> Optional[ModuleHealth]:
        """Obtiene el registro de salud de un módulo."""
        return self._health_records.get(module_name)

    def get_all_health(self) -> Dict[str, ModuleHealth]:
        """Obtiene registros de salud de todos los módulos."""
        return dict(self._health_records)

    def get_health_summary(self) -> dict:
        """Resumen general de salud del sistema."""
        total = len(self._health_records)
        healthy = sum(1 for h in self._health_records.values() if h.status == "healthy")
        degraded = sum(1 for h in self._health_records.values() if h.status == "degraded")
        unhealthy = sum(1 for h in self._health_records.values() if h.status == "unhealthy")
        return {
            "total": total,
            "healthy": healthy,
            "degraded": degraded,
            "unhealthy": unhealthy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

# Singleton
health_monitor = HealthMonitor()
```

### 5.3 Registro de Salud por Módulo

```python
# Estructura de ModuleHealthRecord (serializada)
{
    "module_name": "mod-estudiantes",
    "status": "healthy",
    "last_check": "2026-06-26T12:00:00Z",
    "response_time": 0.045,  # 45ms
    "error_count": 0,
    "last_error": null,
    "degraded_since": null,
    "history": [
        {
            "timestamp": "2026-06-26T12:00:00Z",
            "status": "healthy",
            "response_time": 0.045,
            "error": null
        },
        {
            "timestamp": "2026-06-26T11:59:30Z",
            "status": "healthy",
            "response_time": 0.052,
            "error": null
        }
    ]
}
```

### 5.4 Alertas del Health Monitor

| Condición | Alerta | Acción |
|-----------|--------|--------|
| Módulo cambia de HEALTHY a DEGRADED | ⚠️ Alerta amarilla | Notificar a Slack/Telegram, loggear |
| Módulo cambia de DEGRADED a UNHEALTHY | 🔴 Alerta roja | Notificar a Slack/Telegram, crear ticket |
| Error count > 10 en 5 minutos | 🔴 Alerta roja | Notificar inmediatamente |
| Response time > 5s | ⚠️ Degradado por rendimiento | Reportar en dashboard |
| Módulo se recupera (UNHEALTHY → HEALTHY) | ✅ Alerta verde | Notificar recuperación |

---

## 6. Fallback Manager

### 6.1 Definición

El Fallback Manager provee respuestas alternativas cuando un módulo no está disponible. Tiene una jerarquía de estrategias: intenta la mejor opción primero y degrada progresivamente.

### 6.2 Estrategias de Fallback

| Estrategia | Prioridad | Descripción | Fuente de Datos | Ejemplo |
|-----------|-----------|-------------|-----------------|---------|
| **CACHE_ONLY** | 1ª | Retornar datos cacheados en Redis | Redis (caché distribuido) | Lista de estudiantes desde cache |
| **STATIC_DATA** | 2ª | Retornar datos estáticos predefinidos | Archivos YAML/JSON en el Core | Carreras disponibles, catálogo básico |
| **DEGRADE_FUNCTIONALITY** | 3ª | Retornar respuesta parcial | Combinación de cache + estáticos | "Datos de estudiantes no disponibles, mostrando solo materias" |
| **QUEUE_AND_RETRY** | 4ª | Encolar request para procesar después | NATS JetStream Queue | Solicitud de matrícula encolada |
| **UNAVAILABLE** | 5ª | Retornar 503 Service Unavailable | Mensaje hardcodeado | "Servicio no disponible, intente más tarde" |

### 6.3 Implementación

```python
# app/core/resilience/fallback_manager.py

from typing import Optional, Dict, Any, Callable
from fastapi import Request
from fastapi.responses import JSONResponse, Response
from app.core.resilience.cache_manager import cache_manager
from app.core.gateway.event_bus import event_bus
import json
import yaml
import os

class FallbackManager:
    """
    Gestiona las estrategias de fallback cuando un módulo no está disponible.
    Jerarquía: Cache → Datos Estáticos → Degradación → Encolar → 503
    """

    def __init__(self):
        self._static_fallbacks: Dict[str, Dict[str, Any]] = {}
        self._loaded = False

    def setup_default_fallbacks(self):
        """Carga los datos de fallback estáticos desde archivos."""
        fallback_dir = os.path.join(os.path.dirname(__file__), "..", "..", "fallbacks")
        if not os.path.exists(fallback_dir):
            print("   ⚠️ Directorio de fallbacks no encontrado, creando vacío")
            os.makedirs(fallback_dir, exist_ok=True)
            return

        for filename in os.listdir(fallback_dir):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                module_name = filename.replace(".yaml", "").replace(".yml", "")
                filepath = os.path.join(fallback_dir, filename)
                try:
                    with open(filepath, "r") as f:
                        data = yaml.safe_load(f)
                    self._static_fallbacks[module_name] = data
                    print(f"   📄 Fallback estático cargado: {module_name}")
                except Exception as e:
                    print(f"   ⚠️ Error al cargar fallback {filename}: {e}")

        self._loaded = True

    async def execute(
        self,
        module_name: str,
        path: str,
        request: Request,
    ) -> Response:
        """
        Ejecuta la jerarquía de fallback para un módulo.
        Intenta cada estrategia en orden hasta encontrar una respuesta.
        """
        cache_key = f"{module_name}:{path.replace('/', ':')}"

        # 1. Intentar CACHE
        cached = await cache_manager.get(cache_key)
        if cached is not None:
            # Publicar evento de fallback
            await self._publish_fallback_event(module_name, "cache")
            return JSONResponse(
                content=cached,
                status_code=200,
                headers={
                    "X-SIGA-Degraded": "true",
                    "X-SIGA-Fallback": "cache",
                    "Cache-Control": "no-cache",
                }
            )

        # 2. Intentar DATOS ESTÁTICOS
        static = self._get_static_fallback(module_name, path)
        if static is not None:
            await self._publish_fallback_event(module_name, "static")
            return JSONResponse(
                content=static,
                status_code=200,
                headers={
                    "X-SIGA-Degraded": "true",
                    "X-SIGA-Fallback": "static",
                }
            )

        # 3. Degradar funcionalidad
        await self._publish_fallback_event(module_name, "degraded")
        return JSONResponse(
            content={
                "status": "degraded",
                "message": f"El módulo '{module_name}' no está disponible en este momento. "
                          f"Algunas funcionalidades pueden estar limitadas. "
                          f"Por favor, intente nuevamente en unos minutos.",
                "module": module_name,
                "path": path,
            },
            status_code=200,
            headers={
                "X-SIGA-Degraded": "true",
                "X-SIGA-Fallback": "degraded",
            }
        )

        # Nota: QUEUE_AND_RETRY y UNAVAILABLE se implementarán
        # cuando se requiera encolamiento de operaciones de escritura.

    def _get_static_fallback(self, module_name: str, path: str) -> Optional[Dict]:
        """Obtiene datos de fallback estático para un módulo y ruta."""
        if module_name in self._static_fallbacks:
            data = self._static_fallbacks[module_name]
            # Navegación simple por path
            parts = [p for p in path.split("/") if p]
            current = data
            for part in parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return None
            return current if isinstance(current, (dict, list)) else None
        return None

    def add_static_fallback(self, module_name: str, data: Dict):
        """Agrega datos de fallback estático para un módulo."""
        self._static_fallbacks[module_name] = data

    async def _publish_fallback_event(self, module_name: str, strategy: str):
        """Publica evento de activación de fallback."""
        try:
            if event_bus._connected:
                await event_bus.publish(
                    "fallback.activated",
                    {
                        "module": module_name,
                        "strategy": strategy,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
        except Exception:
            pass  # No propagar errores de eventos

# Singleton
fallback_manager = FallbackManager()
```

### 6.4 Datos Estáticos de Fallback

Ejemplo de archivo de fallback para `mod-estudiantes`:

```yaml
# fallbacks/mod-estudiantes.yaml
# Datos estáticos de respaldo cuando mod-estudiantes no está disponible.
# Estos datos se muestran como fallback de último recurso.

estudiantes: []
total: 0

programas:
  - id: 1
    nombre: "Desarrollo de Sistemas de Información"
  - id: 2
    nombre: "Enfermería Técnica"
  # ... más programas

documentos_tipos:
  - DNI
  - CE
  - PASAPORTE

mensaje: "Los datos de estudiantes no están disponibles actualmente."
```

### 6.5 Cabeceras de Respuesta en Fallback

Cuando se activa un fallback, el Core incluye cabeceras HTTP específicas para que el Frontend pueda reaccionar:

| Cabecera | Valor | Significado |
|----------|-------|-------------|
| `X-SIGA-Degraded` | `true` | La respuesta es degradada (no datos en vivo) |
| `X-SIGA-Fallback` | `cache` / `static` / `degraded` | Estrategia de fallback utilizada |
| `Cache-Control` | `no-cache` | No cachear esta respuesta (es degradada) |

El Frontend debe leer estas cabeceras y mostrar un indicador al usuario:

```javascript
// Frontend: detectar respuesta degradada
const response = await axios.get('/api/mod-estudiantes/v1/estudiantes');
if (response.headers['x-siga-degraded'] === 'true') {
    showDegradedWarning(
        `Datos mostrados desde ${response.headers['x-siga-fallback']}. ` +
        `Pueden no estar actualizados.`
    );
}
```

---

## 7. Cache Manager

### 7.1 Definición

El Cache Manager es el sistema de caché distribuido del Core. Utiliza Redis como backend primario y memoria local como fallback. No solo mejora rendimiento — es un componente crítico de resiliencia.

### 7.2 Implementación

```python
# app/core/resilience/cache_manager.py

import redis.asyncio as redis_async
from typing import Optional, Any, Dict
import json
import asyncio
from datetime import timedelta, datetime, timezone
from app.core.config import get_settings

settings = get_settings()

class CacheManager:
    """
    Sistema de caché con Redis (producción) y fallback a memoria (desarrollo).
    
    Estrategia:
    - GET requests: cache 10 minutos
    - POST/PUT/PATCH: NO cachear (invalidar en su lugar)
    - Datos críticos: cache 2 minutos
    - Invalidación: por evento de actualización del módulo
    """

    def __init__(self):
        self._redis: Optional[redis_async.Redis] = None
        self._memory_cache: Dict[str, tuple[Any, float]] = {}
        self._enabled = settings.CACHE_ENABLED
        self._default_ttl = settings.CACHE_DEFAULT_TTL  # 300s (5 min)
        self._get_ttl = settings.CACHE_GET_TTL   # 600s (10 min)

    async def connect(self):
        """Conecta a Redis. Si no está disponible, usa memoria."""
        if not self._enabled:
            return

        try:
            self._redis = redis_async.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30,
            )
            await self._redis.ping()
            print(f"✅ CacheManager: Redis conectado en {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            self._redis = None
            print(f"⚠️ CacheManager: Redis no disponible ({e}). Usando caché en memoria.")

    async def get(self, key: str) -> Optional[Any]:
        """Obtiene un valor del caché."""
        if self._redis:
            try:
                data = await self._redis.get(key)
                if data is not None:
                    return json.loads(data)
            except Exception:
                pass  # Fallback a memoria
            return None

        # Fallback a memoria
        if key in self._memory_cache:
            value, expiry = self._memory_cache[key]
            if asyncio.get_event_loop().time() < expiry:
                return value
            del self._memory_cache[key]
        return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        tags: Optional[list[str]] = None,
    ):
        """
        Almacena un valor en caché.
        
        Args:
            key: Clave única
            value: Valor a cachear (debe ser serializable a JSON)
            ttl: Tiempo de vida en segundos (default: CACHE_DEFAULT_TTL)
            tags: Tags para invalidación por grupo (ej: ["mod-estudiantes"])
        """
        ttl = ttl or self._default_ttl

        if self._redis:
            try:
                pipe = self._redis.pipeline()
                pipe.setex(key, timedelta(seconds=ttl), json.dumps(value, default=str))
                
                # Almacenar tags para invalidación por grupo
                if tags:
                    for tag in tags:
                        pipe.sadd(f"tag:{tag}", key)
                        pipe.expire(f"tag:{tag}", ttl + 3600)  # Tag expira 1h después
                
                await pipe.execute()
                return
            except Exception:
                pass  # Fallback a memoria

        # Fallback a memoria
        self._memory_cache[key] = (value, asyncio.get_event_loop().time() + ttl)

    async def delete(self, key: str):
        """Elimina una clave del caché."""
        if self._redis:
            try:
                await self._redis.delete(key)
            except Exception:
                pass
        elif key in self._memory_cache:
            del self._memory_cache[key]

    async def delete_pattern(self, pattern: str):
        """
        Elimina claves que coinciden con un patrón.
        Ejemplo: delete_pattern("mod-estudiantes:*")
        """
        if self._redis:
            try:
                cursor = 0
                while True:
                    cursor, keys = await self._redis.scan(cursor=cursor, match=pattern, count=100)
                    if keys:
                        await self._redis.delete(*keys)
                    if cursor == 0:
                        break
            except Exception:
                pass
        else:
            # Memoria: eliminar por prefijo
            prefix = pattern.replace("*", "")
            keys_to_delete = [k for k in self._memory_cache if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._memory_cache[k]

    async def delete_by_tag(self, tag: str):
        """Elimina todas las claves asociadas a un tag."""
        if self._redis:
            try:
                keys = await self._redis.smembers(f"tag:{tag}")
                if keys:
                    await self._redis.delete(*keys)
                    await self._redis.delete(f"tag:{tag}")
            except Exception:
                pass

    async def invalidate_module_cache(self, module_name: str):
        """
        Invalida todo el caché de un módulo.
        Se llama cuando un módulo publica un evento de actualización.
        """
        await self.delete_pattern(f"{module_name}:*")
        await self.delete_by_tag(module_name)

    async def get_or_set(
        self,
        key: str,
        func: callable,
        ttl: Optional[int] = None,
        tags: Optional[list[str]] = None,
    ) -> Any:
        """
        Patrón Cache-Aside: intenta obtener del caché.
        Si no existe, ejecuta func(), almacena el resultado y lo retorna.
        """
        cached = await self.get(key)
        if cached is not None:
            return cached

        value = await func()
        if value is not None:
            await self.set(key, value, ttl, tags)
        return value

    def make_key(self, module_name: str, endpoint: str, params: Optional[dict] = None) -> str:
        """Construye una clave de caché estandarizada."""
        key = f"{module_name}:{endpoint.replace('/', ':')}"
        if params:
            # Ordenar params para consistencia
            sorted_params = sorted(params.items())
            params_str = ":".join(f"{k}={v}" for k, v in sorted_params)
            key = f"{key}:{params_str}"
        return key

    async def close(self):
        if self._redis:
            try:
                await self._redis.close()
            except Exception:
                pass

    @property
    def is_connected(self) -> bool:
        """Indica si Redis está conectado."""
        if self._redis:
            try:
                return self._redis.is_connected()
            except Exception:
                return False
        return False

# Singleton
cache_manager = CacheManager()
```

### 7.3 Estrategia de Cache por Tipo de Operación

| Tipo de Operación | ¿Cachear? | TTL | Tags | Notas |
|-------------------|-----------|-----|------|-------|
| GET (lista) | ✅ Sí | 10 min | `mod-{name}`, `mod-{name}:list` | Cachear respuestas de listas |
| GET (detalle) | ✅ Sí | 10 min | `mod-{name}`, `mod-{name}:detail` | Cachear respuestas de detalle |
| GET (reportes) | ✅ Sí | 5 min | `mod-{name}:report` | Reportes se cachean menos |
| POST (crear) | ❌ No | - | - | Invalidar cache del módulo |
| PUT (actualizar) | ❌ No | - | - | Invalidar cache del módulo |
| PATCH (actualizar parcial) | ❌ No | - | - | Invalidar cache del módulo |
| DELETE (eliminar) | ❌ No | - | - | Invalidar cache del módulo |

### 7.4 Invalidación por Eventos

Cuando un módulo publica un evento que indica un cambio de datos, el Core invalida automáticamente el cache relacionado:

```python
# En el handler de eventos del Core
async def handle_module_event(msg):
    """Maneja eventos de módulos para invalidar cache."""
    import json
    data = json.loads(msg.data.decode())
    subject = msg.subject
    
    # Extraer nombre del módulo del subject
    # Ej: "estudiante.creado" → "mod-estudiantes"
    module_name = f"mod-{subject.split('.')[0]}"
    
    # Invalidar cache del módulo
    await cache_manager.invalidate_module_cache(module_name)
    
    print(f"📨 Cache invalidado para {module_name} por evento {subject}")
```

### 7.5 Métricas de Cache

El Cache Manager expone las siguientes métricas para Prometheus:

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `cache_hits_total` | Counter | Total de hits en caché |
| `cache_misses_total` | Counter | Total de misses en caché |
| `cache_hit_ratio` | Gauge | Ratio hits/(hits+misses) |
| `cache_operations_total{type="get|set|delete"}` | Counter | Operaciones por tipo |
| `cache_backend` | Gauge | 1=Redis, 0=Memoria |

---

## 8. Timeout Management

### 8.1 Configuración de Timeouts

| Operación | Timeout | Configurable | Acción al expirar |
|-----------|---------|-------------|-------------------|
| **Health Check** | 10s | `HEALTH_CHECK_TIMEOUT` | Marcar módulo como UNHEALTHY |
| **HTTP Proxy** (request a módulo) | 30s | `HTTP_PROXY_TIMEOUT` | Activar fallback (Circuit Breaker cuenta fallo) |
| **NATS Publish** | 2s | Hardcodeado | Reintentar 1 vez, luego loguear |
| **NATS Request** (request-reply) | 5s | Hardcodeado | Reintentar 1 vez con backoff 1s |
| **DB Query** (Core) | 30s | Hardcodeado en engine | Retornar error 500 |
| **Redis Operación** | 2s | Hardcodeado en cliente | Fallback a caché en memoria |
| **Registro de Módulo** | 10s | Hardcodeado | Rechazar registro |

### 8.2 Implementación de Timeouts

Los timeouts se implementan en diferentes niveles:

```python
# Nivel 1: httpx (HTTP Proxy)
self._client = httpx.AsyncClient(
    timeout=httpx.Timeout(
        connect=10.0,    # Timeout de conexión
        read=30.0,       # Timeout de lectura (esperando respuesta)
        write=30.0,      # Timeout de escritura (enviando request)
        pool=10.0,       # Timeout de espera por conexión del pool
    ),
)

# Nivel 2: asyncio.wait_for (operaciones críticas)
try:
    result = await asyncio.wait_for(
        module_function(),
        timeout=settings.HTTP_PROXY_TIMEOUT  # 30s
    )
except asyncio.TimeoutError:
    # Activar fallback
    await fallback_manager.execute(...)

# Nivel 3: redis timeouts (socket)
self._redis = redis_async.Redis(
    socket_connect_timeout=2,
    socket_timeout=2,
)
```

---

## 9. Retry Policy

### 9.1 Configuración

```python
RETRY_CONFIG = {
    "max_retries": 3,           # Máximo de reintentos
    "base_delay": 0.5,          # Espera inicial en segundos
    "max_delay": 10.0,          # Espera máxima en segundos
    "backoff_factor": 2,        # Factor de backoff exponencial
    "retryable_exceptions": [   # Excepciones que disparan reintento
        TimeoutError,
        ConnectionError,
        ConnectionRefusedError,
        httpx.ConnectTimeout,
        httpx.ReadTimeout,
        httpx.RemoteProtocolError,
    ],
}
```

### 9.2 Implementación

```python
# app/core/resilience/retry.py

import asyncio
from typing import Callable, Awaitable, Any, Type, List
import random
import httpx

RETRYABLE_EXCEPTIONS = (
    asyncio.TimeoutError,
    ConnectionError,
    ConnectionRefusedError,
    httpx.ConnectTimeout,
    httpx.ReadTimeout,
    httpx.RemoteProtocolError,
)

async def retry_with_backoff(
    func: Callable[[], Awaitable[Any]],
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 10.0,
    backoff_factor: float = 2.0,
    retryable_exceptions: tuple = RETRYABLE_EXCEPTIONS,
    on_retry: Callable[[int, Exception], None] = None,
) -> Any:
    """
    Ejecuta una función con reintentos y backoff exponencial.
    
    Args:
        func: Función asíncrona a ejecutar
        max_retries: Número máximo de reintentos
        base_delay: Espera inicial en segundos
        max_delay: Espera máxima entre reintentos
        backoff_factor: Factor de crecimiento exponencial
        retryable_exceptions: Tupla de excepciones que disparan reintento
        on_retry: Callback opcional en cada reintento
    
    Returns:
        Resultado de func
    
    Raises:
        La última excepción si se agotan los reintentos
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except retryable_exceptions as e:
            last_exception = e
            if attempt < max_retries:
                # Calcular delay con jitter
                delay = min(base_delay * (backoff_factor ** attempt), max_delay)
                jitter = random.uniform(0, delay * 0.1)  # 10% de jitter
                total_delay = delay + jitter
                
                if on_retry:
                    on_retry(attempt + 1, e)
                
                print(f"🔄 Reintento {attempt + 1}/{max_retries} después de {total_delay:.2f}s: {e}")
                await asyncio.sleep(total_delay)
        except Exception as e:
            # Excepciones no recuperables → fallar inmediatamente
            raise

    raise last_exception
```

### 9.3 ¿Cuándo usar Retry?

| Escenario | ¿Retry? | Por qué |
|-----------|---------|---------|
| Timeout de conexión | ✅ Sí | Puede ser transitorio |
| Connection refused | ✅ Sí | El módulo puede estar reiniciándose |
| 503 Service Unavailable | ✅ Sí | El módulo puede estar en mantenimiento |
| 500 Internal Error | ⚠️ Depende | Si es idempotente, retry; si no, fallar |
| 401 Unauthorized | ❌ No | Error de autenticación, no se recupera solo |
| 403 Forbidden | ❌ No | Error de autorización |
| 400 Bad Request | ❌ No | Error del cliente, no del servidor |

**⚠️ Importante**: Solo reintentar operaciones **idempotentes** (GET, PUT si son idempotentes). Nunca reintentar POST no idempotentes sin verificar que la operación no se ejecutó.

---

## 10. Resiliencia en Módulos

### 10.1 Responsabilidades de los Módulos

Cada módulo debe implementar su propia resiliencia interna:

| Componente | Responsabilidad |
|------------|----------------|
| **Health Endpoint** | Reflejar estado real del módulo (BD conectada, dependencias disponibles, cache local) |
| **Graceful Shutdown** | Atrapar SIGTERM/SIGINT, cerrar conexiones, finalizar operaciones en curso |
| **Conexión a BD** | Pool de conexiones con reconexión automática, retry en fallos de conexión |
| **Cache Local** | Cache en memoria de datos frecuentemente consultados para reducir carga en BD |
| **Timeout Interno** | Timeouts en todas las operaciones externas (BD, NATS, HTTP a otros servicios) |
| **Error Handling** | Capturar y loguear errores, no exponer stack traces, retornar errores estructurados |

### 10.2 Plantilla de main.py para Módulos

```python
# modules/mod-ejemplo/main.py

import uvicorn
import asyncio
import signal
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.core.config import get_settings  # O su propia configuración

settings = get_settings()

# Estado interno del módulo
module_state = {
    "healthy": True,
    "database_connected": False,
    "dependencies_healthy": {},
}

# ──────────────────────────────────────────────
# Graceful Shutdown
# ──────────────────────────────────────────────
async def shutdown_handler(sig, frame):
    """Maneja señales de terminación para shutdown graceful."""
    print(f"📴 Señal {sig} recibida. Iniciando shutdown graceful...")
    # 1. Dejar de aceptar nuevas peticiones
    # 2. Finalizar operaciones en curso
    # 3. Cerrar conexiones
    # 4. Publicar evento module.shutting_down
    print("✅ Shutdown graceful completado")
    exit(0)

signal.signal(signal.SIGTERM, shutdown_handler)
signal.signal(signal.SIGINT, shutdown_handler)

# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check que refleja el estado real del módulo."""
    status = "healthy"
    
    if not module_state["database_connected"]:
        status = "degraded"
    if not all(module_state["dependencies_healthy"].values()):
        status = "degraded"
    
    return {
        "status": status,
        "module": "mod-ejemplo",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if module_state["database_connected"] else "disconnected",
        "dependencies": module_state["dependencies_healthy"],
    }

# ──────────────────────────────────────────────
# Lifespan
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    print(f"🚀 Iniciando módulo ejemplo...")
    # 1. Conectar a BD
    # 2. Conectar a NATS
    # 3. Verificar dependencias
    yield
    # SHUTDOWN
    print("🛑 Deteniendo módulo ejemplo...")
    # 1. Cerrar conexión BD
    # 2. Cerrar NATS
    # 3. Finalizar tareas

app = FastAPI(lifespan=lifespan)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

---

## 11. Monitoreo de Resiliencia

### 11.1 Métricas a Exponer

El Core expone las siguientes métricas para Prometheus en `/metrics`:

```python
# Métricas de Circuit Breaker
circuit_breaker_state{module="mod-estudiantes"}  # 0=CLOSED, 1=OPEN, 2=HALF_OPEN
circuit_breaker_failures_total{module="mod-estudiantes"}
circuit_breaker_rejections_total{module="mod-estudiantes"}

# Métricas de Health
health_status{module="mod-estudiantes"}  # 0=unhealthy, 1=degraded, 2=healthy
health_check_duration_seconds{module="mod-estudiantes"}

# Métricas de Fallback
fallback_activations_total{module="mod-estudiantes", strategy="cache|static|degraded"}

# Métricas de Cache
cache_hits_total
cache_misses_total
cache_hit_ratio
cache_operations_total{type="get|set|delete"}

# Métricas de Request
request_duration_seconds{module="mod-estudiantes", method="GET", status="200"}
request_total{module="mod-estudiantes", method="GET", status="200"}

# Métricas del Sistema
modules_total
modules_healthy
modules_degraded
modules_unhealthy
modules_offline
```

### 11.2 Dashboard Sugerido (Grafana)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SIGA - DASHBOARD DE RESILIENCIA                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                      │
│  │    ESTADO GENERAL         │  │    MÓDULOS ACTIVOS        │                     │
│  │  🟢 Healthy: 4           │  │  mod-estudiantes   🟢    │                     │
│  │  🟡 Degraded: 0          │  │  mod-matricula     🟢    │                     │
│  │  🔴 Unhealthy: 1         │  │  mod-planes        🟢    │                     │
│  │  ⚪ Offline: 0           │  │  mod-programas     🟢    │                     │
│  │                           │  │  mod-tramites      🔴    │                     │
│  └──────────────────────────┘  └──────────────────────────┘                      │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │           HISTÓRICO DE FALLOS (Últimas 24h)                              │   │
│  │  🔴🔴   🟢         🔴         🟢🟢         🔴                           │   │
│  │  │  │   │         │         │  │         │                           │   │
│  │  └──┴───┴─────────┴─────────┴──┴─────────┴───────────────────────────│   │
│  │  12:00    14:00    16:00    18:00    20:00    22:00    00:00    02:00 │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐             │
│  │  TIEMPO DE RESPUESTA          │  │  CACHE HIT RATIO             │            │
│  │  por módulo (promedio)        │  │                               │            │
│  │                               │  │  🟢 85% hits                │            │
│  │  mod-est:    45ms  🟢        │  │  Miss: 15%                  │            │
│  │  mod-matr:   120ms 🟡        │  │  Objetivo: >90%             │            │
│  │  mod-plan:   30ms  🟢        │  │                               │            │
│  └──────────────────────────────┘  └──────────────────────────────┘             │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │           ACTIVACIONES DE FALLBACK (últimas 24h)                          │   │
│  │                                                                           │   │
│  │   Estrategia       |   Total   |   Última hora   |   Tendencia           │   │
│  │  ────────────────────────────────────────────────────────────────────    │   │
│  │   Cache            |   1,234    |   23            |   → estable           │   │
│  │   Datos estáticos   |   56       |   2             |   → decreciente      │   │
│  │   Degradado         |   12       |   1             |   → estable           │   │
│  │   503               |   0        |   0             |   → sin cambios       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Alertas Recomendadas

| Alerta | Condición | Severidad | Acción |
|--------|-----------|-----------|--------|
| Módulo Unhealthy | `health_status{module} == 0` por >5 minutos | 🔴 Crítica | Notificar a Slack, crear ticket |
| Circuit Breaker Open | `circuit_breaker_state{module} == 1` | 🔴 Crítica | Notificar inmediatamente |
| Fallback Rate Alta | `fallback_activations_total > 100/hora` en cualquier módulo | 🟡 Advertencia | Revisar logs del módulo |
| Cache Hit Ratio Bajo | `cache_hit_ratio < 0.7` | 🟡 Advertencia | Revisar configuración de cache |
| Latencia Alta | `request_duration_seconds{module} > 5s` p90 | 🟡 Advertencia | Revisar rendimiento del módulo |
| Módulo Offline | `modules_offline > 0` por >30 minutos | 🟡 Advertencia | Revisar deployment |
| Caída de Redis | `cache_backend == 0` (memoria) en producción | 🔴 Crítica | Revisar servidor Redis |
| Caída de NATS | `nats_connected == 0` en producción | 🔴 Crítica | Revisar servidor NATS |

---

## 12. Inicialización del Sistema de Resiliencia

### 12.1 Orden de Inicialización

```python
# app/main.py — dentro de lifespan startup

async def initialize_resilience(app: FastAPI):
    """
    Inicializa todos los componentes del sistema de resiliencia.
    Orden de inicialización:
    1. Cache Manager (Redis / memoria)
    2. Fallback Manager (cargar datos estáticos)
    3. Health Monitor (loop de monitoreo)
    4. Circuit Breaker Registry (inicializado bajo demanda)
    """
    
    # 1. Cache Manager
    # ─────────────────────────────
    # Conectar a Redis.
    # Si Redis no está disponible, usar caché en memoria.
    # Esto permite que el sistema funcione sin Redis.
    from app.core.resilience.cache_manager import cache_manager
    await cache_manager.connect()
    print("✅ CacheManager: " + 
          ("Redis" if cache_manager._redis else "Memoria (fallback)"))

    # 2. Fallback Manager
    # ─────────────────────────────
    # Cargar datos de fallback estáticos desde archivos YAML.
    # Estos datos se usan cuando un módulo no está disponible
    # y no hay datos en caché.
    from app.core.resilience.fallback_manager import fallback_manager
    fallback_manager.setup_default_fallbacks()
    
    # 3. Health Monitor
    # ─────────────────────────────
    # Iniciar loop de health checks periódicos.
    # Cada 30 segundos verifica la salud de todos los módulos.
    from app.core.resilience.health_monitor import health_monitor
    await health_monitor.start_monitoring()
    
    # 4. Circuit Breaker Registry
    # ─────────────────────────────
    # Se inicializa bajo demanda (lazy).
    # Cada módulo obtiene su CircuitBreaker cuando se registra.
    # No requiere inicialización explícita.
    
    print("✅✅✅ Sistema de resiliencia inicializado correctamente")


# ── En el startup del Core ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... otros pasos de inicialización ...
    
    # 11. Inicializar Resilience
    await initialize_resilience(app)
    
    yield
    
    # SHUTDOWN
    from app.core.resilience.health_monitor import health_monitor
    await health_monitor.stop_monitoring()
    
    from app.core.resilience.cache_manager import cache_manager
    await cache_manager.close()
```

### 12.2 Estado del Sistema de Resiliencia

El endpoint `/core/status` incluye el estado del sistema de resiliencia:

```json
{
    "core": { ... },
    "modules": [ ... ],
    "resilience": {
        "cache": {
            "enabled": true,
            "backend": "redis",
            "connected": true,
            "hit_ratio": 0.85
        },
        "circuit_breakers": [
            {
                "module": "mod-estudiantes",
                "state": "closed",
                "failure_count": 0,
                "total_calls": 1523,
                "rejected_calls": 0
            },
            {
                "module": "mod-matricula",
                "state": "open",
                "failure_count": 5,
                "total_calls": 456,
                "rejected_calls": 23
            }
        ],
        "health_monitor": {
            "running": true,
            "interval_seconds": 30,
            "modules_tracking": 4
        },
        "fallback": {
            "static_fallbacks_loaded": 3,
            "static_fallbacks_modules": ["mod-estudiantes", "mod-matricula", "mod-planes-estudio"]
        }
    },
    "nats": { ... }
}
```

---

## 13. Historial de Cambios

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | 2026-06-26 | Equipo Arquitectura | Versión inicial del documento. Define filosofía de resiliencia, estrategias, Circuit Breaker, Health Monitor, Fallback Manager, Cache Manager, Timeout Management, Retry Policy, y monitoreo. |
