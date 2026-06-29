# Lógica de Negocio Académico

> **Versión:** 1.0 | **Última actualización:** Junio 2026 | **Estándar:** SIGA-BIZ-1.0

---

## 1. Contexto Institucional

### 1.1 Datos Generales del IESTP

| Propiedad | Valor |
|-----------|-------|
| Nombre | IESTP Público Peruano (ej: "Suiza") |
| Nivel | Educación Superior Tecnológica |
| Modalidad | Presencial |
| Programas | 11 carreras profesionales técnicas |
| Duración | 3 años (6 ciclos académicos) |
| Escala | 0 – 20 |
| Mínima aprobatoria | 13 |
| Régimen | Semestral (Ciclo I: Abril-Agosto, Ciclo II: Septiembre-Febrero) |

### 1.2 Programas de Estudio

| Código | Programa | Módulos | UDs |
|--------|----------|---------|-----|
| DSI | Desarrollo de Sistemas de Información | 3 | 28 |
| ENF | Enfermería Técnica | 3 | 30 |
| MEC | Mecánica de Producción | 3 | 26 |
| ELT | Electrotecnia Industrial | 3 | 27 |
| CON | Contabilidad | 3 | 29 |
| ADM | Administración de Empresas | 3 | 28 |
| GAS | Gastronomía | 3 | 25 |
| GUI | Guía Oficial de Turismo | 3 | 26 |
| AGR | Agroindustria | 3 | 27 |
| MIN | Minería | 3 | 26 |
| LAB | Laboratorio Clínico | 3 | 30 |

---

## 2. Jerarquía Académica

### 2.1 Estructura Jerárquica

INSTITUCION (IESTP)
  +-- PROGRAMA DE ESTUDIO (11)
  |     +-- PLAN DE ESTUDIO (versiones: 2024-01, 2027-01)
  |           +-- MODULO FORMATIVO (3 por programa)
  |                 +-- UNIDAD DIDACTICA (25-30 por programa, 8-12 por modulo)
  |                       +-- CAPACIDAD (4-10 por UD)
  |                             +-- INDICADOR DE LOGRO (2-4 por capacidad)

### 2.2 Modelo Entidad-Relacion

```sql
CREATE TABLE programas_estudio (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    duracion_ciclos INTEGER NOT NULL DEFAULT 6,
    resolucion_creacion VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planes_estudio (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER NOT NULL REFERENCES programas_estudio(id),
    version VARCHAR(20) NOT NULL,
    vigencia_inicio DATE NOT NULL,
    vigencia_fin DATE,
    resolucion_aprobacion VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    perfil_egreso JSONB,
    programa_estudios JSONB,
    capacidades JSONB,
    organizacion_modular JSONB,
    detalle_modulos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(programa_id, version)
);

CREATE TABLE modulos_formativos (
    id SERIAL PRIMARY KEY,
    plan_estudio_id INTEGER NOT NULL REFERENCES planes_estudio(id),
    programa_id INTEGER NOT NULL REFERENCES programas_estudio(id),
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    orden INTEGER NOT NULL,
    horas INTEGER NOT NULL DEFAULT 0,
    creditos INTEGER NOT NULL DEFAULT 0,
    unidades_competencia TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unidades_didacticas (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER NOT NULL REFERENCES modulos_formativos(id),
    plan_estudio_id INTEGER NOT NULL REFERENCES planes_estudio(id),
    programa_id INTEGER NOT NULL REFERENCES programas_estudio(id),
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    ciclo INTEGER NOT NULL CHECK (ciclo >= 1 AND ciclo <= 6),
    creditos INTEGER NOT NULL CHECK (creditos >= 1 AND creditos <= 6),
    horas_teoria INTEGER NOT NULL DEFAULT 0,
    horas_practica INTEGER NOT NULL DEFAULT 0,
    horas_virtual INTEGER NOT NULL DEFAULT 0,
    tipo_competencia VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prerrequisitos (
    id SERIAL PRIMARY KEY,
    unidad_didactica_id INTEGER NOT NULL REFERENCES unidades_didacticas(id),
    prerrequisito_id INTEGER NOT NULL REFERENCES unidades_didacticas(id),
    tipo VARCHAR(20) DEFAULT 'obligatorio',
    UNIQUE(unidad_didactica_id, prerrequisito_id)
);

CREATE TABLE capacidades (
    id SERIAL PRIMARY KEY,
    unidad_didactica_id INTEGER NOT NULL REFERENCES unidades_didacticas(id),
    codigo VARCHAR(10) NOT NULL,
    descripcion TEXT NOT NULL,
    orden INTEGER NOT NULL,
    UNIQUE(unidad_didactica_id, codigo)
);

CREATE TABLE indicadores_logro (
    id SERIAL PRIMARY KEY,
    capacidad_id INTEGER NOT NULL REFERENCES capacidades(id),
    codigo VARCHAR(10) NOT NULL,
    descripcion TEXT NOT NULL,
    orden INTEGER NOT NULL,
    UNIQUE(capacidad_id, codigo)
);
```

