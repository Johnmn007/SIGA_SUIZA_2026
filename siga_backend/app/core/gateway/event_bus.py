import asyncio
import json
from typing import Callable, Dict, List, Optional
import logging
from nats.aio.client import Client as NATS
from nats.errors import TimeoutError, NoServersError

from ..config import settings
from .event_schemas import BaseEvent, EventFactory

logger = logging.getLogger(__name__)

class NATSEventBus:
    """Bus de eventos usando NATS para comunicación entre microservicios"""
    
    def __init__(self):
        self.nc = NATS()
        self.connected = False
        self.subscriptions: Dict[str, List[Callable]] = {}
        
    async def connect(self) -> bool:
        """Conecta al servidor NATS"""
        if self.connected:
            return True
            
        try:
            await asyncio.wait_for(
                self.nc.connect(
                    servers=[settings.nats_url],
                    max_reconnect_attempts=5,
                    reconnect_time_wait=2
                ),
                timeout=3
            )
            self.connected = True
            logger.info("NATS Event Bus conectado")
            return True
            
        except (NoServersError, asyncio.TimeoutError):
            logger.error("No se pudo conectar a NATS - Verifica que el servidor esté ejecutándose")
            return False
        except Exception as e:
            logger.error(f"Error conectando a NATS: {e}")
            return False
    
    async def publish(self, event: BaseEvent) -> bool:
        """Publica un evento en el bus"""
        if not self.connected:
            # Intentar reconexión rápida
            if not await self.connect():
                logger.warning("⚠️  Event Bus no conectado - Evento no publicado")
                return False
            
        try:
            # Publicar en el subject correspondiente al tipo de evento
            subject = f"events.{event.event_type.value}"
            message = event.model_dump_json()
            
            await self.nc.publish(subject, message.encode())
            logger.debug(f"📨 Evento publicado: {event.event_type} -> {subject}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error publicando evento: {e}")
            return False

    async def publish_raw(self, subject: str, data: Dict) -> bool:
        """Publica datos crudos en un subject específico"""
        if not self.connected:
            if not await self.connect():
                return False
        
        try:
            message = json.dumps(data).encode()
            await self.nc.publish(subject, message)
            return True
        except Exception as e:
            logger.error(f"❌ Error en publish_raw: {e}")
            return False
    
    async def subscribe(self, event_type: str, callback: Callable) -> bool:
        """Suscribe una función callback a un tipo de evento"""
        if not self.connected:
            if not await self.connect():
                logger.warning("⚠️  Event Bus no conectado - No se puede suscribir")
                return False
            
        try:
            subject = f"events.{event_type}"
            
            # Registrar callback localmente
            if event_type not in self.subscriptions:
                self.subscriptions[event_type] = []
            self.subscriptions[event_type].append(callback)
            
            # Suscribirse en NATS
            await self.nc.subscribe(subject, cb=self._create_message_handler(event_type, callback))
            logger.debug(f"📥 Suscrito a eventos: {event_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error suscribiéndose a {event_type}: {e}")
            return False
    
    def _create_message_handler(self, event_type: str, callback: Callable):
        """Crea manejador de mensajes para NATS con reconstrucción de eventos"""
        async def message_handler(msg):
            try:
                data = json.loads(msg.data.decode())
                # Intentar reconstruir el evento usando BaseEvent o clase específica si fuera necesario
                # Por ahora usamos BaseEvent ya que es la base de todos
                event = BaseEvent(**data)
                
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error(f"❌ Error procesando mensaje en {event_type}: {e}")
        
        return message_handler
    
    async def request(self, subject: str, data: Dict, timeout: float = 5.0) -> Optional[Dict]:
        """Envía una solicitud y espera respuesta (patrón request-reply)"""
        if not self.connected:
            return None
            
        try:
            message = json.dumps(data).encode()
            response = await self.nc.request(subject, message, timeout=timeout)
            return json.loads(response.data.decode())
        except TimeoutError:
            logger.warning(f"⏰ Timeout en request: {subject}")
            return None
        except Exception as e:
            logger.error(f"❌ Error en request {subject}: {e}")
            return None
    
    async def close(self):
        """Cierra la conexión NATS"""
        if self.connected:
            await self.nc.close()
            self.connected = False
            logger.info("🔌 NATS Event Bus desconectado")

# Instancia global del Event Bus
event_bus = NATSEventBus()