import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, ShieldX, Printer, Loader2, Receipt, FileText } from 'lucide-react';
import { CAREERS_MAP } from './tupaCatalog';
import { buildReceiptHtml, buildStatementHtml, printIframe } from './lib/printTemplates';
import { publicApiBase } from './lib/tesoreriaApi';
import { formatMoney, INSTITUTION } from './lib/paymentUtils';

// Página pública que abre el celular al escanear el QR de una boleta o de un estado de cuenta.
// No requiere iniciar sesión: el servidor valida la firma (t) del enlace.
export default function PublicVerification() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isReceipt = params.has('recibo');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [frameHeight, setFrameHeight] = useState(900);
  const frameRef = useRef(null);

  useEffect(() => {
    const base = `${publicApiBase()}/api/mod-gestion-academica/tesoreria/publico`;
    const url = isReceipt
      ? `${base}/recibo?${new URLSearchParams({ codigo: params.get('recibo') || '', dni: params.get('dni') || '', t: params.get('t') || '' })}`
      : `${base}/estado-cuenta?${new URLSearchParams({ dni: params.get('estado-cuenta') || '', t: params.get('t') || '' })}`;
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.detail || 'Comprobante no encontrado o código de verificación inválido.');
        if (!cancelled) setState({ loading: false, error: '', data: body });
      })
      .catch((e) => {
        if (cancelled) return;
        const offline = e instanceof TypeError;
        setState({
          loading: false,
          data: null,
          error: offline ? 'No se pudo conectar con el servidor del instituto. Verifica que estés en la red del IESTP Suiza.' : e.message,
        });
      });
    return () => { cancelled = true; };
  }, [isReceipt, params]);

  const html = useMemo(() => {
    if (!state.data) return '';
    if (isReceipt) return buildReceiptHtml(state.data.recibo);
    const est = state.data.estudiante;
    return buildStatementHtml({
      student: est,
      payments: state.data.movimientos,
      careerName: CAREERS_MAP[est.programa_id] || 'Programa de Estudio General',
      token: state.data.token,
      qrContent: state.data.qrContenido,
      emitted: state.data.emitido,
    });
  }, [state.data, isReceipt]);

  const fitFrame = () => {
    const doc = frameRef.current?.contentDocument;
    if (doc) setFrameHeight(doc.documentElement.scrollHeight + 4);
  };

  const recibo = state.data?.recibo;
  const est = state.data?.estudiante;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-black">IS</div>
          <div>
            <p className="font-extrabold leading-tight">{INSTITUTION.sigla}</p>
            <p className="text-xs text-blue-100/80">Tesorería · Verificación de comprobantes</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {state.loading && (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
            Verificando el comprobante en la base de datos del instituto...
          </div>
        )}

        {!state.loading && state.error && (
          <div className="p-6 rounded-3xl bg-white border-2 border-red-200 text-center">
            <ShieldX className="w-12 h-12 mx-auto text-red-500 mb-2" />
            <h1 className="text-lg font-black text-red-700">No se pudo validar el comprobante</h1>
            <p className="text-sm text-slate-600 mt-1">{state.error}</p>
            <p className="text-xs text-slate-400 mt-3">Si el documento es auténtico, acércate a Tesorería del {INSTITUTION.sigla}.</p>
          </div>
        )}

        {state.data && (
          <>
            <div className="p-5 rounded-3xl bg-white border-2 border-emerald-300 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-700 flex-shrink-0"><ShieldCheck size={26} /></span>
                <div className="min-w-0">
                  <h1 className="text-lg font-black text-emerald-800 leading-tight">
                    {isReceipt ? 'Boleta válida · Pago registrado' : 'Estado de cuenta verificado'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registrado en Tesorería del {INSTITUTION.sigla} · verificado el {state.data.verificadoEn}
                  </p>
                </div>
              </div>

              {isReceipt ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <dt className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Monto pagado</dt>
                    <dd className="text-3xl font-black text-emerald-800 font-mono">{formatMoney(recibo.monto)}</dd>
                  </div>
                  <div><dt className="text-[10px] font-bold text-slate-400 uppercase">DNI del alumno</dt><dd className="font-mono font-black text-primary-dark text-lg">{recibo.dni}</dd></div>
                  <div><dt className="text-[10px] font-bold text-slate-400 uppercase">N° de recibo</dt><dd className="font-mono font-bold text-slate-900">{recibo.codigoRecibo}</dd></div>
                  <div className="col-span-2"><dt className="text-[10px] font-bold text-slate-400 uppercase">Alumno</dt><dd className="font-bold text-slate-900">{recibo.estudianteNombre}</dd></div>
                  <div className="col-span-2"><dt className="text-[10px] font-bold text-slate-400 uppercase">Concepto</dt><dd className="font-semibold text-slate-800">{recibo.conceptoNombre}</dd></div>
                  <div><dt className="text-[10px] font-bold text-slate-400 uppercase">Fecha de pago</dt><dd className="font-semibold text-slate-800">{recibo.fechaHora}</dd></div>
                  <div><dt className="text-[10px] font-bold text-slate-400 uppercase">Forma de pago</dt><dd className="font-semibold text-slate-800">{recibo.metodoPagoNombre}</dd></div>
                </dl>
              ) : (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2"><dt className="text-[10px] font-bold text-slate-400 uppercase">Alumno</dt><dd className="font-bold text-slate-900">{est.nombres} {est.apellidos}</dd></div>
                  <div><dt className="text-[10px] font-bold text-slate-400 uppercase">DNI del alumno</dt><dd className="font-mono font-black text-primary-dark text-lg">{est.dni}</dd></div>
                  <div><dt className="text-[10px] font-bold text-slate-400 uppercase">Condición</dt>
                    <dd className={`font-black ${state.data.habilitado ? 'text-emerald-700' : 'text-amber-700'}`}>{state.data.habilitado ? '✓ Habilitado' : '⚠ Con deuda'}</dd>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200"><dt className="text-[10px] font-bold text-emerald-700 uppercase">Total pagado</dt><dd className="text-xl font-black text-emerald-800 font-mono">{formatMoney(state.data.totalPagado)}</dd></div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200"><dt className="text-[10px] font-bold text-amber-700 uppercase">Saldo pendiente</dt><dd className="text-xl font-black text-amber-800 font-mono">{formatMoney(state.data.totalPendiente)}</dd></div>
                </dl>
              )}
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {isReceipt ? <Receipt size={16} className="text-primary" /> : <FileText size={16} className="text-primary" />}
                  {isReceipt ? 'Boleta de pago' : 'Estado de cuenta 2026'}
                </span>
                <button
                  onClick={() => printIframe(frameRef.current)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition cursor-pointer"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
              </div>
              <iframe
                ref={frameRef}
                title={isReceipt ? 'Boleta de pago' : 'Estado de cuenta'}
                srcDoc={html}
                onLoad={fitFrame}
                style={{ height: frameHeight }}
                className="w-full border-0 block bg-white"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
