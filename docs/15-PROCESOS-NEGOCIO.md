# Procesos de Negocio y Flujos Operativos (Especificación Viva)

> **Versión:** 1.8 | **Última actualización:** 2026-08-29 | **Estándar:** SIGA-BIZ-2.0 | **Estado:** Especificación viva

Este documento es la **especificación viva de los procesos operativos** del SIGA. Se alimenta de los requerimientos funcionales narrados por el equipo y los consolida en flujos accionables, alineándose con el resto de la documentación (DOC-10 Lógica de Negocio, DOC-14 Matrículas, DOC-13 Casuísticas, DOC-06 Comunicación, DOC-07 Seguridad). Cada vez que se narra un nuevo requerimiento, este documento se actualiza antes de tocar otros planes.

---

## 1. Flujo Maestro (Panorama End-to-End)

```
[1] PLAN DE ESTUDIOS  (archivo Excel MINEDU, por carrera)
        │   subir archivo → parser (mod-planes-estudio, /planes/importar-minedu)
        ▼
[2] VALIDACIÓN + CREACIÓN DE LA CARRERA
        │   programa (catálogo 11) + plan/malla + módulos formativos
        │   + unidades didácticas + capacidades + indicadores de logro
        ▼
[3] INGESTA DE ADMITIDOS  (archivo Excel de la oficina de admisión — "cachimbos")
        │   parser (mod-admision) → repartición por carrera (área académica)
        │   → /admision/ingesta en mod-gestion-academica (capa anticorrupción)
        ▼
[4] MATRÍCULA AUTOMÁTICA CICLO I  +  creación de credenciales DNI/DNI
        │   (se asigna todo el Ciclo I del plan vigente; se crea usuario por estudiante)
        │
        ├──  (PARALELO)  [5] PERIODOS ACADÉMICOS
        │                   2 por año · 2026-1: Abril–Agosto · 2026-2: Agosto–Diciembre
        │                   creados por el encargado en mod-gestion-academica
        │
        ▼
[6] MATRÍCULA DE HISTÓRICOS (2do ciclo en adelante)
        por tipo: Regular/Invicto · Irregular · Repitente · Reingresante
                  · Traslado Interno/Externo + Convalidación · Convenio
```

**Regla de precedencia:** el paso [3] depende de [2] (no se puede asentar un ingresante si su carrera aún no tiene plan de estudios vigente con malla de Ciclo I). El paso [5] es independiente y corre en paralelo a [1]-[4].

---

## 2. Proceso A — Creación de Carreras desde Planes de Estudio

### 2.1 Entrada
- Archivo **Excel MINEDU** del plan de estudios (estructura de libros descrita en DOC-10 §3.1: Perfil de Egreso, Programa de Estudios, Capacidades, Organización Modular, Detalle por Módulo).
- Debe contener la data que consume todo el sistema: **unidades didácticas, capacidades, indicadores de logro**, módulos formativos, créditos y horas.

### 2.2 Reglas de dependencia (catálogo)
- La carrera corresponde a un **PROGRAMA del catálogo oficial de 11** (`programa_id` 1..11, ADR-014). El parser **no inventa carreras**.
- Si el archivo menciona un programa **no reconocido**, la operación se **BLOQUEA** y se alerta al administrador — sin fallback 99.
- Si el programa existe y el plan es la primera carga vigente, se crea/vincula la **versión del plan** (ej. `2024-01`, `2027-01`).

### 2.3 Pipeline del parser (`mod-planes-estudio`, `ExcelMineduParser`)
1. **Recepción y validación de estructura** del archivo (hojas y columnas esperadas).
2. **Extracción** (Pandas): módulos formativos, UDs (ciclo, créditos, horas teoría/práctica/virtual), capacidades e indicadores de logro, perfil de egreso.
3. **Normalización y mapeo exacto** del programa (catálogo 11).
4. **Verificación de integridad** (referencias UD→módulo, capacidad→UD, indicador→capacidad; ciclos 1..6; créditos 1..6 por UD; prerrequisitos coherentes).
5. **Persistencia transaccional**: plan de estudios (versión, vigencia, resolución), módulos, UDs, capacidades, indicadores y prerrequisitos.
6. **Auditoría**: registro en `core_audit_logs` con usuario importador y hash del archivo.
7. **Resultado de carga**: resumen (n° módulos, UDs, capacidades, indicadores) o **lista de errores de bloqueo**.

### 2.4 Plan nuevo en una carrera existente (cambio de plan controlado)

La carrera es **única**; el plan de estudios es un atributo **versionado** (relación 1:N). "Cambiar de plan" **nunca recrea la carrera**:

- **Primera vez:** la acción "Crear carrera" sube el plan inicial → se crean el programa de estudios + Plan v1 (estado **`Vigente`**).
- **Carrera ya existente:** botón **"Gestionar planes de estudio"** en la ficha del programa → lista las versiones + **"Subir nuevo plan"**. El sistema crea una **nueva versión** (`planes_estudio` con el mismo `programa_id` y nueva `version`, ej. `2024-01` → `2027-01`) **sin tocar la carrera ni a los estudiantes existentes**.

