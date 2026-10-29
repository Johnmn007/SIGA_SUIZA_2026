"""Endpoints de Tesorería y Caja: tarifario TUPA, recibos de caja y estado de cuenta.

La base de datos es la fuente de verdad:

* El tarifario TUPA (``tesoreria_conceptos``) se edita desde la ventanilla de caja.
* Cada cobro genera un recibo correlativo (``tesoreria_pagos``) y, si el concepto
  habilita la matrícula, actualiza ``estudiantes.pago_matricula`` en la misma transacción.
* El estado de cuenta (deuda / habilitado) se deriva siempre de ``pago_matricula``.
* El QR de cada recibo guarda los datos del pago (fijados al momento de cobrar) con su
  código de verificación HMAC: cualquier celular lo lee sin conexión al sistema.
  Los endpoints ``/tesoreria/publico/*`` permiten además verificarlo en línea.
"""
import base64
import hashlib
import hmac
import ipaddress
import json
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import OutboxEvent, engine, get_db
from models import ConceptoTupa, ConfiguracionCaja, Estudiante, PagoCaja

router = APIRouter(prefix="/tesoreria")

ANIO = 2026
ZONA_PERU = timezone(timedelta(hours=-5))  # Perú no usa horario de verano

METODOS_PAGO = {
    "efectivo": "Efectivo en Ventanilla",
    "banco_nacion": "Banco de la Nación (BN)",
    "yape_plin": "Billetera Digital (Yape / Plin)",
    "tarjeta_pos": "Tarjeta POS (Débito/Crédito)",
}

CONFIG_CAJA_DEFECTO = {
    "yapeNumero": "961-824-192",
    "yapeTitular": "IESTP Suiza",
    "yapeQrImagen": "",
    "bnCuenta": "00-521-029481",
    "urlPublica": "",
}

CONCEPTOS_DEFECTO = [
    ("MAT-01", "Derecho de Matrícula Regular 2026-I", "Matrícula", 120.00, True, "Inscripción y ratificación del periodo académico regular 2026-I."),
    ("MAT-02", "Matrícula Extemporánea 2026-I", "Matrícula", 150.00, True, "Inscripción académica fuera del cronograma ordinario oficial."),
    ("CAR-01", "Carnet Estudiantil / Fotocheck Institucional", "Identificación", 15.00, False, "Expedición y laminado de carnet de estudiante con código QR y chip de acceso."),
    ("CAR-02", "Duplicado de Carnet Estudiantil", "Identificación", 20.00, False, "Emisión por pérdida, deterioro o robo de carnet estudiantil."),
    ("CON-01", "Constancia de Matrícula y Estudios", "Certificaciones", 20.00, False, "Acreditación formal del ciclo, semestre y programa de estudio matriculado."),
    ("CON-02", "Constancia de No Adeudo Institucional", "Certificaciones", 15.00, False, "Certificación de libre deuda con biblioteca, talleres y tesorería."),
    ("CER-01", "Certificado Modular Oficial (DOC-10/15)", "Certificaciones", 50.00, False, "Emisión de diploma de Certificación Modular con valor oficial MINEDU."),
    ("EXA-01", "Examen Extraordinario / Recuperación", "Evaluación", 30.00, False, "Derecho a evaluación extraordinaria por unidad didáctica no aprobada."),
    ("TIT-01", "Derecho de Titulación Profesional Técnico", "Grados y Títulos", 250.00, False, "Revisión de expediente, asesoría de proyecto y expedición de Título a Nombre de la Nación."),
    ("TRM-01", "Convalidación y Reconocimiento de Asignaturas", "Trámites", 80.00, False, "Evaluación técnica de syllabus y tabla de equivalencias por traslado o reingreso."),
]


# ---------------------------------------------------------------------------
# Esquemas de entrada
# ---------------------------------------------------------------------------

class TarifaIn(BaseModel):
    id: Optional[str] = None
    nombre: str
    monto: float


class ConceptoIn(BaseModel):
    codigo: str
    nombre: str
    categoria: Optional[str] = "Otros"
    descripcion: Optional[str] = ""
    tipoPrecio: str = "fijo"
    tarifas: List[TarifaIn]
    montoMinimo: Optional[float] = 0
    liberaMatricula: bool = False
    permiteRepetir: bool = False


class PagoIn(BaseModel):
    estudianteId: int
    conceptoId: int
    tarifaId: Optional[str] = None
    monto: Optional[float] = None          # Solo para conceptos de monto libre
    metodoPagoId: str
    numeroOperacion: Optional[str] = ""
    cajero: Optional[str] = None
    carreraNombre: Optional[str] = None
    observaciones: Optional[str] = ""


class ImportacionIn(BaseModel):
    conceptos: List[dict] = []
    pagos: List[dict] = []
    config: Optional[dict] = None


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def ahora_peru() -> datetime:
    """Fecha y hora local de Perú (sin zona) para los recibos."""
    return datetime.now(ZONA_PERU).replace(tzinfo=None)


def a_float(valor) -> float:
    return float(valor) if isinstance(valor, Decimal) else float(valor or 0)


