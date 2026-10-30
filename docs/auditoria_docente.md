# Auditoría Integral de Seguridad y Calidad: Rol Docente y Coordinación de Programa - SIGA Suiza 2026

**Fecha:** 29 de Octubre de 2026  
**Rama:** `mejoras/docente-coordinacion`  
**Entorno de Pruebas:** `siga_test` (PostgreSQL 18.4 en host local `127.0.0.1:5432`)  
**Base de Datos Institucional:** `siga_local` (**Aislamiento estricto verificado: 784 estudiantes inalterados**)

---

## 1. Verificaciones Previas y Aislamiento de Base de Datos

### a) Verificación de Motores de Base de Datos en Módulos
Al cargar dinámicamente cada microservicio con el cargador de módulos aislado (`tests/helpers/module_loader.py`), se auditó la cadena de conexión configurada en sus respectivos motores SQLAlchemy (`database.py`):

| Microservicio | URL de Conexión Detectada | Base de Datos Destino | Estado |
|---|---|---|---|
| `mod-evaluacion` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |
| `mod-programas-estudio` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |
| `mod-gestion-academica` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |
| `mod-usuarios` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |

*Resultado:* Ningún módulo apunta a `siga_local`. Todas las pruebas unitarias y de integración se ejecutan de manera estrictamente confinada en `siga_test`.

### b) Arquitectura de Autenticación y Cabeceras en Gateway
1. **Core Gateway (`siga-core` :8000):**
   - Valida el token JWT en `/api/{module_name}/*` e inyecta las cabeceras de contexto: `X-User-ID`, `X-User-Email`, `X-User-Permissions`, `X-Request-ID`.
2. **Microservicios (`mod-evaluacion` :8008, `mod-programas-estudio` :8005):**
   - Reciben las peticiones directamente o proxificadas vía Core Gateway.
   - En las operaciones de control de actas (`/actas/...`), se implementó la validación obligatoria de `X-User-ID`: si la cabecera falta o no es numérica, se rechaza de inmediato con **401 Unauthorized**.

---

## 2. Matriz de Hallazgos y Estado de Corrección (BUG-D01 a BUG-D10)

| ID | Severidad | Estado | Componente / Archivo y Línea | Causa Raíz | Prueba Demostrativa | Corrección Aplicada / Detalle |
|---|---|---|---|---|---|---|
| **BUG-D01** | **Alta** | **Corregido** | `siga_backend/modules/mod-evaluacion/routes.py`<br>`siga_backend/modules/mod-programas-estudio/models.py` | Carga lectiva no soportaba cierre formal ni fechas límite de ingreso de notas. | `test_cierre_actas.py` (17 pruebas PASSED) | Se migró el esquema agregando 4 columnas a `carga_lectiva`: `fecha_limite_notas`, `acta_cerrada`, `acta_cerrada_at`, `acta_cerrada_por`. Se implementó el control de actas y endpoints en `mod-evaluacion`. |
| **BUG-D02** | **Alta** | **Pendiente**<br>*(Diferido a tarea RBAC)* | `siga_backend/modules/mod-evaluacion/routes.py` | No valida si el docente autenticado tiene asignada la carga lectiva (BOLA). | `test_docente_no_puede_calificar_unidad_no_asignada` (xfail) | Requiere asociar `docente_id` de `carga_lectiva` con `X-User-ID`. |
| **BUG-D03** | **Alta** | **Pendiente**<br>*(Diferido a tarea RBAC)* | `siga_backend/modules/mod-programas-estudio/routes.py` | Rutas `/docente/{docente_id}/*` confían ciegamente en el ID de la URL (IDOR). | `test_docente_no_puede_ver_datos_de_otro_docente_idor` (xfail) | Comparar `docente_id` con `X-User-ID`. |
| **BUG-D04** | **Alta** | **Corregido** | `siga_backend/modules/mod-evaluacion/routes.py` | Permitía registrar notas a estudiantes con matrícula pendiente o no inscritos. | `test_matricula_pendiente_rechazada_en_post_registros` (PASSED) | En `POST /registros`, se valida estado de matrícula: solo se permite `confirmada` y curso no `retirado`. Matrículas pendientes se rechazan con **409 Conflict**. |
| **BUG-D05** | **Media** | **Corregido** | `siga_backend/modules/mod-evaluacion/routes.py` | Exigía estrictamente estado `en_curso`, bloqueando periodos vigentes en `matricula_abierta` como 2026-II. | `test_periodos_calificables_...` (PASSED) | Se amplió a `ESTADOS_PERIODO_CALIFICABLES = {"en_curso", "matricula_abierta"}`. Periodos cerrados o desconocidos devuelven **409 Conflict**. |
| **BUG-D06** | **Baja** | **Corregido** | `siga_backend/modules/mod-evaluacion/schemas.py` | Respuestas crasheaban con 500 ante notas o estados nulos de la BD real. | `test_listado_evaluacion_con_notas_null...` (PASSED) | Tipado `Optional[float] = None` y `estado: Optional[str] = "cursando"`. |
| **BUG-D07** | **Baja** | **Corregido** | `siga_backend/modules/mod-programas-estudio/routes.py` | `SilaboResponse` no admitía fechas o estados NULL en base de datos. | `test_listado_silabos_con_campos_null...` (PASSED) | Tipado preventivo con valores por defecto. |
| **BUG-D08** | **Baja** | **Corregido** | `siga_backend/modules/mod-programas-estudio/routes.py` | `PlanTrabajoDocenteResponse` no admitía campos nulos. | `test_listado_planes_con_campos_null...` (PASSED) | Tipado preventivo con valores por defecto. |
| **BUG-D09** | **Baja** | **Corregido** | `siga_backend/modules/mod-gestion-academica/schemas.py` | `EstudianteResponse` exigía `estado_academico` no nulo. | `test_listado_matriculas_unidad...` (PASSED) | Tipado `Optional[str] = "regular"`. |
| **BUG-D10** | **Baja** | **Corregido** | `siga_frontend/src/modules/evaluation/EvaluationDashboard.jsx` | Bloqueaba notas fuera de rango [0, 20] silenciosamente sin feedback visual. | Vitest: `[BUG-D10] Debe mostrar un mensaje...` (PASSED) | Alerta React visual con `data-testid="grade-error-alert"`. |