**Flujo controlado de publicación:**
1. **Subir** el Excel del nuevo plan → queda en estado **borrador** (revisable: vista previa de la malla, UDs, créditos totales, advertencias). Así se evita publicar un Excel con errores.
2. **Publicar plan** (con la aprobación/Resolución correspondiente) → el plan nuevo pasa a **`Vigente`** y el plan anterior pasa **automáticamente a `En Baja`**. **Regla: nunca dos planes `Vigente` para el mismo programa.**

**Coexistencia visible en la interfaz:**
- La ficha de la carrera muestra **todas las versiones** del plan con: `codigo`, `version`, **estado** (`Vigente` / `En Baja` / `Reemplazado`), vigencia, resolución y **conteo de estudiantes anclados** (§4.3).
- Selector de plan para ver la malla de cada versión (la vigente y la en baja).
- Un plan solo puede pasar a **`Reemplazado`** cuando su **conteo de alumnos activos llega a 0** — el sistema **bloquea** el pase si aún hay estudiantes anclados.

**Reglas de coexistencia:** el plan `Vigente` gobierna la malla de los **nuevos ingresantes**; los estudiantes históricos siguen con su plan de ingreso (`plan_anclado_id`) hasta la **Adecuación de Malla** (DOC-13 §3, DOC-15 §4.3). Re-importar un **borrador** permite corregirlo antes de publicarlo (solo en estado no vigente).

---

## 3. Proceso B — Ingesta de Estudiantes Ingresantes (Cachimbos)

### 3.1 Entrada
- Archivo **Excel** con el conglomerado de estudiantes recién ingresados del ciclo, generado por la **oficina de admisión** (formato MINEDU; espejo en `mock_admision.json`).

### 3.2 Pipeline del parser (`mod-admision` → `mod-gestion-academica`)
1. **Recepción** del archivo (opción "Ingesta Masiva" del módulo de administración).
2. **Extracción**: datos personales de cada admitido (DNI/tipo documento, nombres, datos de contacto, programa/carrera, documento de admisión).
3. **Repartición por carrera**: cada estudiante se asigna a su **área académica** según el **mapeo exacto** nombre→`programa_id` (ADR-014). El parser agrupa el padrón por programa y reporta conteos por carrera.
4. **Publicación masiva**: JSON de admitidos → `/admision/ingesta` en `mod-gestion-academica` (capa anticorrupción), emitida por outbox (evento `admission.ingested`, DOC-06).
5. **Asentamiento en la carrera:** `mod-gestion-academica` crea al estudiante asignándolo a su carrera según el reparto (§3.3). Al **matricularlo** (matrícula automática de Ciclo I), se dispara la **provisión de credenciales** (§5.2).

### 3.3 Reglas
- **Precedencia:** solo procesa si la carrera tiene **plan de estudios vigente** con malla de Ciclo I completa; de lo contrario **BLOQUEO** (el parser de admitidos nunca precede al de planes).
- **Duplicidad por DNI:** si el DNI ya está registrado como estudiante, el registro se marca/omite con alerta (no se duplica).
- **Nombre de programa no reconocido:** bloquea la operación con alerta (ADR-014); no se asigna carrera de respaldo.
- **Transparencia del reparto:** el resultado muestra conteo por carrera (ej. `DSI: 12, ENF: 8, ...`).
- **Ventana anual de ingesta:** ocurre **una vez al año**, en **enero–abril**, coincidiendo con la admisión institucional; es el momento en que los admitidos **pasan a ser estudiantes**. Se dispara desde el botón **"Extraer ingresantes"** de la sección de **registro de estudiantes**.
- **Aislamiento por área académica:** las **11 carreras son ámbitos aislados e independientes** — la secretaria/encargada de matrícula de cada área académica **solo ve y opera a los estudiantes de su carrera** (ej. Desarrollo de Sistemas de Información: solo los de DSI; Contabilidad: solo contabilidad; Mecánica: solo mecánica; y así las demás). Se controla con **roles** (`role` + sombrilla por `programa_id`, RBAC en DOC-07). El sistema reparte y distribuye cada grupo según la carrera postulada (ej. 40 postulantes a Administración de Empresas → enviados a esa área).

---

## 4. Proceso C — Periodos Académicos

- **Regla canónica:** **2 periodos por año**, convención `YYYY-N`:
  - `2026-1` — **Abril a Agosto**
  - `2026-2` — **Agosto a Diciembre**
- Se crean por el **encargado** (Secretaría Académica / Super Admin) desde **`mod-gestion-academica`**; la configuración (fechas, reglas, umbrales) vive en **backend/BD**, no en un módulo ni componente de configuración (DOC-14 §1).
- **Ciclo de vida del periodo:** Planificación → Matrícula Abierta (Regular → Extemporánea → Bloqueo + Nómina) → En Curso → Cierre/Histórico (DOC-14 §1.1).
- **Definición operativa:** *históricos* = estudiantes desde el **2do ciclo en adelante**; el 1er ciclo corresponde a los **ingresantes**.

### 4.1 Denominación por calendario y distribución de ciclos por semestre

- El sistema **identifica el periodo según las fechas del calendario** y le asigna la denominación `YYYY-N` automáticamente (ej. abril–agosto 2027 → `2027-1`; agosto–diciembre 2028 → `2028-2`).
- **Distribución fija de ciclos por semestre** (patrón del plan de estudios):
  - `YYYY-1` (Abril–Agosto): ciclos **I, III y V** (impares).
  - `YYYY-2` (Agosto–Diciembre): ciclos **II, IV y VI** (pares).
