import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, ShieldX, ShieldAlert, Loader2, Printer, Receipt, User, FileText, Wallet, WifiOff } from 'lucide-react';
import { buildReceiptHtml, printIframe } from './lib/printTemplates';
import { publicApiBase } from './lib/tesoreriaApi';
import { decodeBoletaDatos, formatMoney, amountToWords, formatToken, INSTITUTION } from './lib/paymentUtils';

// Página que abre el celular o la PC al escanear el QR de una boleta.
// La boleta se arma con los datos que trae el propio QR; el servidor solo confirma la firma y que siga vigente.
export default function PublicBoleta() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const datos = params.get('boleta') || '';
  const firma = params.get('f') || '';

  const decoded = useMemo(() => {
    try {
      return { receipt: decodeBoletaDatos(datos, firma), error: '' };
    } catch {
      return { receipt: null, error: 'El código QR no contiene una boleta válida.' };
    }
  }, [datos, firma]);
  const receipt = decoded.receipt;

  // verificando | vigente | anulada | alterada | sin_conexion
  const [check, setCheck] = useState({ status: receipt ? 'verificando' : 'alterada', verificadoEn: '' });
  const printFrameRef = useRef(null);

  useEffect(() => {
    if (!receipt) return undefined;
    let cancelled = false;
    const url = `${publicApiBase()}/api/mod-gestion-academica/tesoreria/publico/boleta?${new URLSearchParams({ datos, f: firma })}`;
    fetch(url)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) setCheck({ status: 'alterada', verificadoEn: '' });
        else setCheck({ status: body.vigente ? 'vigente' : 'anulada', verificadoEn: body.verificadoEn });
      })
      .catch(() => { if (!cancelled) setCheck({ status: 'sin_conexion', verificadoEn: '' }); });
    return () => { cancelled = true; };
  }, [receipt, datos, firma]);

  const printHtml = useMemo(() => (receipt ? buildReceiptHtml(receipt) : ''), [receipt]);

  // El campo Estado refleja la verificación, no solo lo que dice el QR
  const estadoCampo = {
    vigente: { value: 'PAGADO', destacado: 'verde' },
    verificando: { value: 'PAGADO (verificando...)' },
    sin_conexion: { value: 'PAGADO (sin verificar)' },
    anulada: { value: 'NO VIGENTE', destacado: 'ambar' },
    alterada: { value: 'NO VÁLIDA', destacado: 'rojo' },
  }[check.status];
  const invalida = check.status === 'alterada';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-black">IS</div>
          <div>
            <p className="font-extrabold leading-tight">{INSTITUTION.sigla}</p>
            <p className="text-xs text-blue-100/80">Tesorería · Boleta de pago</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {!receipt ? (
          <div className="p-6 rounded-3xl bg-white border-2 border-red-200 text-center">
            <ShieldX className="w-12 h-12 mx-auto text-red-500 mb-2" />
            <h1 className="text-lg font-black text-red-700">No se pudo leer la boleta</h1>
            <p className="text-sm text-slate-600 mt-1">{decoded.error}</p>
            <p className="text-xs text-slate-400 mt-3">Si el documento es auténtico, acércate a Tesorería del {INSTITUTION.sigla}.</p>
          </div>
        ) : (
          <>
            <EstadoVerificacion status={check.status} verificadoEn={check.verificadoEn} />

            {/* BOLETA EN FORMATO DE FORMULARIO (solo lectura) */}
            <form
              className={`rounded-3xl bg-white border shadow-sm overflow-hidden ${invalida ? 'border-red-300 opacity-70' : 'border-slate-200'}`}
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Boleta de Pago · Recibo de Caja</h1>
                  <p className="text-[11px] text-slate-500">{INSTITUTION.nombre} · RUC {INSTITUTION.ruc}</p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-[#0A2552] text-white font-mono font-black text-sm">{receipt.codigoRecibo}</span>
              </div>

              <div className="p-5 space-y-5">
                <Seccion icono={Receipt} titulo="Datos del comprobante">
                  <Campo label="N° de recibo" value={receipt.codigoRecibo} mono />
                  <Campo label="Fecha y hora de pago" value={receipt.fechaHora} />
                  <Campo label="Estado" value={estadoCampo.value} destacado={estadoCampo.destacado} />
                  <Campo label="Cajero responsable" value={receipt.cajero} />
                </Seccion>

                <Seccion icono={User} titulo="Datos del alumno">
                  <Campo label="Apellidos y nombres" value={receipt.estudianteNombre} ancho />
                  <Campo label="DNI" value={receipt.dni} mono destacado="azul" />
                  <Campo label="Código de alumno" value={receipt.codigoEstudiante} mono />
                  <Campo label="Programa de estudio" value={receipt.carreraNombre} ancho />
                </Seccion>

                <Seccion icono={FileText} titulo="Detalle del pago">
                  <Campo label="Código TUPA" value={receipt.conceptoCodigo} mono />
                  <Campo label="Categoría" value={receipt.conceptoCategoria} />
                  <Campo label="Concepto" value={receipt.conceptoNombre} ancho />
                  {receipt.tarifaNombre && <Campo label="Tarifa" value={receipt.tarifaNombre} />}
                  {receipt.observaciones && <Campo label="Observaciones" value={receipt.observaciones} ancho />}
                </Seccion>

                <Seccion icono={Wallet} titulo="Forma de pago">
                  <Campo label="Medio de pago" value={receipt.metodoPagoNombre} />
                  <Campo label="N° de operación / referencia" value={receipt.numeroOperacion || '—'} mono />
                </Seccion>

                <div className="p-4 rounded-2xl bg-[#0A2552] text-white flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Total pagado</p>
                    <p className="text-[11px] text-blue-100">SON: {amountToWords(receipt.monto)}</p>
                  </div>
                  <p className="text-3xl font-black font-mono">{formatMoney(receipt.monto)}</p>
                </div>

                {receipt.liberaMatricula && (
                  <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    ✓ Pago habilitante: este pago liberó el bloqueo de matrícula del alumno.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo label="Código de verificación" value={formatToken(firma)} mono />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                {!invalida && <button
                  type="button"
                  onClick={() => printIframe(printFrameRef.current)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition cursor-pointer"
                >
                  <Printer size={15} /> Imprimir / Guardar PDF
                </button>}
              </div>
            </form>

            {/* Documento de impresión (mismo formato que entrega Caja), fuera de la pantalla:
                con display:none algunos navegadores imprimen la página en blanco */}
            <iframe
              ref={printFrameRef}
              title="Boleta para imprimir"
              srcDoc={printHtml}
              className="fixed top-0 -left-[10000px] w-[148mm] h-[210mm] border-0"
              aria-hidden="true"
              tabIndex={-1}
            />
          </>
        )}
      </main>
    </div>
  );
}

function EstadoVerificacion({ status, verificadoEn }) {
  const estilos = {
    verificando: { icon: Loader2, spin: true, cls: 'border-slate-200 text-slate-600', titulo: 'Verificando la boleta con Tesorería...', texto: 'Los datos que ves vienen del propio código QR.' },
    vigente: { icon: ShieldCheck, cls: 'border-emerald-300 text-emerald-800', titulo: 'Boleta auténtica · Pago registrado', texto: `Confirmado en Tesorería del ${INSTITUTION.sigla} el ${verificadoEn}.` },
    anulada: { icon: ShieldAlert, cls: 'border-amber-300 text-amber-800', titulo: 'Boleta emitida por Tesorería, pero ya no está vigente', texto: 'El recibo no figura como pagado actualmente. Consulta en Tesorería.' },
    alterada: { icon: ShieldX, cls: 'border-red-300 text-red-700', titulo: 'Boleta no válida', texto: 'Los datos del QR fueron alterados o no los emitió Tesorería.' },
    sin_conexion: { icon: WifiOff, cls: 'border-slate-300 text-slate-700', titulo: 'Boleta leída del QR (sin verificar)', texto: `No se pudo conectar con el servidor del ${INSTITUTION.sigla}; los datos mostrados son los del código QR.` },
  };
  const e = estilos[status];
  const Icon = e.icon;
  return (
    <div className={`p-4 rounded-3xl bg-white border-2 shadow-sm flex items-start gap-3 ${e.cls}`}>
      <Icon size={26} className={`flex-shrink-0 ${e.spin ? 'animate-spin' : ''}`} />
      <div>
        <h2 className="font-black leading-tight">{e.titulo}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{e.texto}</p>
      </div>
    </div>
  );
}

function Seccion({ icono: Icon, titulo, children }) {
  return (
    <fieldset>
      <legend className="flex items-center gap-1.5 text-[11px] font-black text-[#0A2552] uppercase tracking-wider mb-2">
        <Icon size={14} /> {titulo}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </fieldset>
  );
}

function Campo({ label, value, mono = false, ancho = false, destacado }) {
  const color = {
    verde: 'text-emerald-700', azul: 'text-primary-dark', ambar: 'text-amber-700 font-black', rojo: 'text-red-700 font-black',
  }[destacado] || 'text-slate-900';
  return (
    <label className={`block ${ancho ? 'sm:col-span-2' : ''}`}>
      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</span>
      <input
        type="text"
        readOnly
        value={value || '—'}
        className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold ${color} ${mono ? 'font-mono' : ''} focus:outline-none`}
      />
    </label>
  );
}
