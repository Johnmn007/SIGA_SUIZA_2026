import os
from datetime import datetime, timedelta
from typing import List, Optional
import pytest
from jose import jwt


def get_jwt_secret() -> str:
    """
    Obtiene la clave secreta JWT estrictamente de la variable de entorno SECRET_KEY.
    Si no está definida, omite la prueba de inmediato sin fallar ni exponer secretos.
    """
    secret = os.getenv("SECRET_KEY")
    if not secret or not secret.strip():
        pytest.skip("Variable de entorno SECRET_KEY no configurada. Omitiendo prueba dependiente de JWT.")
    return secret.strip()


def create_test_token(
    user_id: int | str,
    email: str,
    role: str = "docente",
    permissions: Optional[List[str]] = None
) -> str:
    """
    Genera un token JWT de prueba firmado con el algoritmo HS256.
    Replica exactamente el esquema de payload de Core Gateway.
    """
    secret_key = get_jwt_secret()
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "permissions": permissions or [],
        "type": "user_access",
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")