- Cada semestre tiene **precargados los cursos** de los ciclos que le corresponden (según plan vigente), listos para ejecutar las matrículas.
- **Consecuencia práctica:** el avance correlativo alterna semestre — un estudiante de 1°, 3° o 5° ciclo participa en `YYYY-1`; uno de 2°, 4° o 6° en `YYYY-2`.

### 4.2 Activación, cierre y aislamiento de periodos (gestión académica)

El menú de **gestión académica** gestiona el inicio y fin de cada ciclo/semestre desde `mod-gestion-academica`:

- **Un solo periodo activo a la vez:** al activar un periodo (ej. `2026-2`), el periodo anterior (`2026-1`) queda **desactivado automáticamente** — es una **regla de negocio**, no una acción manual.
- **Ciclo de vida del periodo (4 estados):** Planificación → Matrícula Abierta → En Curso (Activo) → Histórico/Cerrado (DOC-14 §1.1), refinados: **Planificación** precarga los cursos del semestre (§4.1) y la **oferta de mallas en coexistencia** (§4.3); el cierre de **Matrícula Abierta sella la Nómina de ratificados** (§5.4); **En Curso** es el único visible; **Histórico** es sellado pero consultable.
- **Acciones del encargado (transiciones):** **"Activar / Abrir Ciclo"** = Planificación → Matrícula Abierta (aplica un solo activo: el anterior pasa a Histórico); **"Cerrar Semestre"** = En Curso → Histórico. Al **cerrar** se **sella**: se bloquean matrículas, ingreso de notas y ediciones.
- **Aislamiento por `periodo_id`:** todo registro operativo (matrículas, notas, actas) lleva `periodo_id`. La **interfaz operativa** solo muestra el periodo **activo** — los registros de ciclos cerrados **no se muestran** en la UI operativa.
- **La data siempre está viva:** nada se borra ni se vuelve inaccesible. Las consultas y reportes (nóminas, promedios, carga MINEDU/SISEDU) de ciclos anteriores se realizan con el **filtro `periodo_id`** (por defecto el activo; opción "Todos/histórico").

### 4.3 Coexistencia de mallas: cambio de plan de estudios en transición

Un programa de estudios maneja **dos (o más) mallas/planes en paralelo** durante la transición de planes (un plan de estudios dura **3+ años**; al aprobarse uno nuevo, el anterior se da de baja pero sus alumnos terminan con él):

- **Estados de plan:** `Vigente` (recibe nuevos ingresos — **exactamente 1 por programa**), `En Baja` (dejó de recibir ingresantes; sus alumnos continúan), `Reemplazado/Histórico` (sin alumnos activos).
- **Plan anclado por estudiante:** en la **ingesta al Ciclo I**, el sistema fija `plan_anclado_id` = el plan `Vigente` de ese momento. Desde ahí, **todo** el recorrido académico del estudiante (matrícula, jalados, prerrequisitos, historial, certificación) se resuelve **contra SU malla**, nunca contra "la malla actual" del programa.
- **Dictado en paralelo (precisión del equipo):** mientras un plan está `En Baja`, **los docentes siguen dictando sus UDs** hasta que la **última promoción egresa**; **a la par** se dictan las UDs de la malla nueva. La oferta académica de un mismo periodo puede incluir UDs de **ambas mallas** (un mismo ciclo con grupos por plan).
- **Ingesta de plan nuevo por parser:** al **publicar** el plan nuevo del mismo programa (§2.4), el parser marca automáticamente el anterior como **`En Baja`** (nunca dos `Vigente`); antes de publicar, el plan vive en **borrador** revisable.
- **Fin de transición controlado:** un plan solo pasa a **`Reemplazado`** cuando su **conteo de alumnos activos llega a 0** — el sistema bloquea el pase si aún hay anclados (§2.4).
- **Paridad por programa, contenido por malla:** la distribución de ciclos por semestre (§4.1) es **por programa** y la comparten ambas mallas; el **contenido** (UDs por ciclo, prerrequisitos) es **por `plan_id`**.
- **Reportes:** nóminas, carga y SISEDU se agregan **por programa**, pudiendo mezclar alumnos de ambos planes en el mismo ciclo.
- **Fin de transición:** los alumnos restantes del plan en extinción con UDs que ya no se dictan pasan por **Adecuación de Malla** (DOC-13 §3): mapeo de sus UDs pendientes a las **equivalentes** del plan nuevo, aprobado por el área académica. **Nunca** migración masiva ni silenciosa.

---

## 5. Proceso D — Matrícula por Tipo de Estudiante

### 5.1 Conducta por tipo

