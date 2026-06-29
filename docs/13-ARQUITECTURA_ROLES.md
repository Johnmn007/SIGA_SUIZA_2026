# Arquitectura Organizacional y Flujo de Procesos (IEST)

Basado en las mejores prácticas de los Institutos de Educación Superior Tecnológica (considerando las normativas de certificación modular y procesos académicos formales), he diseñado este mapa de roles y flujos para que el sistema opere como un reloj suizo, sin cuellos de botella ni cabos sueltos.

## 1. Matriz de Roles y Alcance (RBAC)

Para que el sistema sea seguro, cada actor opera bajo un **Alcance (Scope)**. Nadie ve información que no necesita.

| Rol en el Sistema | Área Real | Nivel de Alcance | Responsabilidades Principales |
| :--- | :--- | :--- | :--- |
| **`admin_admision`** | Comisión de Admisión | Institucional (Global) | Gestionar postulantes, exámenes y aprobar el "Padrón de Ingresantes". |
| **`tesoreria`** | Caja / Finanzas | Institucional (Global) | Registrar pagos (matrículas, certificados). Habilitar bloqueos financieros. |
| **`direccion_academica`** | Dirección / RR.HH. | Institucional (Global) | Aperturar el periodo académico, contratar docentes y distribuirlos a los programas. |
| **`jefe_programa`** | Coord. Programa de Estudio | **Limitado a su Carrera** | Diseñar horarios, asignar "Carga Lectiva" (UDs) a docentes, supervisar notas y EFSRT. |
| **`secretaria_programa`** | Sec. de Programa de Estudio | **Limitado a su Carrera** | Ejecutar la matrícula operativa de sus alumnos, orientar al estudiante, armar expedientes. |
| **`secretaria_central`** | Secretaría Académica | Institucional (Global) | Custodiar el historial, emitir Nóminas Oficiales, Actas Finales y Certificados Modulares. |
| **`docente`** | Plana Docente | Limitado a sus Clases | Registrar asistencia y notas, cerrar sus actas. |
| **`estudiante`** | Alumnado | Limitado a su Perfil | Consultar horarios, boletas de notas, solicitar trámites. |

---

## 2. Los 5 Macro-Procesos del Ecosistema

Para conectar a estos actores de forma impecable, el sistema debe automatizar el paso de información entre ellos a través de 5 macro-procesos:

### Macro-Proceso 1: Captación y Onboarding
1. **Admisión** cierra el examen y el sistema transfiere a los ganadores a la base de datos central como `Ingresantes`.
2. **Secretaría Central** valida que el ingresante haya entregado sus requisitos físicos (Certificado de secundaria, DNI, fotos). Si falta algún documento, **el sistema NO bloquea la matrícula inmediatamente**, sino que emite una **Alerta (con periodo de gracia)**.
3. *Flexibilidad (Cabo suelto cerrado):* El periodo de gracia por defecto será de 2 meses (editable por el administrador). El alumno puede matricularse condicionalmente. Si expira el tiempo sin subsanar, el sistema sí bloquea futuras acciones o congela la matrícula.

### Macro-Proceso 2: Planificación (Setup del Semestre)
1. **Dirección Académica** crea el "Periodo 2026-I" en el sistema y da de alta a los docentes contratados, asignándolos a las distintas carreras.
2. **Jefatura de Programa** entra al sistema, ve los docentes que le asignaron y empieza a armar el rompecabezas: *Horarios y Carga Lectiva*. 
3. *Cabo suelto cerrado:* El sistema incluirá una validación para evitar **cruces de horario** (un docente en dos aulas a la vez) y evitar exceder las horas límite de contratación.

### Macro-Proceso 3: Matrícula y Recaudación (El Trípode Financiero-Académico)
Este proceso requiere 3 actores para completarse, garantizando control y cero corrupción:
1. **Tesorería:** El alumno paga. El cajero registra el recibo y el sistema cambia un flag a `Habilitado_Financiero = True`.
2. **Secretaría de Programa:** Ve la luz verde financiera en su panel, recibe al alumno y registra las Unidades Didácticas en el sistema.
3. **Fases de Matrícula y Cierre Oficial:**
   * **Matrícula Regular:** Funciona durante el periodo oficial.
   * **Matrícula Extemporánea:** A las 3 semanas de haber iniciado el cierre de la matrícula regular, se abre una fase de "Matrícula Extemporánea". El administrador puede configurar la fecha límite de esta fase.
   * **Bloqueo Definitivo:** Pasada la fecha límite extemporánea, el sistema bloquea definitivamente cualquier nueva matrícula y **Secretaría Central** genera automáticamente la **Nómina Oficial de Matriculados**.
4. *Flexibilidad (Cabo suelto cerrado):* El sistema crece con la madurez del instituto. El coordinador del programa se quita el peso de cobrar, y Secretaría Académica controla las fechas exactas de gracia extemporánea.

### Macro-Proceso 4: Ejecución y Evaluación
1. **Docente:** Durante el semestre, ingresa las notas según el sílabo. Al finalizar, hace clic en "Cerrar Acta".
2. **Jefatura de Programa:** Tiene un dashboard tipo semáforo donde ve qué docentes están atrasados en subir notas.
3. *Cabo suelto cerrado:* Una vez que el docente cierra el acta, el sistema se bloquea para él. Si hubo un error en una nota, debe solicitar un trámite formal a Secretaría Central para la "Rectificación de Nota", dejando un rastro de auditoría.

### Macro-Proceso 5: Salida, Certificación y EFSRT
1. **Jefatura de Programa:** Registra y aprueba las horas de Experiencias Formativas (EFSRT) del estudiante a lo largo de los ciclos.
2. **Secretaría Central:** Cuando el estudiante completa un año (Ej. Ciclo I y II) más sus EFSRT, Secretaría Central usa el sistema para generar la "Certificación Modular" (requisito indispensable en el modelo peruano). Esto se cobra a través de Tesorería.

---

## 3. Sugerencias Clave de Arquitectura de Base de Datos
*   **Aislamiento por Scope:** En la tabla `usuarios_programas`, vincularemos los IDs de los Coordinadores y Secretarias de Programa con el ID de su carrera. El Gateway inyectará este `programa_id` en las consultas, haciendo imposible que la secretaria de Mecánica altere datos de Enfermería.
*   **Trazabilidad (Audit Logs):** Cada vez que se cambie una nota, se matricule a alguien o se apruebe un trámite, el sistema guardará "quién", "cuándo" y "qué" cambió (Tabla `core_audit_logs`), protegiendo a la institución ante auditorías.
