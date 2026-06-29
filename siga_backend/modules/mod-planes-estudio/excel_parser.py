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
        for i, row in df.iterrows():
            found_cols = {}
            for j, val in enumerate(row.values):
                if pd.notna(val) and isinstance(val, str):
                    val_lower = val.lower().strip()
                    for kw in required_keywords:
                        if kw in val_lower:
                            found_cols[kw] = j
                    # Also look for exact period columns
                    if val_lower in ["i", "ii", "iii", "iv", "v", "vi", "1", "2", "3", "4", "5", "6", "periodo"]:
                        found_cols[val_lower] = j
            
            if len([k for k in found_cols.keys() if any(rk in k for rk in required_keywords)]) >= 2 and any("unidad" in k for k in found_cols.keys()):
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
            
            general_sheet = next((n for n in sheet_names if any(k in n.lower() for k in ["programa", "dato", "general"])), None)
            if general_sheet:
                df_gen = pd.read_excel(excel_file, sheet_name=general_sheet)
                codigo = ExcelMineduParser._find_anchor_value(df_gen, ["código", "codigo"])
                if codigo: plan_data["codigo"] = str(codigo).strip()
                nombre = ExcelMineduParser._find_anchor_value(df_gen, ["denominación del programa", "programa de estudio", "carrera"])
                if nombre: plan_data["nombre"] = str(nombre).strip()
                horas = ExcelMineduParser._find_anchor_value(df_gen, ["horas"])
                if horas: 
                    try: plan_data["horas_totales"] = int(float(str(horas).strip()))
                    except: pass
                creditos = ExcelMineduParser._find_anchor_value(df_gen, ["crédito", "credito"])
                if creditos:
                    try: plan_data["creditos_totales"] = int(float(str(creditos).strip()))
                    except: pass

            if not plan_data["codigo"]: plan_data["codigo"] = "TMP-" + str(pd.Timestamp.now().timestamp()).replace(".","")[-6:]
            if not plan_data["nombre"]: plan_data["nombre"] = "Plan Extraído (Autogenerado)"

            modulo_sheets = [n for n in sheet_names if (n.startswith("M") and n[1:].isdigit()) or ("módulo" in n.lower() or "modulo" in n.lower())]
            
            modulos_procesados_dict = {} # Key: Period (1 to 6)
            orden_modulo_idx = 1
            
            for m_sheet in modulo_sheets:
                df_mod = pd.read_excel(excel_file, sheet_name=m_sheet)
                nombre_mod = ExcelMineduParser._find_anchor_value(df_mod, ["denominación del módulo", "nombre del módulo", "módulo"])
                if not nombre_mod: nombre_mod = f"Módulo {orden_modulo_idx}"
                
                header_info = ExcelMineduParser._find_table_headers(df_mod, ["unidad", "horas", "crédito", "credito"])
                
                if header_info:
                    header_row_idx, col_map = header_info
                    
                    ud_col = next((c for k, c in col_map.items() if "unidad" in k), None)
                    hr_col = next((c for k, c in col_map.items() if "hora" in k), None)
                    cr_col = next((c for k, c in col_map.items() if "crédito" in k or "credito" in k), None)
                    
                    # Identificar columna exacta de periodo o columnas i, ii
                    periodo_col_exact = next((c for k, c in col_map.items() if "periodo" in k), None)
                    periodo_cols = {}
                    for p_str, p_val in {"i":1,"1":1, "ii":2,"2":2, "iii":3,"3":3, "iv":4,"4":4, "v":5,"5":5, "vi":6,"6":6}.items():
                        if p_str in col_map:
                            periodo_cols[col_map[p_str]] = p_val
                    
                    if ud_col is not None:
                        current_periodo = None
                        for idx in range(header_row_idx + 1, len(df_mod)):
                            # Check if the row has a value in the 'periodo' column to update current_periodo
                            if periodo_col_exact is not None:
                                p_val = df_mod.iloc[idx, periodo_col_exact]
                                if pd.notna(p_val) and str(p_val).strip() not in ["", "0", "-"]:
                                    p_str = str(p_val).strip().lower()
                                    if p_str in ["i", "1"]: current_periodo = 1
                                    elif p_str in ["ii", "2"]: current_periodo = 2
                                    elif p_str in ["iii", "3"]: current_periodo = 3
                                    elif p_str in ["iv", "4"]: current_periodo = 4
                                    elif p_str in ["v", "5"]: current_periodo = 5
                                    elif p_str in ["vi", "6"]: current_periodo = 6
                                    else:
                                        try: current_periodo = int(p_str)
                                        except: pass

                            # Determine periodo using boolean columns if 'periodo' column doesn't exist
                            periodo_for_row = current_periodo
                            if periodo_for_row is None:
                                for p_c, p_v in periodo_cols.items():
                                    val_p = df_mod.iloc[idx, p_c]
                                    if pd.notna(val_p) and str(val_p).strip() not in ["", "0", "-"]:
                                        periodo_for_row = p_v
                                        current_periodo = p_v # Carry over
                                        break
                            
                            ud_name_raw = df_mod.iloc[idx, ud_col]
                            if pd.isna(ud_name_raw) or str(ud_name_raw).strip() in ["", "0"]: continue
                            ud_name_str = str(ud_name_raw).strip()
                            if ud_name_str.lower() in ["unidad didáctica", "unidad didactica"]: continue
                            if any(stop in ud_name_str.lower() for stop in ["total", "sumatoria"]): break
                            
                            # Ignorar EFSRT nativo del Excel para estandarizarlo al final por cada ciclo
                            if any(efsrt_kw in ud_name_str.lower() for efsrt_kw in ["efsrt", "experiencias formativas"]): 
                                continue
                            
                            hrs, creds = 0, 0
                            if hr_col is not None and pd.notna(df_mod.iloc[idx, hr_col]):
                                try: hrs = int(float(str(df_mod.iloc[idx, hr_col]).strip()))
                                except: pass
                            if cr_col is not None and pd.notna(df_mod.iloc[idx, cr_col]):
                                try: creds = int(float(str(df_mod.iloc[idx, cr_col]).strip()))
                                except: pass
                                    
                            if not periodo_for_row:
                                periodo_for_row = (orden_modulo_idx - 1) * 2 + 1
                                
                            if periodo_for_row not in modulos_procesados_dict:
                                modulos_procesados_dict[periodo_for_row] = {
                                    "codigo": f"MOD-C{periodo_for_row:02d}",
                                    "nombre": f"{str(nombre_mod).strip()} - Ciclo {periodo_for_row}",
                                    "horas": 0,
                                    "creditos": 0,
                                    "orden": periodo_for_row,
                                    "unidades": []
                                }
                                
                            unidad = {
                                "codigo": f"UD-C{periodo_for_row:02d}-{len(modulos_procesados_dict[periodo_for_row]['unidades'])+1:02d}",
                                "nombre": ud_name_str,
                                "horas": hrs,
                                "creditos": creds,
                                "tipo": "teorico-practico",
                                "orden": len(modulos_procesados_dict[periodo_for_row]["unidades"]) + 1
                            }
                            modulos_procesados_dict[periodo_for_row]["unidades"].append(unidad)
                            modulos_procesados_dict[periodo_for_row]["horas"] += hrs
                            modulos_procesados_dict[periodo_for_row]["creditos"] += creds
                
                orden_modulo_idx += 1
            
            # --- ESTANDARIZACIÓN EFSRT ---
            # Inyectar EFSRT I al VI (1 por cada ciclo), de 2 créditos cada uno.
            roman_numerals = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI"}
            for p in range(1, 7):
                if p not in modulos_procesados_dict:
                    modulos_procesados_dict[p] = {
                        "codigo": f"MOD-C{p:02d}",
                        "nombre": f"Ciclo {p}",
                        "horas": 0,
                        "creditos": 0,
                        "orden": p,
                        "unidades": []
                    }
                
                unidad_efsrt = {
                    "codigo": f"UD-C{p:02d}-EFSRT",
                    "nombre": f"Experiencias Formativas en Situaciones Reales de Trabajo {roman_numerals.get(p, str(p))}",
                    "horas": 64, # Asumiendo 2 creditos = 64 horas practicas
                    "creditos": 2,
                    "tipo": "practico",
                    "orden": len(modulos_procesados_dict[p]["unidades"]) + 1
                }
                modulos_procesados_dict[p]["unidades"].append(unidad_efsrt)
                modulos_procesados_dict[p]["horas"] += 64
                modulos_procesados_dict[p]["creditos"] += 2
            
            # Sort modulos by period (1 to 6)
            modulos_list = [modulos_procesados_dict[k] for k in sorted(modulos_procesados_dict.keys())]
            plan_data["modulos"] = modulos_list
            
            if plan_data["creditos_totales"] == 0 and modulos_list:
                plan_data["creditos_totales"] = sum(m["creditos"] for m in modulos_list)
            if plan_data["horas_totales"] == 0 and modulos_list:
                plan_data["horas_totales"] = sum(m["horas"] for m in modulos_list)
                
            return True, plan_data, "Archivo procesado y estructurado exitosamente"

        except Exception as e:
            logger.error(f"Error parseando Excel MINEDU: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False, {}, f"Error al procesar el archivo Excel: {str(e)}"