| Tipo | Contexto | Comportamiento de matrícula |
|------|----------|-----------------------------|
| **Ingresante (Ciclo I)** | Admitido por primera vez | **Automática en bloque**: se asignan todas las UDs de su Ciclo I según plan vigente (estado **standby/provisional**, §5.4). En paralelo se crean credenciales DNI/DNI (§5.2). Se **ratifica por boleta de pago** en Tesorería (§5.4). No puede retirar cursos en su primer ciclo. |
| **Regular (Invicto)** | Aprobó todas las UDs de su ciclo anterior | **Automática**: matrícula en el **siguiente ciclo correlativo** (ej. estuvo en 2°, se matricula en 3°). Valida rango 12–24 créditos. |
| **No regular / Irregular (con jaladas)** | Cursos a cargo: jalados del ciclo anterior, de ciclos previos acumulados o del ciclo actual; **<70% de las asignaturas jaladas** | **Avance (misma mecánica que ingresantes)**: matrícula automática en **todos** los cursos del ciclo siguiente; jalados de ciclos anteriores de la **misma paridad/semestre y vigentes** se agregan si la carga no supera 24 créditos. Prerrequisitos siempre bloquean. Detalle en §5.6. |
| **Repitente (Separado)** | Supera el **70% de las asignaturas jaladas** de un ciclo | **Separado del periodo**: repite el ciclo (no avanza) y puede **regresar el próximo año como reingresante**, previa evaluación del área académica y permiso (DOC-13 §3). Detalle en §5.6. |
| **Reingresante** | Dejó pendientes sus estudios ≥1 año, retiró matrícula o reservó | Debe pasar por **evaluación del área académica**; si se emite el **permiso** (resolución), se matricula en su ciclo relativo + UDs pendientes. Posible **Adecuación de Malla** (DOC-13 §3 / Caso D DOC-14). |
| **Traslado Interno/Externo + Convalidación** | Cambio de programa o viene de otro IESTP | **Evaluación en el área académica**; si se aprueba, se **autoriza** la matrícula con la **documentación** respectiva. El ciclo relativo se calcula por UDs convalidadas (DOC-13 §1/§4). |
| **Convenio / Becado** | Financiado por convenio institucional o beca | Matrícula **previa a la presentación de la documentación** del convenio; cruce con tesorería/flag Financiero (DOC-14 Caso E). |

> **Definiciones:** **Regular / Invicto** = aprueba todas las UDs de su ciclo (sin jalados). **No regular / Irregular** = tiene cursos a cargo (jalados), acumulados de ciclos anteriores o del ciclo actual (§5.6). **Histórico** = estudiante ya registrado en el sistema (2do ciclo en adelante) que conserva sus credenciales (§5.5).
>
> **Alcance de implementación (MVP vs. Futuro):** el MVP v1.1 opera los **3 tipos de matrícula más comunes**:
> 1. **Ingresante / Cachimbo** (Caso A, DOC-14) — primera vez, automática en bloque.
> 2. **Histórico Regular / Invicto** (Caso B, DOC-14) — aprobó todo su ciclo.
> 3. **Irregular con jalados** (Caso C, DOC-14) — avanzó con el siguiente ciclo correlativo.
>
> Los tipos **Reingresante** (Caso D), **Traslado Interno/Externo** (Caso G), **Convalidación** (Caso H) y **Convenio / Becado** (Caso E) **funcionan hoy en el tecnológico** y deben incluirse en el sistema: se **deja lista su base de diseño** (motor de reglas, casos de DOC-14, flujos de DOC-13 y esquemas en `mod-gestion-academica`) para **habilitarse en versiones futuras** (roadmap DOC-12) — **no bloquean el alcance MVP**.

### 5.2 Provisión de credenciales (al matricular al ingresante)
- Al **matricular** al ingresante (matrícula automática de Ciclo I, §5.4) se **dispara la creación de usuario** en `mod-usuarios`:
  - **username y contraseña por defecto = DNI** del estudiante.
- El estudiante puede **cambiarlas** desde el propio sistema cuando lo considere (flujo "Cambiar contraseña").
- **Pulido sugerido (parametrizable):** exigir el cambio de contraseña en el **primer ingreso** (política; por defecto voluntario).
- El contrato de la provisión (llamada síncrona vía Gateway vs. evento NATS `credentials.issued`) queda **en §10 como pendiente**.

### 5.3 Motor de reglas (siempre en backend)
- Las **validaciones duras** se ejecutan en `mod-gestion-academica`: creditaje 12–24, prerrequisitos, cruces de horario, avance correlativo, prioridad de carga. El **modo flexible solo cambia la UX de sugerencia** (DOC-14 §3, regla de oro).

### 5.4 Ciclo de ratificación de la matrícula (ingresantes)

La matrícula de los ingresantes **concluye con la ratificación**, y la ratificación **solo se da a través del comprobante de pago** (la boleta que emite la institución al realizar el pago del proceso de matrícula).

Estados de la matrícula del ingresante:
- **Matriculado (Standby):** asignado automáticamente al Ciclo I, pero **provisional** — está en lista de espera (matriculado, aún no ratificado).
- **Ratificado (Nómina Oficial):** conclusión de la matrícula; el estudiante integra la **Nómina Oficial de Matriculados** del semestre.

Flujo:
1. El **área académica** recibe a los estudiantes repartidos (§3) y con el botón de **matrícula masiva** les asigna todas las UDs del Ciclo I → quedan en **standby**.
2. Cada estudiante pasa por **Tesorería**: paga el proceso de matrícula y Tesorería emite la **boleta de pago** (el pago ratifica la matrícula; flag `Habilitado_Financiero`, DOC-14 §1.1).
3. El estudiante presenta la boleta en la **secretaría del área académica**; la encargada de matrícula **valida la boleta**.
4. La secretaria **llena la ficha de estudiante**: datos personales, fotografía y espacios para notas y otros datos.
5. Al completar la ficha, el estudiante adquiere oficialmente el derecho como alumno: matrícula **ratificada** y alta en la **Nómina Oficial de Matriculados** del semestre.