---

## 3. Arquitectura del Cierre de Actas y Decisiones Técnicas Fundamentales

### a) Regla Única de Matrícula Calificable (Alcance por Unidad y Periodo)
* **Diagnóstico de los Datos Institucionales (`siga_local`):**
  Se detectó que en el periodo 15 (`2026-II`), todas las 56 matrículas confirmadas poseen cabecera con `matriculas.programa_id = 1` (identificador histórico del plan origen), mientras que la tabla institucional `programas_estudio` contiene un único registro con `id = 15` ("DESARROLLO DE SISTEMAS DE INFORMACION"), al cual están asociadas las cargas lectivas (`carga_lectiva.programa_id = 15`). Filtrar los detalles de matrícula por `matriculas.programa_id` provocaba que el conteo de estudiantes fuera erróneamente `0`.
* **Regla Canónica Institucional:**
  Una matrícula es calificable si y solo si:
  $$\text{estado\_matricula} = \text{'confirmada'} \quad \land \quad (\text{estado\_curso} \neq \text{'retirado'} \lor \text{estado\_curso IS NULL})$$
* **Alcance de Conteo:**
  El conteo de estudiantes matriculados y evaluados para una unidad didáctica se realiza agrupando estrictamente por `(unidad_didactica_id, periodo_id)` sin filtrar por el programa de la matrícula. El parámetro `programa_id` en `GET /actas/periodo/{periodo_id}/programa/{programa_id}` se utiliza exclusivamente para:
  1. Filtrar las cargas lectivas asignadas a dicho programa en `carga_lectiva`.
  2. Clasificar las unidades sin carga asignada que pertenecen formalmente al plan/módulos del programa (`unidades_sin_carga`).
  3. Clasificar de forma transparente en `unidades_sin_programa` aquellas unidades que no tienen asociación registrada con ningún programa o plan en la base de datos (por ejemplo, unidades 401 a 407 en el periodo 14), garantizando que ningún dato quede oculto ni falseado.

### b) Preservación de `evaluacion_registros.estado`
* **Motivo Técnico:**
  En versiones preliminares, el cierre de acta sobreescribía `evaluacion_registros.estado = 'cerrado'`. Esto destruía la condición académica del estudiante (`aprobado`, `desaprobado`), impidiendo que el motor de matrícula y convalidaciones de `mod-gestion-academica` validara prerrequisitos y calculara el 70% de créditos aprobados exigido por la normativa MINEDU para la promoción académica.
* **Solución Implementada:**
  Se eliminó la sobreescritura de `evaluacion_registros.estado` en `/cerrar` y su recálculo en `/reabrir`. La restricción de edición de calificaciones reside de manera autónoma y exclusiva en `carga_lectiva.acta_cerrada = true` y la fecha límite `fecha_limite_notas`. De este modo, los registros de evaluación conservan intacta su condición académica original (`aprobado` si nota $\ge 13$, `desaprobado` si nota $< 13$, `cursando`).