def formato_fecha_hora(fecha: Optional[datetime]) -> str:
    return fecha.strftime("%d/%m/%Y, %H:%M:%S") if fecha else ""


def parse_fecha_recibo(texto: str, timestamp_ms=None) -> datetime:
    """Interpreta 'dd/mm/aaaa, hh:mm[:ss]' (y el formato antiguo mm/dd/aaaa h:mm AM/PM)."""
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?)?", texto or "")
    if m:
        dia, mes, anio = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if mes > 12 and dia <= 12:
            dia, mes = mes, dia
        hora, minuto, segundo = int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0)
        if m.group(7):
            pm = "p" in m.group(7).lower()
            if pm and hora < 12:
                hora += 12
            if not pm and hora == 12:
                hora = 0
        try:
            return datetime(anio, mes, dia, hora, minuto, segundo)
        except ValueError:
            pass
    if timestamp_ms:
        return datetime.fromtimestamp(timestamp_ms / 1000, ZONA_PERU).replace(tzinfo=None)
    return ahora_peru()


async def obtener_config(db: AsyncSession, clave: str) -> Optional[ConfiguracionCaja]:
    result = await db.execute(select(ConfiguracionCaja).where(ConfiguracionCaja.clave == clave))
    return result.scalar_one_or_none()


_secreto_cache: Optional[bytes] = None


async def secreto_qr(db: AsyncSession) -> bytes:
    """Clave HMAC para firmar los QR (se genera una sola vez y se guarda en la BD)."""
    global _secreto_cache
    if _secreto_cache:
        return _secreto_cache
    fila = await obtener_config(db, "qr_secreto")
    if not fila:
        fila = ConfiguracionCaja(clave="qr_secreto", valor={"clave": secrets.token_hex(32)})
        db.add(fila)
        await db.commit()
    _secreto_cache = fila.valor["clave"].encode()
    return _secreto_cache


def firmar(secreto: bytes, *partes: str) -> str:
    """Token de verificación de 12 caracteres (HMAC-SHA256)."""
    mensaje = "|".join(str(p) for p in partes).encode()
    return hmac.new(secreto, mensaje, hashlib.sha256).hexdigest()[:12].upper()


def token_valido(esperado: str, recibido: str) -> bool:
    limpio = re.sub(r"[^0-9A-Fa-f]", "", recibido or "").upper()
    return hmac.compare_digest(esperado, limpio)


def formato_token(token: str) -> str:
    return "-".join(token[i:i + 4] for i in range(0, len(token), 4))


async def asegurar_esquema_tesoreria():
    """Columnas agregadas después de crear las tablas (create_all no altera tablas existentes)."""
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE IF EXISTS tesoreria_pagos ADD COLUMN IF NOT EXISTS qr_contenido TEXT"))


# ---------------------------------------------------------------------------
# Contenido de los QR: los datos del pago viajan dentro del propio código
# ---------------------------------------------------------------------------

def texto_ascii(texto: str) -> str:
    """Sin tildes ni símbolos especiales: legible por cualquier lector QR."""
    plano = unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode()
    return re.sub(r"[^\x20-\x7E\n]", "", plano)


def es_url_publica(url: str) -> bool:
    """Dirección que un celular puede abrir: dominio en internet o IP de la red del instituto (no localhost)."""
    if not url or urlparse(url).scheme not in ("http", "https"):
        return False
    host = urlparse(url).hostname or ""
    if host in ("localhost", "0.0.0.0") or host.endswith(".localhost"):
        return False
    try:
        ip = ipaddress.ip_address(host)
        return not (ip.is_loopback or ip.is_link_local or ip.is_unspecified)
    except ValueError:
        return "." in host


async def url_publica_qr(db: AsyncSession) -> Optional[str]:
    fila = await obtener_config(db, "caja")
    url = ((fila.valor or {}).get("urlPublica") if fila else "") or ""
    url = url.strip().rstrip("/")
    return url if es_url_publica(url) else None


def b64url(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).decode().rstrip("=")


def qr_boleta(m: dict, secreto: bytes) -> dict:
    """Todo el contenido de la boleta viaja dentro del enlace del QR (no se guarda en la base de datos).
    La página pública arma la boleta con estos datos y la firma HMAC prueba que no fueron alterados."""
    operacion = m.get("numeroOperacion") or ""
    tarifa = m.get("tarifaNombre") or ""
    campos = {
        "r": m["codigoRecibo"], "f": m.get("fechaHora") or "", "a": m["estudianteNombre"], "d": m["dni"],
        "c": m.get("codigoEstudiante") or "", "p": m.get("carreraNombre") or "",
        "k": m.get("conceptoCodigo") or "", "n": m.get("conceptoNombre") or "", "g": m.get("conceptoCategoria") or "",
        "t": tarifa if tarifa not in ("", "General") else "", "m": f"{a_float(m['monto']):.2f}",
        "mp": m.get("metodoPagoNombre") or "", "o": operacion if operacion != "-" else "",
        "j": m.get("cajero") or "Caja Central", "b": m.get("observaciones") or "",
        "l": 1 if m.get("liberaMatricula") else 0,
    }
    compacto = {k: v for k, v in campos.items() if v not in ("", 0)}
    datos = b64url(json.dumps(compacto, ensure_ascii=False, separators=(",", ":")).encode())
    return {"datos": datos, "firma": firmar(secreto, "BOLETA", datos)}