> **Ficha de estudiante:** expediente (físico/digital) estándar que la secretaría crea o actualiza al ratificar la matrícula; contiene los datos personales, fotografía y los campos donde se registrarán las notas y demás datos académicos.

> **Reporte MINEDU (SISEDU):** al cerrar el proceso de matrícula, el encargado del área académica **eleva el reporte de estudiantes matriculados** para su carga al **Ministerio de Educación**. El dato fuente es la **nómina ratificada**; la automatización/exportación SISEDU se agenda con `mod-reportes` (post-MVP, DOC-10 §8).

### 5.5 Mecánica operativa: formulario de matrícula y estudiantes históricos

- Los **históricos** (ya registrados en el sistema, 2do ciclo en adelante) se matriculan **uno por uno en un formulario**, pero con **carga masiva de los cursos del ciclo académico**:
  1. La secretaria/encargada de matrícula del área académica selecciona al **estudiante histórico**.
  2. Selecciona el **ciclo** al que lo matricula → el sistema muestra las UDs de ese ciclo según plan vigente (ej. los 8 cursos que llevaría).
  3. Un **clic matricula en todos los cursos del ciclo**.
  4. El estudiante queda **a la espera de la ratificación de matrícula** (misma lógica §5.4: boleta de Tesorería → ratificación → nómina oficial).
- Esta mecánica de un clic es la misma que usa la secretaría para la **matriculación automática de ingresantes** (§5.4) e **irregulares** (§5.6): hace a las matrículas **versátiles**.
- **Credenciales:** el histórico **ya posee** sus credenciales de alumno; el sistema **no genera credenciales nuevas** (a diferencia de los cachimbos, §5.2) — **las mantiene**.

### 5.6 Matrícula de estudiantes no regulares (irregulares)

**Definiciones de "no regular":** estudiante con **cursos a cargo (jalados)**. Los jalados pueden originarse en:
- el **ciclo que acaba de terminar**,
- **ciclos anteriores** (se acumulan a lo largo de la carrera; ej. jaló en 1er ciclo y ya cursa 4°; o en 5° tiene jalado de 3°),
- el **ciclo actual** (sin jalados previos, jala una asignatura del ciclo que cursa: ej. en 4° jala una UD del 4°).

Al cumplir cualquiera de esas condiciones, el estudiante **deja de ser regular/invicto**.

**Regla del 70% (sobre las asignaturas/UDs del ciclo):**
- **< 70% jaladas** → el estudiante **pasa al siguiente ciclo**: la secretaría lo matricula **automáticamente en todos los cursos del ciclo correlativo** (ej. cursó 4°, se matricula en 5°) mediante el formulario de un clic (§5.5).
- **> 70% jaladas** → **repetición/separación**: no avanza de ciclo; queda **separado del periodo** y puede **regresar el próximo año como reingresante** (aplica evaluación del área académica + permiso, DOC-13 §3).

**Jalados recuperables (créditos y paridad):**
- Si los créditos de la matrícula del nuevo ciclo **no superan 24**, el estudiante puede además matricularse en jalados de ciclos anteriores **vigentes** en ese momento.
- **Regla de paridad:** solo se recuperan jalados de ciclos de la **misma paridad** que el ciclo actual (se dictan en el mismo semestre, §4.1). Ej.: en 5° ciclo (semestre 1) se recuperan jalados de **1° y 3°**; **nunca de 2° ni 4°** (pertenecen al semestre 2).

### 5.7 Generación de documentos desde plantillas (ficha de matrícula)

- Las **fichas de matrícula** (y documentos del proceso) se generan desde **plantillas Word** que el equipo facilitará como archivo plantilla.
- Las plantillas contienen **variables** que el sistema **rellena con data** obtenida de:
  - un **formulario** de captura, o
  - la información extraída de los **parsers** (planes de estudio, ingesta de admitidos) o los **Excel**, o de cualquier otra fuente disponible.
- La **ficha de matrícula** usada en la ratificación (§5.4 paso 4) se produce a partir de estas plantillas + la data del estudiante/plan.
- La ingeniería de plantillas (librería de render docx, front vs. backend, versionado de plantillas oficiales) queda como **pendiente §10** y se conecta con la emisión documental oficial de DOC-13 §10.

---

## 6. Proceso E — Personal Académico (Docentes, Secretaria y Coordinador de Área)

### 6.1 Estructura de un área académica (requisitos del programa de estudios)
Un programa de estudios, al ser creado, requiere **3 actores académicos**:
1. **Coordinador de Área Académica** — el **cargo más elevado** del programa de estudios; jefe de todos en el área.
2. **Docentes** — un número según la **cantidad de alumnos, salones o secciones** que tenga el área.
3. **Secretaria del área** — **bajo el mando del coordinador** del área académica.

Cada actor se convierte en un **rol** en `mod-usuarios` (`coordinador_programa`, `docente`, `secretaria_programa`, DOC-07). El sistema ya es capaz de registrar usuarios con varios roles.

