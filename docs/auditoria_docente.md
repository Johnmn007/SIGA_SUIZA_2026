# Auditoría Integral de Seguridad y Calidad: Rol Docente - SIGA Suiza 2026

**Fecha:** 28 de Octubre de 2026  
**Rama:** `mejoras/docente-coordinacion`  
**Entorno de Pruebas:** `siga_test` (PostgreSQL 18.4 en host local `127.0.0.1:5432`)  
**Base de Datos Institucional:** `siga_local` (**Aislamiento verificado: 784 estudiantes inalterados**)

---

## 1. Verificaciones Previas (PASO 0)

### a) Verificación de Motores de Base de Datos en Módulos
Al cargar dinámicamente cada microservicio con el cargador de módulos aislado (`tests/helpers/module_loader.py`), se auditó la cadena de conexión configurada en sus respectivos motores SQLAlchemy (`database.py`):

| Microservicio | URL de Conexión Detectada | Base de Datos Destino | Estado |
|---|---|---|---|
| `mod-evaluacion` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |
| `mod-programas-estudio` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |
| `mod-gestion-academica` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |
| `mod-usuarios` | `postgresql+asyncpg://postgres:****@127.0.0.1:5432/siga_test` | `siga_test` | Seguro (Aislado) |

*Resultado:* Ningún módulo apunta a `siga_local`. Todas las operaciones del runner y pruebas de integración se ejecutan de manera estrictamente confinada en `siga_test`.

### b) Arquitectura de Autenticación y Autorización
Se analizó el flujo de peticiones desde el cliente hasta los microservicios:
1. **Core Gateway (`siga_backend/app/core/gateway/security_middleware.py`):**
   - El Gateway actúa como proxy inverso en el puerto `:8000`.
   - Intercepta todas las rutas `/api/{module_name}/*` y valida el token JWT (`Authorization: Bearer <token>`) consultando `AuthService`.
   - Realiza una validación genérica de permisos a nivel de módulo (ej. `mod-evaluacion:read`, `mod-evaluacion:write`).
   - Inyecta cabeceras de contexto al reenviar la petición interna mediante `HTTPGateway`:
     - `X-User-ID`: Identificador numérico del usuario en `core_users`.
     - `X-User-Email`: Correo institucional del usuario.
     - `X-User-Permissions`: Lista de permisos asignados.
     - `X-Internal-Token`: Token HMAC de comunicación interna entre servicios.
2. **Microservicios (`mod-evaluacion`, `mod-programas-estudio`, `mod-gestion-academica`):**
   - **Hallazgo Crítico:** Los microservicios **NO validan el JWT ni inspeccionan `X-User-ID`**.
   - Asumen ciegamente que cualquier petición recibida es legítima y confían en el `{docente_id}` o `{registro_id}` provisto en el path de la URL.
   - No validan si el docente que ejecuta la petición es dueño del registro ni si tiene asignada la unidad didáctica en su carga lectiva.

### c) Auditoría de Valores `NULL` en Base Institucional Real (`siga_local`)
Se ejecutó una consulta de solo lectura (SELECT) en `siga_local` para verificar la existencia de campos `NULL` en tablas del rol docente:

| Tabla Institucional | Total Registros | Registros con `estado IS NULL` | Otras Columnas con Valores `NULL` Reales |
|---|---|---|---|
| `silabos` | 0 | 0 | Estructura DDL permite `archivo_url`, `observaciones`, `estado` NULL. |
| `planes_trabajo_docente` | 0 | 0 | Estructura DDL permite `archivo_url`, `observaciones`, `estado` NULL. |
| `carga_lectiva` | 11 | 0 | `seccion`, `turno`, `estado` son nulos permitidos en DDL. |
| `evaluacion_registros` | 192 | 0 | **`nota_c1`: 138 filas NULL**<br>**`nota_c2`: 163 filas NULL**<br>**`nota_c3`: 187 filas NULL**<br>**`nota_final`: 9 filas NULL**<br>`estado`: Nulable en PostgreSQL DDL. |

