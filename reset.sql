    -- Habilitar pgcrypto para poder hashear la contraseña en SQL
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Truncar todas las tablas principales con CASCADE
    TRUNCATE 
        core_audit_logs, core_user_roles, core_role_permissions,
        core_roles, core_permissions, core_modules, core_users,
        periodos_academicos, planes_estudio, programas_estudio, 
        estudiantes, matriculas, historial_academico, 
        evaluacion_registros, registros_practicas, 
        resoluciones_convalidacion, solicitudes_tramites, 
        beneficios_estudiante, outbox_events, perfiles_personal,
        admision_postulantes
    CASCADE;

    -- Reiniciar secuencias pero dejarlas por encima de las semillas manuales
    ALTER SEQUENCE core_users_id_seq RESTART WITH 100;
    ALTER SEQUENCE core_roles_id_seq RESTART WITH 100;
    ALTER SEQUENCE core_permissions_id_seq RESTART WITH 100;

    -- Insertar Roles
    INSERT INTO core_roles (id, name, description) VALUES
    (1, 'superadmin', 'Super Administrador del Sistema'),
    (2, 'caja_tesoreria', 'Caja y Tesorería'),
    (3, 'secretaria_academica', 'Secretaría Académica'),
    (4, 'coordinador_programa', 'Coordinador Programa'),
    (5, 'oficina_admision', 'Oficina Admisión'),
    (6, 'docente', 'Docente'),
    (7, 'estudiante', 'Estudiante'),
    (8, 'secretaria_programa', 'Secretaría de Programa');

    -- Insertar Usuarios con sus contraseñas en Bcrypt
    INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser) VALUES
    (1, 'admin@siga.edu', 'Super Admin', crypt('admin123', gen_salt('bf')), true, true),
    (2, 'tesoreria@siga.edu', 'Caja y Tesorería', crypt('tesoreria123', gen_salt('bf')), true, false),
    (3, 'secretaria@siga.edu', 'Secretaría Académica', crypt('secretaria123', gen_salt('bf')), true, false),
    (4, 'coordinador@siga.edu', 'Coordinador Programa', crypt('coordinador123', gen_salt('bf')), true, false),
    (5, 'admision@siga.edu', 'Oficina Admisión', crypt('admision123', gen_salt('bf')), true, false),
    (6, 'docente@siga.edu', 'Docente', crypt('docente123', gen_salt('bf')), true, false),
    (7, 'estudiante@siga.edu', 'Estudiante', crypt('estudiante123', gen_salt('bf')), true, false),
    (8, 'secretaria_prog@siga.edu', 'Secretaría de Programa', crypt('secretariaprog123', gen_salt('bf')), true, false);

    -- Asociar Usuarios con Roles
    INSERT INTO core_user_roles (user_id, role_id) VALUES
    (1, 1),
    (2, 2),
    (3, 3),
    (4, 4),
    (5, 5),
    (6, 6),
    (7, 7),
    (8, 8);

    -- Insertar Permisos Base
    INSERT INTO core_permissions (id, name, description) VALUES
    (1, 'mod-programas-estudio:read', 'Lectura de Programas y Periodos'),
    (2, 'mod-programas-estudio:write', 'Escritura de Programas y Periodos'),
    (3, 'mod-usuarios:read', 'Lectura de Usuarios'),
    (4, 'mod-evaluacion:read', 'Lectura Evaluaciones'),
    (5, 'mod-evaluacion:write', 'Escritura Evaluaciones'),
    (6, 'mod-gestion-academica:read', 'Lectura Gestion Academica'),
    (7, 'mod-gestion-academica:write', 'Escritura Gestion Academica'),
    (8, 'mod-planes-estudio:read', 'Lectura Planes Estudio'),
    (9, 'mod-planes-estudio:write', 'Escritura Planes Estudio');

    -- Asociar Permisos a Roles (Coordinador y Docente necesitan read para programas)
    INSERT INTO core_role_permissions (role_id, permission_id) VALUES
    -- Secretaria Academica
    (3, 1), (3, 2), (3, 3), (3, 6), (3, 7), (3, 8), (3, 9),
    -- Coordinador Programa
    (4, 1), (4, 3), (4, 4),
    -- Docente
    (6, 1), (6, 4), (6, 5), (6, 6),
    -- Estudiante
    (7, 1), (7, 4), (7, 6),
    -- Admision
    (5, 1), (5, 6), (5, 7),
    -- Secretaria Programa
    (8, 1), (8, 6), (8, 7);
