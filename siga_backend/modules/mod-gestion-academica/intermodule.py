"""Cliente HTTP mínimo para consultar otros módulos (malla y prerrequisitos).

En despliegue se usa el nombre de servicio de Docker (p. ej.
``http://mod-programas-estudio:8005``); en desarrollo local se cae a
``localhost``. Si un módulo no responde, se degrada con gracia (None / {} y el
motor sigue funcionando sin esa información).
"""
import logging

import httpx

from config import enrollment_settings

logger = logging.getLogger(__name__)

_LOCALHOST = {
    "programas": "http://localhost:8005",
    "planes": "http://localhost:8002",
}


def _bases(kind: str):
    configured = enrollment_settings.programas_url if kind == "programas" else enrollment_settings.planes_url
    candidatos = [configured, _LOCALHOST[kind]]
    vistos, salida = set(), []
    for base in candidatos:
        if base and base not in vistos:
            vistos.add(base)
            salida.append(base.rstrip("/"))
    return salida


async def _get(kind: str, path: str):
    for base in _bases(kind):
        try:
            async with httpx.AsyncClient(timeout=enrollment_settings.intermodule_timeout) as client:
                response = await client.get(f"{base}{path}")
            if response.status_code == 200:
                return response.json()
            logger.warning("intermodule %s%s -> HTTP %s", base, path, response.status_code)
        except Exception as exc:  # noqa: BLE001 - degradación intencional
            logger.debug("intermodule %s%s no accesible: %s", base, path, exc)
    return None


async def fetch_malla(programa_id: int):
    """Malla curricular del programa (mod-programas-estudio)."""
    return await _get("programas", f"/programas/{programa_id}/malla")


async def fetch_programa(programa_id: int):
    """Datos del programa (incluye ``plan_estudio_id`` vigente)."""
    return await _get("programas", f"/programas/{programa_id}")


async def fetch_periodos():
    """Lista de periodos académicos (mod-programas-estudio)."""
    data = await _get("programas", "/periodos")
    return data if isinstance(data, list) else []


async def fetch_periodo(periodo_id: int):
    for periodo in await fetch_periodos():
        if periodo.get("id") == periodo_id:
            return periodo
    return None


async def fetch_prerequisitos(programa_id: int):
    """Mapa ``{unidad_id: [unidad_requerida_id, ...]}`` (mod-programas-estudio).

    Si el endpoint no está disponible se retorna ``{}`` y el motor continúa
    sin validación de prerrequisitos.
    """
    data = await _get("programas", f"/programas/{programa_id}/prerrequisitos")
    if isinstance(data, dict):
        mapa = {}
        for clave, valor in data.items():
            try:
                mapa[int(clave)] = [int(x) for x in (valor or [])]
            except (TypeError, ValueError):
                continue
        return mapa
    return {}


async def fetch_cargaLectiva(programa_id: int, periodo_id: int):
    """Carga lectiva (docente/horario/sección por UD) del programa y periodo."""
    data = await _get("programas", f"/programas/{programa_id}/carga-lectiva?periodo_id={periodo_id}")
    return data if isinstance(data, list) else []
