import { MERITO_CONFIG } from './reportCardUtils';

function KpiCard({ label, value, sub, accent }) {
  const accentMap = {
    blue: 'from-blue-600 to-indigo-600',
    green: 'from-green-600 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
    slate: 'from-slate-600 to-slate-800',
  };
  const gradient = accentMap[accent] || accentMap.blue;

  return (
    <div className="glass-card p-5 flex flex-col">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{label}</div>
      <div className="flex items-end justify-between gap-3">
        <div className={`leading-none text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br ${gradient}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-slate-500 text-right leading-tight">{sub}</div>}
      </div>
    </div>
  );
}

export function ReportCardKpis({ kpis }) {
  if (!kpis) return null;

  const merito = kpis.merito || {};
  const meritoCfg = MERITO_CONFIG[merito.color];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KpiCard label="Promedio Período" value={kpis.ppp ?? '-'} sub="PPP · ponderado por créditos" accent="blue" />
      <KpiCard label="Promedio Acumulado" value={kpis.ppa ?? '-'} sub="PPA · histórico ponderado" accent="green" />
      <KpiCard
        label="Créditos"
        value={`${kpis.creditos_aprobados ?? 0}/${kpis.creditos_cursados ?? 0}`}
        sub="aprobados / cursados"
        accent="amber"
      />
      <KpiCard
        label="Materias"
        value={`${kpis.materias_aprobadas ?? 0}/${kpis.materias_total ?? 0}`}
        sub={`en riesgo: ${kpis.materias_en_riesgo ?? 0}`}
        accent={kpis.materias_en_riesgo > 0 ? 'red' : 'slate'}
      />

      {meritoCfg && merito.merito && (
        <div className="col-span-2 lg:col-span-4">
          <div className={`glass-card p-4 flex items-center justify-between ${meritoCfg.badge}`}>
            <span className="font-bold">🏆 Mérito Académico</span>
            <span className="text-sm font-bold">{merito.merito} <span className="font-medium opacity-70">({merito.escala})</span></span>
          </div>
        </div>
      )}
    </div>
  );
}