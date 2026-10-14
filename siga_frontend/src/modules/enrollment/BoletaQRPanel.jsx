import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient, API_BASE } from '../../core/api/client';

/** Sección 3 del diagrama — Boleta con QR. */
export function BoletaQRPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [soloEmitidas, setSoloEmitidas] = useState(false);

  const [qrBoleta, setQrBoleta] = useState(null); // { codigo, item, payload }
  const [emitiendo, setEmitiendo] = useState(null);

  const [codigoValidar, setCodigoValidar] = useState('');
  const [validacion, setValidacion] = useState(null);
  const [validacionError, setValidacionError] = useState('');
  const [validando, setValidando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (soloEmitidas) params.set('solo_emitidas', 'true');
      if (search.trim()) params.set('q', search.trim());
      const json = await apiClient.request(
        `/api/mod-gestion-academica/matriculas/boletas?${params.toString()}`
      );
      setData(json);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloEmitidas]);

  const emitir = async (item) => {
    setEmitiendo(item.matricula_id);
    setError('');
    try {
      const payload = await apiClient.callModule(
        'mod-gestion-academica',
        `matriculas/${item.matricula_id}/boleta`,
        'POST'
      );
      setQrBoleta({ codigo: payload.codigo, item, payload });
      await cargar();
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setEmitiendo(null);
    }
  };

  const verQr = (item) =>
    setQrBoleta({ codigo: item.boleta_codigo, item, payload: null });

  const validar = async (codigoArg) => {
    const codigo = (codigoArg ?? codigoValidar).trim();
    if (!codigo) return;
    setValidando(true);
    setValidacion(null);
    setValidacionError('');
    try {
      const res = await apiClient.request(
        `/api/mod-gestion-academica/boletas/validar/${encodeURIComponent(codigo)}`
      );
      setValidacion(res);
    } catch (e) {
      setValidacionError(e.message);
    } finally {
      setValidando(false);
    }
  };

  const boletas = data?.boletas || [];
  const resumen = data?.resumen || {};

  const urlDeQr = (codigo) =>
    `${API_BASE}/api/mod-gestion-academica/boletas/validar/${codigo}`;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <div className="glass-card p-6">
        <h4 className="text-xl font-bold text-slate-800 flex items-center mb-1">
          <span className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mr-3">🧾</span>
          3. Boleta con QR
        </h4>
        <p className="text-slate-500 text-sm">
          El sistema emite la boleta con un <b>código QR único</b> por matrícula. El alumno o la
          secretaría escanean el QR para <b>validar</b> la matrícula en tiempo real.
        </p>
      </div>

      {/* Validación por código */}
      <div className="glass-card p-6">
        <h5 className="font-bold text-slate-800 mb-3">🔎 Validar una boleta por código</h5>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            className="input-field flex-1 min-w-[240px] py-2.5 text-sm font-mono"
            placeholder="Ej: BOL-15-XXXXXXXXXX"
            value={codigoValidar}
            onChange={(e) => setCodigoValidar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && validar()}
          />
          <button
            onClick={() => validar()}
            disabled={validando || !codigoValidar.trim()}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {validando ? 'Validando...' : 'Validar'}
          </button>
        </div>

        {validacionError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
            ❌ {validacionError}
          </div>
        )}
        {validacion && (
          <div className={`mt-3 p-4 rounded-xl border text-sm ${validacion.valida ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`font-extrabold ${validacion.valida ? 'text-green-700' : 'text-red-700'}`}>
              {validacion.valida ? '✅ Boleta VÁLIDA' : '⛔ Boleta ANULADA / no vigente'}
            </p>
            <div className="mt-2 text-slate-700 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">Código</span>{validacion.boleta.codigo}</div>
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">Estudiante</span>{validacion.estudiante ? `${validacion.estudiante.nombres} ${validacion.estudiante.apellidos}` : '-'}</div>
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">Periodo</span>{validacion.boleta.periodo_id}</div>
              <div><span className="block text-[10px] uppercase font-bold text-slate-400">Unidades</span>{validacion.unidades?.length || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Matrículas</p>
          <p className="text-2xl font-extrabold text-slate-800">{resumen.total || 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Emitidas</p>
          <p className="text-2xl font-extrabold text-green-600">{resumen.emitidas || 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendientes</p>
          <p className="text-2xl font-extrabold text-amber-600">{resumen.pendientes || 0}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <span className="px-2 text-slate-400 text-xl">🔍</span>
        <input
          type="text"
          className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 py-2 text-slate-700 placeholder-slate-400 outline-none"
          placeholder="Buscar por DNI, Nombre, Código o código de boleta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={soloEmitidas}
            onChange={(e) => setSoloEmitidas(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Solo emitidas
        </label>
        <button
          onClick={cargar}
          className="px-3 py-2 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20"
        >
          ⟳ Recargar
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">❌ {error}</div>
      )}

      {/* Tabla */}
      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estudiante</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">DNI</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Periodo</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ciclo</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Código de boleta</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-slate-500 font-medium">Cargando boletas...</p>
                  </td>
                </tr>
              ) : boletas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="text-4xl mb-3 opacity-50">🧾</div>
                    <p className="text-slate-500 font-medium">No hay matrículas para este filtro.</p>
                  </td>
                </tr>
              ) : (
                boletas.map((b) => (
                  <tr key={b.matricula_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-800 font-medium">{b.nombres} {b.apellidos}</td>
                    <td className="py-3 px-4 text-slate-600">{b.dni}</td>
                    <td className="py-3 px-4 text-slate-600">{b.periodo_id}</td>
                    <td className="py-3 px-4 text-slate-600">{b.ciclo ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
                        {b.estado_matricula}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {b.tiene_boleta ? (
                        <span className="font-mono text-xs font-bold text-slate-700">{b.boleta_codigo}</span>
                      ) : (
                        <span className="text-amber-600 text-xs font-bold">Sin emitir</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.tiene_boleta ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => verQr(b)}
                            className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg"
                          >
                            Ver QR
                          </button>
                          <button
                            onClick={() => { setCodigoValidar(b.boleta_codigo); validar(b.boleta_codigo); }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            Validar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => emitir(b)}
                          disabled={emitiendo === b.matricula_id}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50"
                        >
                          {emitiendo === b.matricula_id ? 'Emitiendo...' : 'Emitir boleta'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal QR */}
      {qrBoleta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setQrBoleta(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h5 className="font-bold text-slate-800">🧾 Boleta de Matrícula</h5>
              <button onClick={() => setQrBoleta(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="p-3 bg-white border-2 border-slate-100 rounded-xl">
                <QRCodeSVG value={urlDeQr(qrBoleta.codigo)} size={180} />
              </div>
              <p className="mt-3 text-xs text-slate-400">Código único</p>
              <p className="font-mono font-bold text-slate-800">{qrBoleta.codigo}</p>
              <p className="mt-3 text-sm text-slate-600 text-center">
                {qrBoleta.item?.nombres} {qrBoleta.item?.apellidos}
              </p>
              <button
                onClick={() => { setCodigoValidar(qrBoleta.codigo); validar(qrBoleta.codigo); setQrBoleta(null); }}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20"
              >
                Validar esta boleta
              </button>
              <p className="mt-2 text-[10px] text-slate-400 text-center break-all">
                Escanea para abrir: {urlDeQr(qrBoleta.codigo)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoletaQRPanel;