---

## 3. Estructura del Plan de Estudios (MINEDU)

### 3.1 Libros del Plan de Estudios

| Libro | Contenido |
|-------|-----------|
| Libro 1 - Perfil de Egreso | Competencias especificas (UC1-UC4) y de empleabilidad (CE1-CE9) |
| Libro 2 - Programa de Estudios | Unidades de competencia e indicadores |
| Libro 3 - Capacidades | Matriz modulo-capacidad-indicador |
| Libro 4 - Organizacion Modular | Distribucion de modulos por ciclos |
| Libro 5 - Detalle por Modulo | Contenidos, horas, perfil docente |

---

## 4. Reglas Academicas

### 4.1 Sistema de Evaluacion

| Regla | Valor |
|-------|-------|
| Escala | 00.00 - 20.00 |
| Nota minima aprobatoria | 13.00 |
| Nota minima en examen final | 06.00 (menos de 06 = nota final 00) |
| Tipos de evaluacion | PC, EP, EF, TF, PA |

### 4.2 Calculo de Nota Final por UD

Formula:
  NF = (PC1 x 0.15) + (PC2 x 0.15) + (EP x 0.25) + (TF x 0.15) + (EF x 0.30)

### 4.3 Promedio General del Ciclo

Formula:
  PG = SUM(NF_UD x Creditos_UD) / SUM(Creditos_UD)

### 4.4 Promocion por Ciclo (Regla del 70%)

- REGULAR: Aprueba todas las UDs del ciclo
- IRREGULAR: Desaprueba <= 70% de creditos del ciclo. Se matricula en el siguiente ciclo con las UDs desaprobadas (lleva curso).
- REPITE: Desaprueba > 70% de creditos del ciclo. Debe repetir el ciclo completo.

### 4.5 Limites de Credito

| Concepto | Valor |
|----------|-------|
| Minimo por ciclo | 12 creditos |
| Maximo por ciclo | 24 creditos |
| Recomendado | 18-22 creditos |
| Maximo UDs desaprobadas | 4 |

### 4.6 Tipos de Matrícula

`
CICLO I - AUTOMATICA
- Estudiante nuevo ingresa
- Sistema asigna automaticamente todas las UDs del primer ciclo
- No aplica validacion de prerrequisitos
- No aplica limite de creditos
- Estado inicial: REGULAR

CICLOS II-VI - ASISTIDA
- Estudiante selecciona UDs de un catalogo
- Sistema valida: prerrequisitos, creditos (12-24), estado promocion, UDs desaprobadas
- Sistema sugiere carga optima
- Requiere confirmacion del estudiante

MATRICULA EXTEMPORANEA
- Fuera de periodo regular
- Requiere aprobacion de secretaria academica
- Penalidad configurable
- Solo si hay vacantes

RETIRO DE CURSO
- Hasta la 4ta semana del ciclo
- No aplica para Ciclo I
- Maximo 2 UDs retiradas por ciclo
- La UD retirada no cuenta como desaprobada
`

---

## 5. Procesos Academicos

### 5.1 Proceso de Matricula

