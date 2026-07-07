import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';

export function EditStudentModal({ student, onClose, onUpdated }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (student) {
      setForm({ ...student });
    }
  }, [student]);

  if (!student || !form) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Clean up fields
      const payload = { ...form };
      if (payload.fecha_nacimiento === '') payload.fecha_nacimiento = null;
      if (payload.email_institucional === '') payload.email_institucional = null;
      if (payload.email_personal === '') payload.email_personal = null;
      if (payload.celular === '') payload.celular = null;

      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const errData = await res.text();
        setError(`Error: ${errData}`);
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        <div className="bg-primary px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center">
            <span className="mr-2">✏️</span> Editar Datos: {student.nombres} {student.apellidos}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-sm text-blue-800">
            <strong>Nota:</strong> Esta función es para corregir errores de tipeo (Fase 3 - MVP). Si el cambio de nombre es por <strong>Mandato Legal</strong>, esto deberá tramitarse por mesa de partes (Fase 4 - Casuísticas).
          </div>
          
          <form id="edit-student-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* DNI */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">DNI / Documento</label>
              <input 
                type="text" 
                className="input-field py-2" 
                value={form.dni || ''} 
                onChange={e => handleChange('dni', e.target.value)} 
                required 
              />
            </div>
            
            {/* Fecha Nacimiento */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Fecha de Nacimiento</label>
              <input 
                type="date" 
                className="input-field py-2" 
                value={form.fecha_nacimiento || ''} 
                onChange={e => handleChange('fecha_nacimiento', e.target.value)} 
              />
            </div>

            {/* Nombres */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Nombres</label>
              <input 
                type="text" 
                className="input-field py-2" 
                value={form.nombres || ''} 
                onChange={e => handleChange('nombres', e.target.value)} 
                required 
              />
            </div>

            {/* Apellidos */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Apellidos</label>
              <input 
                type="text" 
                className="input-field py-2" 
                value={form.apellidos || ''} 
                onChange={e => handleChange('apellidos', e.target.value)} 
                required 
              />
            </div>

            {/* Email Personal */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Email Personal</label>
              <input 
                type="email" 
                className="input-field py-2" 
                value={form.email_personal || ''} 
                onChange={e => handleChange('email_personal', e.target.value)} 
              />
            </div>

            {/* Teléfono */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Teléfono / Celular</label>
              <input 
                type="text" 
                className="input-field py-2" 
                value={form.celular || form.telefono_movil || ''} 
                onChange={e => {
                  handleChange('celular', e.target.value);
                  handleChange('telefono_movil', e.target.value);
                }} 
              />
            </div>

            {/* Dirección */}
            <div className="flex flex-col space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Dirección</label>
              <input 
                type="text" 
                className="input-field py-2" 
                value={form.direccion_residencia || form.direccion_domicilio || ''} 
                onChange={e => {
                  handleChange('direccion_residencia', e.target.value);
                  handleChange('direccion_domicilio', e.target.value);
                }} 
              />
            </div>
            
          </form>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="edit-student-form"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
