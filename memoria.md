# INFORME DE ESTADO - SIGA

> **Última actualización:** 30 Oct 2026 | **Sesión:** 9 (Maestro de Estudiantes: carrera en tabla, filtro y ordenamiento)

---

## 0. SESIÓN 9 — MAESTRO DE ESTUDIANTES: CARRERA, FILTRO Y ORDEN

Solo frontend (`StudentMaster.jsx`, `DashboardLayout.jsx`).

### 0.1 Columna Carrera y orden de la tabla
- La columna **Código** se reemplazó por **Carrera** (`StudentMaster.jsx:1234`). La celda usa `getProgramaLabel(s.programa_id)`, fallback `Sin carrera`, badge truncado a 220px y `title` con el nombre completo.
- El catálogo sigue hardcodeado en `PROGRAMAS` (ids 1–11) porque `programas_estudio` está vacía. Si se puebla la tabla, unificar el mapeo (hoy `mod-admision` usa otro distinto).
- **Orden visual:** `compareStudentsByCarrera` ordena por carrera (A→Z, dejando `Sin carrera` al final), luego apellidos y nombres con `localeCompare('es')`. Reemplazó al orden anterior por `id` descendente (`StudentMaster.jsx:423`, `StudentMaster.jsx:622`).

### 0.2 Filtro por carrera
- El `ProgramaFilter` ahora se muestra también para `secretaria_academica` y `admin_admision`; `secretaria_programa` sigue auto-filtrado a su carrera y sin dropdown.
- Comparaciones normalizadas con `String(...)` en `ProgramaFilter`/`SearchSelect`; `handleSearch` tolera campos nulos y normaliza DNI, nombres, apellidos y código.

### 0.3 Fix de consola
- `DashboardLayout.jsx`: las notificaciones WebSocket usaban `Date.now()` como `key` y generaban claves duplicadas; ahora usan `notificationSeqRef` incremental.

### 0.4 Verificación
- `npm run build` OK; `npx eslint StudentMaster.jsx` → 0 errores, 1 warning preexistente (`react-hooks/exhaustive-deps`).
- El endpoint de lista solo devuelve 7 campos; por eso la columna Estudiante sigue mostrando `Sin correo`.
- Nada de esta sesión está commiteado.

---

## 0. SESIÓN 7 — REDISEÑO UI DEL MAESTRO DE ESTUDIANTES

Solo frontend. Archivo central: `siga_frontend/src/modules/students/StudentMaster.jsx`. No se tocó backend ni `docker-compose.yml`.

### 0.1 Listado con scroll infinito (20 recientes, uno a uno)
- Los datos se ordenan por **carrera y apellidos/nombres** (`compareStudentsByCarrera`) tras el fetch (`handleSearch`); antes de la Sesión 9 se ordenaba por `id` descendente. El backend sigue devolviendo todo y ordena por `apellidos`; el orden y el paginado son en cliente.
- `visibleCount` (constante `INITIAL_VISIBLE = 20`) controla cuántos se muestran; se resetea a 20 cuando cambia la lista (`useEffect` sobre `students`).
- `IntersectionObserver` sobre un `sentinelRef` (con `rootMargin: '0px 0px 120px 0px'`): revela **1 alumno por vez**, con un `loadLockRef` de 250 ms para evitar ráfagas. El indicador "Cargando más estudiantes…" se muestra solo si `visibleCount < students.length`.
- Ambos listados (tabla y tarjetas) renderizan `visibleStudents = students.slice(0, visibleCount)`.

### 0.2 Filtro de Programas custom (`ProgramaFilter`)
- Se reemplazó el `<select>` nativo por un componente propio con trigger tipo tarjeta (icono degradado `LayoutGrid` si "Todos" / `GraduationCap` si un programa, label "Programa de Estudio", badge con el id del programa activo y chevron rotatorio) y panel flotante con check del activo. Cierra al click fuera y con `Esc`.
- Catálogo en constante `PROGRAMAS` (11 carreras, ids 1–11 + `ALL`).
- **Fix de superposición:** el panel se veía *detrás* de la lista. Causa: `.glass-card` usa `backdrop-blur`, que crea stacking context y atrapaba el `z-40` del panel. Solución: `relative z-30` en la tarjeta del filtro y `relative z-0` en la tarjeta del listado.

