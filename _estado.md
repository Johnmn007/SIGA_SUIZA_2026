# INFORME DE ESTADO - SIGA

> **Última actualización:** 28 Jun 2026 | **Sesión:** 3 (Debugging E2E, Orquestación Frontend-Backend y Fix de Prefijos API)

---

## 1. OBJETIVO GENERAL

Construir el SIGA (Sistema Integrado de Gestion Academica): Core modular (FastAPI + SQLAlchemy async + NATS + JWT + Redis) + microservicios + frontend React + parser MINEDU. Meta inmediata: **MVP operativo** con Core funcional, frontend conectado con diseño moderno, y módulos base testeados.

---

## 2. ESTRUCTURA DEL PROYECTO

```
D:\SIGA\
├── docs/                       # Documentacion arquitectura (14 docs)
├── siga_backend/               # Backend Python
│   ├── app/                    # Core FastAPI (Gateway centralizado, CORS, Auth)
│   ├── modules/                # Microservicios modulares (carreras, planes, programas, estudiantes, matricula)
│   ├── docker/                 # Dockerfiles
│   └── entrypoint.sh           # Script de inicio ajustado
├── siga_frontend/              # React 19 + Vite 7 + Tailwind
│   ├── src/core/api/           # Cliente API unificado
│   ├── src/modules/            # Vistas modulares (admin, academic, students, etc.)
│   └── index.css               # Sistema de diseño base (Glassmorphism + Tailwind)
├── docker-compose.yml          # Orquestacion completa (Postgres, Redis, NATS, Core, Frontend)
└── _estado.md                  # ESTE ARCHIVO
```

---

## 3. QUÉ HICIMOS Y QUÉ CORREGIMOS (Última Sesión)

### 3.1 Infraestructura & Integración Backend
- **Docker Compose:** Se estabilizó la orquestación. Los contenedores (Redis, Postgres, NATS, Core, Frontend) levantan correctamente y se comunican entre sí.
- **CORS:** Se corrigieron las políticas de CORS en el Gateway (`siga_backend/app/main.py`) permitiendo peticiones desde el frontend.
- **Gateway Auth:** Se parcheó `security_middleware.py` para permitir que el superusuario (`is_superuser`) omita validaciones restrictivas por módulo, solucionando errores **403 Forbidden** invisibles al crear registros.
- **Fix Registro de Módulos (Core):** Se resolvió el bug en `runtime.py` que causaba que los módulos se quedaran en estado `DISCOVERED` perpetuamente al arrancar el contenedor por falta del `commit` del nuevo estado.
- **Fix Módulo Usuarios:** Se reparó `manifest.yaml` del `mod-usuarios` que enrutaba erróneamente al puerto de programas de estudio (8005) en vez del suyo (8001).
- **Fix Cifrado de Contraseñas (Core / Auth):** Se descubrió y reparó un error `500 Internal Server Error` en el módulo de usuarios ocasionado por una incompatibilidad entre `passlib` y la última versión de `bcrypt` (4.x). Se ancló la dependencia `bcrypt==3.2.2` en los requisitos del backend.

### 3.2 Frontend & UI/UX (Tailwind + React)
- **Refactorización a Tailwind CSS:** Se eliminó el uso incorrecto de clases Bootstrap. Se reescribieron los componentes clave (`AdminDashboard`, `UserManagement`, `AuditLogs`) utilizando Tailwind CSS y el nuevo sistema de diseño "Glassmorphism", logrando un acabado profesional y estético.
- **Fijado Crash de Renderizado React:** Se corrigió un error catastrófico (pantalla en blanco) en el dashboard de administrador causado por intentar renderizar un objeto JSON completo en el DOM (estado del gateway).
- **Fijado API Client:** Se estandarizaron los métodos del `apiClient` en la gestión de usuarios (de `.get`/`.post` a `.request`) para coincidir con la implementación real del cliente.
- **Fix Rutas Modal de Usuarios:** Se corrigió el fallo al abrir el modal de registro y edición de usuarios, ocasionado porque el componente estaba solicitando los endpoints a una URL sin el prefijo `/api/v1/` lo que resultaba en errores 404/401 y crasheaba la iteración de los roles en la UI.
- **Fijado Anti-patrón de React (Foco en Inputs):** Se reestructuró `StudentMaster.jsx` moviendo los sub-componentes `InputGroup` y `CheckboxGroup` fuera del componente principal, solucionando el problema de que los campos perdían el foco (unmount) en cada pulsación de tecla.
- **Feedback UI:** Se integró retroalimentación visual (alerts) en `AcademicDashboard.jsx` para confirmar acciones como la creación de una carrera.

---

## 4. ESTADO ACTUAL (Qué funciona)

