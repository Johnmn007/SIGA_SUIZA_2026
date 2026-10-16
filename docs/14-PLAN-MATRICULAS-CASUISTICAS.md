# Arquitectura de Matrículas y Gestión de Periodos

> **Versión:** 2.7 | **Última actualización:** 2026-08-29 | **Estado:** Implementado (MVP v1.1)

Este documento detalla la estructura lógica para automatizar la gestión de periodos académicos y resolver las distintas casuísticas de matrícula del IESTP.

---

## 1. Gestión de Periodos Académicos (El Motor del Tiempo)

Actualmente los periodos se inyectaron manualmente. La configuración institucional **no es un módulo nuevo**: se resuelve con **configuración interna vía secretos/BD** (parametrización de reglas como rangos de créditos y umbrales de notas). No existe un módulo "Configuración Institucional" ni un componente `AcademicConfig.jsx`.

**Convención de periodos (regla canónica):** se crean **2 periodos por año** con nombre `YYYY-N` — `2026-1` (**Abril–Agosto**) y `2026-2` (**Agosto–Diciembre**). Los crea el **encargado** (Secretaría Académica / Super Admin) desde **`mod-gestion-academica`**; la configuración vive en backend/BD (DOC-15 §4).

### 1.1. Ciclo de Vida del Periodo Académico
Un periodo (ej. `2026-I`) debe tener los siguientes estados automatizados por fechas:
1. **Planificación:** El periodo está creado. Incluye la **precarga de los cursos de los ciclos del semestre** (impares en `YYYY-1`, pares en `YYYY-2`, DOC-15 §4.1). Se asignan docentes a las Unidades Didácticas (UD) **por malla en coexistencia** cuando corresponde (DOC-15 §4.3: un mismo ciclo puede tener grupos de ambas mallas) y se configuran horarios. (Los alumnos aún no pueden matricularse).
2. **Matrícula Abierta:** Se habilita automáticamente al llegar la `fecha_inicio_matricula`. El sistema permite el proceso de matrícula con las siguientes **fases según Anexo B de `07-SEGURIDAD.md` (Macro-Proceso 3)**:
   - **Matrícula Regular:** durante el periodo oficial.
   - **Matrícula Extemporánea:** a las **3 semanas** de iniciado el cierre de la regular. El administrador configura la fecha límite.
   - **Bloqueo Definitivo:** pasada la fecha límite, el sistema **bloquea nuevas matrículas** y **sella la Nómina Oficial de Matriculados**, compuesta **solo por los ratificados** (matrículas validadas con boleta y flag `Habilitado_Financiero`, DOC-15 §5.4). Quienes quedaron en **standby** no integran la nómina.
   - **Periodo de gracia de requisitos de ingreso:** si al ingresante le falta documentación, el sistema **no bloquea la matrícula**; emite una **Alerta con periodo de gracia** (por defecto **2 meses**, editable por el administrador) permitiendo la **matrícula condicional**. Si expira sin subsanar, se bloquean futuras acciones o se congela la matrícula.
   - **Flag `Habilitado_Financiero`:** trípode Tesorería/Secretaría — el alumno paga, el cajero registra el recibo y el sistema cambia el flag a `True`; solo entonces la Secretaría de Programa puede formalizar el registro de UDs.
3. **En Curso (Activo):** Las clases han iniciado. Es el **único periodo visible** en la UI operativa (aislamiento por `periodo_id`, DOC-15 §4.2). Se bloquean nuevas matrículas (salvo excepciones con Resolución). Se habilita el ingreso de notas.
4. **Cierre / Histórico:** Fin del ciclo. Se cierran actas, se calculan promedios finales y se bloquea cualquier modificación; el periodo queda **sellado** pero sus datos se mantienen **vivos y consultables** vía reportes históricos (filtro `periodo_id`, DOC-15 §4.2).

