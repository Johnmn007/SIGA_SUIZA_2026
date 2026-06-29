from sqlalchemy import Column, Integer, String
from database import BaseModel

class RegistroEvaluacion(BaseModel):
    """
    Registro de notas para un estudiante en una Unidad Didáctica específica.
    Cada registro corresponde a un `matricula_detalle_id` único.
    """
    __tablename__ = "evaluacion_registros"

    matricula_detalle_id = Column(Integer, unique=True, index=True, nullable=False)
    estudiante_id = Column(Integer, index=True, nullable=False)
    unidad_didactica_id = Column(Integer, index=True, nullable=False)
    periodo_id = Column(Integer, index=True, nullable=False)

    # Calificaciones según Sistema Vigesimal (0-20)
    nota_c1 = Column(Integer, nullable=True) # Capacidad 1
    nota_c2 = Column(Integer, nullable=True) # Capacidad 2
    nota_c3 = Column(Integer, nullable=True) # Capacidad 3
    
    nota_final = Column(Integer, nullable=True) # Promedio calculado
    estado = Column(String(20), default="cursando") # cursando, aprobado, desaprobado
