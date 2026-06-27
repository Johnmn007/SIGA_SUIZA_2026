# INFORME DE ESTADO - SIGA

> **Última actualización:** 27 Jun 2026 | **Sesión:** 2 (UI Refactor Tailwind + Fixes Integración Frontend-Backend)

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
- **Módulo de Matrícula (Enrollment):** Armonizado a Tailwind CSS (Glassmorphism). Se unificó el `EnrollmentDashboard` (donde se registran nuevos alumnos y se listan) con `EnrollmentProcess` (donde se matricular un alumno). El flujo completo desde listar, registrar alumno nuevo, y pulsar "Matricular" para entrar al flujo de pasos está completamente implementado y pulido visualmente.

## Siguiente Paso (Next Steps)
- Validar con el usuario el flujo completo de Matrícula en el Frontend.
- Abordar el Módulo de Evaluación (fase 3 - registro de notas y promedios) u otra directiva que se defina.

---

## 5. LECCIONES APRENDIDAS (PROCESO)

1. **React Anti-patterns:** Declarar componentes funcionales dentro del scope del render de otro componente causa que React destruya y vuelva a montar el componente hijo en cada render (perdiendo el state y el focus). Siempre extraer componentes reusables al root file o a su propio archivo.
2. **Depuración Full-Stack:** Errores silenciosos en frontend (botones que "no hacen nada") a menudo enmascaran errores HTTP (403, 422, 404). Es imperativo revisar la consola del navegador y los logs del contenedor core (backend).
3. **Manejo de Respuestas JSON Complejas:** React crashea con una pantalla blanca total si se intenta imprimir un Objeto u Array como un primitivo en el JSX. Usar `JSON.stringify` o acceder a llaves específicas.
4. **Tailwind > Bootstrap:** Mezclar clases de librerías extintas en el proyecto causaba una interfaz "desordenada y poco prolija". Es fundamental mantener la coherencia del stack de diseño elegido.
5. **Cuidado con las dependencias y volúmenes en Docker:** Cuando se configuran los `docker-compose` usando la orden `COPY` en los Dockerfiles en lugar de mapear directorios con `volumes`, reiniciar los contenedores no aplica los cambios locales. Es estrictamente necesario reconstruir las imágenes con `docker-compose up --build`.

---

## 6. PRÓXIMOS PASOS CONCRETOS (Siguiente Meta)

### Inmediatos (próxima sesión)
1. **Parser MINEDU:** Construir e integrar el parser para importar masivamente los 8 libros Excel de **planes de estudio** en el módulo correspondiente.
2. **Pruebas de Módulo de Matrícula:** Validar de principio a fin el flujo de matrícula (`mod-matricula`), asegurando que su vista React funcione acorde a la nueva estética de Tailwind.
3. **Módulo de Evaluación (Notas):** Iniciar el desarrollo de la Fase 3, creando el módulo que permita el registro de notas, cálculo de promedios y generación de boletines.
4. **Armonización de Interfaz:** Aplicar el mismo rediseño moderno ("Glassmorphism") al resto de las pantallas (Matrícula, Evaluación) que aún puedan conservar código UI obsoleto.
