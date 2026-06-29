import sys
import os
import json
import requests

API_URL = "http://localhost:8000"

def login():
    print("Iniciando sesión como admin_admision...")
    # O usar superadmin
    response = requests.post(
        f"{API_URL}/auth/login",
        params={"email": "admin@siga.edu", "password": "admin123"}
    )
    if not response.ok:
        print("Fallo el login:", response.text)
        sys.exit(1)
    return response.json()["access_token"]

def ingestar_admision(token, json_path):
    print(f"Leyendo archivo {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        payload = json.load(f)

    print(f"Proceso de Admisión ID: {payload['proceso_admision_id']}")
    print(f"Total a ingestar: {len(payload['admitidos'])} alumnos.")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("Enviando datos al motor de Gestión Académica...")
    response = requests.post(
        f"{API_URL}/api/mod-gestion-academica/admision/ingesta",
        json=payload,
        headers=headers
    )

    if response.ok:
        data = response.json()
        print("✅ INGESTA COMPLETADA EXITOSAMENTE")
        print(f"Mensaje del sistema: {data['message']}")
        print(f"Perfiles maestros creados: {data['estudiantes_creados']}")
    else:
        print("❌ ERROR EN LA INGESTA")
        print(f"Código HTTP: {response.status_code}")
        print(f"Detalle: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Default path
        file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../docs/mock_admision.json"))
    else:
        file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"Error: No se encuentra el archivo {file_path}")
        sys.exit(1)

    token = login()
    ingestar_admision(token, file_path)
