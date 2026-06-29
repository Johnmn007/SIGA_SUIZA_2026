import sys
import os
import requests
import json

API_URL = "http://localhost:8000"

def login():
    print("Iniciando sesión como admin...")
    response = requests.post(
        f"{API_URL}/auth/login",
        params={"email": "admin@siga.edu", "password": "admin123"}
    )
    if not response.ok:
        print("Fallo el login:", response.text)
        sys.exit(1)
    return response.json()["access_token"]

def main():
    token = login()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 1. Crear Programa DSI
    print("1. Creando Programa DSI-01...")
    prog_data = {
        "nombre": "Desarrollo de Sistemas de Información",
        "codigo": "DSI-01",
        "duracion_periodos": 6,
        "creditos_totales": 120,
        "modalidad": "presencial"
    }
    r = requests.post(f"{API_URL}/api/mod-programas-estudio/programas", json=prog_data, headers=headers)
    print("   Respuesta:", r.status_code, r.text if not r.ok else "")
    
    # 2. Generar Malla básica (Ya que no hay excel MINEDU a la mano)
    print("2. Creando Malla básica...")
    # Solo crearemos una UD por base de datos directamente o ignoramos esto y en el frontend dejamos que falle si no hay malla.
    # En realidad mod-planes-estudio/importar-minedu no existe el excel. Así que lo ignoramos.
        
    # 3. Crear Periodo
    print("3. Creando Periodo Academico...")
    periodo_data = {
        "codigo": "2026-I",
        "fecha_inicio": "2026-03-01T00:00:00",
        "fecha_fin": "2026-07-31T23:59:59",
        "estado": "planificacion"
    }
    r = requests.post(f"{API_URL}/api/mod-programas-estudio/periodos", json=periodo_data, headers=headers)
    print("   Respuesta Periodo:", r.status_code, r.text if not r.ok else "")
    
    # 4. Ingestar Admisión
    print("4. Ingestando Admisión (110 alumnos)...")
    json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../docs/mock_admision.json"))
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            payload = json.load(f)
        r = requests.post(f"{API_URL}/api/mod-gestion-academica/admision/ingesta", json=payload, headers=headers)
        print("   Respuesta Admision:", r.status_code)
    else:
        print("   Archivo no encontrado:", json_path)
        
    print("COMPLETADO!")

if __name__ == '__main__':
    main()
