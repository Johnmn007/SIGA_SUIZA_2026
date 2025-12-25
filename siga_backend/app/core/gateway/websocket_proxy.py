from fastapi import WebSocket, WebSocketDisconnect
import logging
from typing import Dict

logger = logging.getLogger(__name__)

class WebSocketGateway:
    """Gateway para WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Acepta conexión WebSocket"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"🔌 WebSocket conectado: {client_id}")
    
    def disconnect(self, client_id: str):
        """Desconecta WebSocket"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"🔌 WebSocket desconectado: {client_id}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """Envía mensaje a cliente específico"""
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)
    
    async def broadcast(self, message: str):
        """Envía mensaje a todos los clientes conectados"""
        for connection in self.active_connections.values():
            await connection.send_text(message)

# Instancia global
ws_gateway = WebSocketGateway()