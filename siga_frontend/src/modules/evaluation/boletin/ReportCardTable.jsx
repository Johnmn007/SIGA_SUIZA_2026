import { getEstadoConfig, notaTextColor } from './reportCardUtils';

function evalNota(evaluaciones, nombre) {
  const item = (evaluaciones || []).find(e => e.nombre === nombre);
  return item && item.nota !== null && item.nota !== undefined ? item.nota : null;
}

export function ReportCardTable({ materias, onSelectMateria }) {
  if (!materias || materias.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
        <h4 className="font-bold flex items-center text-lg">
          <span className="mr-2">📊</span> Cuadro de Notas por Unidad Didáctica
        </h4>
        {onSelectMateria && (
          <span className="text-xs text-slate-300 hidden sm:block">
            Haz clic en una materia para ver el detalle completo
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[860px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">#</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Unidad Didáctica</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Ciclo</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Créd.</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">PC1</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">PC2</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">PC3</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 uppercase text-xs tracking-wider text-center bg-slate-100/50">Promedio</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Estado</th>
              {onSelectMateria && <th className="py-3 px-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materias.map((m, idx) => {
              const estCfg = getEstadoConfig(m.estado);
              const pc1 = evalNota(m.evaluaciones, 'PC1');
              const pc2 = evalNota(m.evaluaciones, 'PC2');
              const pc3 = evalNota(m.evaluaciones, 'PC3');

              return (
                <tr
                  key={m.matricula_detalle_id || idx}
                  onClick={onSelectMateria ? () => onSelectMateria(m) : undefined}
                  className={`transition-colors ${onSelectMateria ? 'hover:bg-blue-50/30 cursor-pointer' : 'hover:bg-blue-50/30'}`}
                >
                  <td className="py-4 px-4 text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-4 px-4">
                    <div className="text-xs font-bold text-primary uppercase tracking-wide">{m.codigo || '-'}</div>
                    <div className="font-semibold text-slate-700">{m.nombre || '-'}</div>
                    {m.modulo && <div className="text-xs text-slate-400 mt-0.5">{m.modulo}</div>}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-500">{m.ciclo ?? '-'}</td>
                  <td className="py-4 px-4 text-center font-medium text-slate-500">{m.creditos ?? '-'}</td>
                  <td className={`py-4 px-4 text-center text-lg ${notaTextColor(pc1)}`}>{pc1 ?? '-'}</td>
                  <td className={`py-4 px-4 text-center text-lg ${notaTextColor(pc2)}`}>{pc2 ?? '-'}</td>
                  <td className={`py-4 px-4 text-center text-lg ${notaTextColor(pc3)}`}>{pc3 ?? '-'}</td>
                  <td className={`py-4 px-4 text-center text-2xl bg-slate-50/50 ${notaTextColor(m.nota_final)}`}>
                    {m.nota_final ?? '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${estCfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${estCfg.dot}`} />
                      {estCfg.label}
                    </span>
                  </td>
                  {onSelectMateria && (
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMateria(m);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-primary-dark bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Ver
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}