import sys
import os
import uuid

# Añadir el path para importar correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../modules")))

from fastapi.testclient import TestClient

# Importar app de mod-usuarios
from modules.getattr import getattr_hack
pass
