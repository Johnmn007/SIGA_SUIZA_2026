import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '../../core/api/client';
import { StudentSearchBox } from '../enrollment/StudentSearchBox';

const TIPOS_TRAMITE = [
  'Constancia de Estudios',
  'Constancia de Matrícula',
  'Certificado de Estudios',
  'Récord Académico / Historial de Notas',
  'Reserva de Matrícula',
  'Licencia de Estudios',
  'Reincorporación',
  'Traslado Interno',
  'Traslado Externo',
  'Rectificación de Datos',
  'Duplicado de Carné',
];
const OTRO = 'Otro';

/** Registro manual de una solicitud de trámite (TUPA) para un estudiante. */
export function NuevaSolicitudModal({ estudiantes, cargandoEstudiantes, onClose, onCreated }) {
  const [estudiante, setEstudiante] = useState(null);
  const [tipo, setTipo] = useState(TIPOS_TRAMITE[0]);
  const [otroTipo, setOtroTipo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape' && !guardando) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guardando, onClose]);

  const tipoFinal = tipo === OTRO ? otroTipo.trim() : tipo;

  const guardar = async (e) => {
    e.preventDefault();
    if (!estudiante) { setError('Selecciona al estudiante que hace la solicitud.'); return; }
    if (!tipoFinal) { setError('Escribe el tipo de trámite.'); return; }
    setGuardando(true);
    setError('');
    try {
      const creado = await apiClient.request('/api/mod-gestion-academica/tramites/', {
        method: 'POST',
        body: JSON.stringify({
          estudiante_id: estudiante.id,
          tipo_tramite: tipoFinal.slice(0, 100),
          observaciones: observaciones.trim() || null,
        }),
      });
      onCreated(creado, estudiante);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo registrar la solicitud.');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <form onSubmit={guardar} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h4 className="text-lg font-bold text-slate-800">Nueva Solicitud Manual</h4>
          <button type="button" onClick={onClose} disabled={guardando} className="btn-icon text-slate-400 hover:text-slate-700" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estudiante</label>
            {estudiante ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{estudiante.apellidos}, {estudiante.nombres}</p>
                  <p className="text-xs text-slate-500">DNI {estudiante.dni} · {estudiante.codigo_estudiante}</p>
                </div>
                <button type="button" onClick={() => setEstudiante(null)} className="text-xs font-bold text-primary hover:underline">Cambiar</button>
              </div>
            ) : (
              <StudentSearchBox students={estudiantes} onSelect={setEstudiante} loading={cargandoEstudiantes} />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo de trámite</label>
            <select className="input-field w-full py-2.5 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_TRAMITE.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value={OTRO}>Otro (especificar)</option>
            </select>
            {tipo === OTRO && (
              <input
                type="text"
                maxLength={100}
                className="input-field w-full py-2.5 text-sm mt-2"
                placeholder="Describe el trámite"
                value={otroTipo}
                onChange={(e) => setOtroTipo(e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Observaciones (opcional)</label>
            <textarea
              rows={3}
              className="input-field w-full py-2.5 text-sm"
              placeholder="Motivo, documentos adjuntos, número de expediente..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="btn-primary px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
            {guardando ? 'Registrando...' : 'Registrar solicitud'}
          </button>
        </div>
      </form>
    </div>
  );
}
