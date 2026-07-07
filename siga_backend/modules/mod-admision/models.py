from sqlalchemy import Column, Integer, String, JSON, Boolean
from database import Base

class PostulanteAdmitido(Base):
    __tablename__ = "admision_postulantes"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String(20), unique=True, index=True)
    nombres = Column(String(100))
    apellidos = Column(String(100))
    programa_nombre = Column(String(150))
    modalidad_admision = Column(String(100))
    email = Column(String(150), nullable=True)
    celular = Column(String(20), nullable=True)
    fecha_nacimiento = Column(String(20), nullable=True)
    
    # Todos los demas campos del Excel
    metadata_admision = Column(JSON, default={})
    
    # Estado de sincronizacion con SIGA Core
    sincronizado = Column(Boolean, default=False)