### 6.2 Tipos de trabajadores (3 grupos)
- **Docentes Nombrados:** trabajan **permanentemente** en el tecnológico; **no necesitan contrato por año**.
- **Docentes Contratados:** contratados a partir de una **Resolución emitida por la DREU** (Dirección Regional de Educación).
- **Secretarias:** contratadas **directamente por la institución** (el tecnológico).

### 6.3 Asignación del personal a las áreas académicas
La institución, al contar con docentes (nombrados/contratados) y secretarias, los **asigna a las áreas académicas creadas**, determinando desde allí:
- **Puesto de trabajo** del docente.
- **Área académica** a la que pertenece.
- **Coordinador bajo cuyo mando** está (docentes y secretaria).
- **Quién coordina el área** (designación del Coordinador de Área Académica).

El área nueva recibe así: su **coordinador**, los **docentes necesarios** y su **secretaria**. El **aislamiento por área** (roles + sombrilla por `programa_id`, DOC-07) aplica también al personal: el coordinador, su secretaria y sus docentes operan solo dentro de su área (§3.3).

### 6.4 Doble función del Coordinador de Área Académica
- El coordinador cumple **dos funciones**: la **coordinación** (jefe del área) y la **docencia** (dicta cursos).
- Su **carga lectiva es siempre menor** que la de un docente regular: si un docente regular lleva **4 a 6 cursos** por periodo, el coordinador suele llevar **1 a 2** — nunca igual ni más que un docente regular.
- Docencia y coordinación comparten el mismo usuario/rol; en la **planificación del periodo** (DOC-14 §1.1 estado 1) el coordinador puede aparecer asignado a UDs como docente además de su rol de coordinación.

---

## 7. Matriz de Trazabilidad

| Requerimiento (narrativa) | Se especifica en |
|---------------------------|------------------|
| Crear carrera desde plan de estudios (Excel + parser) | DOC-15 §2 · DOC-10 §2/§3 · DOC-11 (`mod-planes-estudio`) · DOC-05 §5.2.1 |
| Parser de admitidos con reparto por carrera | DOC-15 §3 · DOC-06 (`admission.ingested`) · DOC-01 ADR-011/ADR-014 · DOC-14 Caso A |
| Periodos: 2/año, `YYYY-N` (2026-1 Abr–Ago, 2026-2 Ago–Dic) | DOC-15 §4 · DOC-14 §1 · DOC-10 §1.1 |
| Distribución de ciclos por semestre (impares en `YYYY-1`, pares en `YYYY-2`) | DOC-15 §4.1 · DOC-14 §1 |
| Matrícula automática Ciclo I + credenciales DNI/DNI | DOC-15 §5.1/§5.2 · DOC-14 Caso A · DOC-07 (identidad) |
| Ratificación por boleta de Tesorería + ficha de estudiante + nómina oficial | DOC-15 §5.4 · DOC-14 §1.1 (flag `Habilitado_Financiero`) · DOC-14 Caso A |
| Aislamiento por área académica (reparto de ingresantes) | DOC-15 §3.3 · DOC-07 (RBAC) |
| Reporte MINEDU (SISEDU) de matriculados | DOC-15 §5.4 · DOC-10 §8 · DOC-12 (post-MVP) |
| Matrícula de no regulares (regla 70%, paridad de jalados, históricos) | DOC-15 §5.5/§5.6 · DOC-14 Caso C/F · DOC-10 §4.4 |
| Credenciales: se mantienen para históricos | DOC-15 §5.5 · DOC-07 (identidad) |
| Fichas de matrícula desde plantillas Word con variables | DOC-15 §5.7 · DOC-13 §10 (emisión documental) · Pendiente catálogo de plantillas |
| Aislamiento de periodos: un solo activo; UI operativa solo muestra el activo; consultas históricas por `periodo_id` | DOC-15 §4.2 · DOC-14 §1.1 |
| Coexistencia de mallas: plan anclado por estudiante, dictado paralelo, parser marca el anterior En Baja | DOC-15 §4.3 · DOC-05 §5.1/§5.3 · DOC-13 §3 (Adecuación de Malla) |
| Matrícula regular/automática (invicto) | DOC-15 §5.1 · DOC-14 Caso B · DOC-10 §4.4 |
| Matrícula irregular (ciclo siguiente + jaladas según creditaje) | DOC-15 §5.1 · DOC-14 Caso C |
| Repitente (repite ciclo con evaluación) | DOC-15 §5.1 · DOC-14 Caso F · DOC-10 §4.4 |
| Reingresantes → evaluación → permiso | DOC-15 §5.1 · DOC-14 Caso D · DOC-13 §3 |
| Traslados + convalidaciones → evaluación → autorización | DOC-15 §5.1 · DOC-13 §1/§4 |
| Convenios (documentación previa + tesorería) | DOC-15 §5.1 · DOC-14 Caso E · DOC-13 §8 |
| Estructura del área académica (coordinador + docentes + secretaria) | DOC-15 §6.1 · DOC-07 (roles `coordinador_programa`, `docente`, `secretaria_programa`) |
| Tipos de trabajadores: nombrados / contratados (Resolución DREU) / secretarias | DOC-15 §6.2 · DOC-07 · DOC-12 |
| Asignación de personal a áreas (puesto, área, mando, coordinador) | DOC-15 §6.3 · DOC-07 (RBAC + sombrilla `programa_id`) |
| Doble función del coordinador (coordinación + docencia, carga menor) | DOC-15 §6.4 · DOC-14 §1.1 (carga lectiva) |

