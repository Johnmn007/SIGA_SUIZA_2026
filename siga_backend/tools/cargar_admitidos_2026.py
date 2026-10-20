"""
Carga idempotente de los admitidos 2026 (438) desde admision_resultados.xlsx.

- Siembra el catalogo real de 11 programas de estudio (tabla vacia).
- Crea un Estudiante por cada admitido via API del Core (POST /api/mod-gestion-academica/estudiantes/).
- No duplica: si el DNI ya existe, lo omite y lo reporta.
- Descarta la fila de prueba (codigo 439 / "rfgdfg") y la fila vacia.

Uso:  python siga_backend/tools/cargar_admitidos_2026.py [--dry-run]
"""
import sys
import json
import math
import re
from pathlib import Path

import httpx
import pandas as pd

API = "http://localhost:8000"
EMAIL = "admin@siga.edu"
PASSWORD = "admin123"
EXCEL = Path(__file__).resolve().parents[2] / "admision_resultados.xlsx"
REPORTE = Path(__file__).resolve().parents[2] / "siga_backend" / "tools" / "reporte_carga_admitidos_2026.csv"

ANIO = 2026

# Catalogo real de carreras del IEST (nombre exacto del Excel de admision 2026).
# creditos_totales: 0 => PENDIENTE de validar contra el plan de estudios oficial.
PROGRAMAS = [
    ("ENFERMERÍA TÉCNICA", "ENF", 30, None),
    ("CONTABILIDAD", "CON", 29, None),
    ("MECATRÓNICA AUTOMOTRIZ", "MET", 0, "Creditos del plan de estudios PENDIENTE de validar"),
    ("GESTIÓN ADMINISTRATIVA", "GAS-ADM", 0, "Creditos del plan de estudios PENDIENTE de validar"),
    ("PRODUCCIÓN AGROPECUARIA", "PRO-AG", 0, "Creditos del plan de estudios PENDIENTE de validar"),
    ("CONSTRUCCIÓN CIVIL", "CON-CIV", 0, "Creditos del plan de estudios PENDIENTE de validar"),
    ("DESARROLLO DE SISTEMAS DE INFORMACIÓN", "DSI", 28, None),
    ("ELECTRICIDAD INDUSTRIAL", "ELT", 27, None),
    ("ADMINISTRACIÓN DE OPERACIONES TURÍSTICAS", "AOT", 0, "Creditos del plan de estudios PENDIENTE de validar"),
    ("MANEJO FORESTAL", "MAN-FOR", 0, "Creditos del plan de estudios PENDIENTE de validar"),
    ("ASISTENCIA ADMINISTRATIVA", "ASI-ADM", 0, "Creditos del plan de estudios PENDIENTE de validar"),
]

# Fila basura de prueba registrada en el Excel (codigo 439, nombres "rfgdfg dfgdf").
CODIGOS_EXCLUIDOS = {439}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
NULLOS = {"", "nan", "none", "null", "\\n", "n", "-", "s/n"}


def limpiar(valor):
    if valor is None:
        return None
    if isinstance(valor, float) and math.isnan(valor):
        return None
    if isinstance(valor, str):
        v = valor.strip()
        return None if v.lower() in NULLOS else v
    if hasattr(valor, "isoformat"):
        return valor.isoformat()
    if hasattr(valor, "item"):
        return valor.item()
    return valor


def texto(valor, default=""):
    v = limpiar(valor)
    return default if v is None else str(v).strip()


def digitos(valor):
    v = limpiar(valor)
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    s = re.sub(r"\D", "", str(v))
    return s or None


