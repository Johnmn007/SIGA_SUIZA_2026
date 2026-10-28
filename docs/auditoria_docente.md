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

*Conclusión:* El riesgo de ruptura de esquemas Pydantic por campos `NULL` procedentes de la base de datos es **completamente real e inminente**, ya que en producción existen calificaciones parciales y finales pendientes (`NULL`). Si un schema Pydantic no tiene tipado `Optional[T] = None`, el endpoint crashea con Error 500.

---

## 2. Matriz de Hallazgos y Vulnerabilidades (BUG-D01 a BUG-D10)

| ID | Severidad | Componente / Archivo y Línea | Causa Raíz | Prueba Demostrativa | Corrección Propuesta |
|---|---|---|---|---|---|
| **BUG-D01** | **Alta** | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 80–106 | `actualizar_notas` no verifica el estado del acta ni si el registro está consolidado/cerrado. Permite alterar calificaciones de periodos o actas ya oficializadas. | `test_editar_notas_unidad_acta_cerrada_se_rechaza` | Consultar el estado del registro o acta antes de actualizar; si es `cerrado` o `consolidado`, rechazar con HTTP 409 Conflict. |
| **BUG-D02** | **Alta** | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 80–106 | No valida la relación entre el docente autenticado (`X-User-ID`) y la `carga_lectiva` asignada a la unidad didáctica. Cualquier docente puede calificar unidades ajenas (BOLA). | `test_docente_no_puede_calificar_unidad_no_asignada` | Verificar en `carga_lectiva` que `docente_id` coincida con el usuario autenticado para esa `unidad_didactica_id` y `periodo_id`. |
| **BUG-D03** | **Alta** | `siga_backend/modules/mod-programas-estudio/routes.py`<br>Líneas 566, 644, 660, 678 | Endpoints `/docente/{docente_id}/*` confían ciegamente en el ID de la URL. Un docente puede visualizar y alterar carga, sílabos y planes de cualquier otro docente (IDOR). | `test_docente_no_puede_ver_datos_de_otro_docente_idor` | Comparar el `docente_id` de la ruta con el `X-User-ID` de la cabecera, o restringir la consulta a rol Coordinador/Admin si difiere. |
| **BUG-D04** | **Alta** | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 34–46 | `crear_registro` no valida existencia ni estado de matrícula en `matricula_detalles`. Además, en la BD `evaluacion_registros` carece de FK contra `matricula_detalles`. | `test_no_se_puede_calificar_estudiante_no_matriculado` | Validar contra la BD que `matricula_detalle_id` exista y pertenezca al estudiante, periodo y unidad indicados. Agregar FK en migración. |
| **BUG-D05** | **Media** | `siga_backend/modules/mod-evaluacion/routes.py`<br>Líneas 34–46, 80–106 | No valida si el `periodo_id` tiene `estado == 'en_curso'`. Permite registrar o actualizar notas en periodos académicos concluidos (`cerrado`). | `test_no_se_puede_registrar_nota_en_periodo_cerrado` | Consultar `periodos_academicos` y rechazar (HTTP 400/409) si el periodo no está activo. |
| **BUG-D06** | **Media** | `siga_backend/modules/mod-evaluacion/schemas.py`<br>Líneas 24–28 | En `RegistroEvaluacionResponse`, el campo `estado: str` no es opcional. Si en la BD `estado` es NULL, Pydantic v2 arroja ValidationError 500. | `test_listado_evaluacion_con_estado_null_responde_200` | Cambiar a `estado: Optional[str] = "cursando"` en `RegistroEvaluacionResponse`. |
| **BUG-D07** | **Media** | `siga_backend/modules/mod-programas-estudio/routes.py`<br>Líneas 611–624 | `SilaboResponse` define `created_at: datetime` y `estado: str` no opcionales. En `silabos`, ambas columnas admiten NULL en la base de datos. | `test_listado_silabos_con_campos_null_responde_200` | Tipar en `SilaboResponse` y `SilaboBase`: `created_at: Optional[datetime] = None`, `estado: Optional[str] = "borrador"`. |
| **BUG-D08** | **Media** | `siga_backend/modules/mod-programas-estudio/routes.py`<br>Líneas 625–640 | `PlanTrabajoDocenteResponse` define `created_at: datetime` no opcional. Si es NULL en la BD, la serialización falla con error 500. | `test_listado_planes_con_campos_null_responde_200` | Cambiar a `created_at: Optional[datetime] = None` y `estado: Optional[str] = "borrador"`. |
| **BUG-D09** | **Media** | `siga_backend/modules/mod-gestion-academica/schemas.py`<br>Líneas 46–56 | `EstudianteResponse` define `estado_academico: str` obligatorio. Si un estudiante tiene este campo NULL en BD, GET `/matriculas/unidad/...` falla con 500. | `test_listado_matriculas_unidad_con_estado_academico_null_responde_200` | Cambiar a `estado_academico: Optional[str] = "regular"`. |
| **BUG-D10** | **Baja** | `siga_frontend/src/modules/evaluation/EvaluationDashboard.jsx`<br>Líneas 106–118 | `handleGradeChange` bloquea silenciosamente entradas `< 0` o `> 20` sin mostrar ningún aviso visual ni mensaje de error al docente. | `it.fails: 4. [BUG-D10] Debe mostrar un mensaje de error visual...` | Agregar un estado de validación local y renderizar un mensaje de alerta (ej. "La nota debe estar entre 0 y 20"). |

---

## 3. Registro de Ejecución Real de Pruebas

Comando centralizado ejecutado:
```powershell
.\scripts\run_tests.ps1
```

### Resultados Consolidados:
```text
============================================================
                     RESUMEN DE PRUEBAS                    
============================================================
Backend Status : EXITOSO (PASSED)
  - Pasadas: 24
  - XFAIL (Bugs documentados estrictos): 9
  - Fallos inesperados: 0
  - Total pruebas Backend: 33

Frontend Status: EXITOSO (PASSED)
  - Pasadas: 7
  - Expected Fail (it.fails / Bug documentado): 1
  - Fallos inesperados: 0
  - Total pruebas Frontend: 8

Auditoría de Invarianza:
  - Estudiantes en siga_local ANTES de las pruebas: 784
  - Estudiantes en siga_local DESPUÉS de las pruebas: 784
  - [CONFIRMADO] siga_local permaneció 100% INTACTA y aislada.
```
