from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import BaseModel

class ProgramaEstudio(BaseModel):
    """Modelo para programas de estudio (carreras)"""
    __tablename__ = "programas_estudio"

    nombre = Column(String(255), nullable=False)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    descripcion = Column(Text)
    duracion_periodos = Column(Integer, default=6)
    creditos_totales = Column(Integer, nullable=False)
    plan_estudio_id = Column(Integer)
    modalidad = Column(String(50), default="presencial")
    estado = Column(String(20), default="activo")

    # Relaciones
    configuraciones = relationship("ProgramaConfiguracion", back_populates="programa")
    modulos = relationship("ProgramaModulo", back_populates="programa")
    requisitos = relationship("ProgramaRequisito", back_populates="programa")

class PeriodoAcademico(BaseModel):
    """Periodos académicos (Semestres)"""
    __tablename__ = "periodos_academicos"

    codigo = Column(String(20), unique=True, nullable=False) # Ej: 2024-I
    fecha_inicio = Column(TIMESTAMP, nullable=False)
    fecha_fin = Column(TIMESTAMP, nullable=False)
    estado = Column(String(20), default="planificacion") # planificacion, matricula_abierta, en_curso, cerrado
    
    # Nuevos campos para precisión de Matrícula Regular vs Extemporánea
    fecha_fin_matricula_regular = Column(TIMESTAMP)
    fecha_fin_matricula_extemporanea = Column(TIMESTAMP)

class ProgramaConfiguracion(BaseModel):
    """Configuración por periodo académico"""
    __tablename__ = "programa_configuraciones"

    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    periodo_academico = Column(Integer, nullable=False)
    turnos = Column(JSON)  # {mañana: bool, tarde: bool, noche: bool}
    coordinador_id = Column(Integer)
    max_estudiantes = Column(Integer, default=30)

    programa = relationship("ProgramaEstudio", back_populates="configuraciones")

class ProgramaModulo(BaseModel):
    """Módulos del programa"""
    __tablename__ = "programa_modulos"

    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    modulo_plan_id = Column(Integer)
    nombre = Column(String(255), nullable=False)
    periodo = Column(Integer, nullable=False)
    horas_totales = Column(Integer)
    creditos = Column(Integer)
    orden = Column(Integer)

    programa = relationship("ProgramaEstudio", back_populates="modulos")
    unidades = relationship("ProgramaUnidad", back_populates="modulo")

class ProgramaUnidad(BaseModel):
    """Unidades de cada módulo"""
    __tablename__ = "programa_unidades"

    programa_modulo_id = Column(Integer, ForeignKey("programa_modulos.id"), nullable=False)
    unidad_plan_id = Column(Integer)
    nombre = Column(String(255), nullable=False)
    horas_teoria = Column(Integer, default=0)
    horas_practica = Column(Integer, default=0)
    creditos = Column(Integer)
    orden = Column(Integer)

    modulo = relationship("ProgramaModulo", back_populates="unidades")

class ProgramaRequisito(BaseModel):
    """Requisitos de titulación"""
    __tablename__ = "programa_requisitos"

    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    tipo_requisito = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    obligatorio = Column(Boolean, default=True)

    programa = relationship("ProgramaEstudio", back_populates="requisitos")

class CargaLectiva(BaseModel):
    """Programación Académica: Asignación de Docente a Unidad Didáctica"""
    __tablename__ = "carga_lectiva"

    periodo_id = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    docente_id = Column(Integer, nullable=False) # Referencia a core_users
    unidad_didactica_id = Column(Integer, nullable=False) # Referencia a la UD en Planes de Estudio
    turno = Column(String(50)) # Mañana, Tarde, Noche
    seccion = Column(String(10)) # A, B, C
    estado = Column(String(30), default="borrador") # borrador, revision, publicado

class Silabo(BaseModel):
    """Sílabo elaborado por el Docente para una Carga Lectiva"""
    __tablename__ = "silabos"

    carga_lectiva_id = Column(Integer, ForeignKey("carga_lectiva.id"), unique=True, nullable=False)
    estado = Column(String(30), default="borrador") # borrador, presentado, aprobado, observado
    archivo_url = Column(String(255))
    observaciones = Column(Text)

class PlanTrabajoDocente(BaseModel):
    """Plan de trabajo del Docente por Periodo"""
    __tablename__ = "planes_trabajo_docente"

    periodo_id = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    docente_id = Column(Integer, nullable=False)
    estado = Column(String(30), default="borrador") # borrador, presentado, aprobado, observado
    archivo_url = Column(String(255))
    observaciones = Column(Text)

class Tutoria(BaseModel):
    """Asignación de Tutoría por Ciclo"""
    __tablename__ = "tutorias"

    periodo_id = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    docente_id = Column(Integer, nullable=False)
    ciclo = Column(Integer, nullable=False) # 1, 2, 3, 4, 5, 6
    observaciones = Column(Text)

class HorarioPeriodo(BaseModel):
    """Horario en Excel subido por el Coordinador"""
    __tablename__ = "horarios_periodo"

    periodo_id = Column(Integer, ForeignKey("periodos_academicos.id"), nullable=False)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    estado = Column(String(30), default="borrador") # borrador, revision, publicado
    archivo_excel_url = Column(String(255), nullable=False)
    observaciones = Column(Text)