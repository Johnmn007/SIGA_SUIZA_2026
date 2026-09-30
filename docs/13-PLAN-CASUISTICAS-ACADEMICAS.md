# Plan de Casuísticas y Gestión Académica Avanzada (Fase 4)

> **Versión:** 2.0 | **Última actualización:** 2026-08-29 | **Estado:** Implementado (MVP v1.1)

Este documento establece la arquitectura y las reglas de negocio para los escenarios excepcionales (casuísticas) que ocurren en el ciclo de vida de un estudiante en un IESTP. Estas reglas son esenciales para garantizar que la plataforma SIGA sea robusta ante cualquier situación administrativa.

> **Estado de implementación:** Las entidades descritas en §12 y el panel `TramitesDashboard.jsx` para Secretaría Académica existen en `mod-gestion-academica` (MEMORIA_CONTEXTO v4.0). Lo pendiente se lista al final (§13).

## 1. Convalidaciones (Reconocimiento de UDs)

La convalidación es el proceso mediante el cual se reconocen las Unidades Didácticas (UD) aprobadas previamente, eximiendo al estudiante de cursarlas nuevamente.

### Tipos de Convalidación:
1. **Por Traslado Interno:** Cambio de programa de estudios dentro de la misma institución. (Ej. de Enfermería a Laboratorio Clínico). Se convalidan automáticamente las UDs Transversales (Empleabilidad) si coinciden en créditos y sílabo.
2. **Por Traslado Externo:** El estudiante proviene de otro IESTP. Se requiere evaluación de sílabos por parte del Coordinador.
3. **Por Cambio de Plan de Estudios:** Si el estudiante reingresa y su plan de estudios original ya no está vigente, debe adecuarse al nuevo plan convalidando las UDs equivalentes.
4. **Por Experiencia Laboral (Certificación):** Según la normativa MINEDU, un estudiante con experiencia laboral demostrada puede convalidar UDs específicas (requiere examen de suficiencia).

**Regla de Sistema:**
* Una UD convalidada recibe el estado `Convalidado`. 
* La nota se registra típicamente como la nota de origen, o si es por suficiencia, la nota del examen de convalidación (mínimo 13 — **parametrizable** en configuración, no hardcodeado).
* Las UDs convalidadas suman a los créditos acumulados del estudiante pero pueden ser excluidas del cálculo del "Promedio Ponderado Semestral" si así lo dicta el reglamento.

## 2. Reserva de Matrícula (Licencias de Estudio)

El estudiante tiene derecho a suspender temporalmente sus estudios, guardando su cupo en el instituto.

**Reglas de Negocio:**
* **Plazo máximo:** Generalmente hasta cuatro (4) semestres académicos consecutivos o alternos a lo largo de su carrera.
* **Momento de solicitud:**
  * *Antes de la matrícula:* El estudiante se marca en el sistema con estado `Reserva`. No consume vacante.
  * *Durante el semestre:* Si ya estaba matriculado, se ejecuta un **Retiro Excepcional**. Su matrícula actual pasa a estado `Anulada_por_Reserva`. Las notas parciales obtenidas **no se borran destructivamente**: se aplica **anulación lógica** con registro en `core_audit_logs` (trazabilidad completa).
* **Impacto en el Sistema:** El estudiante no aparecerá en nóminas de evaluación ni contará como repitente.

## 3. Reingresos (Retorno al Sistema)

Proceso mediante el cual un estudiante retoma sus estudios tras una reserva de matrícula o un abandono.

**Reglas de Negocio:**
* **Verificación de Plan de Estudios:** Es el paso crítico. El sistema debe evaluar si el `plan_estudio_id` con el que ingresó originalmente sigue "Vigente".
  * *Si sigue vigente:* Se matricula en el ciclo correspondiente según sus UDs pendientes.
  * *Si caducó:* El sistema debe disparar un flujo de **Adecuación de Malla**. Se le asigna el nuevo plan vigente y se mapean sus UDs antiguas a las nuevas (vía Convalidación por Cambio de Plan).
* **Restricción:** Solo se puede reingresar si no se ha superado el tiempo máximo de reserva estipulado por la institución.