*Conclusión:* El riesgo de ruptura de esquemas Pydantic por campos `NULL` procedentes de la base de datos es **completamente real e inminente**, ya que en producción existen calificaciones parciales y finales pendientes (`NULL`). Si un schema Pydantic no tiene tipado `Optional[T] = None`, el endpoint crashea con Error 500. Se confirmó además que en `siga_local` ninguna fila tiene `estado IS NULL` o `estado_academico IS NULL`, por lo que las correcciones en dichos campos constituyen un **endurecimiento preventivo**.

---

## 2. Matriz de Hallazgos y Estado de Corrección (BUG-D01 a BUG-D10)

| ID | Severidad | Estado | Componente / Archivo y Línea | Causa Raíz | Prueba Demostrativa | Corrección Aplicada / Propuesta |
|---|---|---|---|---|---|---|
| **BUG-D01** | **Alta** | **Pendiente**<br>*(Sin mecanismo en backend)* | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 80–135 | `actualizar_notas` no verifica el estado del acta ni si el registro está consolidado/cerrado. Permite alterar calificaciones de periodos o actas ya oficializadas. | `test_editar_notas_unidad_acta_cerrada_se_rechaza` (xfail) | Se investigó el esquema y código: hoy **no existe tabla ni modelo de actas en el backend**; en el frontend es solo un modal HTML imprimible. Se documentan opciones en Sección 4. |
| **BUG-D02** | **Alta** | **Pendiente**<br>*(Diferido a tarea de autorizaciones)* | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 80–135 | No valida la relación entre el docente autenticado (`X-User-ID`) y la `carga_lectiva` asignada a la unidad didáctica. Cualquier docente puede calificar unidades ajenas (BOLA). | `test_docente_no_puede_calificar_unidad_no_asignada` (xfail) | Requiere inspección de cabeceras de identidad (`X-User-ID`) o JWT en los microservicios. Diferido por alcance de la tarea. |
| **BUG-D03** | **Alta** | **Pendiente**<br>*(Diferido a tarea de autorizaciones)* | `siga_backend/modules/mod-programas-estudio/routes.py`<br>Líneas 566, 644, 660, 678 | Endpoints `/docente/{docente_id}/*` confían ciegamente en el ID de la URL. Un docente puede visualizar y alterar carga, sílabos y planes de cualquier otro docente (IDOR). | `test_docente_no_puede_ver_datos_de_otro_docente_idor` (xfail) | Comparar el `docente_id` de la ruta con el `X-User-ID` de la cabecera, o restringir la consulta a rol Coordinador/Admin si difiere. Diferido por alcance. |
| **BUG-D04** | **Alta** | **Corregido** | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 48–66 | `crear_registro` permitía registrar notas a estudiantes sin matrícula activa en la unidad didáctica. | `test_no_se_puede_calificar_estudiante_no_matriculado` (PASSED) | En `mod-evaluacion/routes.py` (`POST /registros`), se valida contra `matricula_detalles` y `matriculas` que el estudiante posea matrícula activa (`estado != 'retirado'`). Si no existe, retorna **404 Not Found**. |
| **BUG-D05** | **Media** | **Corregido** | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 34–52, 125–144 | La regla anterior requería estrictamente `en_curso`, bloqueando periodos reales vigentes como `2026-II` que operan bajo `matricula_abierta`. | `test_periodos_calificables_en_curso_y_matricula_abierta_permiten_calificar` (PASSED)<br>`test_periodos_no_calificables_cerrado_null_inventado_devuelven_409` (PASSED) | Se definió la constante `ESTADOS_PERIODO_CALIFICABLES = {"en_curso", "matricula_abierta"}`. En `POST /registros` y `PUT /registros/{registro_id}`, si el estado del periodo no pertenece al conjunto (`cerrado`, `NULL`, inventado), responde **409 Conflict** con mensaje en español detallando el código del periodo y su estado actual. |
| **BUG-D06** | **Baja**<br>*(Reclasificada: endurecimiento preventivo)* | **Corregido** | `siga_backend/modules/mod-evaluacion/schemas.py`<br>Líneas 24–36 | En `RegistroEvaluacionResponse`, el campo `estado: str` no era opcional. Si en la BD `estado` es NULL, Pydantic v2 arroja ValidationError 500. | `test_listado_evaluacion_con_estado_null_responde_200` (PASSED)<br>`test_listado_evaluacion_con_notas_null_responde_200` (PASSED) | Se modificó `estado: Optional[str] = "cursando"`. Además se verificó que `nota_c1`, `nota_c2`, `nota_c3` y `nota_final` admiten `None` (`Optional[float] = None`). |
| **BUG-D07** | **Baja**<br>*(Reclasificada: endurecimiento preventivo)* | **Corregido** | `siga_backend/modules/mod-programas-estudio/routes.py`<br>Líneas 611–624 | `SilaboResponse` definía `created_at: datetime` y `estado: str` no opcionales. En `silabos`, ambas columnas admiten NULL en BD. | `test_listado_silabos_con_campos_null_responde_200` (PASSED) | Se tipó en `SilaboResponse` y `SilaboBase`: `created_at: Optional[datetime] = None`, `estado: Optional[str] = "borrador"`. |
| **BUG-D08** | **Baja**<br>*(Reclasificada: endurecimiento preventivo)* | **Corregido** | `siga_backend/modules/mod-programas-estudio/routes.py`<br>Líneas 625–640 | `PlanTrabajoDocenteResponse` definía `created_at: datetime` y `estado: str` no opcionales. | `test_listado_planes_con_campos_null_responde_200` (PASSED) | Se tipó en `PlanTrabajoDocenteResponse` y `PlanTrabajoDocenteBase`: `created_at: Optional[datetime] = None` y `estado: Optional[str] = "borrador"`. |
| **BUG-D09** | **Baja**<br>*(Reclasificada: endurecimiento preventivo)* | **Corregido** | `siga_backend/modules/mod-gestion-academica/schemas.py`<br>Líneas 46–56 | `EstudianteResponse` definía `estado_academico: str` obligatorio. | `test_listado_matriculas_unidad_con_estado_academico_null_responde_200` (PASSED) | Se modificó `estado_academico: Optional[str] = "regular"`, `pago_matricula: Optional[bool] = False`, `documentos_completos: Optional[bool] = True`. |
| **BUG-D10** | **Baja** | **Corregido** | `siga_frontend/src/modules/evaluation/EvaluationDashboard.jsx`<br>Líneas 106–125 | `handleGradeChange` bloqueaba silenciosamente notas fuera del rango [0, 20] sin informar al usuario visualmente. | `4. [BUG-D10] Debe mostrar un mensaje de error visual cuando se ingresa una nota fuera de rango (0-20)` (PASSED) | Se agregó el estado React `gradeError` y una alerta renderizada con `data-testid="grade-error-alert"` ("La calificación debe ser un valor entre 0 y 20"). |