Fase 1: PUBLICACION DE VACANTES (Secretaria)
  - Secretaria Academica abre periodo de matricula
  - Sistema muestra UDs disponibles por programa y ciclo

Fase 2: PRE-MATRICULA (Estudiante)
  - Ciclo I: Automatica (asignacion completa)
  - Ciclos II-VI: Estudiante selecciona UDs
    - Sistema valida prerrequisitos
    - Sistema verifica limite de creditos
    - Sistema sugiere carga optima
  - Estudiante confirma seleccion

Fase 3: VALIDACION (Sistema)
  - Verificar estado academico (regular/irregular/repite)
  - Verificar creditos minimos y maximos
  - Verificar prerrequisitos (solo para irregulares)
  - Generar resumen de matricula

Fase 4: CONFIRMACION (Secretaria)
  - Revisar casos especiales (si aplica)
  - Aprobar matricula
  - Sistema actualiza estado

Fase 5: PUBLICACION
  - Estudiante recibe confirmacion
  - Docentes reciben listas de aula
  - Sistema genera actas de matricula

### 5.2 Proceso de Evaluacion

Fase 1: APERTURA DE PERIODO (Administrativo)
  - Secretaria activa periodo de evaluacion
  - Docentes acceden a registro de notas

Fase 2: REGISTRO DE NOTAS (Docente)
  - Ingresa notas parciales durante el ciclo
  - Sistema valida: 0-20
  - Tipos: practicas calificadas, examen parcial, trabajos, examen final
  - Nota final se calcula automaticamente

Fase 3: CALCULO AUTOMATICO (Sistema)
  - Promedio ponderado por UD
  - Estado (aprobado/desaprobado)
  - Promedio general del ciclo
  - % creditos aprobados
  - Estado de promocion (regular/irregular/repite)

Fase 4: PUBLICACION (Administrativo)
  - Secretaria revisa y publica actas
  - Estudiantes consultan notas
  - Sistema genera alertas de riesgo

Fase 5: CIERRE
  - Periodo de recuperacion (si aplica)
  - Actualizacion de historial academico
  - Preparacion para siguiente ciclo

---

## 6. Alertas Tempranas

### 6.1 Catalogo de Alertas

| Alerta | Disparador | Destinatario | Accion | Prioridad |
|--------|-----------|-------------|--------|-----------|
| AL-01: Riesgo de Repitencia | Nota < 13 en 2+ evaluaciones consecutivas | Tutor, Estudiante | Notificar, programar tutoria | Alta |
| AL-02: Inasistencia Critica | Faltas > 20% del total de horas del ciclo | Docente, Secretaria | Notificar, citar a apoderado | Alta |
| AL-03: Bajo Rendimiento | Promedio parcial < 11 | Tutor, Estudiante | Cita con tutor academico | Media |
| AL-04: Desercion Potencial | Estudiante no se matricula 2 semanas despues del inicio | Secretaria, Tutor | Contactar al estudiante | Alta |
| AL-05: Excelencia Academica | Promedio >= 18 | Direccion, Estudiante | Felicitacion, reconocimiento | Baja |
| AL-06: Sobrecarga Academica | Estudiante irregular con > 22 creditos | Tutor, Estudiante | Recomendar ajuste de carga | Media |
| AL-07: Progreso Lento | Estudiante reprueba el mismo ciclo 2+ veces | Direccion, Tutor | Revision de situacion academica | Alta |

---

## 7. Reglas de Negocio por Tipo de Estudiante

### 7.1 Clasificacion de Estudiantes

| Tipo | Descripcion | Reglas Especiales |
|------|-------------|-------------------|
| Nuevo | Ingresa por primera vez al IESTP | Matricula automatica en Ciclo I; no aplican prerrequisitos; no aplica limite de creditos |
| Regular | Aprobo todas las UDs del ciclo anterior | Matricula completa en siguiente ciclo; prerrequisitos estandar |
| Irregular | Desaprobo <=70% de creditos del ciclo anterior | Matricula en siguiente ciclo + UDs desaprobadas; priorizar desaprobadas; limite 24 creditos |
| Repitente | Desaprobo >70% de creditos del ciclo anterior | Repite ciclo completo; no puede avanzar; maximo 3 repitencias permitidas |
| Trasladado | Viene de otro IESTP | Convalidacion de UDs cursadas; ubicacion en ciclo segun UDs convalidadas |
| Reingresante | Estuvo ausente 1+ ciclos y retoma estudios | Evaluacion de convalidacion; posible ubicacion en ciclo anterior |

