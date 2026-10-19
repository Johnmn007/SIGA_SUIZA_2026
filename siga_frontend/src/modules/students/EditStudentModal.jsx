import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../../core/api/client';
import { Pencil, X, Fingerprint, GraduationCap, Mail, Phone, MapPin, ShieldAlert } from 'lucide-react';

const SectionLabel = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="w-7 h-7 rounded-lg bg-primary-soft text-primary-dark flex items-center justify-center">
      <Icon size={14} />
    </span>
    <p className="text-xs font-bold uppercase tracking-wider text-primary-dark">{label}</p>
  </div>
);

const Field = ({ label, value, onChange, type = "text", required = false, placeholder = "" }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-xs font-bold text-slate-600 uppercase">{label}</label>
    <input
      type={type}
      className="input-field py-2"
      value={value || ''}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
    />
  </div>
);

export function EditStudentModal({ student, onClose, onUpdated }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({ ...student });
      setPhotoFile(null);
      setPhotoPreview(null);
      setRemovePhoto(false);
    }
  }, [student]);

  useEffect(() => {
    if (!student) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [student]);

  if (!student || !form) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form };
      if (payload.fecha_nacimiento === '') payload.fecha_nacimiento = null;
      if (payload.email_institucional === '') payload.email_institucional = null;
      if (payload.email_personal === '') payload.email_personal = null;
      if (payload.celular === '') payload.celular = null;

      const auth = `Bearer ${localStorage.getItem('token')}`;

      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.text();
        setError(`Error: ${errData}`);
        setLoading(false);
        return;
      }

      if (photoFile) {
        const fd = new FormData();
        fd.append('file', photoFile);
        const upRes = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${student.id}/foto`, {
          method: 'POST',
          headers: { 'Authorization': auth },
          body: fd
        });
        if (!upRes.ok) {
          setError("Datos guardados, pero no se pudo subir la foto. Intenta de nuevo.");
          return;
        }
      } else if (removePhoto) {
        await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${student.id}/foto`, {
          method: 'DELETE',
          headers: { 'Authorization': auth }
        });
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError("Error de conexión");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="glass-card w-full sm:max-w-3xl overflow-hidden animate-slide-up flex flex-col h-full sm:h-auto sm:max-h-[92vh] bg-white/95 shadow-2xl">

        <div className="bg-gradient-to-r from-primary to-secondary px-4 sm:px-6 py-4 flex justify-between items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center min-w-0">
            <Pencil size={18} className="mr-2 flex-shrink-0" /> <span className="truncate">Corregir Datos: {student.nombres} {student.apellidos}</span>
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center flex-shrink-0" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 text-sm text-amber-800 flex items-start gap-3">
            <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>Nota:</strong> Esta función es para corregir errores de tipeo (Fase 3 - MVP). Si el cambio de nombre es por <strong>Mandato Legal</strong>, esto deberá tramitarse por mesa de partes (Fase 4 - Casuísticas).
            </p>
          </div>

          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">

            <div>
              <SectionLabel label="Identidad" icon={Fingerprint} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="DNI / Documento" value={form.dni} onChange={e => handleChange('dni', e.target.value)} required />
                <Field label="Fecha de Nacimiento" type="date" value={form.fecha_nacimiento} onChange={e => handleChange('fecha_nacimiento', e.target.value)} />
                <Field label="Nombres" value={form.nombres} onChange={e => handleChange('nombres', e.target.value)} required />
                <Field label="Apellidos" value={form.apellidos} onChange={e => handleChange('apellidos', e.target.value)} required />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionLabel label="Contacto" icon={Mail} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email Personal" type="email" value={form.email_personal || form.email_institucional} onChange={e => handleChange('email_personal', e.target.value)} />
                <Field label="Teléfono / Celular" value={form.celular || form.telefono_movil} onChange={e => {
                  handleChange('celular', e.target.value);
                  handleChange('telefono_movil', e.target.value);
                }} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionLabel label="Ubicación" icon={MapPin} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label="Dirección" value={form.direccion_residencia || form.direccion_domicilio} onChange={e => {
                    handleChange('direccion_residencia', e.target.value);
                    handleChange('direccion_domicilio', e.target.value);
                  }} />
                </div>
                <Field label="Distrito" value={form.distrito} onChange={e => handleChange('distrito', e.target.value)} />
                <Field label="Departamento" value={form.departamento} onChange={e => handleChange('departamento', e.target.value)} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionLabel label="Académico" icon={GraduationCap} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Código de Estudiante" value={form.codigo_estudiante} onChange={e => handleChange('codigo_estudiante', e.target.value)} />
                <Field label="Colegio de Procedencia" value={form.colegio_procedencia} onChange={e => handleChange('colegio_procedencia', e.target.value)} />
              </div>
            </div>

          </form>
        </div>

        <div className="bg-slate-light px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end sm:space-x-3 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-student-form"
            disabled={loading}
            className="btn-primary w-full sm:w-auto disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}