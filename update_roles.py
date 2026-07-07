import os

# 1. Update auth_service.py
auth_path = "D:/SIGA/siga_backend/app/core/identity/auth_service.py"
with open(auth_path, "r", encoding="utf-8") as f:
    auth_content = f.read()

# in authenticate_user
auth_content = auth_content.replace(
    'primary_role = user.roles[0].name if user.roles else "estudiante"\n        \n        # Generar token',
    'primary_role = user.roles[0].name if user.roles else "estudiante"\n        role_list = [r.name for r in user.roles] if user.roles else ["estudiante"]\n        \n        # Generar token'
)
auth_content = auth_content.replace(
    '"role": primary_role,\n                "permissions": permissions',
    '"role": primary_role,\n                "roles": role_list,\n                "permissions": permissions'
)

# in get_current_user
auth_content = auth_content.replace(
    'primary_role = user.roles[0].name if user.roles else "estudiante"\n        \n        return {',
    'primary_role = user.roles[0].name if user.roles else "estudiante"\n        role_list = [r.name for r in user.roles] if user.roles else ["estudiante"]\n        \n        return {'
)
auth_content = auth_content.replace(
    '"role": primary_role,\n            "permissions": permissions,',
    '"role": primary_role,\n            "roles": role_list,\n            "permissions": permissions,'
)

with open(auth_path, "w", encoding="utf-8") as f:
    f.write(auth_content)


# 2. Update App.jsx
app_path = "D:/SIGA/siga_frontend/src/App.jsx"
with open(app_path, "r", encoding="utf-8") as f:
    app_content = f.read()

app_old_get_role = """      const getUserRole = () => {
        if (user?.is_superuser) return 'superadmin';
        if (user?.role) return user.role;
        if (!user?.roles || user.roles.length === 0) return 'invitado';
        const r = user.roles[0];
        return typeof r === 'string' ? r : (r.name || r.nombre || 'invitado');
      };
      const userRole = getUserRole();"""

app_new_get_role = """      const getUserRoles = () => {
        if (user?.is_superuser) return ['superadmin'];
        let roles = [];
        if (user?.roles && Array.isArray(user.roles)) {
          roles = user.roles.map(r => typeof r === 'string' ? r : (r.name || r.nombre));
        } else if (user?.role) {
          roles = [user.role];
        }
        return roles.length > 0 ? roles : ['invitado'];
      };
      const userRoles = getUserRoles();"""

app_content = app_content.replace(app_old_get_role, app_new_get_role)

app_old_routing = """      if (!['superadmin', 'admin'].includes(userRole)) {
        if (userRole === 'coordinador_programa') defaultView = 'coordinator_academic';
        else if (userRole === 'docente') defaultView = 'evaluation';
        else if (userRole === 'estudiante') defaultView = 'report_card';
        else if (userRole === 'secretaria_academica') defaultView = 'students';
        else if (userRole === 'secretaria_programa') defaultView = 'enrollment';
        else if (userRole === 'caja_tesoreria') defaultView = 'finanzas';
        else if (userRole === 'director') defaultView = 'academic';
      }"""

app_new_routing = """      if (!userRoles.includes('superadmin') && !userRoles.includes('admin')) {
        if (userRoles.includes('coordinador_programa')) defaultView = 'coordinator_academic';
        else if (userRoles.includes('docente')) defaultView = 'evaluation';
        else if (userRoles.includes('estudiante')) defaultView = 'report_card';
        else if (userRoles.includes('secretaria_academica')) defaultView = 'students';
        else if (userRoles.includes('secretaria_programa')) defaultView = 'enrollment';
        else if (userRoles.includes('caja_tesoreria')) defaultView = 'finanzas';
        else if (userRoles.includes('director')) defaultView = 'academic';
      }"""

app_content = app_content.replace(app_old_routing, app_new_routing)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(app_content)


# 3. Update DashboardLayout.jsx
dash_path = "D:/SIGA/siga_frontend/src/layouts/DashboardLayout.jsx"
with open(dash_path, "r", encoding="utf-8") as f:
    dash_content = f.read()

dash_old_get_role = """  const getUserRole = () => {
    if (user?.is_superuser) return 'superadmin';
    if (user?.role) return user.role;
    if (!user?.roles || user.roles.length === 0) return 'invitado';
    const r = user.roles[0];
    return typeof r === 'string' ? r : (r.name || r.nombre || 'invitado');
  };
  const userRole = getUserRole();"""

dash_new_get_role = """  const getUserRoles = () => {
    if (user?.is_superuser) return ['superadmin'];
    let roles = [];
    if (user?.roles && Array.isArray(user.roles)) {
      roles = user.roles.map(r => typeof r === 'string' ? r : (r.name || r.nombre));
    } else if (user?.role) {
      roles = [user.role];
    }
    return roles.length > 0 ? roles : ['invitado'];
  };
  const userRoles = getUserRoles();
  const primaryDisplayRole = userRoles[0];"""

dash_content = dash_content.replace(dash_old_get_role, dash_new_get_role)

dash_content = dash_content.replace(
    "{user?.is_superuser ? 'Superadmin' : userRole}",
    "{user?.is_superuser ? 'Superadmin' : (userRoles.join(' / '))}"
)

# Replace all `.includes(userRole)` with `.some(r => userRoles.includes(r))`
import re
dash_content = re.sub(
    r"\{\['([^\]]+)'\]\.includes\(userRole\)",
    lambda m: f"{{[{m.group(1)}].some(r => userRoles.includes(r))",
    dash_content
)
dash_content = dash_content.replace(
    "{['superadmin', 'admin'].includes(userRole)",
    "{['superadmin', 'admin'].some(r => userRoles.includes(r))"
)

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash_content)

print("Update completed.")
