import { nombreCompleto, formatFecha } from './reportCardUtils';

export function ReportCardFilters({ estudiante, periodo, periods, periodId, onPeriodChange, onExport, canExport, estadoMatricula }) {
  const disabled = !periodId || !periods || periods.length === 0;

  return (
    <>
      <div className="mb-8 text-center">
        <h3 className="text-4xl font-extrabold tracking-tight text-slate-800 mb-2">
          Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Notas</span>
        </h3>
        <p className="text-slate-500 font-medium">Consulta el avance académico del estudiante por periodo</p>
      </div>

      <div className="glass-card p-6 mb-6 border-l-4 border-l-primary flex flex-col lg:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-4xl shadow-inner border-2 border-white flex-shrink-0">
          🎓
        </div>
        <div className="flex-1 text-center lg:text-left min-w-0">
          <h2 className="text-2xl font-bold text-slate-800">{estudiante ? nombreCompleto(estudiante) : 'Estudiante'}</h2>
          {estudiante && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-sm">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider inline-block mr-2">Código</span>
                <span className="font-semibold text-slate-700">{estudiante.codigo_estudiante || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider inline-block mr-2">DNI</span>
                <span className="font-semibold text-slate-700">{estudiante.dni || '-'}</span>
              </div>
              {periodo && (
                <div className="col-span-2 md:col-span-1">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider inline-block mr-2">Periodo</span>
                  <span className="font-semibold text-slate-700">{periodo.codigo || '-'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div>
            <label className="label !mb-1">Periodo Académico</label>
            <select
              className="input-field min-w-[170px]"
              value={periodId ?? ''}
              onChange={(e) => onPeriodChange(Number(e.target.value))}
              disabled={disabled}
            >
              {!periodId && <option value="">Seleccionar periodo</option>}
              {(periods || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.estado && p.estado !== 'ACTIVO' && p.estado !== 'activo' ? `${p.codigo} (${p.estado})` : p.codigo}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onExport} disabled={!canExport} className="btn-primary h-[42px] self-end disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow">
            🖨️ Exportar PDF
          </button>
        </div>
      </div>

      {estadoMatricula && (
        <div className="flex items-center justify-center mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            Estado de matrícula: <span className="ml-1 font-bold capitalize">{estadoMatricula}</span>
          </span>
        </div>
      )}

      {periodo && periodo.codigo && (
        <div className="text-xs text-slate-400 text-right -mt-3 mb-5">
          Generado el {formatFecha(new Date())}
        </div>
      )}
    </>
  );
}