def login(client):
    r = client.post("/auth/login", params={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


def sembrar_programas(client, headers):
    existentes = {p["codigo"]: p["id"] for p in client.get("/api/mod-programas-estudio/programas", headers=headers).json()}
    mapa = {}
    for nombre, codigo, creditos, descripcion in PROGRAMAS:
        if codigo in existentes:
            mapa[nombre] = existentes[codigo]
            print(f"  = {nombre} (id {existentes[codigo]}) ya existia")
            continue
        payload = {
            "nombre": nombre,
            "codigo": codigo,
            "descripcion": descripcion,
            "duracion_periodos": 6,
            "creditos_totales": creditos,
            "modalidad": "presencial",
            "estado": "activo",
        }
        r = client.post("/api/mod-programas-estudio/programas", json=payload, headers=headers)
        r.raise_for_status()
        mapa[nombre] = r.json()["id"]
        print(f"  + {nombre} -> id {r.json()['id']}")
    return mapa


def leer_excel():
    df = pd.read_excel(EXCEL)
    df.columns = [str(c).strip() for c in df.columns]
    return df


def construir_payload(row, mapa_programas):
    codigo_admision = digitos(row["CODIGO"])
    programa = texto(row["PROGRAMA DE   ESTUDIOS"])
    tipo_doc = texto(row["TIPO DE DOCUMENTO"], "DNI").upper()
    documento = digitos(row["NRO DE DOCUMENTO"])
    alerta = None

    nombres = texto(row["NOMBRES"])
    paterno = texto(row["APELLIDO PATERNO"])
    materno = texto(row["APELLIDO MATERNO"])
    apellidos = " ".join(p for p in (paterno, materno) if p).title()

    if not codigo_admision or not documento or not nombres or not apellidos:
        return None, "campos requeridos incompletos"
    if programa not in mapa_programas:
        return None, f"programa no mapeado: {programa!r}"
    if not (5 <= len(documento) <= 12):
        return None, f"documento invalido: {documento}"

    # El Excel trae algunos documentos con menos de 8 digitos (error de digitacion).
    # Se conservan para no perder al estudiante, pero quedan marcados para verificacion.
    if tipo_doc == "DNI" and len(documento) != 8:
        alerta = f"DNI con {len(documento)} digitos segun el Excel de admision; verificar documentacion fisica antes de matricular"

    correo = texto(row["CORREO:"])
    if correo and not EMAIL_RE.match(correo):
        correo = None

    nacimiento = limpiar(row["FECHA NACIMIENTO:"])
    if isinstance(nacimiento, str):
        try:
            fecha = pd.to_datetime(nacimiento)
            nacimiento = None if pd.isna(fecha) else fecha.date().isoformat()
        except Exception:
            nacimiento = None
    elif isinstance(nacimiento, pd.Timestamp):
        nacimiento = None if pd.isna(nacimiento) else nacimiento.date().isoformat()

    metadata = {
        "codigo_admision": codigo_admision,
        "programa_admision": programa,
        "tipo_documento": tipo_doc,
        "edad": limpiar(row["EDAD:"]),
        "sexo": texto(row["SEXO:"]) or None,
        "nacionalidad": texto(row["NACIONALIDAD"]) or None,
        "departamento": texto(row["DEPARTAMENTO:"]) or None,
        "provincia": texto(row["PROVINCIA:"]) or None,
        "distrito": texto(row["DISTRITO:"]) or None,
        "lengua_materna": texto(row["LENGUA MATERNA:"]) or None,
        "discapacidad": texto(row["DISCAPACIDAD SI/NO:"]) or None,
        "tipo_discapacidad": texto(row["TIPO DE DISCAPACIDAD:"]) or None,
        "apoderado": {
            "nombre": texto(row["NOMBRE DEL APODERADO:"]) or None,
            "dni": digitos(row["DNI (APODERADO):"]),
            "celular": texto(row["CELULAR (APODERADO):"]) or None,
        },
        "institucion_educativa": {
            "nombre": texto(row["INSTITUCION EDUCATIVA:"]) or None,
            "codigo_modular": texto(row["CODIGO MODULAR:"]) or None,
            "departamento": texto(row["DEPARTAMENTO IE:"]) or None,
            "provincia": texto(row["PROVINCIA IE:"]) or None,
            "distrito": texto(row["DISTRITO IE:"]) or None,
            "tipo": texto(row["TIPO (Estatal o Particular):"]) or None,
            "modalidad": texto(row["MODALIDAD (EBR O EBA)"]) or None,
        },
        "anio_termino_secundaria": texto(row["Año que termino Secundaria:"]) or None,
        "fecha_inscripcion": limpiar(row["Fecha de inscripcion:"]),
        "nro_boleta": texto(row["N° Boleta:"]) or None,
        "costo": limpiar(row["S/. COSTO (S/. 250):"]),
        "observacion": texto(row["OBSERVACION:"]) or None,
        "documentos": {
            "copia_dni": texto(row["COPIA DE DNI"]) or None,
            "certificado_estudios": texto(row["CERT. DE ESTUDIOS"]) or None,
            "partida_nacimiento": texto(row["PART. NACIMIENTO"]) or None,
            "fotos": texto(row["FOTOS"]) or None,
            "doc_merged_url": texto(row["Link to merged Doc - INSCRIPCIONES 2026"]) or None,
            "merge_status": texto(row["Document Merge Status - INSCRIPCIONES 2026"]) or None,
        },
        "origen": "admision_resultados.xlsx / ADMISION_2026.xlsx!B_Datos",
    }
    if alerta:
        metadata["alerta"] = alerta

    payload = {
        "codigo_estudiante": f"{ANIO}-{int(codigo_admision):06d}",
        "dni": documento,
        "nombres": nombres.title(),
        "apellidos": apellidos,
        "programa_id": mapa_programas[programa],
        "modalidad_admision": "EXTRANJERIA" if tipo_doc != "DNI" else "ORDINARIO",
        "documentos_completos": False,
        "pago_matricula": False,
        "metadata_admision": metadata,
    }
    if nacimiento:
        payload["fecha_nacimiento"] = nacimiento
    if correo:
        payload["email_personal"] = correo
    celular = texto(row["CELULAR"])
    if celular:
        payload["celular"] = celular
    domicilio = texto(row["DOMICILIO:"])
    if domicilio:
        payload["direccion_domicilio"] = domicilio

    return payload, None


def main():
    dry_run = "--dry-run" in sys.argv

    with httpx.Client(base_url=API, timeout=60.0) as client:
        token = login(client)
        headers = {"Authorization": f"Bearer {token}"}

        print("== Catalogo de programas ==")
        mapa = sembrar_programas(client, headers)

        df = leer_excel()
        print(f"\n== Procesando {len(df)} filas del Excel ==")

        creados, omitidos, fallidos, descartados = 0, 0, [], []
        for idx, row in df.iterrows():
            codigo = digitos(row["CODIGO"])
            nombres = texto(row["NOMBRES"])
            if codigo is None and not nombres:
                descartados.append((idx, "(fila vacia)", "fila totalmente vacia"))
                continue
            if codigo and int(codigo) in CODIGOS_EXCLUIDOS:
                descartados.append((idx, codigo, f"fila de prueba: {nombres}"))
                continue

            payload, error = construir_payload(row, mapa)
            if payload is None:
                fallidos.append((idx, codigo, nombres, error))
                continue
            if dry_run:
                print(f"  [dry] {payload['codigo_estudiante']} {payload['apellidos']}, {payload['nombres']} | {payload['dni']} | prog {payload['programa_id']}")
                continue

            r = client.post("/api/mod-gestion-academica/estudiantes/", json=payload, headers=headers)
            if r.status_code == 201:
                creados += 1
                if creados % 50 == 0:
                    print(f"  ... {creados} creados")
            elif r.status_code == 400 and "ya existen" in r.text:
                omitidos += 1
            else:
                fallidos.append((idx, codigo, nombres, f"HTTP {r.status_code}: {r.text[:200]}"))

    print(f"\nDescartadas: {len(descartados)}")
    for d in descartados:
        print(f"  - fila {d[0]} (codigo {d[1]}): {d[2]}")
    if dry_run:
        print(f"\n[DRY-RUN] validos a cargar: {creados + omitidos + len(df) - len(descartados) - len(fallidos)}")
    else:
        print(f"\nCreados: {creados} | ya existian: {omitidos} | fallidos: {len(fallidos)}")

    if fallidos:
        print("\nFallidos:")
        for f in fallidos:
            print(f"  - fila {f[0]} codigo {f[1]} {f[2]}: {f[3]}")
        with REPORTE.open("w", encoding="utf-8-sig", newline="") as fh:
            fh.write("fila_excel;codigo_admision;nombres;error\n")
            for f in fallidos:
                fh.write(f"{f[0]};{f[1]};{f[2]};{f[3]}\n")
        print(f"\nReporte: {REPORTE}")

    return 1 if fallidos else 0


if __name__ == "__main__":
    sys.exit(main())