### c) Registro Temporal de Cierre en UTC (`acta_cerrada_at`)
* **Decisión de Auditoría y Zona Horaria:**
  La columna `carga_lectiva.acta_cerrada_at` es de tipo `TIMESTAMP WITHOUT TIME ZONE`. Para evitar desfases por el huso horario local de los clientes o coordinadores, el backend genera el sello de tiempo en tiempo universal coordinado (UTC): `datetime.now(timezone.utc).replace(tzinfo=None)`.
* **Compatibilidad de Base de Datos:**
  El objeto se almacena como datetime naive en UTC para garantizar compatibilidad con los drivers `asyncpg` y PostgreSQL, serializándose en formato ISO 8601 hacia los clientes y los eventos de auditoría (`outbox_events`).
* **Comparaciones de Fechas Límite:**
  La validación de fechas límite se evalúa contra la fecha calendario oficial en el territorio institucional usando la zona horaria `America/Lima` (`get_hoy_lima()`).

### d) Tratamiento de Matrículas Pendientes (Advertencia Informativa)
* En el periodo 15 de `siga_local`, existen estudiantes con matrículas en estado `pendiente`.
* **Regla de Cierre:** Las matrículas pendientes **no bloquean** el cierre de acta (no son calificables, pues no han completado sus requisitos administrativos/académicos).
* **Transparencia y Alerta al Coordinador:**
  - En `POST /actas/carga/{carga_id}/cerrar`, si existen matrículas pendientes en la unidad y periodo, la respuesta incluye un mensaje explícito en el campo `advertencia` detallando la cantidad exacta de matrículas no consideradas (ej. *"Atención: existen 2 matrícula(s) en estado pendiente que no fueron consideradas para el cierre del acta"*).
  - En `GET /actas/periodo/{periodo_id}/programa/{programa_id}`, se reporta el campo `matriculas_pendientes` por cada carga lectiva y unidad sin carga, además de un consolidado `total_matriculas_pendientes`.

### e) Concurrencia y Control de Carreras (Row-Level Locking)
* **Operaciones de Cierre y Reapertura:** Se protegen mediante bloqueos exclusivos `SELECT ... FOR UPDATE` sobre la fila de `carga_lectiva` dentro de la transacción, evitando que dos coordinadores concurrentes alteren el estado de la misma acta.
* **Operaciones de Calificación Docente (`POST /registros`, `PUT /registros/{id}`):** Validan la carga lectiva mediante `SELECT ... FOR SHARE` dentro de la transacción, garantizando que el acta no pueda ser cerrada en el milisegundo exacto en que un docente guarda una nota.

---

## 4. Endpoints de Actas Implementados en `mod-evaluacion`

1. **`GET /actas/unidad/{unidad_id}/periodo/{periodo_id}`:**
   - Retorna: `tiene_carga`, `acta_cerrada`, `fecha_limite_notas`, `editable` (booleano) y `motivo_bloqueo`.
   - Utilizado por el panel docente para determinar si se habilita la edición de calificaciones.
2. **`GET /actas/periodo/{periodo_id}/programa/{programa_id}`:**
   - Retorna resumen completo para coordinación: `cargas` (con estadísticas de confirmadas, calificadas, faltantes y pendientes), `unidades_sin_carga` del programa y `unidades_sin_programa` (unidades activas sin programa/plan asignado en DB).
3. **`PUT /actas/carga/{carga_id}/fecha-limite`:**
   - Exige cabecera `X-User-ID` numérica (401 si falta).
   - Fija fecha límite hoy o futura (422 si es pasada). Rechaza si el acta o el periodo están cerrados (409).
4. **`POST /actas/programa/{programa_id}/periodo/{periodo_id}/fecha-limite`:**
   - Exige `X-User-ID` numérica. Fija fecha masiva a todas las cargas abiertas del programa y periodo.
5. **`POST /actas/carga/{carga_id}/cerrar`:**
   - Exige `X-User-ID` numérica. Bloquea la carga lectiva con `FOR UPDATE`.
   - Rechaza con 409 si la unidad tiene 0 matrículas calificables.
   - Rechaza con 409 si faltan notas en matrículas calificables (detalla total de faltantes e IDs de matrícula).
   - Emite advertencia si hay matrículas pendientes. Guarda `acta_cerrada = true`, fecha UTC y usuario.
6. **`POST /actas/carga/{carga_id}/reabrir`:**
   - Exige `X-User-ID` numérica, motivo de al menos 10 caracteres (422) y nueva fecha válida (422).
   - Bloquea con `FOR UPDATE`. Restablece el acta a abierta y devuelve la edición al docente.
