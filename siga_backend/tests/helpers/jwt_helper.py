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
    Replica exactamente el esquema de payload de Core Gateway para usuarios.
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


def create_internal_token(
    module_name: str = "core-gateway",
    scopes: Optional[List[str]] = None,
    expires_delta: Optional[timedelta] = None,
    token_type: str = "module_access",
    secret_key: Optional[str] = None
) -> str:
    """
    Genera un token JWT interno (X-Internal-Token) emitido por el Gateway
    para comunicación segura entre servicios internos.
    """
    key = secret_key or get_jwt_secret()
    exp_time = datetime.utcnow() + (expires_delta if expires_delta is not None else timedelta(hours=24))
    payload = {
        "sub": f"module::{module_name}",
        "scopes": scopes or ["gateway:forward"],
        "type": token_type,
        "exp": exp_time
    }
    return jwt.encode(payload, key, algorithm="HS256")


def auth_headers(user_id: int | str, token: Optional[str] = None) -> dict:
    """
    Construye las cabeceras canónicas de autenticación interna hacia los microservicios:
    - X-Internal-Token: token de servicio firmado por el gateway.
    - X-User-ID: identificador numérico del usuario autenticado.
    """
    t = token if token is not None else create_internal_token()
    return {
        "X-Internal-Token": t,
        "X-User-ID": str(user_id)
    }