def texto_qr_estado_cuenta(estado: dict, emitido: str, url_publica: Optional[str] = None) -> str:
    est = estado["estudiante"]
    pagados = [m for m in estado["movimientos"] if m["estado"] == "PAGADO"]
    lineas = [
        f"IESTP SUIZA - ESTADO DE CUENTA {ANIO}",
        f"ALUMNO: {est['nombres']} {est['apellidos']}",
        f"DNI: {est['dni']}",
        f"CODIGO: {est['codigo_estudiante']}",
        f"CONDICION: {'HABILITADO' if estado['habilitado'] else 'CON DEUDA DE MATRICULA'}",
        f"TOTAL PAGADO: S/ {estado['totalPagado']:.2f}",
        f"SALDO PENDIENTE: S/ {estado['totalPendiente']:.2f}",
        "RECIBOS:",
    ]
    lineas += [f" {m['codigoRecibo']} S/ {a_float(m['monto']):.2f}" for m in pagados[:8]]
    if len(pagados) > 8:
        lineas.append(f" ... y {len(pagados) - 8} recibo(s) mas")
    lineas += [f"EMITIDO: {emitido}", f"VERIFICACION: {formato_token(estado['token'])}"]
    if url_publica:
        lineas.append(f"VER EN LINEA: {url_publica}/?{urlencode({'estado-cuenta': est['dni'], 't': estado['token']})}")
    return texto_ascii("\n".join(lineas))


def concepto_dict(c: ConceptoTupa) -> dict:
    tarifas = [{"id": t.get("id") or f"T{i + 1}", "nombre": t.get("nombre") or "General", "monto": float(t.get("monto") or 0)}
               for i, t in enumerate(c.tarifas or [])] or [{"id": "T1", "nombre": "General", "monto": 0.0}]
    return {
        "id": c.id,
        "codigo": c.codigo,
        "nombre": c.nombre,
        "categoria": c.categoria or "Otros",
        "descripcion": c.descripcion or "",
        "tipoPrecio": c.tipo_precio or "fijo",
        "tarifas": tarifas,
        "montoMinimo": a_float(c.monto_minimo),
        "monto": tarifas[0]["monto"],
        "liberaMatricula": bool(c.libera_matricula),
        "permiteRepetir": bool(c.permite_repetir),
    }


def pago_dict(p: PagoCaja, secreto: bytes, url_publica: Optional[str] = None) -> dict:
    datos = {
        "id": p.id,
        "codigoRecibo": p.codigo_recibo,
        "estudianteId": p.estudiante_id,
        "estudianteNombre": p.estudiante_nombre,
        "dni": p.dni,
        "codigoEstudiante": p.codigo_estudiante,
        "carreraNombre": p.carrera_nombre,
        "conceptoId": p.concepto_id,
        "conceptoCodigo": p.concepto_codigo,
        "conceptoNombre": p.concepto_nombre,
        "conceptoCategoria": p.concepto_categoria,
        "tipoPrecio": p.tipo_precio,
        "tarifaNombre": p.tarifa_nombre,
        "monto": a_float(p.monto),
        "metodoPagoId": p.metodo_pago_id,
        "metodoPagoNombre": p.metodo_pago_nombre,
        "numeroOperacion": p.numero_operacion or "",
        "cajero": p.cajero,
        "observaciones": p.observaciones or "",
        "liberaMatricula": bool(p.libera_matricula),
        "estado": p.estado,
        "fechaHora": formato_fecha_hora(p.fecha_pago),
        "timestamp": int(p.fecha_pago.replace(tzinfo=ZONA_PERU).timestamp() * 1000) if p.fecha_pago else None,
        "origen": "caja",
        "token": firmar(secreto, p.codigo_recibo, p.dni),
    }
    # El QR se arma al mostrar la boleta: el enlace lleva todos sus datos firmados (no se guarda en la base de datos)
    datos["qrBoleta"] = qr_boleta(datos, secreto)
    datos["qrBase"] = url_publica or ""
    return datos


def normalizar_tarifas(data: ConceptoIn) -> list:
    tarifas = [{"id": t.id or f"T{i + 1}", "nombre": (t.nombre or "").strip() or ("General" if i == 0 else f"Tarifa {i + 1}"),
                "monto": round(float(t.monto), 2)} for i, t in enumerate(data.tarifas)]
    if not tarifas:
        raise HTTPException(400, detail="El concepto necesita al menos un precio.")
    if any(t["monto"] < 0 for t in tarifas):
        raise HTTPException(400, detail="Los precios no pueden ser negativos.")
    if data.tipoPrecio not in ("fijo", "tarifas", "libre"):
        raise HTTPException(400, detail="Tipo de precio inválido.")
    if data.tipoPrecio == "tarifas" and len(tarifas) < 2:
        raise HTTPException(400, detail="Un concepto con varias tarifas necesita al menos dos.")
    if data.tipoPrecio == "fijo" and tarifas[0]["monto"] <= 0:
        raise HTTPException(400, detail="El precio fijo debe ser mayor a S/ 0.00.")
    return tarifas if data.tipoPrecio == "tarifas" else tarifas[:1]


