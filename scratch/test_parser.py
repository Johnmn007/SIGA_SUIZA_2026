import requests
import json
import sys

url = 'http://localhost:8001/api/v1/planes/parse-minedu'
files = {'file': open('PLAN_DSI_2026.xlsx', 'rb')}

try:
    response = requests.post(url, files=files)
    if response.status_code == 200:
        data = response.json()
        print("Success! Parsed Data Summary:")
        plan = data.get("data", {})
        print(f"Codigo: {plan.get('codigo')}")
        print(f"Nombre: {plan.get('nombre')}")
        print(f"Horas: {plan.get('horas_totales')} | Creditos: {plan.get('creditos_totales')}")
        
        modulos = plan.get("modulos", [])
        print(f"\nModulos extraídos ({len(modulos)}):")
        for m in modulos:
            print(f"  - {m.get('nombre')} (H: {m.get('horas')}, C: {m.get('creditos')}) - {len(m.get('unidades', []))} Unidades")
            for i, u in enumerate(m.get('unidades', [])[:2]):
                print(f"      * {u.get('nombre')} (H: {u.get('horas')}, C: {u.get('creditos')})")
            if len(m.get('unidades', [])) > 2:
                print(f"      * ... y {len(m.get('unidades', [])) - 2} más.")
    else:
        print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