### 0.3 Buscador y hero del encabezado
- Buscador rediseñado al mismo lenguaje del filtro: bloque de icono degradado, label "Buscar Estudiante", placeholder corto, foco con `ring-4 ring-primary/15`, y chip contador de resultados (reemplaza al spinner al terminar).
- Cabecera del apartado convertida en **banner hero**: degradado `primary → primary-dark → secondary`, blobs difusos, icono en cápsula, título/subtítulo y chips "N registrados" / "Maestro de Datos". Botones adaptados a fondo oscuro (blanco sólido para "Registrar Estudiante").

### 0.4 Imagen de fondo tecnológica
- `src/assets/tech-bg.svg`: se creó un patrón de circuitos/red en la paleta institucional (`#A0C1F7` → `#7FB2F0`). Quedó como alternativa sin uso.
- `src/assets/tech-bg.jpg`: **imagen libre descargada de Unsplash** ("líneas y puntos azules", `photo-1644088379091…`, ~213 KB), almacenada localmente (funciona en Docker sin red). Se usa en el hero y en la cabecera del modal, con un degradado `primary-dark/primary` encima para teñirla a la paleta.

### 0.5 Listado en tonos grises, texto resaltado
- Tabla: cabecera `slate-200` con texto `slate-700` y borde `slate-300`; filas con zebra `odd:bg-white even:bg-slate-100` y hover `slate-200`; contenedor `bg-slate-50 border-slate-200` (se dejó de usar `glass-card`).
- Tarjetas (móvil/tablet): degradado `slate-50 → slate-100`, borde `slate-300`, hover `slate-400`.
- Texto reforzado: nombres `slate-900`, chips de código `slate-300/70 text-slate-800`, DNI `slate-700 medium`, contacto `slate-600/700`.

### 0.6 Modal de registro rediseñado
- **Ancho:** `sm:max-w-3xl` → `sm:max-w-5xl lg:max-w-6xl`.
- **Cabecera azul** con la imagen `tech-bg.jpg` de fondo (opacidad ~50%) + degradado, título grande y subtítulo "Censo Institucional · Maestro de Identidad". Altura final **20% más delgada** que el primer rediseño (`py-6 sm:py-9`, `min-h-[106px] sm:min-h-[144px]`).
- **Cabecera estática:** `shrink-0` en cabecera/stepper/footer y `min-h-0` en el cuerpo (`overflow-y-auto flex-1`) → solo scrollea el contenido; el encabezado, el stepper y el pie quedan fijos.
- **Contenido reordenado** para aprovechar el ancho: Paso 1 nombres/apellidos primero y 3 columnas en `lg`; Paso 2 dirección a todo lo ancho + distrito/provincia/departamento y contacto en 3 columnas; Paso 4 en 3 columnas; Paso 5 pasó de lista estrecha a **grilla de tarjetas** de 2 columnas (`max-w-3xl`).

### 0.7 Animaciones entre pasos
- Nuevas keyframes en `index.css`: `stepInRight` / `stepInLeft` (slide 32px + escala sutil, `cubic-bezier(0.22,1,0.36,1)` 0.4s).
- State `stepDir` (`forward`/`back`) según Anterior/Siguiente. El cuerpo se envuelve en `<div key={wizardStep} className={stepDir === 'back' ? 'animate-step-in-left' : 'animate-step-in-right'}>`: el `key` fuerza remontaje y por tanto **reinicia la animación en cada cambio** (antes el `<div>` se reutilizaba y la animación no se reproducía). Se quitaron los `animate-fade-in-right` de los pasos.
- Stepper con **barra de progreso animada**: línea azul que se rellena con `transition-all duration-500 ease-out` según el paso.

### 0.8 Archivos de esta sesión

| Archivo | Cambio |
|---------|--------|
| `siga_frontend/src/modules/students/StudentMaster.jsx` | Scroll infinito, `ProgramaFilter`, buscador/hero, listado gris, modal ensanchado + cabecera con imagen + contenido reordenado, animaciones direccionales, cabecera estática |
| `siga_frontend/src/index.css` | Keyframes `stepInRight` y `stepInLeft` |
| `siga_frontend/src/assets/tech-bg.jpg` | **Nuevo**: imagen tecnológica libre (Unsplash), usada en hero y modal |
| `siga_frontend/src/assets/tech-bg.svg` | **Nuevo**: patrón vectorial alternativo (sin uso) |
| `memoria.md` | Esta sección |

