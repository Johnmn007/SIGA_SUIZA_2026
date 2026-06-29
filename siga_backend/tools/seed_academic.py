import sys
import os
import requests
import datetime

API_URL = "http://localhost:8000"

def login():
    print("Iniciando sesion como superadmin...")
    response = requests.post(
        f"{API_URL}/api/core/auth/login",
        data={"username": "admin@siga.edu", "password": "admin123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if not response.ok:
        print("Fallo el login:", response.text)
        sys.exit(1)
    return response.json()["access_token"]

def seed_academic(token):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 1. Crear Programa
    print("Creando Programa de Estudios...")
    prog_data = {
        "nombre": "Desarrollo de Sistemas de Información",
        "codigo": "DSI-01",
        "duracion_periodos": 6,
        "creditos_totales": 120,
        "modalidad": "presencial"
    }
    r = requests.post(f"{API_URL}/api/mod-programas-estudio/programas", json=prog_data, headers=headers)
    if r.ok:
        print("Programa Creado:", r.json()["nombre"])
    else:
        print("Programa (ya existe o error):", r.text)

    # 2. Crear Periodo
    print("Creando Periodo Academico...")
    today = datetime.date.today()
    fin_regular = today + datetime.timedelta(days=30)
    fin_ext = today + datetime.timedelta(days=45)
    fin_periodo = today + datetime.timedelta(days=120)

    periodo_data = {
        "codigo": "2026-I",
        "fecha_inicio": today.isoformat() + "T00:00:00Z",
        "fecha_fin": fin_periodo.isoformat() + "T00:00:00Z",
        "estado": "matricula_abierta",
        "fecha_fin_matricula_regular": fin_regular.isoformat() + "T00:00:00Z",
        "fecha_fin_matricula_extemporanea": fin_ext.isoformat() + "T00:00:00Z"
    }
    r2 = requests.post(f"{API_URL}/api/mod-programas-estudio/periodos", json=periodo_data, headers=headers)
    if r2.ok:
        print("Periodo Creado:", r2.json()["codigo"])
    else:
        print("Periodo (ya existe o error):", r2.text)

if __name__ == "__main__":
    token = login()
    seed_academic(token)
