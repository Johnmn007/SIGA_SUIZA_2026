# Arquitectura de Matrículas y Gestión de Periodos

Este documento detalla la estructura lógica para automatizar la gestión de periodos académicos y resolver las distintas casuísticas de matrícula del IESTP.

---

## 1. Gestión de Periodos Académicos (El Motor del Tiempo)

Actualmente los periodos se inyectaron manualmente, pero la solución profesional requiere un **Módulo de Configuración Institucional**.

### 1.1. Ciclo de Vida del Periodo Académico
Un periodo (ej. `2026-I`) debe tener los siguientes estados automatizados por fechas:
1. **Planificación:** El periodo está creado. Se asignan docentes a las Unidades Didácticas (UD) y se configuran horarios. (Los alumnos aún no pueden matricularse).
2. **Matrícula Abierta:** Se habilita automáticamente al llegar la `fecha_inicio_matricula`. El sistema permite el proceso de matrícula (regular y extemporánea).
3. **En Curso (Activo):** Las clases han iniciado. Se bloquean nuevas matrículas (salvo excepciones con Resolución). Se habilita el ingreso de notas.
4. **Cierre / Histórico:** Fin del ciclo. Se cierran actas, se calculan promedios finales y se bloquea cualquier modificación.

### 1.2. Interfaz de Super Admin
Se requiere construir una vista en el Frontend (`AcademicConfig.jsx`) donde la Secretaría Académica o el Super Admin pueda:
- Crear el periodo definiendo el cronograma (fechas de matrícula, fechas de clases, fechas de ingreso de notas por parciales).
- Habilitar o forzar el cambio de estado de un periodo ante directivas de emergencia de la institución.

---

## 2. Casuísticas de Matrícula (El Motor de Reglas)

La matrícula no es un simple `INSERT`. Es un motor de validación que debe ejecutarse en el backend (`mod-gestion-academica`).

### Caso A: Ingresante (Primera Vez)
- **Contexto:** El alumno acaba de pasar por el proceso de Admisión.
- **Acción del Sistema:** Matrícula **Automática en Bloque**.
- **Reglas:** 
  - Se le asignan obligatoriamente **todas** las Unidades Didácticas (UDs) correspondientes al Ciclo I de su Plan de Estudios.
  - No puede retirar cursos en su primer ciclo.

### Caso B: Estudiante Regular (Invicto)
- **Contexto:** Alumno que aprobó todas las UDs de su ciclo anterior.
- **Acción del Sistema:** Matrícula **Sugerida (Promoción de Ciclo)**.
- **Reglas:**
  - El sistema precarga automáticamente todas las UDs del siguiente ciclo cronológico.
  - Valida el rango de créditos (Ej. mínimo 12, máximo 24).
  - El alumno o la secretaria solo da clic en "Confirmar".

### Caso C: Estudiante Irregular (Con Cursos Reprobados)
- **Contexto:** Alumno que desaprobó entre 1 y 3 cursos (Si desaprueba 4 o más, entra en suspensión según normativas típicas de IESTP).
- **Acción del Sistema:** Matrícula **Restringida y Priorizada**.
- **Reglas:**
  - **Prioridad 1 (Obligatorio):** El sistema inyecta primero y obligatoriamente las UDs reprobadas del ciclo anterior.
  - **Prioridad 2 (Pre-requisitos):** Se bloquean las UDs del ciclo superior que tengan como pre-requisito una UD que el alumno reprobó.
  - **Prioridad 3 (Tope de Créditos):** El alumno puede completar su matrícula con UDs del nuevo ciclo *siempre y cuando* no exceda el máximo de créditos permitidos (24).
  
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

---

## 3. Arquitectura de Doble Motor (Dual-Engine Strategy)

A petición de la institución, el sistema implementará ambos motores de matrícula, permitiendo activar uno u otro según la madurez digital del personal:

### Motor Activo (Estrategia Flexible / Manual)
- **Ingresantes (Primera Vez):** Matrícula totalmente automática (se asigna todo el Ciclo I sin intervención).
- **Alumnos Regulares / Irregulares / Resto:** El sistema actúa como un "asistente visual". Lista todas las Unidades Didácticas (UDs) disponibles para el periodo y ciclo correspondiente, pero **permite a la Secretaria Académica tomar la decisión final**. La secretaria puede marcar o desmarcar libremente los cursos, asumiendo ella la responsabilidad de las restricciones (tope de créditos, cruce de horarios o arrastre de cursos).

### Motor en Reposo (Estrategia Estricta / Automatizada)
- Es el motor descrito en la sección 2 (Casos A, B, C, D, E).
- Aplica las reglas duras de negocio en el backend (bloqueo por pre-requisitos, obligación de llevar cursos jalados primero, bloqueo si supera los 24 créditos).
- Estará programado y existirá en el código, pero se mantendrá inactivo (mediante un Feature Flag o switch de configuración) hasta que la institución decida activar el rigor total del sistema.

---

## 4. Plan de Implementación (Roadmap Inmediato)

Para hacer realidad esto, dividiremos el trabajo en 3 etapas:

1. **Etapa 1: UI de Configuración de Periodos**
   - Construir en React la pantalla para crear y administrar Periodos Académicos con sus fechas. (Frontend)

2. **Etapa 2: Doble Motor en el Backend (API)**
   - Crear dos endpoints de propuesta de matrícula o un endpoint con un parámetro `estrategia=flexible|estricta` en `mod-gestion-academica`.

3. **Etapa 3: Asistente de Matrícula Flexible en Frontend (Mejora del EnrollmentProcess)**
   - Modificar el paso 2 de `EnrollmentProcess.jsx` para mostrar un panel de "Selección Manual Asistida" de UDs, permitiendo a la secretaria armar la matrícula a medida.