> **Regla de gestión académica:** **un solo periodo activo a la vez** — al activar el nuevo, el anterior queda automáticamente **cerrado/aislado**. La **UI operativa solo muestra el periodo activo**; los registros de periodos cerrados **no se borran** y quedan consultables mediante **consulta histórica** (filtro por `periodo_id`, DOC-15 §4.2).
>
> **Transiciones (menú de gestión académica, DOC-15 §4.2):**
> - **"Activar / Abrir Ciclo"**: Planificación → **Matrícula Abierta**. Aplica la regla de un solo activo (el periodo anterior pasa a Histórico/Cerrado).
> - **"Cerrar Semestre"**: En Curso/Activo → **Histórico**. Cierra actas y promedios finales; bloquea cualquier edición.

### 1.2. Configuración de Periodos
Se requiere una vista en el Frontend donde la Secretaría Académica o el Super Admin pueda:
- Crear el periodo definiendo el cronograma (fechas de matrícula, fechas de clases, fechas de ingreso de notas por parciales).
- Habilitar o forzar el cambio de estado de un periodo ante directivas de emergencia de la institución.
- Configurar la fecha límite de la matrícula extemporánea y el periodo de gracia de requisitos.

> **Nota:** el componente `AcademicConfig.jsx` **no existe** en el código actual. La configuración (secretos y parámetros de reglas) se gestiona por configuraciones de entorno/base de datos, no como un módulo o componente de configuración institucional.

---

## 2. Casuísticas de Matrícula (El Motor de Reglas)

La matrícula no es un simple `INSERT`. Es un motor de validación que debe ejecutarse en el backend (`mod-gestion-academica`).

### Caso A: Ingresante (Primera Vez)
- **Contexto:** El alumno acaba de pasar por el proceso de Admisión.
- **Acción del Sistema:** Matrícula **Automática en Bloque** (estado **standby**).
- **Reglas:** 
  - Se le asignan obligatoriamente **todas** las Unidades Didácticas (UDs) correspondientes al Ciclo I de su Plan de Estudios.
  - No puede retirar cursos en su primer ciclo.
  - Queda en estado **`Matriculado (Standby)`**: matriculado automáticamente pero **provisional**.
  - **Ratificación vía Tesorería:** el pago de la matrícula emite la **boleta** (flag `Habilitado_Financiero`); con la boleta, la secretaría del área académica **valida y llena la ficha de estudiante**, pasando el alumno a la **Nómina Oficial de Matriculados** del semestre (DOC-15 §5.4).
  - Sin ratificación no aparece en la nómina oficial, aunque mantiene los cursos asignados.

### Caso B: Estudiante Regular (Invicto)
- **Contexto:** Alumno que aprobó todas las UDs de su ciclo anterior.
- **Acción del Sistema:** Matrícula **Sugerida (Promoción de Ciclo)**.
- **Reglas:**
  - El sistema precarga automáticamente todas las UDs del siguiente ciclo cronológico.
  - Valida el rango de créditos (Ej. mínimo 12, máximo 24).
  - El alumno o la secretaria solo da clic en "Confirmar".

### Caso C: Estudiante Irregular (Con Cursos Reprobados)
- **Contexto:** Alumno con cursos a cargo (jalados); desaprobó **menos del 70%** de las asignaturas (UDs) de su ciclo. Los jalados pueden venir del ciclo anterior, de ciclos previos acumulados o del ciclo actual.
- **Acción del Sistema:** Matrícula **automática de avance** (misma mecánica que los ingresantes): formulario de un clic sobre el estudiante + carga masiva del ciclo.
- **Reglas:**
  - **Prioridad 1 (Avance):** el sistema matricula en **todos** los cursos del **siguiente ciclo correlativo** (ej. estuvo en 4°, se matricula en todos los cursos del 5°).
  - **Prioridad 2 (Jalados de ciclos anteriores):** si la carga **no supera 24 créditos**, se incorporan jalados de ciclos anteriores **de la misma paridad que el ciclo actual** (se dictan en el mismo semestre, DOC-15 §4.1) y **vigentes**. Ej.: en 5° (semestre 1) se recuperan jalados de **1° y 3°**; **nunca** de 2° ni 4° (pertenecen al semestre 2).
  - **Siempre (Prerrequisitos):** bloquean; si una UD del ciclo siguiente exige una UD jalada como prerrequisito, queda bloqueada hasta que se apruebe esa UD.
  
