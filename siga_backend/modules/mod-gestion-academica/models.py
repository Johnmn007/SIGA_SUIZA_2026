from sqlalchemy import Column, String, Integer, Date, Boolean, Text, Float, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from database import BaseModel

class Estudiante(BaseModel):
    __tablename__ = "estudiantes"

    codigo_estudiante = Column(String(20), unique=True, index=True, nullable=False)
    dni = Column(String(15), unique=True, index=True, nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    email_institucional = Column(String(150), unique=True)
    email_personal = Column(String(150))
    celular = Column(String(20))
    direccion_domicilio = Column(String(255))
    estado_academico = Column(String(30), default="postulante")
    foto_url = Column(String(255))
    observaciones = Column(Text)
    pago_matricula = Column(Boolean, default=False)
    documentos_completos = Column(Boolean, default=True)
    fecha_limite_documentos = Column(TIMESTAMP)

class Matricula(BaseModel):
    __tablename__ = "matriculas"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    programa_id = Column(Integer, index=True, nullable=False) # Refers to mod-programas-estudio
    periodo_id = Column(Integer, index=True, nullable=False) # Refers to mod-programas-estudio
    tipo_ingreso = Column(String(50))
    estado_matricula = Column(String(30), default="pendiente")
    observaciones = Column(String(255))

    # Relación con el detalle de la matrícula (las UDs matriculadas)
    from sqlalchemy.orm import relationship
    detalles = relationship("MatriculaDetalle", back_populates="matricula", cascade="all, delete-orphan")

class MatriculaDetalle(BaseModel):
    __tablename__ = "matricula_detalles"

    matricula_id = Column(Integer, ForeignKey("matriculas.id"), index=True, nullable=False)
    unidad_didactica_id = Column(Integer, index=True, nullable=False) # Refers to mod-planes-estudio -> UnidadPlan
    creditos = Column(Integer, nullable=False)
    estado_curso = Column(String(30), default="cursando") # cursando, aprobado, desaprobado, retirado
    
    matricula = relationship("Matricula", back_populates="detalles")

class HistorialAcademico(BaseModel):
    __tablename__ = "historial_academico"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    periodo_id = Column(Integer, index=True) # Referencia al periodo en que cambia
    estado = Column(String(50), nullable=False) # Reserva, Reingreso, Egreso, Titulado, Abandono
    fecha_registro = Column(Date, default=func.current_date())
    resolucion = Column(String(100)) # Opcional: RM o RD que avala el estado
    observaciones = Column(Text)

class BeneficioEstudiante(BaseModel):
    __tablename__ = "beneficios_estudiante"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    tipo_beneficio = Column(String(100), nullable=False) # Beca 18, Convenio FF.AA., Excelencia
    porcentaje_descuento = Column(Float, nullable=False) # 100.0, 20.0, etc.
    condicion_mantenimiento = Column(String(255)) # "Promedio >= 14"
    periodo_validez_inicio_id = Column(Integer, index=True, nullable=False)
    periodo_validez_fin_id = Column(Integer, index=True) # Puede ser nulo si es permanente
    activo = Column(Boolean, default=True)

class RegistroPractica(BaseModel):
    __tablename__ = "registros_practicas"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    modulo_formativo_id = Column(Integer, index=True, nullable=False) # A qué módulo pertenece la práctica
    centro_labores = Column(String(255), nullable=False)
    representante_centro = Column(String(150))
    horas_acumuladas = Column(Integer, default=0)
    estado_aprobacion = Column(String(50), default="en_proceso") # aprobado, en_proceso, rechazado
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)

class ResolucionConvalidacion(BaseModel):
    __tablename__ = "resoluciones_convalidacion"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    numero_resolucion = Column(String(100), nullable=False, unique=True)
    fecha_emision = Column(Date, nullable=False)
    tipo_convalidacion = Column(String(100), nullable=False) # Traslado Interno, Externo, Experiencia
    institucion_origen = Column(String(255)) # En caso de traslado externo
    estado = Column(String(50), default="aprobado")

class ConvalidacionDetalle(BaseModel):
    __tablename__ = "convalidaciones_detalle"

    resolucion_id = Column(Integer, ForeignKey("resoluciones_convalidacion.id"), index=True, nullable=False)
    unidad_destino_id = Column(Integer, index=True, nullable=False) # UD del plan actual
    curso_origen = Column(String(255), nullable=False) # Nombre de la UD origen o código
    nota_reconocida = Column(Float)
    creditos_reconocidos = Column(Integer)
    
    resolucion = relationship("ResolucionConvalidacion", backref="detalles")

class SolicitudTramite(BaseModel):
    __tablename__ = "solicitudes_tramites"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    tipo_tramite = Column(String(100), nullable=False) # Constancia Estudios, Certificado, Reserva
    estado = Column(String(50), default="pendiente") # pendiente, en_proceso, emitido, rechazado
    fecha_solicitud = Column(Date, default=func.current_date())
    fecha_resolucion = Column(Date)
    documento_url = Column(String(255)) # Si es digital
    observaciones = Column(Text)
