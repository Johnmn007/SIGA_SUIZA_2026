import sys
sys.path.append("D:\\SIGA\\siga_backend\\modules\\mod-planes-estudio")
from excel_parser import ExcelMineduParser

with open("D:\\SIGA\\PLAN_DSI_2026.xlsx", "rb") as f:
    success, data, msg = ExcelMineduParser.parse_plan_estudio(f.read())
    print("Success:", success)
    for m in data.get('modulos', []):
        print(f"Mod: {m['nombre']}")
        for u in m['unidades']:
            print(f"  - {u['nombre']}")