## 4. Traslados (Internos y Externos)

El traslado implica el ingreso a un Programa de Estudios asumiendo un historial previo.

**Flujo en el Sistema:**
1. Se registra al estudiante con Tipo de Admisión = `Traslado (Interno/Externo)`.
2. El sistema lo bloquea para Matrícula Regular hasta que pase por el **Módulo de Convalidaciones**.
3. El Coordinador mapea qué UDs se le aprueban.
4. En base a los créditos convalidados, el sistema calcula automáticamente a qué **Ciclo Relativo** pertenece (Ej. si convalidó todos los créditos de Ciclo I y II, el sistema lo habilita para pre-matricularse en el Ciclo III).

## 5. Evaluaciones Extraordinarias (Subsanaciones)

Cuando un estudiante termina su carrera (Ciclo VI) y nota que le faltan 1 o 2 UDs para egresar (o está en riesgo de no poder graduarse por un curso rezagado).

**Reglas de Sistema:**
* El sistema habilita la "Evaluación de Subsanación" solo si el estudiante desaprobó la UD previamente con nota dentro del rango configurable (por defecto entre 10 y 12, según el reglamento interno de cada IESTP) — **parametrizable**, no hardcodeado.
* Se crea un acta especial (`Tipo_Acta: Extraordinaria`) independiente del periodo regular.
* La nota máxima alcanzable suele estar capada según reglamento, o se registra normalmente indicando su origen de subsanación.

## 6. Abandono (Deserción)

* Si un estudiante no se matricula por dos semestres consecutivos sin haber solicitado Reserva de Matrícula, el sistema (mediante un Job automático al cerrar matriculas) cambiará su estado a `Abandono`.
* Para volver, no aplica "Reingreso" directo; podría requerir postular de nuevo o un proceso disciplinario/administrativo especial.

## 7. Becas y Beneficios Económicos

El sistema debe gestionar los beneficios que afectan tanto el perfil académico como las obligaciones financieras (Módulo de Tesorería futuro).

### Tipos de Becas Comunes en IESTP:
1. **Becas de Excelencia Académica:** Otorgadas a estudiantes en el tercio/quinto superior o primeros puestos. El sistema debe evaluar automáticamente su promedio ponderado del ciclo anterior. Si baja de una nota mínima (ej. 14.00), el sistema revoca la beca automáticamente para el siguiente ciclo.
2. **Becas Estatales (PRONABEC / Beca 18):** El estudiante es financiado por el Estado. El sistema debe generar reportes específicos para enviar al MINEDU/PRONABEC demostrando asistencia y notas.
3. **Becas por Situación Socioeconómica / Orfandad / Talento (Deportivo/Artístico).**

**Reglas de Negocio:**
* El estado de Beca se asocia al `Estudiante` y tiene un periodo de validez (ej. "Válido para 2026-I").
* Al momento de la matrícula, si el estudiante tiene una beca activa, el sistema envía un evento al futuro módulo de tesorería para aplicar un 100% de descuento (o el % que aplique) en su deuda.

## 8. Convenios Institucionales

1. **Convenios de Descuento (Corporativos):** Acuerdos con Municipalidades, FFAA o Empresas. Un estudiante marcado con "Convenio X" recibe descuentos parametrizados (Ej. 20% menos en cuotas).
2. **Convenios de Movilidad Estudiantil:** Si el alumno se va un semestre a otro IESTP. Sus estudios en ese semestre se ingresan luego vía "Convalidación".

## 9. Prácticas Pre-Profesionales (PPP) y Titulación

La graduación no es automática al aprobar las materias. Requiere cumplir hitos externos.

**Reglas de Negocio para Egresar/Titularse:**
* **Horas de Prácticas:** El sistema debe tener un registro de horas PPP acumuladas. No se le otorga la "Constancia de Egreso" si no tiene el 100% de horas aprobadas por el supervisor de prácticas.
* **Idioma Extranjero y Ofimática:** Requisito obligatorio según ley para IESTP.
* **Trabajo de Aplicación / Examen de Suficiencia:** Se abre un "Acta de Titulación". El jurado emite una nota aprobatoria para que Secretaría proceda a emitir el Título a nombre de la Nación.

