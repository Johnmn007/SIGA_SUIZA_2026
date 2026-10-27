# Reglas Permanentes del Workspace - SIGA_SUIZA_2026

1. **Ámbito de Responsabilidad (Foco de Trabajo):**
   * El alcance prioritario de trabajo abarca exclusivamente el rol **Docente** y el menú de **Coordinación de Programa**.
   * No modificar archivos de otros menús, vistas o módulos sin solicitar confirmación previa al usuario y explicar detalladamente el motivo técnico.

2. **Entorno de Base de Datos y Datos Reales:**
   * La base de datos de desarrollo con datos reales institucionales es **`siga_local`** (PostgreSQL 18.4 en el host local: `127.0.0.1:5432`, usuario `postgres`).
   * **PROHIBICIÓN ESTRICTA:** Ninguna prueba automática, test unitario, runner de test o script de prueba puede escribir o alterar datos en `siga_local`.
   * Todas las pruebas automáticas y scripts de verificación deben apuntar y escribir exclusivamente en la base de datos de pruebas **`siga_test`**.

3. **Herramientas de Respaldo (pg_dump):**
   * Para generar volcados y respaldos, usar siempre el ejecutable nativo de PostgreSQL 18:
     `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe`
   * Nunca utilizar el cliente `pg_dump` dentro de los contenedores Docker (versión 16, incompatible con el servidor PostgreSQL 18.4).

4. **Operaciones Destructivas y Seguridad de Datos:**
   * Antes de ejecutar cualquier operación potencialmente destructiva (`DELETE`, `DROP`, `TRUNCATE`, migraciones de base de datos o scripts de carga masiva/modificación de datos), generar de forma obligatoria un respaldo completo en la carpeta `backups/` y solicitar confirmación explícita del usuario.

5. **Flujo de Trabajo Git y Commits:**
   * Trabajar siempre en la rama **`mejoras/docente-coordinacion`**.
   * Realizar commits pequeños, atómicos y con mensajes claros y descriptivos.
   * **PROHIBICIÓN:** Nunca realizar commit de la carpeta `backups/`, archivos `.env`, `.env.*` ni credenciales o contraseñas en texto plano.

6. **Reglas de Negocio Institucionales (MINEDU):**
   * **Nota Aprobatoria:** Calificación vigesimal mayor o igual a 13 ($\ge 13$).
   * **Regla de Promoción:** Aprobación mínima del $70\%$ de los créditos matriculados en el periodo para ser promovido.
   * **Carga Académica Máxima:** Límite de 24 créditos académicos por semestre/periodo lectivo.

7. **Criterio de Aceptación y Verificación:**
   * Concluir cada tarea ejecutando las pruebas pertinentes y reportando el resultado real y verificable.
   * Jamás dar por finalizada una tarea ("listo") si alguna prueba o validación arroja fallos.
