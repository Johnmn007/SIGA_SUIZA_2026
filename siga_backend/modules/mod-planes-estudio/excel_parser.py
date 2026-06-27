import pandas as pd
import io
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

class ExcelMineduParser:
    """
    Parser especializado para importar Planes de Estudio desde el formato Excel de MINEDU.
    Espera una estructura estándar donde la primera hoja tiene la información general del plan,
    y las siguientes hojas/tablas tienen los módulos y unidades.
    """
    
    @staticmethod
    def parse_plan_estudio(file_contents: bytes) -> Tuple[bool, Dict[str, Any], str]:
        """
        Analiza el archivo Excel y extrae la estructura del plan de estudio.
        Retorna (exito, datos, mensaje_error)
        """
        try:
            # Leer el archivo Excel en memoria
            excel_file = pd.ExcelFile(io.BytesIO(file_contents))
            
            # Verificar hojas necesarias (asumiendo formato MINEDU: "Datos Generales", "Módulos")
            sheet_names = [name.lower() for name in excel_file.sheet_names]
            
            # Intentar encontrar la hoja principal
            main_sheet = None
            for name in excel_file.sheet_names:
                if "datos" in name.lower() or "general" in name.lower() or "plan" in name.lower():
                    main_sheet = name
                    break
                    
            if not main_sheet:
                main_sheet = excel_file.sheet_names[0] # Fallback a la primera
                
            df_general = pd.read_excel(excel_file, sheet_name=main_sheet)
            
            # 1. Extraer Datos Generales del Plan
            # Asumimos una estructura llave-valor o un formato específico
            # En la vida real esto requiere mapeo exacto, aquí usaremos una heurística
            # para buscar 'Código', 'Nombre del Programa', etc.
            
            plan_data = {
                "codigo": "TMP-" + str(pd.Timestamp.now().timestamp()).replace(".","")[-6:],
                "nombre": "Plan Extraído (Generado automáticamente)",
                "descripcion": "Importado desde archivo MINEDU",
                "nivel_formativo": "Técnico Profesional",
                "creditos_totales": 0,
                "horas_totales": 0,
                "estado": "activo",
                "modulos": []
            }
            
            # Buscando Código o Programa
            for i, row in df_general.iterrows():
                row_str = " ".join([str(val).lower() for val in row.values if pd.notna(val)])
                if "código" in row_str or "codigo" in row_str:
                    # Intentar extraer el valor en la siguiente columna
                    for j, val in enumerate(row.values):
                        if pd.notna(val) and ("código" in str(val).lower() or "codigo" in str(val).lower()):
                            if j + 1 < len(row.values) and pd.notna(row.values[j+1]):
                                plan_data["codigo"] = str(row.values[j+1]).strip()
                
                if "programa" in row_str or "carrera" in row_str:
                    for j, val in enumerate(row.values):
                        if pd.notna(val) and ("programa" in str(val).lower() or "carrera" in str(val).lower()):
                            if j + 1 < len(row.values) and pd.notna(row.values[j+1]):
                                plan_data["nombre"] = str(row.values[j+1]).strip()
                                
            # 2. Extraer Módulos y Unidades (de la segunda hoja si existe)
            if len(excel_file.sheet_names) > 1:
                modulos_sheet = excel_file.sheet_names[1]
                df_modulos = pd.read_excel(excel_file, sheet_name=modulos_sheet)
                
                # Heurística simple: buscar columnas 'Módulo', 'Unidad Didáctica', 'Horas', 'Créditos'
                cols = [str(c).lower() for c in df_modulos.columns]
                
                mod_col = None
                ud_col = None
                hrs_col = None
                cred_col = None
                
                for orig_col in df_modulos.columns:
                    c = str(orig_col).lower()
                    if "módulo" in c or "modulo" in c: mod_col = orig_col
                    elif "unidad" in c or "didáctica" in c or "didactica" in c: ud_col = orig_col
                    elif "horas" in c: hrs_col = orig_col
                    elif "crédito" in c or "credito" in c: cred_col = orig_col
                
                # Si tenemos columnas identificadas, procesar
                if ud_col:
                    current_modulo = None
                    modulos_dict = {}
                    
                    for i, row in df_modulos.iterrows():
                        # Si hay un módulo definido en esta fila, actualizar el actual
                        if mod_col and pd.notna(row[mod_col]) and str(row[mod_col]).strip() != "":
                            mod_name = str(row[mod_col]).strip()
                            if mod_name not in modulos_dict:
                                modulos_dict[mod_name] = {
                                    "codigo": f"MOD-{len(modulos_dict)+1:02d}",
                                    "nombre": mod_name,
                                    "horas": 0,
                                    "creditos": 0,
                                    "orden": len(modulos_dict) + 1,
                                    "unidades": []
                                }
                            current_modulo = mod_name
                            
                        # Si hay una unidad didáctica
                        if pd.notna(row[ud_col]) and str(row[ud_col]).strip() != "":
                            # Si no hay módulo, crear uno genérico
                            if not current_modulo:
                                current_modulo = "Módulo Formativo General"
                                modulos_dict[current_modulo] = {
                                    "codigo": "MOD-GEN",
                                    "nombre": current_modulo,
                                    "horas": 0,
                                    "creditos": 0,
                                    "orden": 1,
                                    "unidades": []
                                }
                            
                            ud_name = str(row[ud_col]).strip()
                            hrs = int(row[hrs_col]) if hrs_col and pd.notna(row[hrs_col]) and str(row[hrs_col]).isnumeric() else 0
                            creds = int(row[cred_col]) if cred_col and pd.notna(row[cred_col]) and str(row[cred_col]).isnumeric() else 0
                            
                            unidad = {
                                "codigo": f"UD-{len(modulos_dict[current_modulo]['unidades'])+1:02d}",
                                "nombre": ud_name,
                                "horas": hrs,
                                "creditos": creds,
                                "tipo": "teorico-practico",
                                "orden": len(modulos_dict[current_modulo]["unidades"]) + 1
                            }
                            
                            modulos_dict[current_modulo]["unidades"].append(unidad)
                            modulos_dict[current_modulo]["horas"] += hrs
                            modulos_dict[current_modulo]["creditos"] += creds
                            plan_data["horas_totales"] += hrs
                            plan_data["creditos_totales"] += creds
                    
                    plan_data["modulos"] = list(modulos_dict.values())
                    
            return True, plan_data, "Archivo procesado exitosamente"
            
        except Exception as e:
            logger.error(f"Error parseando Excel MINEDU: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False, {}, f"Error al procesar el archivo Excel: {str(e)}"