---

## 3. Análisis Técnico de "Acta Cerrada" (BUG-D01) y Opciones de Implementación

### Diagnóstico del Estado Actual
Tras inspeccionar exhaustivamente la base de datos `siga_local`/`siga_test` y el código fuente de backend y frontend:
1. **Inexistencia de Modelo de Acta:** No existe ninguna tabla `actas` o `actas_evaluacion` en el modelo relacional.
2. **Frontend como Simulación Visual:** En `EvaluationDashboard.jsx`, el botón "Generar Acta Oficial" abre un modal (`showActaModal`) que toma las notas en memoria de los estudiantes y maqueta un documento HTML imprimible en el navegador (`window.print()`). No persiste ningún estado ni invoca ningún endpoint de cierre en el backend.
3. **Módulo Gestión Académica vs Evaluación:** En `matriculas`, existe una bandera booleana `consolidada`, pero representa la matrícula global de un estudiante en el semestre completo (todas sus asignaturas), no el cierre de acta de una unidad didáctica por un docente.
4. **Decisión:** Siguiendo la regla de no inventar mecanismos sin aprobación de arquitectura, la prueba `test_editar_notas_unidad_acta_cerrada_se_rechaza` se mantiene con `xfail` (documentando el comportamiento esperado).

### Opciones de Solución para la Siguiente Etapa

