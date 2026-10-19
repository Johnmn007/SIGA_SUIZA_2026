"""Configuración del módulo de gestión académica / motor de matrícula.

Todos los valores se leen de variables de entorno con valores por defecto
seguros, de modo que el comportamiento actual (motor flexible) se mantiene
intacto si no se define nada.
"""
import os


def _int_env(nombre: str, default: int) -> int:
    try:
        return int(os.getenv(nombre, str(default)))
    except (TypeError, ValueError):
        return default


class EnrollmentSettings:
    """Parámetros del doble motor de matrícula (docs/14, sección 3)."""

    def __init__(self):
        # 'flexible' (por defecto, preserva la esencia actual) o 'strict'.
        self.engine_mode = os.getenv("ENROLLMENT_ENGINE", "flexible").strip().lower()

        # Reglas de créditos y reprobaciones.
        self.min_creditos = _int_env("ENROLLMENT_MIN_CREDITOS", 1)
        self.max_creditos = _int_env("ENROLLMENT_MAX_CREDITOS", 40)
        self.max_reprobadas = _int_env("ENROLLMENT_MAX_REPROBADAS", 3)
        self.max_intentos = _int_env("ENROLLMENT_MAX_INTENTOS", 3)

        # Comunicación entre módulos (malla y prerrequisitos).
        self.programas_url = os.getenv("PROGRAMAS_MODULE_URL", "http://mod-programas-estudio:8005")
        self.planes_url = os.getenv("PLANES_MODULE_URL", "http://mod-planes-estudio:8002")
        self.intermodule_timeout = float(os.getenv("INTERMODULE_TIMEOUT", "5"))

    @property
    def strict(self) -> bool:
        return self.engine_mode == "strict"

    def engine_for(self, override: str = None) -> str:
        """Resuelve el modo efectivo, aceptando un override por petición."""
        modo = (override or self.engine_mode or "flexible").strip().lower()
        return modo if modo in ("flexible", "strict") else "flexible"


enrollment_settings = EnrollmentSettings()
