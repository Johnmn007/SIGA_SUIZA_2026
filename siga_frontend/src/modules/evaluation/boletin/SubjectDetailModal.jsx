import { getEstadoConfig, notaTextColor } from './reportCardUtils';

const ALERTA_STYLES = {
  peligro: 'bg-red-50 border-red-200 text-red-700',
  advertencia: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
};

const ALERTA_ICONS = { peligro: '🚨', advertencia: '⚠️', info: 'ℹ️' };

export function SubjectDetailModal({ materia, onClose }) {
  if (!materia) return null;

  const estCfg = getEstadoConfig(materia.estado);
  const evaluaciones = materia.evaluaciones || [];
  const alertas = materia.alertas || [];
  const asistencia = materia.porcentaje_asistencia;
  const maxPeso = Math.max(1, ...evaluaciones.map(e => e.peso || 0));

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0">
            <div className="text-xs font-bold text-primary uppercase tracking-wide">{materia.codigo || '-'}</div>
            <h3 className="text-xl font-bold text-slate-800 font-semibold">{materia.nombre || '-'}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
              {materia.modulo && <span>{materia.modulo}</span>}
              {materia.ciclo !== null && materia.ciclo !== undefined && <span>Ciclo {materia.ciclo}</span>}
              <span>Créditos: {materia.creditos ?? '-'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center bg-gradient-to-br from-white to-slate-50">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Promedio Final</div>
            <div className={`text-3xl font-extrabold ${notaTextColor(materia.nota_final)}`}>
              {materia.nota_final ?? '-'}
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm mt-1 ${estCfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estCfg.dot}`} />
              {estCfg.label}
            </span>
          </div>
          <div className="glass-card p-4 text-center bg-gradient-to-br from-white to-slate-50">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Asistencia</div>
            <div className={`text-3xl font-extrabold ${asistencia !== null && asistencia !== undefined && asistencia < 80 ? 'text-red-600' : 'text-green-600'}`}>
              {asistencia !== null && asistencia !== undefined ? `${asistencia}%` : '-'}
            </div>
            {asistencia !== null && asistencia !== undefined && (
              <div className="text-[11px] text-slate-400 mt-1">Límite mínimo: 80%</div>
            )}
          </div>
          <div className="glass-card p-4 text-center bg-gradient-to-br from-white to-slate-50">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Evaluaciones</div>
            <div className="text-3xl font-extrabold text-slate-800">{evaluaciones.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">criterios considerados</div>
          </div>
        </div>

        {evaluaciones.length > 0 && (
          <div className="mb-6">
            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">📝 Desglose de Evaluaciones</h4>
            <div className="space-y-3">
              {evaluaciones.map((ev, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-24 flex-shrink-0">
                    <div className="font-bold text-sm text-slate-700">{ev.nombre || `Evaluación ${idx + 1}`}</div>
                    <div className="text-[11px] text-slate-400">{ev.label || ''}</div>
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark"
                      style={{ width: `${Math.max(0, Math.min(100, (ev.nota ?? 0) / 20 * 100))}%` }}
                    />
                  </div>
                  <div className="w-10 text-center text-lg font-extrabold">{ev.nota ?? '-'}</div>
                  <div className="w-16 text-right text-xs text-slate-500">{ev.peso ?? 0}%</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-1 text-[11px] text-slate-400">
              Peso máximo representado: {maxPeso}%
            </div>
          </div>
        )}

        {materia.retroalimentacion && (
          <div className="mb-5">
            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">💬 Retroalimentación del Docente</h4>
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-4 whitespace-pre-wrap">
              {materia.retroalimentacion}
            </p>
          </div>
        )}

        {alertas.length > 0 && (
          <div className="mb-5">
            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">🔔 Alertas</h4>
            <div className="space-y-2">
              {alertas.map((a, idx) => (
                <div key={idx} className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm ${ALERTA_STYLES[a.tipo] || ALERTA_STYLES.info}`}>
                  <span>{ALERTA_ICONS[a.tipo] || 'ℹ️'}</span>
                  <span>{a.mensaje}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}