async def conceptos_activos(db: AsyncSession) -> List[ConceptoTupa]:
    total = (await db.execute(select(func.count(ConceptoTupa.id)))).scalar()
    if not total:
        for codigo, nombre, categoria, monto, libera, descripcion in CONCEPTOS_DEFECTO:
            db.add(ConceptoTupa(codigo=codigo, nombre=nombre, categoria=categoria, descripcion=descripcion,
                                tipo_precio="fijo", tarifas=[{"id": "T1", "nombre": "General", "monto": monto}],
                                monto_minimo=0, libera_matricula=libera, permite_repetir=False, activo=True))
        await db.commit()
    result = await db.execute(select(ConceptoTupa).where(ConceptoTupa.activo.is_(True)).order_by(ConceptoTupa.id))
    return result.scalars().all()


def concepto_matricula(conceptos: List[ConceptoTupa]) -> Optional[ConceptoTupa]:
    """Concepto con el que se cobra la matrícula pendiente (MAT-01 si habilita la matrícula)."""
    habilitantes = [c for c in conceptos if c.libera_matricula]
    return next((c for c in habilitantes if c.codigo == "MAT-01"), None) or (habilitantes[0] if habilitantes else None)


async def siguiente_codigo_recibo(db: AsyncSession) -> str:
    # Bloqueo transaccional: dos cajas no pueden obtener el mismo correlativo
    await db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": 2026_0001})
    prefijo = f"REC-{ANIO}-"
    result = await db.execute(select(PagoCaja.codigo_recibo).where(PagoCaja.codigo_recibo.like(f"{prefijo}%")))
    numeros = [int(c[len(prefijo):]) for c in result.scalars().all() if c[len(prefijo):].isdigit()]
    return f"{prefijo}{(max(numeros) if numeros else 0) + 1:05d}"


async def construir_estado_cuenta(db: AsyncSession, est: Estudiante, secreto: bytes) -> dict:
    """Movimientos del año: admisión, recibos de caja y la matrícula (pagada o pendiente)."""
    conceptos = await conceptos_activos(db)
    mat = concepto_matricula(conceptos)
    url_publica = await url_publica_qr(db)
    nombre = f"{est.nombres} {est.apellidos}"
    meta = est.metadata_admision or {}
    movimientos = []

    # 1. Derecho de admisión (registrado por la Comisión de Admisión)
    fecha_adm = "04/04/2026"
    try:
        if meta.get("Fecha de inscripcion:"):
            fecha_adm = datetime.fromisoformat(str(meta["Fecha de inscripcion:"])).strftime("%d/%m/%Y")
    except ValueError:
        pass
    codigo_meta = str(meta.get("CODIGO") or "").strip()
    codigo_adm = f"ADM-{ANIO}-{int(codigo_meta) if codigo_meta.isdigit() else est.id * 7 % 900 + 100:05d}"
    modalidad = est.modalidad_admision or meta.get("MODALIDAD (EBR O EBA)") or "ORDINARIO"
    movimientos.append({
        "id": f"adm-{est.id}", "codigoRecibo": codigo_adm, "fechaHora": f"{fecha_adm}, 08:30:00",
        "estudianteId": est.id, "estudianteNombre": nombre, "dni": est.dni, "codigoEstudiante": est.codigo_estudiante,
        "conceptoCodigo": "ADM-01", "conceptoNombre": f"Derecho de Inscripción y Carpeta de Admisión {ANIO} ({modalidad})",
        "conceptoCategoria": "Admisión Institucional", "monto": float(meta.get("S/. COSTO (S/. 250):") or 250),
        "metodoPagoId": "banco_nacion", "metodoPagoNombre": "Banco de la Nación (Cta. Admisión)",
        "numeroOperacion": f"BN-{str(est.dni)[:6]}", "estado": "PAGADO", "cajero": f"Comisión Central de Admisión {ANIO}",
        "liberaMatricula": False, "origen": "admision", "token": firmar(secreto, codigo_adm, est.dni),
    })

    # 2. Recibos emitidos en caja
    result = await db.execute(select(PagoCaja).where(PagoCaja.estudiante_id == est.id, PagoCaja.estado == "PAGADO")
                              .order_by(PagoCaja.fecha_pago))
    pagos = result.scalars().all()
    movimientos.extend(pago_dict(p, secreto, url_publica) for p in pagos)

    # 3. Matrícula: la condición financiera la define estudiantes.pago_matricula
    if est.pago_matricula and not any(p.libera_matricula for p in pagos):
        codigo_acr = f"ACR-{ANIO}-{est.id:05d}"
        movimientos.append({
            "id": f"acr-{est.id}", "codigoRecibo": codigo_acr, "fechaHora": "Acreditado",
            "estudianteId": est.id, "estudianteNombre": nombre, "dni": est.dni, "codigoEstudiante": est.codigo_estudiante,
            "conceptoId": mat.id if mat else None, "conceptoCodigo": mat.codigo if mat else "MAT-01",
            "conceptoNombre": mat.nombre if mat else "Derecho de Matrícula",
            "conceptoCategoria": mat.categoria if mat else "Matrícula",
            "monto": concepto_dict(mat)["monto"] if mat else 0.0,
            "metodoPagoId": "acreditado", "metodoPagoNombre": "Acreditado en el sistema académico",
            "numeroOperacion": "-", "estado": "PAGADO", "cajero": "Registro académico",
            "liberaMatricula": True, "origen": "acreditado", "token": firmar(secreto, codigo_acr, est.dni),
        })
    elif not est.pago_matricula:
        movimientos.append({
            "id": f"pending-mat-{est.id}", "codigoRecibo": "PENDIENTE", "fechaHora": "Vence: 30/10/2026",
            "estudianteId": est.id, "estudianteNombre": nombre, "dni": est.dni, "codigoEstudiante": est.codigo_estudiante,
            "conceptoId": mat.id if mat else None, "conceptoCodigo": mat.codigo if mat else "MAT",
            "conceptoNombre": mat.nombre if mat else "Derecho de Matrícula (no hay concepto que habilite la matrícula en el tarifario)",
            "conceptoCategoria": mat.categoria if mat else "Matrícula",
            "monto": concepto_dict(mat)["monto"] if mat else 0.0,
            "metodoPagoId": "pendiente", "metodoPagoNombre": "Pendiente en Caja", "numeroOperacion": "-",
            "estado": "PENDIENTE", "cajero": "-", "liberaMatricula": True, "origen": "pendiente",
            "sinConceptoMatricula": mat is None,
        })

    # QR de los comprobantes de admisión y acreditación (no se emiten en caja)
    for m in movimientos:
        if m["estado"] == "PAGADO" and "qrBoleta" not in m:
            m["qrBoleta"] = qr_boleta(m, secreto)
            m["qrBase"] = url_publica or ""

    total_pagado = sum(m["monto"] for m in movimientos if m["estado"] == "PAGADO")
    total_pendiente = sum(m["monto"] for m in movimientos if m["estado"] == "PENDIENTE")
    estado = {
        "estudiante": {
            "id": est.id, "dni": est.dni, "nombres": est.nombres, "apellidos": est.apellidos,
            "codigo_estudiante": est.codigo_estudiante, "programa_id": est.programa_id,
            "modalidad_admision": est.modalidad_admision, "pago_matricula": bool(est.pago_matricula),
        },
        "movimientos": movimientos,
        "totalPagado": round(total_pagado, 2),
        "totalPendiente": round(total_pendiente, 2),
        "habilitado": bool(est.pago_matricula),
        "token": firmar(secreto, "EC", est.dni),
        "emitido": formato_fecha_hora(ahora_peru()),
    }
    estado["qrContenido"] = texto_qr_estado_cuenta(estado, estado["emitido"], url_publica)
    return estado


