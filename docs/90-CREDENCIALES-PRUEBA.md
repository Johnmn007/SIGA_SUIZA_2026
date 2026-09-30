# Registro de Credenciales de Prueba (Entorno de Desarrollo)

Este documento contiene la lista centralizada de cuentas de usuario creadas (sembradas por el módulo de Identidad) para facilitar las pruebas de los diferentes roles y módulos del sistema SIGA. 

> [!WARNING]
> Estas credenciales son exclusivamente para el entorno de **desarrollo local (Dev)**. Jamás deben ser replicadas ni utilizadas en un entorno de producción (Prod).

---

## 🏛 Roles Administrativos y Directivos

| Rol | Correo / Usuario | Contraseña | Nombre de Prueba | Propósito |
|---|---|---|---|---|
| **Super Administrador** | `admin@siga.edu` | `admin123` | Super Admin | Acceso total para configuraciones globales, gestión de usuarios, roles y auditoría. |
| **Secretaría Académica Central** | `secretaria@siga.edu` | `secretaria123` | Secretaría Central | Custodiar historial, emitir nóminas oficiales y certificados modulares. |
| **Secretaría de Programa** | `secretaria_prog@siga.edu` | `secretariaprog123` | Secretaría Computación | Ejecutar la matrícula operativa, armar expedientes de su carrera. |
| **Caja y Tesorería** | `tesoreria@siga.edu` | `tesoreria123` | Caja Principal | Pruebas del registro de pagos manuales (liberación de candados de matrícula). |
| **Oficina de Admisión** | `admision@siga.edu` | `admision123` | Oficina de Admisión | (Uso de API) Para que el microservicio externo haga Ingesta Masiva de estudiantes. |
| **Coordinador de Programa** | `coordinador@siga.edu` | `coordinador123` | Coordinador General | Pruebas de supervisión de carrera, distribución de carga horaria y docentes. |

## 👨‍🏫 Roles Académicos

| Rol | Correo / Usuario | Contraseña | Nombre de Prueba | Propósito |
|---|---|---|---|---|
| **Docente** | `docente@siga.edu` | `docente123` | Docente Principal | Pruebas del módulo de evaluación, registro de notas de unidades didácticas y asistencia. |

## 🎓 Roles Estudiantiles

| Rol | Correo / Usuario | Contraseña | Nombre de Prueba | Propósito |
|---|---|---|---|---|
| **Estudiante** | `estudiante@siga.edu` | `estudiante123` | Estudiante Promedio | Pruebas de visualización del boletín de notas, horarios y proceso de matrícula online. |

---

*(Nota: Las contraseñas siguen la estructura `[nombre_rol]123`. Estos usuarios se inyectan mediante el script `seed_identity.py` en la inicialización de la base de datos).*
