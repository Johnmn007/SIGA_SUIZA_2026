from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from datetime import datetime
from app.core.database import Base

class CoreModule(Base):
    """Persistencia de Módulos Registrados en el API Gateway"""
    __tablename__ = "core_modules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    version = Column(String(20), nullable=False)
    api_version = Column(String(20))
    description = Column(String(255))
    endpoints = Column(JSON, nullable=False)
    events = Column(JSON)
    permissions = Column(JSON)
    health_check = Column(String(100))
    config = Column(JSON)
    
    status = Column(String(50), default="discovered")
    is_active = Column(Boolean, default=True)
    
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_health_check = Column(DateTime, nullable=True)
    compliance_data = Column(JSON, nullable=True)
