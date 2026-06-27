import pandas as pd
import io
import logging
from typing import Dict, Any, Tuple, List, Optional
import math

logger = logging.getLogger(__name__)

class ExcelMineduParser:
    """
    Motor de Extracción Semántica (Anchor-Based) para Planes de Estudio MINEDU.
    """

    @staticmethod
    def _find_anchor_value(df: pd.DataFrame, anchor_keywords: List[str]) -> Optional[Any]:
        """
        Busca un 'ancla' (keyword) en todo el DataFrame y retorna el valor de la celda adyacente (a su derecha o abajo).
        """
        for i, row in df.iterrows():
            for j, val in enumerate(row.values):
                if pd.notna(val) and isinstance(val, str):
                    val_lower = val.lower().strip()
                    if any(kw in val_lower for kw in anchor_keywords):
                        # Encontramos el ancla. Buscar a la derecha.
                        for k in range(j + 1, len(row.values)):
                            if pd.notna(row.values[k]) and str(row.values[k]).strip() != "":
                                return row.values[k]
                        # Si no hay nada a la derecha, buscar abajo
                        if i + 1 < len(df):
                            val_below = df.iloc[i+1, j]
                            if pd.notna(val_below) and str(val_below).strip() != "":
                                return val_below
        return None

    @staticmethod
    def _find_table_headers(df: pd.DataFrame, required_keywords: List[str]) -> Optional[Tuple[int, Dict[str, int]]]:
        """
        Busca la fila que contiene las cabeceras de la tabla (ej: Unidad Didáctica, Créditos, Horas).
        Retorna (row_index, {keyword: col_index})
        """
        for i, row in df.iterrows():
            found_cols = {}
            for j, val in enumerate(row.values):
                if pd.notna(val) and isinstance(val, str):
                    val_lower = val.lower().strip()
                    for kw in required_keywords:
                        if kw in val_lower and kw not in found_cols:
                            found_cols[kw] = j
            
            # Si encontramos al menos 2 palabras clave, y una de ellas es 'unidad', asumimos que es la cabecera
            if len(found_cols) >= 2 and any("unidad" in kw for kw in found_cols.keys()):
                return i, found_cols
                
        return None

    @staticmethod
    def parse_plan_estudio(file_contents: bytes) -> Tuple[bool, Dict[str, Any], str]:
        try:
            excel_file = pd.ExcelFile(io.BytesIO(file_contents))
            sheet_names = excel_file.sheet_names
            
            plan_data = {
                "codigo": "",
                "nombre": "",
                "descripcion": "Importado desde archivo MINEDU",
                "nivel_formativo": "Técnico Profesional",
                "creditos_totales": 0,
                "horas_totales": 0,
                "estado": "activo",
                "modulos": []
            }
            
            # 1. Extraer Metadatos Generales
            general_sheet = None
            for name in sheet_names:
                name_lower = name.lower()
                if "programa" in name_lower or "dato" in name_lower or "general" in name_lower:
                    general_sheet = name
                    break
            
            if general_sheet:
                df_gen = pd.read_excel(excel_file, sheet_name=general_sheet)
                
                # Buscar Código
                codigo = ExcelMineduParser._find_anchor_value(df_gen, ["código", "codigo"])
                if codigo: plan_data["codigo"] = str(codigo).strip()
                
                # Buscar Nombre
                nombre = ExcelMineduParser._find_anchor_value(df_gen, ["denominación del programa", "programa de estudio", "carrera"])
                if nombre: plan_data["nombre"] = str(nombre).strip()
                
                # Buscar Horas
                horas = ExcelMineduParser._find_anchor_value(df_gen, ["horas"])
                if horas: 
                    try: plan_data["horas_totales"] = int(float(str(horas).strip()))
                    except: pass
                
                # Buscar Créditos
                creditos = ExcelMineduParser._find_anchor_value(df_gen, ["crédito", "credito"])
                if creditos:
                    try: plan_data["creditos_totales"] = int(float(str(creditos).strip()))
                    except: pass

            # Si no encontró código, generar uno temporal
            if not plan_data["codigo"]:
                plan_data["codigo"] = "TMP-" + str(pd.Timestamp.now().timestamp()).replace(".","")[-6:]
            if not plan_data["nombre"]:
                plan_data["nombre"] = "Plan Extraído (Autogenerado)"

            # 2. Extraer Módulos (Hojas M1, M2... o que digan 'Modulo')
            modulo_sheets = []
            for name in sheet_names:
                if name.startswith("M") and name[1:].isdigit():
                    modulo_sheets.append(name)
                elif "módulo" in name.lower() or "modulo" in name.lower() and "organización" not in name.lower():
                    modulo_sheets.append(name)
            
            if not modulo_sheets:
                # Fallback: intentar leer la hoja de organización modular si no hay hojas M1, M2
                pass # Por ahora asumimos que el formato detallado es el mejor
            
            modulos_procesados = []
            orden_modulo = 1
            
            for m_sheet in modulo_sheets:
                df_mod = pd.read_excel(excel_file, sheet_name=m_sheet)
                
                # Buscar Nombre del Módulo
                nombre_mod = ExcelMineduParser._find_anchor_value(df_mod, ["denominación del módulo", "nombre del módulo", "módulo"])
                if not nombre_mod:
                    nombre_mod = f"Módulo {orden_modulo}"
                
                modulo = {
                    "codigo": f"MOD-{orden_modulo:02d}",
                    "nombre": str(nombre_mod).strip(),
                    "horas": 0,
                    "creditos": 0,
                    "orden": orden_modulo,
                    "unidades": []
                }
                
                # Buscar tabla de Unidades
                header_info = ExcelMineduParser._find_table_headers(df_mod, ["unidad", "horas", "crédito", "credito"])
                print(f"Header info for {m_sheet}: {header_info}")
                
                if header_info:
                    header_row_idx, col_map = header_info
                    
                    # Identificar columnas exactas
                    ud_col = None
                    hr_col = None
                    cr_col = None
                    
                    for kw, col_idx in col_map.items():
                        if "unidad" in kw: ud_col = col_idx
                        elif "hora" in kw: hr_col = col_idx
                        elif "crédito" in kw or "credito" in kw: cr_col = col_idx
                    
                    if ud_col is not None:
                        orden_ud = 1
                        # Leer desde la fila siguiente a la cabecera
                        for idx in range(header_row_idx + 1, len(df_mod)):
                            ud_name_raw = df_mod.iloc[idx, ud_col]
                            
                            if pd.isna(ud_name_raw) or str(ud_name_raw).strip() in ["", "0"]:
                                continue # Ignorar filas vacías
                                
                            ud_name_str = str(ud_name_raw).strip()
                            
                            # Ignorar repeticiones de la cabecera (ej. para habilidades de empleabilidad)
                            if ud_name_str.lower() == "unidad didáctica" or ud_name_str.lower() == "unidad didactica":
                                continue
                                
                            # Criterio de parada: si vemos "Total", "Subtotal", o similar, paramos de leer unidades
                            if "total" in ud_name_str.lower() or "sumatoria" in ud_name_str.lower():
                                break
                            
                            # Extraer horas y créditos asegurando que sean numéricos
                            hrs = 0
                            if hr_col is not None and pd.notna(df_mod.iloc[idx, hr_col]):
                                try: hrs = int(float(str(df_mod.iloc[idx, hr_col]).strip()))
                                except: pass
                                
                            creds = 0
                            if cr_col is not None and pd.notna(df_mod.iloc[idx, cr_col]):
                                try: creds = int(float(str(df_mod.iloc[idx, cr_col]).strip()))
                                except: pass
                            
                            unidad = {
                                "codigo": f"UD-{orden_ud:02d}",
                                "nombre": ud_name_str,
                                "horas": hrs,
                                "creditos": creds,
                                "tipo": "teorico-practico",
                                "orden": orden_ud
                            }
                            modulo["unidades"].append(unidad)
                            modulo["horas"] += hrs
                            modulo["creditos"] += creds
                            orden_ud += 1
                
                modulos_procesados.append(modulo)
                orden_modulo += 1
            
            plan_data["modulos"] = modulos_procesados
            
            # Recalcular totales si no se extrajeron bien de la metadata global
            if plan_data["creditos_totales"] == 0 and modulos_procesados:
                plan_data["creditos_totales"] = sum(m["creditos"] for m in modulos_procesados)
            if plan_data["horas_totales"] == 0 and modulos_procesados:
                plan_data["horas_totales"] = sum(m["horas"] for m in modulos_procesados)
                
            return True, plan_data, "Archivo procesado y estructurado exitosamente"

        except Exception as e:
            logger.error(f"Error parseando Excel MINEDU: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False, {}, f"Error al procesar el archivo Excel: {str(e)}"