### Caso D: Reingresante (Retorno tras Reserva de Matrícula)
- **Contexto:** Alumno que pausó sus estudios formalmente y vuelve 1 o 2 años después.
- **Acción del Sistema:** Matrícula **Asistida por Resolución**.
- **Reglas:**
  - El sistema exige el número de Resolución Directoral de Reingreso.
  - **Análisis de Malla:** El sistema compara el Plan de Estudios en el que el alumno estaba vs. el Plan de Estudios vigente actual. Si el plan cambió, el sistema debe disparar automáticamente el flujo de **Convalidación Interna** para equivalencias antes de dejarlo matricular.

### Caso E: Convenios / Becados
- **Contexto:** Alumnos que estudian financiados por PRONABEC (Beca 18), Fuerzas Armadas, etc.
- **Acción del Sistema:** Matrícula **Cruzada con Tesorería**.
- **Reglas:**
  - Se matriculan igual que el Caso B o C, pero el evento NATS `matricula.confirmada` es escuchado por el módulo de **Tesorería**, el cual genera una deuda con valor `0.00` para el alumno y deriva el cobro (facturación) a la entidad correspondiente al Convenio.

> **Nota (estado real MVP v1.1):** no existe un módulo de Tesorería separado. **Hoy los pagos y el flag `Habilitado_Financiero` viven en `mod-gestion-academica`**, y el listener del evento `matricula.confirmada` es (por ahora) `mod-gestion-academica`. La separación del dominio de Tesorería es **post-MVP**.

### Caso F: Repitente (Separación por Bajo Rendimiento)
- **Contexto:** Alumno que supera el **70% de las asignaturas (UDs) jaladas** de un ciclo — **no avanza**.
- **Acción del Sistema:** **Separación del periodo** — no se le matricula en el siguiente ciclo.
- **Reglas:**
  - Automáticamente **repite el ciclo** (no pasa al correlativo).
  - Queda **separado** del periodo académico; puede **regresar el próximo año como reingresante**, aplicando **evaluación del área académica** y **permiso** (DOC-15 §5.6, DOC-13 §3).
  - Sin el permiso de reingreso, el sistema **bloquea** su matrícula.

### Caso G: Traslado (Interno / Externo) — FUTURO (post-MVP)
- **Contexto:** Alumno que cambia de programa de estudios dentro del mismo IESTP (**interno**) o proviene de otro IESTP/universidad (**externo**).
- **Acción del Sistema:** Matrícula **Asistida tras Convalidación** — habilitada en versión futura (base de diseño lista desde el MVP).
- **Reglas:**
  - Se registra con Tipo de Admisión = `Traslado (Interno/Externo)` (DOC-13 §4).
  - Queda **bloqueado para matrícula regular** hasta aprobar el flujo de **convalidación** de sus UDs cursadas.
  - El **ciclo relativo** se calcula por las **UDs convalidadas** (criterios de DOC-13 §1/§4). Si las convalidadas no alcanzan un ciclo completo, se ubica por créditos.
  - Interno: conserva sus **credenciales**. Externo: la provisión de credenciales sigue la política de nuevos ingresos (DOC-15 §5.2).

