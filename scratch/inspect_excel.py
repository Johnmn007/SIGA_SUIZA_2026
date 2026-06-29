import pandas as pd
import json

file_path = "/tmp/PLAN_DSI_2026.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    print("Sheets:", xl.sheet_names)
    
    # We want to dump a specific sheet to a json file to read easily.
    df = pd.read_excel(xl, sheet_name='L4 Organizacion modular')
    df.to_json('/tmp/L4_Organizacion_modular.json', orient='records', force_ascii=False)
    
    df_l5 = pd.read_excel(xl, sheet_name='L5. Detalle de Módulos DSI')
    df_l5.to_json('/tmp/L5_Detalle.json', orient='records', force_ascii=False)
    print("Exported L4 and L5 to JSON")
except Exception as e:
    print(f"Error: {e}")