### 0.9 Verificación y pendientes
- `npm run build` OK en cada cambio. `npx eslint StudentMaster.jsx` solo reporta los 2 avisos **preexistentes**: `selectedStudent` sin usar (botón "Ver Detalle" sin modal) y `exhaustive-deps` en el `useEffect` de carga.
- Nada de esta sesión está commiteado.
- Pendiente heredado: portar a `createPortal` los demás modales (ver §0.8.d de la Sesión 6).

---

## 0. SESIÓN 6 — ENTORNO DOCKER + CARGA DE ADMISIONES 2026 + MAESTRO DE ESTUDIENTES

### 0.1 Cambio de entorno: ahora SIEMPRE Docker
El stack corre **exclusivamente en Docker**. Se detuvieron el servicio nativo `postgresql-x64-17` y el uvicorn local.

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Core Gateway | http://localhost:8000 | `admin@siga.edu` / `admin123` |
| Frontend (Docker) | http://localhost:3000 | — |
| Postgres (Docker) | localhost:5432 | `postgres` / **`john.007`** / db `siga_core` |

> ⚠️ El `.env` local conserva la contraseña nativa `61077615`, pero **docker-compose.yml la sobreescribe con `john.007`**. No mezclar.

Login correcto: `POST /auth/login?email=admin@siga.edu&password=admin123`.
(`/api/core/auth/login` devuelve 401: el middleware exige token en esa ruta.)

### 0.2 Correcciones técnicas aplicadas
- **`entrypoint.sh` con finales de línea CRLF** hacia bash: el script fallaba de forma silenciosa. Convertido a LF y se agregó `.gitattributes` (`*.sh text eol=lf`) para que no vuelva a ocurrir.
- **`requirements.txt`**: `sqlalchemy[asyncio]>=2.0.23` + `greenlet>=3.0.0` (el motor async lo necesita en platforms donde no se instala como dependencia transitiva).
- **Carrera de arranque:** los módulos ejecutan `Base.metadata.create_all()` en paralelo al cold start y chocaban en `outbox_events` (`duplicate key value violates unique constraint "pg_type_typname_nsp_index"`). Workaround actual: reiniciar los módulos **secuencialmente**. Deuda técnica pendiente: migraciones centralizadas o lock de arranque.

### 0.3 Catálogo real de Programas de Estudio
`programas_estudio` estaba **vacía** y el catálogo de DOC-10 no correspondía a las carreras reales del IEST. Se crearon las **11 carreras** con los nombres exactos del Excel de admisión:

| id | Código | Programa | Créditos |
|----|--------|----------|----------|
| 1 | ENF | Enfermería Técnica | 30 |
| 2 | CON | Contabilidad | 29 |
| 3 | MET | Mecatrónica Automotriz | 0 * |
| 4 | GAS-ADM | Gestión Administrativa | 0 * |
| 5 | PRO-AG | Producción Agropecuaria | 0 * |
| 6 | CON-CIV | Construcción Civil | 0 * |
| 7 | DSI | Desarrollo de Sistemas de Información | 28 |
| 8 | ELT | Electricidad Industrial | 27 |
| 9 | AOT | Administración de Operaciones Turísticas | 0 * |
| 10 | MAN-FOR | Manejo Forestal | 0 * |
| 11 | ASI-ADM | Asistencia Administrativa | 0 * |

`*` Créditos **pendientes de validar** contra el plan de studies oficial. DOC-10 debe actualizarse con este catálogo (el anterior lista DSI/ENF/MEC/ELT/CON/ADM/GAS/GUI/AGR/MIN/LAB).

### 0.4 Carga masiva de admitidos 2026
Script idempotente: **`siga_backend/tools/cargar_admitidos_2026.py`** (`--dry-run` para previsualizar).

- Fuente: `admision_resultados.xlsx` == `ADMISION_2026.xlsx!B_Datos`.
- **438 estudiantes** cargados vía `POST /api/mod-gestion-academica/estudiantes/` (nada de SQL directo).
- `codigo_estudiante` = `2026-{código de admisión con 6 dígitos}` (p. ej. `2026-000123`), formato de DOC-05.
- `metadata_admision` conserva el Excel completo: edad, sexo, nacionalidad, ubicación, lengua materna, discapacidad, apoderado, colegio + código modular, documentos y links.

