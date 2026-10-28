import sys
import importlib
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


def get_module_dir(module_name: str) -> Path:
    """Devuelve la ruta absoluta al directorio del módulo."""
    return BACKEND_DIR / "modules" / module_name


def load_module_component(module_name: str, component_name: str = "main"):
    """
    Carga de forma dinámica un componente (main, routes, database, models, schemas)
    de un microservicio cuyo nombre contiene guiones (ej. mod-gestion-academica).
    
    Añade el directorio del módulo al inicio de sys.path para que sus imports
    internos (from database import ..., from models import ...) se resuelvan limpiamente.
    """
    mod_dir = str(get_module_dir(module_name))
    if mod_dir not in sys.path:
        sys.path.insert(0, mod_dir)

    # Forzar recarga o import limpio
    module = importlib.import_module(component_name)
    return module