---

## 8. Precedencias Operativas (resumen)

1. **Proceso A antes que B** para la misma carrera (plan vigente habilitante de la ingesta de admitidos).
2. **Proceso C independiente** (corre en paralelo; sin él no se abre ventana de matrícula).
3. **Matrícula Ciclo I** requiere: periodo abierto (C) + plan vigente (A) + padrón ingestado (B).
4. **Históricos** requieren: periodo abierto (C) + su historial académico/plan de ingreso.
5. **Proceso E** habilita la **planificación del periodo**: para asignar docentes a las UDs (carga lectiva, incluyendo el dictado del coordinador, §6.4) y horarios, el área debe contar con **coordinador y docentes asignados** (DOC-14 §1.1 estado 1).

---

## 9. Casos de Borde a Validar en Campo

- Ingresante que también existía como histórico (duplicado por DNI).
- Carrera con plan vigente pero sin UDs de Ciclo I completas al momento de la ingesta.
- Reingresante cuyo plan caducó → **Adecuación de Malla** (DOC-13 §3).
- Traslado cuyas UDs convalidadas no alcanzan un ciclo completo → ubicación por créditos.
- Convenio con documentación incompleta → **matrícula condicionada** (misma lógica del periodo de gracia DOC-14 §1.1).
- Docente asignado a **dos áreas** a la vez (ej. horas sueltas) — confirmar política.
- **Coordinador sin carga lectiva** (0 cursos) o que **exceda el tope** (1-2 cursos) — el sistema debe avisar.
- Área académica **sin coordinador designado** al crearse — la asignación debe completarse antes de la planificación del periodo.
- Docente **contratado** cuya **Resolución DREU** falta o vence dentro del periodo.

---

## 10. Pendientes de Especificación (por confirmar)

- **Contrato de provisión de credenciales** (evento NATS `credentials.issued` vs. llamada directa vía Gateway).
- **Obligatoriedad del cambio de contraseña** en el primer ingreso (¿por defecto Sí o No?).
- **Calendario exacto de matrícula** por periodo (fechas de apertura/cierre por ciclo).
- **Política de retiro de curso** en ciclos 2+ (DOC-10 §4.6: hasta 4ta semana) — confirmar alcance MVP.
- Consecuencias formales del **≥4 jaladas** (amonestación/suspensión) más allá de repetir ciclo.
- **Padrón SISEDU de matriculados:** confirmar si el reporte al MINEDU se genera automáticamente (post-MVP con `mod-reportes`) o se mantiene como exportación manual del área académica.
- **Plantillas Word (ficha de matrícula):** recibir las plantillas oficiales del equipo; definir el motor de render (docx en backend o front), el catálogo de variables por documento y su versionado (documentos oficiales → DOC-13 §10).
- **Activación post-MVP de los tipos de matrícula futuros (reingreso, traslado, convalidación, convenio):** confirmar las reglas de negocio finas (documentación requerida, resolución, cómputo de ciclo por créditos convalidados, pago/flag financiero) para cada caso antes de habilitarlos en el sistema (DOC-14 §2 Casos D/E/G/H).
- **Registro/provisión del personal académico en `mod-usuarios`:** confirmar si el alta de docentes (nombrados/contratados) y secretarias se hace en la interfaz de usuarios (registro + rol + asignación a área), cómo se registra la **Resolución DREU** de los contratados y su auditoría; alcance en el MVP (DOC-15 §6, DOC-07).
- **[Verificación de implementación 2026-08-30]** El Anexo de `MEMORIA_CONTEXTO.md` (v4.12) registra el estado real **especificado vs código** de cada regla (no se modificó código): la plataforma está construida, pero quedan brechas de **reglas de negocio** — conectar ingesta→matrícula Ciclo I→credenciales DNI/DNI, ratificación con Nómina, aislamiento forzado por `programa_id`, coexistencia de mallas en datos (`plan_anclado_id`, estados de plan), regla 70%/paridad ≤24, login por body JSON (ADR-013). De aquí saldrá el plan de implementación priorizado.

---

