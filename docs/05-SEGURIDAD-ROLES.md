# Arquitectura de Seguridad y Roles (SIGA)

| Versión | Fecha       | Autor               | Descripción                        |
|---------|-------------|----------------------|------------------------------------|
| 1.0     | 2026-06-27  | Equipo Arquitectura  | Definición inicial de Matriz de Roles y Permisos (RBAC) |

---

## 1. Propósito
Este documento define el modelo de Control de Acceso Basado en Roles (RBAC) y la estructura de seguridad perimetral para el Sistema Integrado de Gestión Académica (SIGA). Se alinea con las normativas del MINEDU (sistema REGISTRA) y la Ley de Institutos N° 30512.

## 2. Modelo de Identidad Centralizada (Core Identity)
La autenticación y autorización son gobernadas exclusivamente por el componente `siga-core` (Gateway). Los microservicios no manejan contraseñas ni bases de datos de usuarios; confían ciegamente en el JWT (JSON Web Token) firmado asimétricamente (RS256) emitido por el Core.

### 2.1 Estructura del JWT (Payload)
El token propaga la identidad y los permisos a todos los módulos:
```json
{
  "sub": "user_1205",
  "dni": "70123456",
  "role": "coordinador_programa",
  "scopes": ["programa:read", "programa_id:3", "notas:read"],
  "exp": 1690000000
}
```
*El scope `programa_id:3` permite realizar un "Tenant Isolation" lógico, limitando al usuario a operar solo sobre la carrera que tiene asignada.*

## 3. Matriz de Roles Estándar (IESTP)

### Nivel Directivo y Estratégico
| Rol | Identificador | Alcance | Capacidades Principales |
|---|---|---|---|
| **Director General** | `director` | Global (Solo Lectura) | Visualiza dashboards gerenciales (deserción, vacantes, finanzas). Aprueba Nóminas y Actas finales para envío al MINEDU. |
| **Coordinador de Programa** | `coordinador_programa` | Local (Por Programa/Carrera) | Asigna carga lectiva, aprueba convalidaciones de su carrera, supervisa notas de sus docentes. |

### Nivel Administrativo y Operativo
| Rol | Identificador | Alcance | Capacidades Principales |
|---|---|---|---|
| **Secretaría Académica** | `secretaria_academica` | Global (Lectura/Escritura) | Gestiona matrículas, anulaciones, traslados, licencias, y emite Certificados Oficiales. |
| **Responsable Admisión** | `admin_admision` | Módulo Admisión | Configura vacantes, gestiona postulantes y ejecuta la "Ingesta Masiva" de admitidos al sistema. |
| **Tesorería** | `tesoreria` | Módulo Financiero | Gestiona pagos, conceptos, deudas y levanta alertas de morosidad. |
| **Bienestar Estudiantil** | `bienestar` | Módulo Bienestar | Seguimiento psicológico, becas y alertas tempranas por bajo rendimiento o inasistencia. |

### Nivel Académico
| Rol | Identificador | Alcance | Capacidades Principales |
|---|---|---|---|
| **Docente** | `docente` | Local (Por Unidad Didáctica) | Registro de asistencia, ingreso de notas (respetando cronogramas), y carga de sílabos. |

### Nivel Usuario Final
| Rol | Identificador | Alcance | Capacidades Principales |
|---|---|---|---|
| **Estudiante** | `estudiante` | Local (Datos propios) | Matrícula online, visualización de Boletín de notas, horarios, y trámites virtuales. |
| **Egresado** | `egresado` | Local (Histórico) | Visualización de récord académico histórico, solicitud de titulación y bolsa de trabajo. |

### Nivel Técnico
| Rol | Identificador | Alcance | Capacidades Principales |
|---|---|---|---|
| **Administrador TI** | `superadmin` | Global (Infraestructura) | Creación de roles, gestión de periodos académicos base, monitoreo técnico y auditoría. No opera procesos académicos. |

## 4. Middleware de Seguridad (Gateway)
El Core inyecta un middleware en todas las rutas `/api/*` que:
1. Verifica la existencia del Header `Authorization`.
2. Valida la firma del JWT usando la llave pública.
3. Extrae el `role` y `scopes` y los cruza con los requisitos declarados por el módulo destino en su `manifest.yaml`.
4. Si la validación falla, retorna HTTP 403 (Forbidden) sin tocar el microservicio.