* **Opción A (Recomendada - Nivel Carga Lectiva):**
  - Agregar una columna `acta_cerrada: bool = False` (o `estado_acta: str = 'abierta'`) en la tabla `carga_lectiva`.
  - Crear el endpoint `POST /api/mod-evaluacion/carga-lectiva/{carga_id}/cerrar-acta` (o en `mod-programas-estudio`) con confirmación del docente o coordinador.
  - En `PUT /api/mod-evaluacion/registros/{registro_id}`, validar que la carga lectiva vinculada a la unidad didáctica y periodo no tenga `acta_cerrada == True`. Si está cerrada, devolver `HTTP 409 Conflict`.

* **Opción B (Nivel Registro de Evaluación):**
  - Utilizar el campo `estado` de la tabla `evaluacion_registros` admitiendo valores `'cursando'`, `'aprobado'`, `'desaprobado'`, `'cerrado'` o `'consolidado'`.
  - Crear un endpoint `POST /api/mod-evaluacion/registros/unidad/{unidad_id}/periodo/{periodo_id}/cerrar` que actualice masivamente el estado de todos los registros de la unidad a `'cerrado'`.
  - En `PUT /api/mod-evaluacion/registros/{registro_id}`, rechazar con `HTTP 409 Conflict` si `registro.estado in ['cerrado', 'consolidado']`.

---

## 4. Verificación de Contenedores y Endpoints de Solo Lectura

Tras aplicar las correcciones, se reiniciaron ordenadamente los contenedores correspondientes:
- `siga_suiza_2026-mod-gestion-academica-1`
- `siga_suiza_2026-mod-evaluacion-1`
- `siga_suiza_2026-mod-programas-estudio-1`

### a) Pruebas Unitarias Ejecutadas dentro del Contenedor
Se ejecutaron los tests unitarios dentro del contenedor `mod-gestion-academica-1`:
```powershell
docker exec -w /app/modules/mod-gestion-academica siga_suiza_2026-mod-gestion-academica-1 python -m unittest test_enrollment_engine.py test_matricula_schema.py
```
**Resultado:** 15 pruebas ejecutadas exitosamente (OK).

### b) Verificación HTTP (GET Solo Lectura) contra Contenedores
Se validó la disponibilidad y serialización correcta en los puertos de los microservicios:
- `GET http://127.0.0.1:8008/health` -> **200 OK** (`{"status":"healthy","module":"mod-gestion-academica"}`)
- `GET http://127.0.0.1:8008/api/mod-gestion-academica/matriculas/` -> **200 OK** (Matrículas recuperadas y serializadas correctamente).
- `GET http://127.0.0.1:8005/health` -> **200 OK** (`{"status":"healthy","module":"mod-evaluacion"}`)
- `GET http://127.0.0.1:8006/health` -> **200 OK** (`{"status":"healthy","module":"mod-programas-estudio"}`)

---

## 5. Registro de Ejecución Real de la Suite de Pruebas

Comando centralizado:
```powershell
$env:PGPASSWORD = '...'; .\scripts\run_tests.ps1
```

### Resultados Consolidados:
- **Backend (Pytest sobre `siga_test`):**
  - **27 PASSED** (incluyendo las pruebas de BUG-D04, BUG-D05, BUG-D06, BUG-D07, BUG-D08, BUG-D09 y nueva prueba para notas nulas).
  - **3 XFAIL** (Bugs intencionalmente diferidos o sin modelo backend: BUG-D01 acta cerrada, BUG-D02 BOLA, BUG-D03 IDOR).
  - **0 FAILED / 0 Errores inesperados**.
- **Frontend (Vitest):**
  - **8 PASSED** (incluyendo BUG-D10 con alerta visual y validación de notas 0–20).
  - **0 FAILED**.
  - ESLint: 0 errores en `EvaluationDashboard.jsx`.
  - Vite Build: Compilación exitosa en producción (`dist/` generado limpiamente).
- **Aislamiento de Base de Datos Institucional:**
  - Estudiantes en `siga_local` ANTES de las pruebas: **784**
  - Estudiantes en `siga_local` DESPUÉS de las pruebas: **784**
  - **Invarianza confirmada:** Ninguna prueba escribió en la base de datos institucional.
