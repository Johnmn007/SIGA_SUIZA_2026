# INFORME DE ESTADO - SIGA

> **Última actualización:** 16 Oct 2026 | **Sesión:** 5 (Boletín de Notas — histórico por ciclos)

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

### 3.4 Boletín de Notas — "Notas por Ciclos" con histórico (fase frontend)
- **Problema:** el menú Boletín de Notas solo renderizaba el Ciclo V: `evaluacion_registros` está vacía en la BD (0 filas) y el único dato de notas provenía de `mockEvaluacion.json` (1 estudiante, solo periodo 2026-I = unidades 329-335 = Ciclo 5).
- **Solución:** nuevo módulo `siga_frontend/src/modules/evaluation/notasPorCiclo.js` que lee `siga_frontend/src/data/boletin.json` (relacional: periodos, matriculas, unidades, registros, docentes) y expone `obtenerNotasPorCiclo`, `resumenDesdeJson` y `construirListaCiclos`. Regla corregida: el **periodo más antiguo matriculado es el CICLO I** y cada semestre avanza un ciclo (2025-I=I, 2025-II=II, 2026-I=III, 2026-II=IV), de modo que las notas salen en I–IV (el campo `ciclo` del JSON está desfasado y ya no se usa como ancla).
- **Integración:** `StudentReportCard.jsx` prioriza el JSON (fallback al mock solo si el estudiante no aparece), fusiona los ciclos del plan con los del JSON (los ciclos cubiertos reemplazan sus unidades por las del JSON y quedan con notas; **los ciclos posteriores —V y VI— se muestran con sus unidades del plan y sin notas**), y alinea `periodo_codigo`, `cursos_periodo` y `resumen`. Aprobación canónica **nota ≥ 13**.
- **Verificación:** `npm run build` ✓ · `npm run lint` sin errores nuevos (baseline 19/7) · lógica probada con esbuild+node (estudiantes 2315/1666/1887) · API real OK (login `admin@siga.edu`/`admin123`, boletín 2315 → 6 ciclos de plan sin notas). Sin commit (pendiente de indicación).

---

## 4. ESTADO ACTUAL (Qué funciona)

| Componente / Módulo | Estado | Notas |
|-----------|--------|-------|
| Orquestación (Docker) | **OK** | `docker-compose up` levanta el stack completo 100% operativo. |
| Core Gateway | **OK** | Proxy, Auth y CORS funcionales. Registro de módulos reparado (HEALTHY status persistente). |
| Dashboard Administrador | **OK** | Rediseñado, muestra estado del sistema en tiempo real con todos los módulos conectados. |
| Gestión de Usuarios | **OK** | Modal de registro/edición funcional (RBAC). Cambio de contraseña integrado en UI/UX. |
| Gestión de Personal (RRHH) | **OK** | CRUD completo implementado con edición de roles y perfiles. |
| Gestión de Estudiantes | **OK** | Corrección de errores de tipeo en línea (Edición Rápida). |
| Gestión Académica (Carreras)| **OK** | Reparado el error 403. Ya guarda exitosamente y muestra feedback. |
| Motor de Matrícula | **OK** | Prevención de doble matrícula reparado. Selección flexible multi-ciclo funcional. |
| Dashboard Docente | **OK** | [REFINADO] Ingreso ultra-rápido de Promedios Finales. Renderizado de planificaciones reparado. |
| Coordinación Académica | **OK** | UI pulida, asignación de carga, tutorías funcionales. |
| Supervisión de Actas | **OK** | Info-cards de solo lectura, muestra porcentaje de avance de notas. |
| Boletín de Notas (Notas por Ciclos) | **OK (frontend)** | Muestra notas históricas de ciclos anteriores desde `data/boletin.json` (JSON); la BD aún no tiene `evaluacion_registros`. Pendiente: migrar la fuente a BD. |

## Siguiente Paso Inmediato (Next Steps)
- Validar End-to-End el flujo completo: Ingesta Admisión -> Matrícula -> Asignación Carga/Tutoría -> Registro de Notas.
- Iniciar revisión formal (UAT) de todos los módulos con el usuario para preparar el cierre de esta etapa del MVP.

---

## 5. LECCIONES APRENDIDAS (PROCESO)

1. **React Anti-patterns:** Declarar componentes funcionales dentro del scope del render de otro componente causa que React destruya y vuelva a montar el componente hijo en cada render (perdiendo el state y el focus). Siempre extraer componentes reusables al root file o a su propio archivo.
2. **Depuración Full-Stack:** Errores silenciosos en frontend (botones que "no hacen nada") a menudo enmascaran errores HTTP (403, 422, 404). Es imperativo revisar la consola del navegador y los logs del contenedor core (backend).
3. **Manejo de Respuestas JSON Complejas:** React crashea con una pantalla blanca total si se intenta imprimir un Objeto u Array como un primitivo en el JSX. Usar `JSON.stringify` o acceder a llaves específicas.
4. **Validación de Tipos (Comparación de IDs):** Al auto-seleccionar combos o info-cards basándose en IDs relacionales, siempre asegurar que la comparación se haga sobre el mismo tipo (ej. `String(a) === String(b)`) para evitar fallas silenciosas en Array.find() de JavaScript.