### Caso H: Convalidación (Reconocimiento de UDs) — FUTURO (post-MVP)
- **Contexto:** Reconocimiento de UDs cursadas en traslados (interno/externo), reingresos con plan caducado o cambio de plan/malla (Adecuación de Malla).
- **Acción del Sistema:** Flujo de **convalidación** gestionado dentro de `mod-gestion-academica` (trámites) — habilitado en versión futura (base de diseño lista desde el MVP).
- **Reglas:**
  - Las UDs Transversales (Empleabilidad) se convalidan **automáticamente** si coinciden en créditos y sílabo (traslado interno); el resto pasa por **evaluación de sílabos** del Coordinador/área académica (DOC-13 §1).
  - Se respalda en documento oficial (Resolución Directoral) y emite el evento `convalidation.approved` (DOC-06).
  - La **nota reconocida** y la **UD de destino** (`ud_destino_id`, `origen`, `nota_reconocida`) se registran en `ConvalidacionesDetalle` (DOC-05 / DOC-13).

> **Nota de alcance (MVP v1.1):** los **Casos A, B y C son operativos en el MVP** (los 3 tipos de matrícula más comunes). Los **Casos D, E, G y H quedan como diseño preparado** para habilitarse en versiones futuras del roadmap (DOC-12) — el motor de reglas de §3 los contempla y sus esquemas ya viven en `mod-gestion-academica`.

---

## 3. Motor de Validación y Modo Flexible

> **Regla de oro:** las **validaciones duras SIEMPRE se ejecutan en el backend** (`mod-gestion-academica`): rango de créditos 12-24 (parametrizable), prerrequisitos, cruces de horario y prioridad de UDs reprobadas. El **modo flexible** solo cambia la **UX de sugerencia / propuesta de carga**, nunca relaja las reglas de negocio (ver `12-ROADMAP.md`, Fase 2).

### Motor de Reglas (Backend, siempre activo)
- Se ejecuta en todos los casos (A, B, C, D, E, F, G, H) en el backend.
- Aplica las reglas duras de negocio: bloqueo por prerrequisitos, obligación de llevar UDs jaladas primero, bloqueo si se superan los créditos máximos, control de cruces de horario.

### Modo Flexible (UX de sugerencia asistida)
- **Ingresantes (Primera Vez):** Matrícula totalmente automática (se asigna todo el Ciclo I sin intervención).
- **Alumnos Regulares / Irregulares / Resto:** El sistema actúa como un "asistente visual": lista todas las UDs disponibles para el periodo y ciclo, precargando la propuesta sugerida, pero **permite a la Secretaría Académica tomar la decisión final** sobre la selección de cursos *dentro de las reglas permitidas*. Las restricciones duras (tope de créditos, cruces de horario, prerrequisitos, arrastre de cursos) **siempre bloquean** en backend: si la propuesta manual las viola, el sistema rechaza la solicitud con un mensaje claro.

---

## 4. Plan de Implementación (estado MVP v1.1)

El trabajo se organiza en 3 etapas:

1. **Etapa 1: UI de Configuración de Periodos** 🔄
   - Pantalla en React para crear y administrar Periodos Académicos con sus fechas (Frontend). La configuración de periodos y reglas vive en backend/BD config, no en un módulo separado.

2. **Etapa 2: Motor de Validación en el Backend (API)** ✅
   - Endpoint de propuesta/sugerencia de matrícula en `mod-gestion-academica`. Las validaciones duras (prerrequisitos, créditos 12-24, cruces, prioridad de jaladas) **siempre** se ejecutan en backend.

3. **Etapa 3: Asistente de Matrícula Flexible en Frontend (Mejora del EnrollmentProcess)** 🔄
   - Modificar el paso 2 de `EnrollmentProcess.jsx` para mostrar un panel de "Selección Manual Asistida" de UDs, permitiendo a la secretaria armar la matrícula dentro de las reglas permitidas.

---