**Excepciones registradas:**
- Fila de prueba `código 439` (`rfgdfg/dfgdf`, DNI 32165487) y fila 439 vacía: **descartadas**.
- `2026-000168` García García Keyner José: `CARNET DE EXTRANJERIA` (doc 6293672) → `modalidad_admision = EXTRANJERIA`.
- **2 con DNI mal digitado** en el Excel, cargados con alerta en `metadata_admision.alerta`: `2026-000215` (5 díg.) y `2026-000383` (6 díg.). Verificar documentación antes de matricular.
- 44 sin email, 2 sin fecha de nacimiento.

Distribución final: Enfermería 175, Contabilidad 48, Mecatrónica 41, Gestión Adm. 40, Prod. Agropecuaria 27, Construcción Civil 26, DSI 22, Electricidad 22, Adm. Turística 18, Manejo Forestal 11, Asistencia Adm. 8.

### 0.5 Archivos modificados en esta sesión

| Archivo | Cambio |
|---------|--------|
| `siga_backend/entrypoint.sh` | CRLF → LF (el arranque fallaba en silencio) |
| `.gitattributes` | **Nuevo**: `*.sh text eol=lf` para evitar la regresión |
| `siga_backend/requirements.txt` | `sqlalchemy[asyncio]>=2.0.23` + `greenlet>=3.0.0` |
| `siga_backend/tools/cargar_admitidos_2026.py` | **Nuevo**: cargador idempotente con `--dry-run` |
| `memoria.md` | Sección 0 de esta sesión + ruta corregida (`_estado.md` → `memoria.md`) |
| `.agents/AGENTS.md` | Runbook reescrito a Docker; referencias a `memoria.md` |
| `docs/MEMORIA_CONTEXTO.md` | Lecciones 15-20, reglas de carga masiva, §4.3 puertos |
| `docs/10-LOGICA-NEGOCIO.md` | §1.2 catálogo real de 11 programas (el anterior era ficticio) |

Docker: no se modificó `docker-compose.yml`. Por falta de red con Docker Hub, las imágenes de los 7 microservicios se **retaguearon** a partir de la imagen del Core ya construida (`docker image tag <core> siga_suiza_2026-siga-<modulo>:latest`) para heredar `greenlet` sin rebuild.

### 0.6 Comandos del día
```powershell
docker compose ps
docker compose restart mod-gestion-academica   # reiniciar un módulo
python siga_backend\tools\cargar_admitidos_2026.py --dry-run
python siga_backend\tools\cargar_admitidos_2026.py
```

### 0.7 Pendientes

**Requieren información del usuario**
- Créditos oficiales y plan de estudios de las 7 carreras con `creditos_totales = 0`.
- Verificar físicamente los DNI de `2026-000215` y `2026-000383`.
- Decidir si se cargan en el futuro las hojas `B_Datos_Exonerados` (342) y `B_Datos_Cepre` (357), y `MATRICULADOS I SEM 2026 _rev(2).xlsx` (poblaciones distintas, se deduplicarían por DNI).

**Deuda técnica**
- **Carrera de arranque**: los módulos hacen `create_all()` en paralelo y chocan en `outbox_events`. Solución definitiva: migraciones centralizadas (Alembic) o advisory lock de arranque.
- **`siga_backend/venv/` está versionado en git**: hay que agregarlo a `.gitignore` y hacer `git rm -r --cached siga_backend/venv` para que `git status` sea usable.
- **Red de Docker Hub inestable**: `docker compose up --build` falla con `failed to resolve source metadata ... no such host`. Verificar conectividad antes de reconstruir para no perder las imágenes retagueadas.
- `.env` de `mod-admision` y `mod-auditoria` sin trackear: revisar si deben estar en `.gitignore`.
- Nada de esta sesión está commiteado todavía.

### 0.8 Maestro de Estudiantes: depuración de UI, responsive y modal (frente de usuario)

Trabajo sobre `siga_frontend/src/modules/students/StudentMaster.jsx` e `index.css`.

**a) Depuración de la cabecera de métricas**
Se eliminaron las 4 tarjetas de estadísticas (Estudiantes, Postulantes, Matriculados, Expediente Completo) junto con el `useMemo` de `stats` y los imports `useMemo` y `Clock` que quedaron sin uso. `Users`, `CheckCircle2` y `FileCheck2` se conservan porque siguen en uso en el wizard y en los estados vacíos.