| Componente / Módulo | Estado | Notas |
|-----------|--------|-------|
| Orquestación (Docker) | **OK** | `docker-compose up` levanta el stack completo 100% operativo. |
| Core Gateway | **OK** | Proxy, Auth y CORS funcionales. Registro de módulos reparado (HEALTHY status persistente). |
| Dashboard Administrador | **OK** | Rediseñado, muestra estado del sistema en tiempo real con todos los módulos conectados. |
| Gestión de Usuarios | **OK** | Reparado el error de endpoints. Modal de registro/edición funcional y estético (RBAC). |
| Logs de Auditoría | **OK** | Rediseñado, filtra y muestra payload del historial correctamente. |
| Gestión de Estudiantes | **OK** | Funcional, reparado el registro del estudiante maestro sin perder el foco. |
| Gestión Académica (Carreras)| **OK** | Reparado el error 403. Ya guarda exitosamente y muestra feedback. |

## Estado Actual (2026-06-27)
- **Login:** Funcional (bcrypt==3.2.2 anclado).
- **Gestión de Usuarios:** Modal de registro corregido visualmente (fuera de `glass-card`). Flujo de registro validado.
- **Parser MINEDU (Planes de Estudio):** Implementado motor de extracción heurística (Anchor-based) usando Pandas. 
- **Integración UI Planes:** El Frontend utiliza el Plan MINEDU como única fuente de verdad para crear carreras.
- **Módulo de Matrícula (Enrollment):** Armonizado a Tailwind CSS (Glassmorphism). Se eliminó la pantalla redundante de "Registrar Estudiante" del Dashboard de Matrícula, forzando correctamente el uso del Maestro de Estudiantes. El flujo E2E (Buscar en Maestro -> Asignar Carrera/Periodo -> Confirmar) funciona correctamente.
- **Fixes Estructurales de Orquestación y API:** 
  - Se configuró Vite en `siga_frontend/vite.config.js` con `usePolling: true` para garantizar el Hot-Reloading dentro del contenedor Docker en Windows (solucionando el problema de caché fantasma).
  - Se eliminó el prefijo de enrutamiento interno (`/api/v1`) en **todos los microservicios** (`mod-gestion-academica`, `mod-programas-estudio`, `mod-evaluacion`, `mod-planes-estudio`, `mod-usuarios`) para alinear su respuesta con el proxy dinámico del Gateway, resolviendo múltiples errores 404 silenciosos durante la navegación E2E.
  - Se sanitizaron los payloads del frontend usando valores `null` en fechas/emails vacíos para evitar rechazos tipo 422 de Pydantic.
  - **Plan de Matrículas (Doble Motor):** Creado `docs/14-PLAN-MATRICULAS-CASUISTICAS.md` definiendo el motor estricto (Backend) y el motor flexible (UI de Asistente de Secretaria).
  - **Gestión de Periodos:** Se creó `PeriodManager.jsx` en el módulo académico para administrar el ciclo de vida (Planificación, Matrícula Abierta, En Curso, Histórico) de los periodos institucionales y se conectó con el backend.

## Siguiente Paso (Next Steps)
- Validar con el usuario el flujo completo de Matrícula en el Frontend.
- Abordar el Módulo de Evaluación (fase 3 - registro de notas y promedios):
  - **Hecho:** Se implementó el TeacherGradebook (EvaluationDashboard) con el cliente API unificado y detección de Competencia Específica/Transversal.
  - **Hecho:** Se implementó la Vista de Supervisión para el Coordinador de Programa (`CoordinatorSupervision.jsx`), permitiendo auditar el avance del llenado de actas en tiempo real por Módulo Formativo.
  - **Diferido:** El cálculo del Promedio Ponderado Institucional y la generación de Actas en el backend se han pospuesto (decisión del usuario por su complejidad).
  - **Conclusión Fase 3:** La Fase 3 (Evaluación - MVP) está funcionalmente cerrada con la ingesta y supervisión de notas.

## Siguiente Paso (Next Steps)
- **Fase 4: Expansión (Trámites y Casuísticas):**
  - **Hecho:** Se implementaron las 6 entidades base en la base de datos de `mod-gestion-academica` (`HistorialAcademico`, `BeneficioEstudiante`, `RegistroPractica`, etc.) para soportar Reservas, Convalidaciones, y Titulación.
  - **Hecho:** Se crearon los endpoints REST (`/tramites`, `/convalidaciones`, `/beneficios`) en el backend.
  - **Hecho:** Se desarrolló el `TramitesDashboard.jsx` en el frontend, permitiendo a la Secretaría Académica gestionar las solicitudes y ver las resoluciones en una interfaz moderna (Glassmorphism).