## 5. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-27 | 1.0 | Arquitecto SIGA | Documento original de arquitectura de matrículas y casuísticas |
| 2026-08-29 | 2.0 | Mesa de trabajo (planificación) | Realineación a `07-SEGURIDAD` Anexo B: fases de matrícula Regular → Extemporánea (3 semanas tras cierre, límite configurable) → Bloqueo Definitivo con Nómina Oficial automática; periodo de gracia de 2 meses (editable) para requisitos con matrícula condicional; flag `Habilitado_Financiero` (trípode Tesorería/Secretaría). Se aclara que las validaciones duras siempre corren en backend (el modo flexible solo cambia la UX de sugerencia). Configuración institucional vía secretos/BD (no existe módulo ni `AcademicConfig.jsx`). Los pagos/flag viven hoy en `mod-gestion-academica` (el listener de `matricula.confirmada` no es Tesorería) |
| 2026-08-29 | 2.1 | Mesa de trabajo (planificación) | Reglas canónicas (aprobadas por el equipo, DOC-15): convención de periodos `YYYY-N` (2026-1 Abr–Ago / 2026-2 Ago–Dic) creados por el encargado en `mod-gestion-academica`; Caso C reescrito (avance correlativo primero — todos los cursos del ciclo siguiente — y jaladas solo si el creditaje/la oferta lo permiten; prerrequisitos siempre bloquean); nuevo Caso F Repitente (repite ciclo completo previa evaluación del área académica que emite el permiso) |
| 2026-08-29 | 2.2 | Mesa de trabajo (planificación) | Caso A detallado (DOC-15 §5.4): la matrícula automática en bloque deja al ingresante en estado **standby**; ratificación solo vía **boleta de Tesorería** (`Habilitado_Financiero`) + validación y **ficha de estudiante** en la secretaría del área académica; recién ratificado pasa a la **Nómina Oficial de Matriculados** del semestre |
| 2026-08-29 | 2.3 | Mesa de trabajo (planificación) | Caso C y Caso F afinados (DOC-15 §5.6): umbral definido por **asignaturas/UDs** (no créditos) — <70% jaladas avanza al ciclo siguiente; >70% = **separación del periodo** con retorno el próximo año **como reingresante** (evaluación + permiso). Caso C: jalados recuperables solo de ciclos de **misma paridad/semestre** y vigentes con tope de 24 créditos |
| 2026-08-29 | 2.4 | Mesa de trabajo (planificación) | Alcance de matrícula declarado (DOC-15 §5.1): **MVP opera Casos A/B/C**; se añaden **Caso G (Traslado interno/externo)** y **Caso H (Convalidación)** como diseño preparado — junto a D (Reingresante) y E (Convenio) quedan listos para habilitarse en versiones futuras (roadmap DOC-12) y no bloquean el MVP. Motor de reglas ahora contempla A–H |
| 2026-08-29 | 2.5 | Mesa de trabajo (planificación) | Gestión académica (DOC-15 §4.2): regla de **un solo periodo activo** en §1.1 — al activar el nuevo, el anterior se cierra/aisla automáticamente; la UI operativa solo muestra el activo; las consultas históricas usan filtro `periodo_id`. Coexistencia de mallas (DOC-15 §4.3) alineada al ciclo de vida del periodo |
| 2026-08-29 | 2.6 | Mesa de trabajo (planificación) | Ciclo de vida del periodo **refinado** (manteniendo los 4 estados): Planificación incorpora **precarga de cursos del semestre** y **oferta de mallas en coexistencia**; el cierre de Matrícula Abierta ahora **sella la Nómina compuesta solo por ratificados** (standby no integra la nómina); En Curso definido como el único periodo visible; Histórico sellado pero consultable por `periodo_id`. Mapeo de transiciones: "Activar / Abrir Ciclo" (Planificación → Matrícula Abierta) y "Cerrar Semestre" (En Curso → Histórico) |
| 2026-08-29 | 2.7 | Mesa de trabajo (planificación) | Cambio de plan controlado (DOC-15 §2.4, DOC-05 v1.3.0): la carrera es única y los planes son versiones; flujo "Subir (borrador) → Publicar → `Vigente` + el anterior `En Baja`"; un plan solo pasa a `Reemplazado` con 0 alumnos anclados. La matrícula sigue resolviéndose contra el plan anclado del estudiante (§1 y Casos A–H) |

---