## 11. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-08-29 | 1.0 | Mesa de trabajo (planificación) | Creación del documento a partir de la narrativa funcional del equipo: flujo maestro end-to-end; Proceso A (parser de planes de estudio y creación de carreras); Proceso B (parser de admitidos y reparto por carrera); Proceso C (periodos `YYYY-N`: 2026-1 Abr–Ago / 2026-2 Ago–Dic); Proceso D (matrícula por tipo de estudiante + provisión de credenciales DNI/DNI); reglas canónicas aprobadas: irregular avanza al ciclo siguiente y agrega jaladas según creditaje; repitente repite ciclo completo con evaluación. |
| 2026-08-29 | 1.1 | Mesa de trabajo (planificación) | Detalle de la matrícula regular de ingresantes: denominación de periodos por calendario y distribución de ciclos por semestre (impares en `YYYY-1`, pares en `YYYY-2`, §4.1); ventana anual de ingesta (enero–abril) con botón "Extraer ingresantes" y aislamiento por área académica (§3.3); ciclo de ratificación de la matrícula (§5.4): standby → boleta de Tesorería → validación + ficha de estudiante → Nómina Oficial de Matriculados; reporte MINEDU (SISEDU). |
| 2026-08-29 | 1.2 | Mesa de trabajo (planificación) | Matrícula de no regulares (detalle): definición de no regular (jalados del ciclo anterior, ciclos previos acumulados o del ciclo actual); regla del 70% (asignaturas jaladas): <70% pasa al siguiente ciclo, >70% separado y retorno el próximo año como reingresante; jalados recuperables solo de la misma paridad/semestre y vigentes, con tope de 24 créditos; mecánica de matrícula por formulario de un clic con carga masiva del ciclo (históricos uno-a-uno); credenciales de históricos se mantienen (no se regeneran); §5.7 fichas de matrícula desde plantillas Word con variables (data de formularios/parsers/Excel) y pendiente su motor de render. |
| 2026-08-29 | 1.3 | Mesa de trabajo (planificación) | Declaración de **alcance de matrícula MVP vs. Futuro** (§5.1): el MVP opera 3 tipos (Ingresante/Cachimbo · Histórico Regular/Invicto · Irregular con jalados); Reingresante, Traslado, Convalidación y Convenio **dejan base de diseño lista** (Casos D/E/G/H en DOC-14, flujos DOC-13, esquemas vigentes) para habilitarse en versiones futuras sin bloquear el MVP. Pendiente añadido en §9 para su activación. |
| 2026-08-29 | 1.4 | Mesa de trabajo (planificación) | Gestión académica y coexistencia de mallas: §4.2 **activación/cierre de periodos** (un solo activo a la vez; al activar el nuevo el anterior se desactiva solo; botones "Activar/Abrir Ciclo" y "Cerrar Semestre"; aislamiento por `periodo_id` — la UI operativa solo muestra el activo, pero la data siempre está viva y es consultable por reportes históricos); §4.3 **coexistencia de mallas en transición** (estados Vigente / En Baja / Reemplazado; `plan_anclado_id` fijado en la ingesta; **dictado paralelo** — los docentes siguen dictando las UDs del plan en baja hasta el egreso de la última promoción, a la par de las UDs de la malla nueva; el parser marca el plan anterior En Baja; Adecuación de Malla solo al fin de la transición). Ajuste de esquema en DOC-05 (`plan_anclado_id`, estados). |
| 2026-08-29 | 1.5 | Mesa de trabajo (planificación) | §4.2 refinado: el **ciclo de vida del periodo mantiene sus 4 estados** (Planificación → Matrícula Abierta → En Curso → Histórico, DOC-14 v2.6) con contenidos alineados — Planificación precarga cursos del semestre y oferta de mallas en coexistencia; el cierre de Matrícula Abierta **sella la Nómina solo de ratificados**; En Curso es el único visible; Histórico sellado pero consultable. Botones como **transiciones**: "Activar/Abrir Ciclo" (→ Matrícula Abierta) y "Cerrar Semestre" (→ Histórico) |
| 2026-08-29 | 1.6 | Mesa de trabajo (planificación) | §2.4 reescrito: **cambio de plan controlado en una carrera existente** — la carrera es única y el plan es versionado (1:N); flujo "Subir (borrador) → revisar → **Publicar** → `Vigente` + el anterior `En Baja`" (nunca dos Vigentes por programa); la ficha de la carrera muestra todas las versiones con estado, vigencia y **conteo de estudiantes anclados**; un plan solo pasa a `Reemplazado` con 0 alumnos activos (bloqueo automático). Ajustados los bullets de §4.3 (publicación en vez de carga) |
| 2026-08-29 | 1.7 | Mesa de trabajo (planificación) | **Registro de estudiantes confirmado y precisado** (Proceso B): el sistema consume el Excel de admisión, registra automáticamente a cada alumno nuevo y **filtra y reparte por las 11 carreras** (§3.2/§3.3). Aislamiento reforzado: cada una de las 11 carreras es un ámbito aislado e independiente — la secretaria/encargada de cada área **solo ve y opera a los estudiantes de su carrera** (roles + sombrilla por `programa_id`, DOC-07). Las **credenciales DNI/DNI se generan al matricular** al ingresante (no al asentar) y el estudiante puede cambiarlas en su primer ingreso (§5.2, §3.2 paso 5) |
| 2026-08-29 | 1.8 | Mesa de trabajo (planificación) | **Nuevo Proceso E — Personal Académico** (§6): el área académica requiere 3 actores — **Coordinador de Área (cargo más elevado)**, **docentes** (según alumnos/salones/secciones) y **secretaria** (bajo el mando del coordinador). 3 tipos de trabajadores: **docentes nombrados** (permanentes, sin contrato anual), **docentes contratados** (por **Resolución de la DREU**) y **secretarias** (contratadas por la institución). La institución **asigna** el personal a las áreas (puesto, área, mando, designación del coordinador). **Doble función del coordinador**: coordinación + docencia con **carga siempre menor** que un docente regular (1-2 cursos vs 4-6). Roles ya existentes en DOC-07. Secciones renumeradas (matriz→§7, precedencias→§8, casos→§9, pendientes→§10, historial→§11) |