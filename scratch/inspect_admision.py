import pandas as pd
import json

def inspect_excel(filepath):
    print(f"--- Inspecting {filepath} ---")
    try:
        excel_file = pd.ExcelFile(filepath)
        print(f"Sheet names: {excel_file.sheet_names}")
        
        for sheet in excel_file.sheet_names:
            print(f"\nSheet: {sheet}")
            df = pd.read_excel(filepath, sheet_name=sheet, nrows=5)
            print("Columns:", list(df.columns))
            print("Preview:\n", df.head(3).to_string(index=False))
            print("-" * 40)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

inspect_excel("D:/SIGA/admision_resultados.xlsx")
print("\n" + "="*50 + "\n")
inspect_excel("D:/SIGA/ADMISION_2026.xlsx")
