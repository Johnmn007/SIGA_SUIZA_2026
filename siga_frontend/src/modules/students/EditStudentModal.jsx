import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';
import { Pencil, X } from 'lucide-react';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh] bg-white/95 shadow-2xl">
        
        <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Pencil size={18} className="mr-2" /> Editar Datos: {student.nombres} {student.apellidos}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}
          <div className="bg-primary-soft border border-primary/20 p-4 rounded-xl mb-6 text-sm text-primary-dark">
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

        <div className="bg-slate-light px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="btn-ghost"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="edit-student-form"
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
