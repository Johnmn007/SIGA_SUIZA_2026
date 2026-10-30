from sqlalchemy import Column, JSON, String, Integer, Date, Boolean, Text, Float, ForeignKey, TIMESTAMP, Numeric, func
from sqlalchemy.orm import relationship
from database import BaseModel

class Estudiante(BaseModel):
    __tablename__ = "estudiantes"

    codigo_estudiante = Column(String(20), unique=True, index=True, nullable=False)
    dni = Column(String(15), unique=True, index=True, nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    programa_id = Column(Integer, index=True) # Agregado para filtrar por programa
    email_institucional = Column(String(150), unique=True)
    email_personal = Column(String(150))
    celular = Column(String(20))
    direccion_domicilio = Column(String(255))
    estado_academico = Column(String(30), default="postulante")
    foto_url = Column(Text)
    observaciones = Column(Text)
    pago_matricula = Column(Boolean, default=False)
    documentos_completos = Column(Boolean, default=True)
    fecha_limite_documentos = Column(TIMESTAMP)
    modalidad_admision = Column(String(100), default="ORDINARIO")
    metadata_admision = Column(JSON, default={})
    # Proceso de matrícula (sección 2: alumnos históricos; sección 3: ciclo)
    plan_estudios_id = Column(Integer, index=True)  # Plan de ORIGEN (históricos)
    ciclo_actual = Column(Integer, default=1)

class Matricula(BaseModel):
    __tablename__ = "matriculas"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    programa_id = Column(Integer, index=True, nullable=False) # Refers to mod-programas-estudio
    periodo_id = Column(Integer, index=True, nullable=False) # Refers to mod-programas-estudio
    tipo_ingreso = Column(String(50))
    estado_matricula = Column(String(30), default="pendiente")
    observaciones = Column(String(255))

    # Resultado del motor de matrícula (diagrama, secciones 3-8)
    ciclo = Column(Integer)                     # Ciclo al que corresponde
    casuistica = Column(String(50))             # Ingresante/Regular/Irregular/...
    boleta_codigo = Column(String(64), index=True)  # Código único de la boleta QR
    boleta_emitida_en = Column(TIMESTAMP)       # Fecha de emisión de la boleta
    consolidada = Column(Boolean, default=False)    # Ya pasó por "resultado final"
    registro_academico = Column(String(50))     # Código de registro académico

    # Relación con el detalle de la matrícula (las UDs matriculadas)
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

# ---------------------------------------------------------------------------
# Tesorería y Caja (tarifario TUPA, recibos de caja y configuración de cobro)
# ---------------------------------------------------------------------------

class ConceptoTupa(BaseModel):
    __tablename__ = "tesoreria_conceptos"

    codigo = Column(String(30), index=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    categoria = Column(String(100), default="Otros")
    descripcion = Column(Text)
    tipo_precio = Column(String(20), default="fijo")  # fijo | tarifas | libre
    tarifas = Column(JSON, default=list)               # [{id, nombre, monto}]
    monto_minimo = Column(Numeric(10, 2), default=0)
    libera_matricula = Column(Boolean, default=False)  # Al pagarse habilita la matrícula
    permite_repetir = Column(Boolean, default=False)   # Se puede cobrar más de una vez al mismo alumno
    activo = Column(Boolean, default=True, index=True) # Baja lógica: los recibos emitidos se conservan

class PagoCaja(BaseModel):
    __tablename__ = "tesoreria_pagos"

    codigo_recibo = Column(String(30), unique=True, index=True, nullable=False)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    # Datos del alumno y del concepto al momento del pago (el recibo no cambia si luego se editan)
    dni = Column(String(15), index=True, nullable=False)
    estudiante_nombre = Column(String(255), nullable=False)
    codigo_estudiante = Column(String(20))
    carrera_nombre = Column(String(255))
    concepto_id = Column(Integer, ForeignKey("tesoreria_conceptos.id"), index=True)
    concepto_codigo = Column(String(30), index=True, nullable=False)
    concepto_nombre = Column(String(255), nullable=False)
    concepto_categoria = Column(String(100))
    tipo_precio = Column(String(20))
    tarifa_nombre = Column(String(100))
    monto = Column(Numeric(10, 2), nullable=False)
    metodo_pago_id = Column(String(30), nullable=False)
    metodo_pago_nombre = Column(String(100), nullable=False)
    numero_operacion = Column(String(100))
    cajero = Column(String(150))
    registrado_por = Column(String(150))               # Correo del usuario autenticado
    observaciones = Column(Text)
    libera_matricula = Column(Boolean, default=False)
    estado = Column(String(20), default="PAGADO", index=True)
    fecha_pago = Column(TIMESTAMP, nullable=False)
    qr_contenido = Column(Text)                        # Datos del pago grabados en el QR al momento de cobrar

class ConfiguracionCaja(BaseModel):
    __tablename__ = "tesoreria_configuracion"

    clave = Column(String(50), unique=True, index=True, nullable=False)
    valor = Column(JSON, default=dict)