## 6. Progreso del Día (2026-06-28)
- **Aislamiento de Roles:** Se ajustaron los paneles del menú de navegación según estricto RBAC, impidiendo que el Coordinador vea métricas del Superadmin y reubicando "Gestión Académica Central" a la Secretaría Académica.
- **Creación de Panel de Coordinador (`CoordinatorAcademic.jsx`):** Flujo completo de asignación de Carga Lectiva por docente (con guardado en BD `CargaLectiva`), permitiendo adjuntar Horarios en formato Excel y revisar la asignación por unidad didáctica.
- **Estandarización de Pruebas (DB Reset & Seed):** 
  - Se reescribió `reset_db.py` inyectando por SQL (pgcrypto) exactamente los 8 usuarios predefinidos (`admin`, `tesoreria`, `secretaria`, `coordinador`, `admision`, `docente`, `estudiante`, `secretaria_prog`).
  - Se corrigió error de Zona Horaria (Crash 500) en la ingesta de periodos académicos.
  - El script `seed_all.py` inicializa Mallas, Periodo e ingesta automáticamente 110 estudiantes emulados de Admisión (`mock_admision.json`).
- **Fix Extracción de Rol:** Se corrigió un bug silencioso en `DashboardLayout.jsx` y `App.jsx` donde el frontend esperaba el rol en `user.roles` (como array) pero el Gateway en `/auth/login` devuelve el rol primario parseado como `user.role` (string), solucionando el menú invisible del Coordinador.

## Siguiente Paso Inmediato (Next Steps)
- **Hecho:** Implementar la sumisión y validación del "Sílabo" y "Plan de Trabajo Docente" (Flujo Docente -> Coordinador).
  - Se crearon endpoints en `mod-programas-estudio` para `silabos` y `planes-trabajo`.
  - Se creó el componente `DocentePlanning.jsx` y se integró como pestaña en `EvaluationDashboard.jsx`.
  - Se creó `CoordinatorReview.jsx` para que el coordinador apruebe/observe los documentos.
- **Hecho:** Diseñar UI para asignar Tutores a los Docentes por cada ciclo.
  - Se crearon endpoints para `tutorias` en el backend.
  - Se creó `CoordinatorTutorias.jsx` y se integró en `CoordinatorAcademic.jsx`.
- Validar End-to-End el flujo completo: Ingesta Admisión -> Matrícula -> Asignación Carga/Tutoría -> Registro de Notas.
---

## 5. LECCIONES APRENDIDAS (PROCESO)

1. **React Anti-patterns:** Declarar componentes funcionales dentro del scope del render de otro componente causa que React destruya y vuelva a montar el componente hijo en cada render (perdiendo el state y el focus). Siempre extraer componentes reusables al root file o a su propio archivo.
2. **Depuración Full-Stack:** Errores silenciosos en frontend (botones que "no hacen nada") a menudo enmascaran errores HTTP (403, 422, 404). Es imperativo revisar la consola del navegador y los logs del contenedor core (backend).
3. **Manejo de Respuestas JSON Complejas:** React crashea con una pantalla blanca total si se intenta imprimir un Objeto u Array como un primitivo en el JSX. Usar `JSON.stringify` o acceder a llaves específicas.
4. **Tailwind > Bootstrap:** Mezclar clases de librerías extintas en el proyecto causaba una interfaz "desordenada y poco prolija". Es fundamental mantener la coherencia del stack de diseño elegido.
51. **Hot Reload de Backend en Docker:** Para asegurar que los cambios de Python se apliquen automáticamente y no obligar al uso de `--build` en cada reinicio, se configuró el mapeo de volúmenes (`volumes: - ./siga_backend:/app`) en todos los microservicios backend dentro del `docker-compose.yml`.
2. **Registro de Módulos (Core):** Se resolvió el bug en runtime.py que causaba que los módulos se quedaran en estado DISCOVERED perpetuamente al arrancar el contenedor por falta del commit del nuevo estado.
3. **Manejo de Roles UI:** La UI (DashboardLayout) utiliza validación hardcodeada de roles. Es crucial asegurar que `user?.role` devuelto por el Auth Service coincide exactamente con los esperados (ej. `admin` vs `superadmin`), de lo contrario los usuarios ven el sistema vacío y reportan "pérdida de cambios".

---

## 6. PRÓXIMOS PASOS CONCRETOS (Siguiente Meta)

### Inmediatos (próxima sesión)
1. **Parser MINEDU:** [HECHO] Construido e integrado el script (`siga_backend/tools/importar_planes.py`) que importa automáticamente las mallas curriculares al `mod-planes-estudio`.
2. **Pruebas de Flujo End-to-End:** Validar el camino del estudiante: Ingesta (Admisión) -> Matrícula -> Visualización de Notas -> Tramitación de Reserva/Constancia.
3. **Módulo de Tesorería (Opcional):** Si se decide retomar, integrar la facturación cruzada con el sistema de Becas recién implementado.