## 10. Emisión de Certificados y Trámites (TUPA)

El sistema debe emitir documentos oficiales con código QR o firma digital para evitar falsificaciones:
* **Constancia de Estudios** (válida solo si el alumno está matriculado en el ciclo actual).
* **Certificado Oficial de Estudios** (formato estricto MINEDU con las notas históricas).
* **Constancia de Egreso.**
* *Restricción:* El sistema debe bloquear la emisión de cualquier documento si el alumno tiene "Deuda" en Tesorería o falta disciplinaria grave.

---

## 11. Certificación Modular, EFSRT y Rectificación de Nota

(Anexo B de `07-SEGURIDAD.md` — Macro-Procesos 4 y 5)

**Certificación Modular + EFSRT (Macro-Proceso 5):**
1. **Jefatura de Programa** registra y aprueba las horas de Experiencias Formativas (**EFSRT**) a lo largo de los ciclos.
2. **Secretaría Central**, cuando el estudiante completa un año (Ej. Ciclo I y II) más sus EFSRT, genera la **Certificación Modular** (requisito del modelo educativo peruano).
3. La certificación se **cobra a través de Tesorería** (trípode Tesorería/Secretaría; flag `Habilitado_Financiero`).

**Rectificación de Nota (Macro-Proceso 4):**
* Una vez que el docente cierra el acta, el sistema se bloquea para él.
* Si hubo un error, se solicita un **trámite formal a Secretaría Central** para la "Rectificación de Nota", dejando **rastro de auditoría** en `core_audit_logs`.

---

## 12. Estructura de Datos (Implementada en mod-gestion-academica)

Para soportar estas casuísticas, `mod-gestion-academica` implementó las siguientes entidades (MEMORIA_CONTEXTO v4.0):

1. **`HistorialAcademico`**: Tabla inmutable que guarda los estados (Activo -> Reserva -> Reingreso -> Egreso -> Titulado).
2. **`BeneficiosEstudiante`**: Registra Becas y Convenios: `estudiante_id`, `tipo_beneficio`, `porcentaje_descuento`, `condicion_mantenimiento` (nota mínima), `periodo_validez`.
3. **`RegistroPracticas`**: `estudiante_id`, `centro_labores`, `horas_acumuladas`, `estado_aprobacion`.
4. **`ResolucionesConvalidacion`**: Guarda el documento (Resolución Directoral) que ampara una convalidación.
5. **`ConvalidacionesDetalle`**: Mapea: `estudiante_id`, `ud_destino_id` (la del plan actual), `origen` (texto o id de ud antigua), `nota_reconocida`.
6. **`SolicitudesTramite`**: Tabla para que el alumno pida por el portal web: Reservas, Constancias, Traslados.

---

## 13. Pendientes / Siguientes pasos

1. ~~Crear el esquema de base de datos para Convalidaciones en `mod-gestion-academica`.~~ ✅ Implementado.
2. ~~Crear un panel (Dashboard) para Secretaría Académica donde se aprueben los Reingresos y Reservas.~~ ✅ Implementado (`TramitesDashboard.jsx`).
3. Crear el flujo de "Adecuación de Malla" para cuando un estudiante reingresa a un plan diferente. 🔄 Pendiente (post-MVP).

---

## 14. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-27 | 1.0 | Arquitecto SIGA | Documento arquitectónico maestro de la Fase 4 (Trámites y Casuísticas) |
| 2026-08-29 | 2.0 | Mesa de trabajo (planificación) | Realineación al estado real (MEMORIA_CONTEXTO v4.0): la estructura de datos está implementada en `mod-gestion-academica` (entidades + `TramitesDashboard.jsx`); anulación lógica de notas con registro en `core_audit_logs` (coherente con trazabilidad de `07-SEGURIDAD`); valores mínimos marcados como parametrizables (13, rango 10-12); incorporación de Certificación Modular + EFSRT y Rectificación de Nota como trámite formal con auditoría |

---
