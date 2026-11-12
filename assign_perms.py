import psycopg2
import bcrypt

conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='admin123', database='siga_local')
conn.autocommit = True
cur = conn.cursor()

# Permisos por rol
# secretaria_programa necesita: mod-gestion-academica:read, mod-gestion-academica:write, mod-usuarios:read
# coordinador_programa necesita: mod-gestion-academica:read, mod-planes-estudio:read, mod-usuarios:read
# docente necesita: mod-evaluacion:read, mod-gestion-academica:read

# Obtener IDs
cur.execute("SELECT id, name FROM core_roles WHERE name IN ('secretaria_programa', 'coordinador_programa', 'docente')")
roles = {name: id for id, name in cur.fetchall()}

# Obtener IDs de permisos
cur.execute("SELECT id, name FROM core_permissions")
permisos = {name: id for id, name in cur.fetchall()}

# Asignar permisos a secretaria_programa
secretaria_perms = ['mod-gestion-academica:read', 'mod-gestion-academica:write', 'mod-usuarios:read']
for perm_name in secretaria_perms:
    if perm_name in permisos:
        cur.execute("INSERT INTO core_role_permissions (role_id, permission_id) VALUES (%s, %s)", (roles['secretaria_programa'], permisos[perm_name]))

# Asignar permisos a coordinador_programa
coordinator_perms = ['mod-gestion-academica:read', 'mod-planes-estudio:read', 'mod-usuarios:read']
for perm_name in coordinator_perms:
    if perm_name in permisos:
        cur.execute("INSERT INTO core_role_permissions (role_id, permission_id) VALUES (%s, %s)", (roles['coordinador_programa'], permisos[perm_name]))

# Asignar permisos a docente
docente_perms = ['mod-evaluacion:read', 'mod-gestion-academica:read']
for perm_name in docente_perms:
    if perm_name in permisos:
        cur.execute("INSERT INTO core_role_permissions (role_id, permission_id) VALUES (%s, %s)", (roles['docente'], permisos[perm_name]))

print('Permisos asignados correctamente')

cur.close()
conn.close()