import sys
import os
import requests

API_URL = "http://localhost:8000"

USERS_CONFIG = [
    {"role_name": "caja_tesoreria", "email": "tesoreria@siga.edu", "password": "tesoreria123", "full_name": "Caja y Tesorería"},
    {"role_name": "secretaria_academica", "email": "secretaria@siga.edu", "password": "secretaria123", "full_name": "Secretaría Académica"},
    {"role_name": "coordinador_programa", "email": "coordinador@siga.edu", "password": "coordinador123", "full_name": "Coordinador Programa"},
    {"role_name": "oficina_admision", "email": "admision@siga.edu", "password": "admision123", "full_name": "Oficina Admisión"},
    {"role_name": "docente", "email": "docente@siga.edu", "password": "docente123", "full_name": "Docente"},
    {"role_name": "estudiante", "email": "estudiante@siga.edu", "password": "estudiante123", "full_name": "Estudiante"},
    {"role_name": "secretaria_programa", "email": "secretaria_prog@siga.edu", "password": "secretariaprog123", "full_name": "Secretaría de Programa"}
]

def login():
    response = requests.post(
        f"{API_URL}/auth/login",
        params={"email": "admin@siga.edu", "password": "admin123"}
    )
    if not response.ok:
        print("Fallo el login como admin:", response.text)
        sys.exit(1)
    return response.json()["access_token"]

def main():
    token = login()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print("Sincronizando Usuarios de Prueba y Roles...")
    
    # 1. Obtener Roles actuales
    r = requests.get(f"{API_URL}/api/mod-usuarios/roles", headers=headers)
    existing_roles = r.json()
    
    # 2. Obtener Usuarios actuales
    r = requests.get(f"{API_URL}/api/mod-usuarios/usuarios", headers=headers)
    existing_users = r.json()

    for cfg in USERS_CONFIG:
        # Asegurar Rol
        role = next((r for r in existing_roles if r.get("nombre") == cfg["role_name"] or r.get("name") == cfg["role_name"]), None)
        if not role:
            r = requests.post(f"{API_URL}/api/mod-usuarios/roles", json={"name": cfg["role_name"], "description": cfg["full_name"]}, headers=headers)
            if r.ok:
                role = r.json()
                existing_roles.append(role)
                print(f"Rol '{cfg['role_name']}' creado.")
            else:
                print(f"Error creando rol '{cfg['role_name']}':", r.text)
                continue

        # Asegurar Usuario
        user = next((u for u in existing_users if u.get("email") == cfg["email"]), None)
        if user:
            # Si existe, actualizamos la clave usando el endpoint PUT o un endpoint de reset si lo hay.
            # Como FastAPI Users no expone endpoint simple para cambiar clave de otro por REST sin custom router, 
            # podemos borrarlo y recrearlo, o simplemente ignorar. Para entorno de desarrollo, si ya existe pero
            # su clave era mala, mejor borrarlo y recrearlo.
            print(f"Usuario {cfg['email']} ya existe. Eliminando para recrear con clave correcta...")
            r = requests.delete(f"{API_URL}/api/mod-usuarios/usuarios/{user['id']}", headers=headers)
            if not r.ok:
                print(f"No se pudo eliminar {cfg['email']}. Ignorando.")

        print(f"Creando usuario {cfg['email']}...")
        new_user = {
            "email": cfg["email"],
            "full_name": cfg["full_name"],
            "password": cfg["password"],
            "is_active": True,
            "is_superuser": False,
            "role_ids": [role["id"]]
        }
        r = requests.post(f"{API_URL}/api/mod-usuarios/usuarios", json=new_user, headers=headers)
        if r.ok:
            print(f"  -> Creado exitosamente: {cfg['email']} / {cfg['password']}")
        else:
            print(f"  -> Error creando {cfg['email']}:", r.text)

if __name__ == '__main__':
    main()
