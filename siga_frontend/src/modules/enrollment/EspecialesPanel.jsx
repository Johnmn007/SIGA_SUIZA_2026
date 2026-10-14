import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../core/api/client';

const CASUISTICAS = [
  { value: 'Reingresante', label: 'Reingresante' },
  { value: 'Traslado', label: 'Traslado (interno / externo)' },
  { value: 'Convenio', label: 'Estudiante de convenios' },
];

const CONDICIONES_REINGRESO = [
  { key: 'dejo_institucion_antes_ciclo', label: 'Dejó la institución antes de concluir el ciclo en curso.' },
  { key: 'no_supero_max_ciclos', label: 'No superó el máximo de ciclos permitido por su plan.' },
  { key: 'solicitud_en_plazo', label: 'Registró la solicitud dentro del plazo establecido.' },
  { key: 'tasa_pagada', label: 'Canceló la tasa de reinscripción vigente.' },
];

/** Sección 4 del diagrama — Tipos de alumnos especiales (Bloque 4). */
export function EspecialesPanel() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [casuistica, setCasuistica] = useState('Reingresante');
  const [flags, setFlags] = useState({
    dejo_institucion_antes_ciclo: true,
    no_supero_max_ciclos: true,
    solicitud_en_plazo: true,
    tasa_pagada: true,
  });

  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const est = await apiClient.request('/api/mod-gestion-academica/estudiantes/').catch(() => []);
        setStudents(Array.isArray(est) ? est : []);
      } catch (e) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2 || selectedStudent) return [];
    return students
      .filter(
        (s) =>
          (s.dni || '').includes(q) ||
          (s.nombres || '').toLowerCase().includes(q) ||
          (s.apellidos || '').toLowerCase().includes(q) ||
          (s.codigo_estudiante || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [students, search, selectedStudent]);

  const seleccionar = (s) => {
    setSelectedStudent(s);
    setSearch('');
    setResultado(null);
    setError('');
  };

  const evaluar = async () => {
    if (!selectedStudent) {
      setError('Selecciona un estudiante');
      return;
    }
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const payload = { estudiante_id: selectedStudent.id, casuistica };
      if (casuistica === 'Reingresante') Object.assign(payload, flags);
      const res = await apiClient.callModule('mod-gestion-academica', 'casuisticas/evaluar', 'POST', payload);
      setResultado(res);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = (key) => {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
    setResultado(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <div className="glass-card p-6">
        <h4 className="text-xl font-bold text-slate-800 flex items-center mb-1">
          <span className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center mr-3">✨</span>
          5. Tipos de alumnos especiales
        </h4>
        <p className="text-slate-500 text-sm">
          Casuísticas que no siguen el camino regular: <b>Reingresante</b>, <b>Traslado</b> (interno/externo)
          y <b>estudiantes de convenios</b>. El sistema valida los requisitos de cada caso antes de matricular.
        </p>
      </div>

      {/* Tarjetas informativas del diagrama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-t-4 border-orange-400">
          <h5 className="font-bold text-orange-700 text-sm mb-2">🔄 Reingresante</h5>
          <p className="text-xs text-slate-500 mb-3">Debe cumplir 4 condiciones:</p>
          <ol className="space-y-1.5">
            {CONDICIONES_REINGRESO.map((c, i) => (
              <li key={c.key} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-orange-100 text-[9px] font-extrabold text-orange-700">
                  {i + 1}
                </span>
                <span>{c.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="glass-card p-5 border-t-4 border-sky-400">
          <h5 className="font-bold text-sky-700 text-sm mb-2">↔️ Traslado</h5>
          <div className="space-y-2">
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">Interno</p>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Entre programas de la misma institución, con equivalencia curricular validada por la dirección de estudios.
              </p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">Externo</p>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Desde otra institución, con carta de presentación, certificado de estudios y convalidación de asignaturas.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border-t-4 border-green-400">
          <h5 className="font-bold text-green-700 text-sm mb-2">🤝 Estudiante de convenios</h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            Procedente de una institución o programa con <b>convenio vigente</b>. Se matricula según el plan
            acordado, con las equivalencias y créditos definidos en el instrumento de cooperación.
          </p>
        </div>
      </div>

      {/* Evaluador */}
      <div className="glass-card p-6 space-y-4">
        <h5 className="font-bold text-slate-700 text-sm">🧪 Evaluar requisitos</h5>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estudiante */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estudiante</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {selectedStudent.nombres} {selectedStudent.apellidos}
                  </p>
                  <p className="text-xs text-slate-500">
                    DNI {selectedStudent.dni} · {selectedStudent.codigo_estudiante}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedStudent(null); setResultado(null); }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  className="input-field w-full py-2.5 text-sm"
                  placeholder="Buscar por DNI, nombre o código (mín. 2 letras)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {matches.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {matches.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => seleccionar(s)}
                        className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{s.nombres} {s.apellidos}</span>
                        <span className="block text-xs text-slate-400">{s.dni} · {s.codigo_estudiante}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Casuística */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Casuística especial</label>
            <select
              className="input-field w-full py-2.5 text-sm"
              value={casuistica}
              onChange={(e) => { setCasuistica(e.target.value); setResultado(null); }}
            >
              {CASUISTICAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkboxes de Reingresante */}
        {casuistica === 'Reingresante' && (
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Condiciones de reingreso</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONDICIONES_REINGRESO.map((c) => (
                <label key={c.key} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!flags[c.key]}
                    onChange={() => toggleFlag(c.key)}
                    className="w-4 h-4 mt-0.5 rounded"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(casuistica === 'Traslado' || casuistica === 'Convenio') && (
          <p className="text-xs text-slate-500">
            ℹ️ Para esta casuística el sistema verifica automáticamente la información registrada
            ({casuistica === 'Traslado' ? 'resolución de convalidación aprobada' : 'beneficio/convenio vigente'}).
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={evaluar}
            disabled={loading || !selectedStudent}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Evaluando...' : '✅ Evaluar requisitos'}
          </button>
          {loadingRefs && <span className="text-xs text-slate-400">Cargando estudiantes...</span>}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">❌ {error}</div>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`glass-card p-6 border-l-4 ${resultado.elegible ? 'border-green-500' : 'border-red-400'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h5 className="font-bold text-slate-700 text-sm">
              Resultado — {resultado.casuistica}
            </h5>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                resultado.elegible
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              {resultado.elegible ? '✅ APTO' : '⛔ NO APTO'}
            </span>
          </div>
          <ul className="space-y-2">
            {(resultado.condiciones || []).map((c, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  c.cumple ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <span className="shrink-0">{c.cumple ? '✅' : '❌'}</span>
                <span>{c.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default EspecialesPanel;