def publicar_evento(db: AsyncSession, event_type: str, data: dict, request: Optional[Request] = None):
    db.add(OutboxEvent(event_type=event_type, payload={
        "event_type": event_type,
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": data,
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown") if request else "import"},
    }))


async def estudiante_o_404(db: AsyncSession, estudiante_id: int) -> Estudiante:
    est = (await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))).scalar_one_or_none()
    if not est:
        raise HTTPException(404, detail="Estudiante no encontrado")
    return est


# ---------------------------------------------------------------------------
# Tarifario TUPA
# ---------------------------------------------------------------------------

@router.get("/conceptos")
async def listar_conceptos(db: AsyncSession = Depends(get_db)):
    return [concepto_dict(c) for c in await conceptos_activos(db)]


async def _codigo_disponible(db: AsyncSession, codigo: str, excluir_id: Optional[int] = None):
    stmt = select(ConceptoTupa).where(func.upper(ConceptoTupa.codigo) == codigo.upper(), ConceptoTupa.activo.is_(True))
    if excluir_id:
        stmt = stmt.where(ConceptoTupa.id != excluir_id)
    if (await db.execute(stmt)).scalars().first():
        raise HTTPException(409, detail=f"Ya existe un concepto con el código {codigo}.")


@router.post("/conceptos", status_code=201)
async def crear_concepto(data: ConceptoIn, db: AsyncSession = Depends(get_db)):
    codigo = data.codigo.strip().upper()
    if not codigo or not data.nombre.strip():
        raise HTTPException(400, detail="El código y el nombre son obligatorios.")
    await _codigo_disponible(db, codigo)
    concepto = ConceptoTupa(
        codigo=codigo, nombre=data.nombre.strip(), categoria=data.categoria or "Otros",
        descripcion=(data.descripcion or "").strip(), tipo_precio=data.tipoPrecio, tarifas=normalizar_tarifas(data),
        monto_minimo=max(0, data.montoMinimo or 0), libera_matricula=data.liberaMatricula,
        permite_repetir=data.permiteRepetir, activo=True,
    )
    db.add(concepto)
    await db.commit()
    await db.refresh(concepto)
    return concepto_dict(concepto)