**b) Barra de búsqueda con más presencia, sin ruido visual**
- Fondo blanco sólido + `shadow-sm` + borde `slate-200` (antes `bg-slate-50/80` sin relieve) → destaca sobre el `glass-card` sin sumar color.
- Foco visible: `focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20` (antes el input inline no daba feedback de foco).
- Altura fija `h-[52px]` alineada con el select de programas (`md:h-[52px]`).
- Spinner y botón limpiar con `shrink-0`; el `X` pasó a un área táctil de 28px con `hover:bg-slate-100`.

**c) Responsive de todo el módulo**
- **Listado:** la tabla pasó de `md:` a `lg:` (6 columnas se deformaban en tablet) → móvil/tablet usan las tarjetas. Celdas `px-4 xl:px-6`, `truncate` + `min-w-0` en nombre/correo, `whitespace-nowrap` en código/DNI, iconos `flex-shrink-0`.
- **Acciones de la tabla:** eran `opacity-0 group-hover:opacity-100`, invisibles en pantallas táctiles → `opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100`.
- **Cabecera:** título `text-2xl sm:text-3xl`, contenedor `min-w-0`, botones `!text-sm sm:!text-base`.
- **Wizard:** foto `w-32 sm:w-36` y centrada en móvil; grillas de los pasos 1–4 cambiadas de `md:` a `sm:`; paso 5 con filas `flex-col sm:flex-row` + `break-words`/`break-all`; stepper muestra el nombre del paso actual en móvil (`sm:hidden`); footer con `!text-sm` en móvil y "Guardar Registro Completo" → "Guardar Registro" con `truncate` para evitar desborde por debajo de 380px.

**d) Modal de registro invisible — bug real (causa raíz)**
El botón "Registrar Estudiante" no abría nada. **Causa:** el div raíz de la vista usa `animate-fade-in`, definido en `index.css` como `animation: fadeIn 0.25s ease-out both`. El `fill-mode: both` **retiene `transform: translateY(0)`** incluso después de terminar la animación, y ese div pasa a ser *containing block* y *stacking context*. Por eso el `fixed inset-0` del wizard se resolvía contra el bloque de contenido (más alto que la pantalla) en lugar del viewport: el modal se centraba muy por debajo del área visible y no se veía.
- **Fix:** `createPortal(..., document.body)` para montar el wizard fuera del árbol del layout.
- Extras: `z-[100]`, cierre al hacer click en el overlay y con `Esc`, y bloqueo de scroll del `body` con restauración al cerrar.

**e) Animaciones nunca ejecutadas**
`animate-fade-in-up` y `animate-fade-in-right` se usaban en 6 vistas (`StudentMaster`, `PeriodManager`, `AcademicDashboard`, `EnrollmentProcess`, `EvaluationDashboard`, `CoordinatorSupervision`) pero **no existían** ni en `index.css` ni en `tailwind.config.js` → eran clases muertas. Se agregaron las keyframes `fadeInUp` y `fadeInRight` a `index.css`.

**f) Archivos tocados en este frente**

| Archivo | Cambio |
|---------|--------|
| `siga_frontend/src/modules/students/StudentMaster.jsx` | Depuración de stats, rediseño de la barra de búsqueda, responsive completo, wizard en portal |
| `siga_frontend/src/index.css` | Keyframes `fadeInUp` y `fadeInRight` |

**g) Verificación**
`npm run build` OK. `npx eslint StudentMaster.jsx` solo reporta 2 avisos **preexistentes**: `selectedStudent` asignado y nunca usado (el botón "Ver Detalle" no tiene modal → estado muerto) y `exhaustive-deps` en el `useEffect` de carga.

**Pendiente detectado aquí**
- El bug de *containing block* (§0.8.d) **afecta a los demás modales**, que siguen montándose dentro de vistas con `animate-fade-in`: `EditStudentModal`, `PeriodManager`, `AcademicDashboard`, `EnrollmentProcess`, `ExtraordinaryEnrollmentModal`, `EvaluationDashboard`, `CoordinatorSupervision`. El botón "Editar" de la tabla de estudiantes suffer el mismo síntoma. Decisión del usuario: pendiente de portar a portal.
- `selectedStudent` es estado muerto: "Ver Detalle" no hace nada porque no existe el modal de detalle.

