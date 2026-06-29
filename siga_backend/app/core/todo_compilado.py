import os

# ================= CONFIGURACIÓN =================
# Ruta del proyecto a compilar
RUTA_ORIGEN = r"D:\SIGA\siga_backend"  # Cambia según tu proyecto
# Ruta del archivo de salida
RUTA_DESTINO_TXT = r"D:\SIGA\siga_backend\siga_backend.txt"

# Extensiones de archivos que se copiarán
EXTENSIONES_VALIDAS = ['.py', '.txt', '.json']

# Carpetas y archivos a ignorar
CARPETAS_IGNORAR = ['__pycache__', 'venv']
ARCHIVOS_IGNORAR = ['.env', '.md']

# ================= FUNCIONES =================
def es_archivo_valido(archivo):
    """Verifica si un archivo es válido para copiar."""
    return any(archivo.lower().endswith(ext) for ext in EXTENSIONES_VALIDAS) and archivo not in ARCHIVOS_IGNORAR

def copiar_proyecto_a_txt(ruta_origen, ruta_destino_txt):
    """Recorre el proyecto y copia todos los archivos de texto válidos a un solo archivo TXT."""
    # Crear carpeta destino si no existe
    os.makedirs(os.path.dirname(ruta_destino_txt), exist_ok=True)

    with open(ruta_destino_txt, 'w', encoding='utf-8') as txt_file:
        for root, dirs, files in os.walk(ruta_origen):
            # Ignorar carpetas irrelevantes
            dirs[:] = [d for d in dirs if d not in CARPETAS_IGNORAR]

            # Ruta relativa de la carpeta actual
            ruta_relativa = os.path.relpath(root, ruta_origen)
            txt_file.write(f"\n=== Carpeta: {ruta_relativa} ===\n")

            for archivo in files:
                if es_archivo_valido(archivo):
                    archivo_origen = os.path.join(root, archivo)
                    txt_file.write(f"\n--- Archivo: {archivo} ---\n")
                    try:
                        with open(archivo_origen, 'r', encoding='utf-8') as f:
                            contenido = f.read()
                        txt_file.write(contenido + "\n")
                    except Exception as e:
                        txt_file.write(f"[ERROR LEYENDO ARCHIVO: {e}]\n")

    print(f"Proyecto copiado exitosamente a: {ruta_destino_txt}")

# ================= EJECUCIÓN =================
if __name__ == "__main__":
    copiar_proyecto_a_txt(RUTA_ORIGEN, RUTA_DESTINO_TXT)
