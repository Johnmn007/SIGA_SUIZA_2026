import { useMemo, useState } from 'react';
import { filtrarEstudiantes } from '../../core/studentSearch';

const LIMITE = 50;

/**
 * Buscador de estudiantes con lista desplegable. Al enfocarlo muestra los alumnos de la
 * carrera elegida (o de todas si no hay carrera) y se va filtrando mientras se escribe.
 */
export function StudentSearchBox({ students, programaId = '', onSelect, loading = false }) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);

  const coincidencias = useMemo(
    () => filtrarEstudiantes(students, texto, programaId),
    [students, texto, programaId]
  );
  const visibles = coincidencias.slice(0, LIMITE);

  const elegir = (s) => {
    onSelect(s);
    setTexto('');
    setAbierto(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="input-field w-full py-2.5 text-sm"
        placeholder={programaId ? 'Buscar en esta carrera por DNI, nombre o código...' : 'Buscar por DNI, nombre o código...'}
        value={texto}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
      />
      {abierto && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
            {loading
              ? 'Cargando estudiantes...'
              : `${coincidencias.length} estudiante${coincidencias.length === 1 ? '' : 's'}${programaId ? ' en esta carrera' : ''}`
                + (coincidencias.length > LIMITE ? ` · mostrando ${LIMITE}, escribe para filtrar` : '')}
          </p>
          {visibles.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {visibles.map((s) => (
                <li
                  key={s.id}
                  // onMouseDown para elegir antes de que el input pierda el foco y cierre la lista.
                  onMouseDown={(e) => { e.preventDefault(); elegir(s); }}
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <span className="font-medium text-slate-800">{s.nombres} {s.apellidos}</span>
                  <span className="block text-xs text-slate-400">{s.dni} · {s.codigo_estudiante}</span>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <p className="px-3 py-3 text-sm text-slate-500">No hay estudiantes que coincidan.</p>
          )}
        </div>
      )}
    </div>
  );
}