@router.put("/conceptos/{concepto_id}")
async def actualizar_concepto(concepto_id: int, data: ConceptoIn, db: AsyncSession = Depends(get_db)):
    concepto = (await db.execute(select(ConceptoTupa).where(ConceptoTupa.id == concepto_id, ConceptoTupa.activo.is_(True)))).scalar_one_or_none()
    if not concepto:
        raise HTTPException(404, detail="Concepto no encontrado")
    codigo = data.codigo.strip().upper()
    await _codigo_disponible(db, codigo, excluir_id=concepto_id)
    concepto.codigo = codigo
    concepto.nombre = data.nombre.strip()
    concepto.categoria = data.categoria or "Otros"
    concepto.descripcion = (data.descripcion or "").strip()
    concepto.tipo_precio = data.tipoPrecio
    concepto.tarifas = normalizar_tarifas(data)
    concepto.monto_minimo = max(0, data.montoMinimo or 0)
    concepto.libera_matricula = data.liberaMatricula
    concepto.permite_repetir = data.permiteRepetir
    await db.commit()
    await db.refresh(concepto)
    return concepto_dict(concepto)


@router.delete("/conceptos/{concepto_id}")
async def eliminar_concepto(concepto_id: int, db: AsyncSession = Depends(get_db)):
    concepto = (await db.execute(select(ConceptoTupa).where(ConceptoTupa.id == concepto_id))).scalar_one_or_none()
    if not concepto:
        raise HTTPException(404, detail="Concepto no encontrado")
    concepto.activo = False  # Baja lógica: los recibos ya emitidos lo siguen referenciando
    await db.commit()
    return {"message": "Concepto eliminado del tarifario"}


@router.post("/conceptos/restaurar")
async def restaurar_conceptos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ConceptoTupa).where(ConceptoTupa.activo.is_(True)))
    for c in result.scalars().all():
        c.activo = False
    for codigo, nombre, categoria, monto, libera, descripcion in CONCEPTOS_DEFECTO:
        db.add(ConceptoTupa(codigo=codigo, nombre=nombre, categoria=categoria, descripcion=descripcion,
                            tipo_precio="fijo", tarifas=[{"id": "T1", "nombre": "General", "monto": monto}],
                            monto_minimo=0, libera_matricula=libera, permite_repetir=False, activo=True))
    await db.commit()
    return [concepto_dict(c) for c in await conceptos_activos(db)]


# ---------------------------------------------------------------------------
# Configuración de cobro (Yape / Plin, Banco de la Nación, URL pública de los QR)
# ---------------------------------------------------------------------------

@router.get("/config")
async def leer_config(db: AsyncSession = Depends(get_db)):
    fila = await obtener_config(db, "caja")
    return {**CONFIG_CAJA_DEFECTO, **(fila.valor if fila else {})}


@router.put("/config")
async def guardar_config(data: dict, db: AsyncSession = Depends(get_db)):
    valor = {k: data.get(k, v) for k, v in CONFIG_CAJA_DEFECTO.items()}
    valor["urlPublica"] = (valor.get("urlPublica") or "").strip().rstrip("/")
    if len(valor.get("yapeQrImagen") or "") > 1_500_000:
        raise HTTPException(400, detail="La imagen del QR es demasiado grande (máx. 1 MB).")
    fila = await obtener_config(db, "caja")
    if fila:
        fila.valor = valor
    else:
        db.add(ConfiguracionCaja(clave="caja", valor=valor))
    await db.commit()
    return valor


# ---------------------------------------------------------------------------
# Recibos de caja
# ---------------------------------------------------------------------------

