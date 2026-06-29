import os
import sys
import glob
import httpx
import asyncio

API_URL = "http://localhost:8002/api/v1/planes/importar-minedu"

async def importar_plan(filepath: str, client: httpx.AsyncClient):
    print(f"Importando: {filepath}")
    try:
        with open(filepath, "rb") as f:
            files = {"file": (os.path.basename(filepath), f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            response = await client.post(API_URL, files=files, timeout=30.0)
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"Exito al importar {os.path.basename(filepath)}: {data.get('message', '')} (Plan ID: {data.get('plan_id', '')})")
            else:
                print(f"Error al importar {os.path.basename(filepath)}: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Excepcion al procesar {os.path.basename(filepath)}: {e}")

async def main():
    if len(sys.argv) > 1:
        directory = sys.argv[1]
    else:
        # Default to root directory of the project
        directory = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

    print(f"Buscando archivos Excel en: {directory}")
    
    # Find all .xlsx and .xls files
    excel_files = glob.glob(os.path.join(directory, "*.xlsx")) + glob.glob(os.path.join(directory, "*.xls"))
    
    if not excel_files:
        print("No se encontraron archivos Excel para importar.")
        return

    print(f"Se encontraron {len(excel_files)} archivos Excel. Iniciando importación...")
    
    async with httpx.AsyncClient() as client:
        for filepath in excel_files:
            # Check if gateway is available or directly to module (8002)
            # We are using 8000 (gateway), but let's test if it works.
            # If we don't have gateway configured for /planes, we might need to hit 8002 directly.
            # Wait, gateway should have /api/v1/planes/... routing to 8002.
            await importar_plan(filepath, client)

if __name__ == "__main__":
    asyncio.run(main())