### 7.2 Matriz de Validaciones por Tipo

| Validacion | Nuevo | Regular | Irregular | Repitente | Trasladado | Reingresante |
|-----------|-------|---------|-----------|-----------|------------|--------------|
| Matricula automatica Ciclo I | Si | No | No | No | No | No |
| Validacion de prerrequisitos | No | Si | Si | N/A | Segun convalidacion | Segun convalidacion |
| Limite de creditos (12-24) | No | Si | Si | Si | Si | Si |
| Priorizar UDs desaprobadas | N/A | No | Si | N/A | No | No |
| Repite ciclo completo | No | No | No | Si | No | No |
| Convalidacion de UDs | No | No | No | No | Si | Si |
| Carga sugerida automatica | Si | Si | Si | Si | Si | Si |

---

## 8. Reportes y Estadisticas

### 8.1 Catalogo de Reportes

| Reporte | Frecuencia | Destinatario | Descripcion |
|---------|-----------|-------------|-------------|
| Actas de Evaluacion | Por ciclo | Secretaria | Notas finales por UD y estudiante |
| Boletin de Notas | Por ciclo | Estudiante | Notas, promedios, estado |
| Nomina de Matricula | Por ciclo | Docentes | Lista de estudiantes por UD |
| Reporte MINEDU (SISEDU) | Anual | Direccion | Estadisticas institucionales |
| Tasa de Aprobacion | Por ciclo | Direccion | % aprobados por UD y programa |
| Tasa de Desercion | Anual | Direccion | % estudiantes que abandonan |
| Eficiencia Terminal | Anual | Direccion | % que egresan vs. ingresan |
| Alertas por Programa | Quincenal | Tutores | Estudiantes en riesgo |

### 8.2 Indicadores Academicos

| Indicador | Formula | Proposito |
|-----------|---------|-----------|
| Tasa de Aprobacion | (N° aprobados / N° matriculados) x 100 | Calidad educativa |
| Tasa de Desercion | (N° retirados / N° matriculados) x 100 | Retencion estudiantil |
| Promedio General | Suma(NF) / N° UDs | Rendimiento global |
| Eficiencia Terminal | (N° egresados / N° ingresados) x 100 | Efectividad del programa |
| Tasa de Repitencia | (N° que repiten / N° matriculados) x 100 | Dificultades academicas |

---

## 9. Glosario de Terminos Academicos

| Termino | Definicion |
|---------|-----------|
| UD | Unidad Didactica. Curso/materia individual dentro de un programa. |
| Modulo Formativo | Conjunto de UDs que desarrollan una competencia especifica. |
| Ciclo Academico | Periodo semestral de estudios (18 semanas lectivas + 2 de examenes). |
| Credito | Unidad de valor academico (1 credito aprox. 16-18 horas de clase). |
| Prerrequisito | UD que debe ser aprobada antes de cursar otra. |
| Lleva Curso | Situacion del estudiante irregular que cursa UDs desaprobadas junto con las del siguiente ciclo. |
| Plan de Estudio | Documento normativo que define la estructura academica completa de un programa. |
| Perfil de Egreso | Conjunto de competencias que el estudiante debe alcanzar al culminar el programa. |
| Competencia | Capacidad demostrable para aplicar conocimientos, habilidades y actitudes. |
| Indicador de Logro | Criterio medible que demuestra el dominio de una capacidad. |
| MINEDU | Ministerio de Educacion del Peru. |
| SISEDU | Sistema de Informacion del MINEDU para reportes oficiales. |
| ROF | Reglamento de Organizacion y Funciones del IESTP. |

---

## 10. Historial de Cambios

| Fecha | Version | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-26 | 1.0 | Arquitecto SIGA | Version inicial del documento de logica de negocio |