@router.get("/pagos")
async def listar_pagos(estudiante_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    secreto = await secreto_qr(db)
    stmt = select(PagoCaja).where(PagoCaja.estado == "PAGADO").order_by(PagoCaja.fecha_pago.desc(), PagoCaja.id.desc())
    if estudiante_id is not None:
        stmt = stmt.where(PagoCaja.estudiante_id == estudiante_id)
    url_publica = await url_publica_qr(db)
    result = await db.execute(stmt)
    return [pago_dict(p, secreto, url_publica) for p in result.scalars().all()]


@router.post("/pagos", status_code=201)
async def registrar_pago(data: PagoIn, request: Request, db: AsyncSession = Depends(get_db)):
    secreto = await secreto_qr(db)
    est = await estudiante_o_404(db, data.estudianteId)
    concepto = (await db.execute(select(ConceptoTupa).where(ConceptoTupa.id == data.conceptoId, ConceptoTupa.activo.is_(True)))).scalar_one_or_none()
    if not concepto:
        raise HTTPException(404, detail="El concepto ya no existe en el tarifario TUPA.")

    if data.metodoPagoId not in METODOS_PAGO:
        raise HTTPException(400, detail="Método de pago inválido.")
    numero_operacion = (data.numeroOperacion or "").strip()
    if data.metodoPagoId != "efectivo" and not numero_operacion:
        raise HTTPException(400, detail="Ingresa el N° de operación o referencia del pago.")

    # Reglas de cobro (validadas también aquí, no solo en la pantalla)
    if concepto.libera_matricula and est.pago_matricula:
        raise HTTPException(409, detail="El alumno ya tiene la matrícula pagada; no tiene deuda de matrícula.")
    if not concepto.libera_matricula and not concepto.permite_repetir:
        ya_pagado = (await db.execute(select(PagoCaja.id).where(
            PagoCaja.estudiante_id == est.id, PagoCaja.estado == "PAGADO",
            func.upper(PagoCaja.concepto_codigo) == concepto.codigo.upper()))).first()
        if ya_pagado:
            raise HTTPException(409, detail=f"El alumno ya pagó {concepto.codigo}. Marca el concepto como repetible si se cobra más de una vez.")

    info = concepto_dict(concepto)
    if concepto.tipo_precio == "libre":
        monto = round(float(data.monto or 0), 2)
        if monto <= 0 or monto < info["montoMinimo"]:
            raise HTTPException(400, detail=f"Monto inválido (mínimo S/ {info['montoMinimo']:.2f}).")
        tarifa_nombre = "Monto libre"
    else:
        tarifa = next((t for t in info["tarifas"] if t["id"] == data.tarifaId), None) if concepto.tipo_precio == "tarifas" else None
        tarifa = tarifa or info["tarifas"][0]
        monto, tarifa_nombre = tarifa["monto"], tarifa["nombre"]

    pago = PagoCaja(
        codigo_recibo=await siguiente_codigo_recibo(db),
        estudiante_id=est.id, dni=est.dni, estudiante_nombre=f"{est.nombres} {est.apellidos}",
        codigo_estudiante=est.codigo_estudiante, carrera_nombre=data.carreraNombre,
        concepto_id=concepto.id, concepto_codigo=concepto.codigo, concepto_nombre=concepto.nombre,
        concepto_categoria=concepto.categoria, tipo_precio=concepto.tipo_precio, tarifa_nombre=tarifa_nombre,
        monto=monto, metodo_pago_id=data.metodoPagoId, metodo_pago_nombre=METODOS_PAGO[data.metodoPagoId],
        numero_operacion=numero_operacion or ("PAGO EN VENTANILLA" if data.metodoPagoId == "efectivo" else ""),
        cajero=(data.cajero or request.headers.get("X-User-Email") or "Caja Central")[:150],
        registrado_por=request.headers.get("X-User-Email"), observaciones=(data.observaciones or "").strip(),
        libera_matricula=bool(concepto.libera_matricula), estado="PAGADO", fecha_pago=ahora_peru(),
    )
    db.add(pago)
    if concepto.libera_matricula:
        est.pago_matricula = True  # Libera el bloqueo de matrícula en la misma transacción
    publicar_evento(db, "tesoreria.pago.registrado", {
        "codigo_recibo": pago.codigo_recibo, "estudiante_id": est.id, "dni": est.dni,
        "concepto": concepto.codigo, "monto": monto, "libera_matricula": bool(concepto.libera_matricula),
    }, request)
    await db.commit()
    await db.refresh(pago)
    return {"pago": pago_dict(pago, secreto, await url_publica_qr(db)), "pagoMatricula": bool(est.pago_matricula)}


@router.get("/estudiantes/{estudiante_id}/estado-cuenta")
async def estado_cuenta(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    secreto = await secreto_qr(db)
    est = await estudiante_o_404(db, estudiante_id)
    return await construir_estado_cuenta(db, est, secreto)


@router.post("/importar")
async def importar_datos_locales(data: ImportacionIn, request: Request, db: AsyncSession = Depends(get_db)):
    """Migra (una sola vez por navegador) los datos que la caja guardaba en localStorage."""
    await conceptos_activos(db)
    resumen = {"conceptos": 0, "pagos": 0, "omitidos": 0}

    for c in data.conceptos:
        codigo = str(c.get("codigo") or "").strip().upper()
        if not codigo or not c.get("nombre"):
            continue
        existe = (await db.execute(select(ConceptoTupa.id).where(func.upper(ConceptoTupa.codigo) == codigo,
                                                                 ConceptoTupa.activo.is_(True)))).first()
        if existe:
            continue
        tarifas = c.get("tarifas") or [{"id": "T1", "nombre": "General", "monto": c.get("monto") or 0}]
        db.add(ConceptoTupa(codigo=codigo, nombre=str(c["nombre"])[:255], categoria=c.get("categoria") or "Otros",
                            descripcion=c.get("descripcion") or "", tipo_precio=c.get("tipoPrecio") or "fijo",
                            tarifas=[{"id": t.get("id") or f"T{i + 1}", "nombre": t.get("nombre") or "General",
                                      "monto": float(t.get("monto") or 0)} for i, t in enumerate(tarifas)],
                            monto_minimo=float(c.get("montoMinimo") or 0), libera_matricula=bool(c.get("liberaMatricula")),
                            permite_repetir=bool(c.get("permiteRepetir")), activo=True))
        resumen["conceptos"] += 1

    for p in data.pagos:
        codigo = str(p.get("codigoRecibo") or "").strip()
        if not codigo or (await db.execute(select(PagoCaja.id).where(PagoCaja.codigo_recibo == codigo))).first():
            resumen["omitidos"] += 1
            continue
        est = None
        if str(p.get("estudianteId") or "").isdigit():
            est = (await db.execute(select(Estudiante).where(Estudiante.id == int(p["estudianteId"])))).scalar_one_or_none()
        if (not est or str(est.dni) != str(p.get("dni"))) and p.get("dni"):
            est = (await db.execute(select(Estudiante).where(Estudiante.dni == str(p["dni"])))).scalar_one_or_none()
        if not est:
            resumen["omitidos"] += 1
            continue
        metodo = p.get("metodoPagoId") if p.get("metodoPagoId") in METODOS_PAGO else "efectivo"
        importado = PagoCaja(
            codigo_recibo=codigo, estudiante_id=est.id, dni=est.dni, estudiante_nombre=f"{est.nombres} {est.apellidos}",
            codigo_estudiante=est.codigo_estudiante, carrera_nombre=p.get("carreraNombre"),
            concepto_codigo=str(p.get("conceptoCodigo") or "OTRO")[:30], concepto_nombre=str(p.get("conceptoNombre") or "Concepto")[:255],
            concepto_categoria=p.get("conceptoCategoria"), tipo_precio=p.get("tipoPrecio") or "fijo",
            tarifa_nombre=p.get("tarifaNombre") or "General", monto=round(float(p.get("monto") or 0), 2),
            metodo_pago_id=metodo, metodo_pago_nombre=p.get("metodoPagoNombre") or METODOS_PAGO[metodo],
            numero_operacion=p.get("numeroOperacion") or "", cajero=p.get("cajero") or "Caja Central",
            registrado_por=request.headers.get("X-User-Email"), observaciones=p.get("observaciones") or "",
            libera_matricula=bool(p.get("liberaMatricula")), estado="PAGADO",
            fecha_pago=parse_fecha_recibo(p.get("fechaHora"), p.get("timestamp")),
        )
        db.add(importado)
        if p.get("liberaMatricula"):
            est.pago_matricula = True
        resumen["pagos"] += 1

    if data.config and not await obtener_config(db, "caja"):
        db.add(ConfiguracionCaja(clave="caja", valor={k: data.config.get(k, v) for k, v in CONFIG_CAJA_DEFECTO.items()}))

    await db.commit()
    return resumen


# ---------------------------------------------------------------------------
# Verificación pública (escaneo del QR sin iniciar sesión)
# ---------------------------------------------------------------------------

async def _estudiante_por_dni(db: AsyncSession, dni: str) -> Optional[Estudiante]:
    return (await db.execute(select(Estudiante).where(Estudiante.dni == str(dni).strip()))).scalar_one_or_none()


NO_VALIDO = "Comprobante no encontrado o código de verificación inválido."


@router.get("/publico/recibo")
async def verificar_recibo(codigo: str, dni: str, t: str, db: AsyncSession = Depends(get_db)):
    secreto = await secreto_qr(db)
    if not token_valido(firmar(secreto, codigo, dni), t):
        raise HTTPException(404, detail=NO_VALIDO)
    est = await _estudiante_por_dni(db, dni)
    if not est:
        raise HTTPException(404, detail=NO_VALIDO)
    estado = await construir_estado_cuenta(db, est, secreto)
    recibo = next((m for m in estado["movimientos"] if m["codigoRecibo"] == codigo and m["estado"] == "PAGADO"), None)
    if not recibo:
        raise HTTPException(404, detail=NO_VALIDO)
    return {"valido": True, "recibo": recibo, "verificadoEn": formato_fecha_hora(ahora_peru())}


@router.get("/publico/boleta")
async def verificar_boleta(datos: str, f: str, db: AsyncSession = Depends(get_db)):
    """Comprueba la boleta que viene dentro del QR: firma intacta y recibo vigente en Tesorería."""
    secreto = await secreto_qr(db)
    if not token_valido(firmar(secreto, "BOLETA", datos), f):
        raise HTTPException(404, detail="La boleta del QR fue alterada o no fue emitida por Tesorería.")
    try:
        boleta = json.loads(base64.urlsafe_b64decode(datos + "=" * (-len(datos) % 4)))
    except (ValueError, TypeError):
        raise HTTPException(404, detail=NO_VALIDO)
    est = await _estudiante_por_dni(db, str(boleta.get("d") or ""))
    vigente = False
    if est:
        estado = await construir_estado_cuenta(db, est, secreto)
        vigente = any(m["codigoRecibo"] == boleta.get("r") and m["estado"] == "PAGADO" for m in estado["movimientos"])
    return {"valido": True, "vigente": vigente, "verificadoEn": formato_fecha_hora(ahora_peru())}


@router.get("/publico/estado-cuenta")
async def verificar_estado_cuenta(dni: str, t: str, db: AsyncSession = Depends(get_db)):
    secreto = await secreto_qr(db)
    if not token_valido(firmar(secreto, "EC", dni), t):
        raise HTTPException(404, detail=NO_VALIDO)
    est = await _estudiante_por_dni(db, dni)
    if not est:
        raise HTTPException(404, detail=NO_VALIDO)
    return {"valido": True, **(await construir_estado_cuenta(db, est, secreto)), "verificadoEn": formato_fecha_hora(ahora_peru())}