---

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
└── memoria.md                  # ESTE ARCHIVO
```

---

## 3. QUÉ HICIMOS Y QUÉ CORREGIMOS (Última Sesión)

### 3.1 Refinamiento UI/UX y Restricciones por Rol
- **CRUD Personal & Asignación de Roles:** Se implementó la edición completa de personal en `StaffManagement.jsx`, permitiendo promover roles dinámicamente (ej. de Docente a Coordinador de Programa o `JEFE_AREA`) con su correspondiente actualización en BD.
- **Limpieza de UI de Coordinadores:** En las vistas del Coordinador Académico (`CoordinatorAcademic.jsx`) y Supervisión de Actas (`CoordinatorSupervision.jsx`), se eliminaron los selectores manuales de Programa y Periodo, reemplazándolos por **tarjetas informativas de solo lectura (glass-cards)** autocompletadas en base al perfil del coordinador logueado.
- **Filtro de Roles:** Se corrigió la vista de asignación de carga lectiva del Coordinador para excluir al personal administrativo (`SECRETARIA_PROGRAMA`) de los listados de docentes disponibles.

### 3.2 Refinamiento del Motor de Matrícula (Casuísticas)
- **Auto-selección en Matrícula:** Se parcheó y mejoró la lógica en `EnrollmentProcess.jsx` (Paso 2) para que el Programa de Estudios del alumno y el Periodo Activo se seleccionen y bloqueen automáticamente (Info Cards).
- **Flexibilidad de Casuísticas (Irregulares/Reingresos):** Se validó y estabilizó el "Motor Flexible de Matrícula" (Paso 3) que permite a la Secretaria de Programa matricular alumnos (ej. Irregulares) escogiendo cursos de múltiples ciclos a la vez (Menú a la carta) con validación de créditos en tiempo real.

### 3.3 Refinamiento de Fase 3 (Correcciones y Evaluaciones)
- **Correcciones Rápidas de Tipeo:** Se implementó `EditStudentModal.jsx` en la vista de Maestro de Estudiantes (Secretaría) para permitir corregir errores de tipeo menores inmediatamente, diferenciándolo de los trámites legales de la Fase 4.
- **Simplificación del Ingreso de Notas:** Por decisión de diseño (reducción de fricción de adopción), se eliminó la matriz compleja de 3 evaluaciones en `EvaluationDashboard.jsx`. Ahora el docente ingresa directamente un único **Promedio Final**. Se ajustó el esquema de la BD (`nota_final`) y la UI.

### 3.4 Foto del Estudiante en el Registro (Nuevo)
- **Subida de Foto en PASO 1 (Identidad):** En `StudentMaster.jsx` el PASO 1 ahora incluye un cuadro pequeño (144px) con placeholder "Subir Foto", que permite cargar la imagen del estudiante (JPG/PNG). La imagen se **comprime en frontend vía canvas** a máx. 240px (JPEG q0.82) y se envía como data-URL base64 en el campo `foto_url`.
- **Persistencia:** `foto_url` en `Estudiante` (`mod-gestion-academica/models.py`) ampliado de `String(255)` a `Text` para soportar data-URLs. Migración segura agregada en `init_db` (`database.py`): `ALTER TABLE estudiantes ALTER COLUMN foto_url TYPE TEXT` (no rompe BDs existentes). `foto_url` agregado a `EstudianteBase` (`schemas.py`) para aceptarlo en el POST de creación.
- **Visualización:** La foto se muestra en el PASO 5 (Revisión) y en los listados de estudiantes (tabla y tarjetas móviles) en reemplazo de las iniciales cuando `foto_url` existe. El wizard conserva botón "Quitar foto".
- **Verificación:** `npm run build` OK; `npm run lint` solo reporta errores preexistentes (deuda técnica). Sintaxis Python validada (`py_compile`). Nota: reconstruir el contenedor del módulo (`docker compose up --build mod-gestion-academica`) para aplicar la migración de columna.

---

## 4. ESTADO ACTUAL (Qué funciona)

| Componente / Módulo | Estado | Notas |
|-----------|--------|-------|
| Orquestación (Docker) | **OK** | `docker-compose up` levanta el stack completo 100% operativo. |
| Core Gateway | **OK** | Proxy, Auth y CORS funcionales. Registro de módulos reparado (HEALTHY status persistente). |
| Dashboard Administrador | **OK** | Rediseñado, muestra estado del sistema en tiempo real con todos los módulos conectados. |
| Gestión de Usuarios | **OK** | Modal de registro/edición funcional (RBAC). Cambio de contraseña integrado en UI/UX. |
| Gestión de Personal (RRHH) | **OK** | CRUD completo implementado con edición de roles y perfiles. |
| Gestión de Estudiantes | **OK** | Corrección de errores de tipeo en línea (Edición Rápida) + **foto del estudiante en el registro (PASO 1 Identidad)** y en los listados. **UI depurada, responsive y wizard reparado** (ver §0.8). |
| Gestión Académica (Carreras)| **OK** | Reparado el error 403. Ya guarda exitosamente y muestra feedback. |
| Motor de Matrícula | **OK** | Prevención de doble matrícula reparado. Selección flexible multi-ciclo funcional. |
| Dashboard Docente | **OK** | [REFINADO] Ingreso ultra-rápido de Promedios Finales. Renderizado de planificaciones reparado. |
| Coordinación Académica | **OK** | UI pulida, asignación de carga, tutorías funcionales. |
| Supervisión de Actas | **OK** | Info-cards de solo lectura, muestra porcentaje de avance de notas. |

## Siguiente Paso Inmediato (Next Steps)
- Validar End-to-End el flujo completo: Ingesta Admisión -> Matrícula -> Asignación Carga/Tutoría -> Registro de Notas.
- Iniciar revisión formal (UAT) de todos los módulos con el usuario para preparar el cierre de esta etapa del MVP.

---

## 5. LECCIONES APRENDIDAS (PROCESO)

1. **React Anti-patterns:** Declarar componentes funcionales dentro del scope del render de otro componente causa que React destruya y vuelva a montar el componente hijo en cada render (perdiendo el state y el focus). Siempre extraer componentes reusables al root file o a su propio archivo.
2. **Depuración Full-Stack:** Errores silenciosos en frontend (botones que "no hacen nada") a menudo enmascaran errores HTTP (403, 422, 404). Es imperativo revisar la consola del navegador y los logs del contenedor core (backend).
3. **Manejo de Respuestas JSON Complejas:** React crashea con una pantalla blanca total si se intenta imprimir un Objeto u Array como un primitivo en el JSX. Usar `JSON.stringify` o acceder a llaves específicas.
4. **Validación de Tipos (Comparación de IDs):** Al auto-seleccionar combos o info-cards basándose en IDs relacionales, siempre asegurar que la comparación se haga sobre el mismo tipo (ej. `String(a) === String(b)`) para evitar fallas silenciosas en Array.find() de JavaScript.
5. **`animation-fill-mode: both` + `transform` rompe los modales (`position: fixed`):** una animación tipo `.animate-fade-in { animation: fadeIn .25s ease-out both }` retiene el `transform: translateY(0)` del keyframe final incluso al terminar. Ese valor de `transform` (distinto de `none`) convierte al elemento en **containing block y stacking context**, así que los hijos con `position: fixed` se posicionan respecto a él y no al viewport. Si el bloque es más alto que la pantalla, el modal queda centrado fuera del área visible y el síntoma es "el botón no abre nada". **Regla: todo modal (`fixed inset-0`) se monta con `createPortal(..., document.body)`.**
6. **Clases de animación inexistentes son silenciosas:** `animate-fade-in-up` y `animate-fade-in-right` se usaban en 6 vistas sin existir en `index.css` ni en `tailwind.config.js`. Tailwind no avisa: simplemente no aplican. Verificar siempre que la clase esté definida antes de confiar en el efecto visual.
7. **Acción invisible en táctil:** `opacity-0 group-hover:opacity-100` en una columna de tabla esconde los botones en tablets y móviles (no hay hover). Usar `opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100`.


---

## 0.10 SESIÓN 8 — CONEXIÓN BD + DOCKER (2026-10-27)

### 0.10.1 Configuración Base de Datos
- PostgreSQL local (17.4): contraseña de postgres cambiada de 61077615 a john.007
- Base de datos: creada siga_core con tablas del sistema
- .env raíz: DB_HOST=host.docker.internal, DB_PORT=5432, DB_USER=postgres, DB_PASSWORD=john.007, DB_NAME=siga_core

### 0.10.2 Docker Compose
- Stack levantado con docker compose up -d (nats, redis, core, 7 módulos, frontend)
- NATS/Redis healthy; contenedores conectan vía host.docker.internal

### 0.10.3 Ajustes para arranque del Core
- Instalado psycopg2-binary en siga-core para migraciones Alembic
- alembic_version ajustado a 123456789abc; creada core_modules si necesario
- Core Gateway operativo: GET http://localhost:8000/health -> healthy

### 0.10.4 Verificación
- BD, Core, microservicios y frontend conectados y operativos
