import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../../core/api/client';
import techBg from '../../assets/tech-bg.jpg';
import { DEPARTAMENTOS, getProvincias, getDistritos } from './ubigeoPeru';
import {
  Pencil, X, User, Mail, Phone, MapPin, Calendar,
  ShieldAlert, AlertTriangle, Lock, Check, ChevronDown,
  Building2, Activity, GraduationCap, HeartPulse, ShieldCheck
} from 'lucide-react';

const PROGRAMAS = {
  1: 'Administración de Operaciones Turísticas',
  2: 'Asistencia Administrativa',
  3: 'Contabilidad',
  4: 'Construcción Civil',
  5: 'Gestión Administrativa',
  6: 'Desarrollo de Sistemas de Información',
  7: 'Electricidad Industrial',
  8: 'Enfermería Técnica',
  9: 'Manejo Forestal',
  10: 'Mecatrónica Automotriz',
  11: 'Producción Agropecuaria',
};

function SearchSelect({
  label,
  icon: Icon = null,
  value,
  onChange,
  options = [],
  placeholder = 'Buscar...',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setQuery(null);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery(null);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const isOpen = open && !disabled;
  const normalized = options
    .map(option => (typeof option === 'string' ? { value: option, label: option } : option))
    .filter(option => option.value !== '' && option.value !== undefined && option.value !== null);
  const selectedOption = normalized.find(option => String(option.value) === String(value));
  const displayValue = selectedOption ? selectedOption.label : (value || '');
  const term = (query ?? '').trim().toLowerCase();
  const filtered = term
    ? normalized.filter(option => option.label.toLowerCase().includes(term))
    : normalized;

  const selectOption = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
    setQuery(null);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen(prev => !prev);
    setQuery(null);
  };

  return (
    <div ref={containerRef} className="flex flex-col space-y-1 relative">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-primary flex-shrink-0" />}
        <span>{label}</span>
        {required && <span className="text-rose-500 font-black">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          className={`w-full px-3.5 py-2.5 pr-16 bg-white border-2 rounded-xl text-slate-950 font-bold text-sm placeholder:text-slate-400 placeholder:font-normal focus:ring-4 focus:outline-none transition-all duration-200 shadow-xs ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed shadow-none'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-primary/15'
          }`}
          value={isOpen ? (query ?? displayValue) : displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={(event) => {
            if (disabled) return;
            setOpen(true);
            setQuery(null);
            event.target.select();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (filtered.length > 0) selectOption(filtered[0].value);
            }
          }}
        />

        <div className="absolute inset-y-0 right-2 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => selectOption('')}
              aria-label={`Limpiar ${label}`}
              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleOpen}
            disabled={disabled}
            aria-label={`Mostrar opciones de ${label}`}
            className="w-6 h-6 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full origin-top rounded-xl border border-primary/20 bg-white shadow-2xl shadow-primary/15 overflow-hidden">
            <div className="max-h-56 overflow-y-auto p-1.5" role="listbox">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs font-semibold text-slate-500">Sin resultados</div>
              ) : (
                filtered.map(option => {
                  const active = String(option.value) === String(value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => selectOption(option.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        active ? 'bg-primary/10 text-primary font-bold' : 'text-slate-700 font-medium hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex-1 truncate">{option.label}</span>
                      {active && <Check size={15} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 mb-3.5">
    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Icon size={15} />
    </span>
    <div>
      <h5 className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</h5>
      {subtitle && <p className="text-[11px] font-semibold text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const EditField = ({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  disabled = false,
  readOnly = false,
  icon: Icon,
  onlyDigits = false,
  maxLength,
  options
}) => {
  const handleChange = (e) => {
    if (!onChange || disabled || readOnly) return;
    if (onlyDigits) {
      const digits = e.target.value.replace(/\D/g, '');
      const nextVal = maxLength ? digits.slice(0, maxLength) : digits;
      onChange(nextVal);
      return;
    }
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
        <span>{label} {required && <span className="text-rose-500 font-black">*</span>}</span>
        {readOnly && <span className="text-[10px] text-slate-400 font-bold lowercase flex items-center gap-0.5"><Lock size={10} /> protegido</span>}
      </label>

      {options ? (
        <select
          value={value ?? ''}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={disabled || readOnly}
          className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-bold text-sm focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <div className="relative flex items-center">
          {Icon && (
            <span className="absolute left-3 text-slate-400 pointer-events-none">
              <Icon size={15} />
            </span>
          )}
          <input
            type={type}
            value={value ?? ''}
            onChange={handleChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled || readOnly}
            readOnly={readOnly}
            maxLength={maxLength}
            className={`w-full py-2.5 bg-white border-2 rounded-xl text-slate-950 font-bold text-sm placeholder:text-slate-400 placeholder:font-normal focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all shadow-xs ${
              Icon ? 'pl-9 pr-3.5' : 'px-3.5'
            } ${
              readOnly
                ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed select-none shadow-none'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export function EditStudentModal({ student, onClose, onUpdated }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (student) {
      const meta = student.metadata_admision || {};
      setForm({
        nombres: student.nombres || '',
        apellidos: student.apellidos || '',
        dni: student.dni || '',
        fecha_nacimiento: student.fecha_nacimiento || '',
        genero: meta.genero || meta.sexo || 'Masculino',
        estado_civil: meta.estado_civil || 'Soltero',
        nacionalidad: meta.nacionalidad || 'Peruana',
        celular: student.celular || meta.telefono_movil || '',
        email_personal: student.email_personal || '',
        direccion_domicilio: student.direccion_domicilio || meta.direccion_residencia || '',
        departamento: meta.departamento || meta.ubigeo?.departamento || '',
        provincia: meta.provincia || meta.ubigeo?.provincia || '',
        distrito: meta.distrito || meta.ubigeo?.distrito || '',
        contacto_emergencia_nombre: meta.emergencia?.contacto_nombre || meta.apoderado?.nombre || meta.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: meta.emergencia?.contacto_telefono || meta.apoderado?.celular || meta.contacto_emergencia_telefono || '',
      });
      setShowConfirmModal(false);
      setError(null);
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

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.dni.trim()) {
      setError("Los nombres, apellidos y DNI son campos obligatorios.");
      return;
    }
    setError(null);
    setShowConfirmModal(true);
  };

  const handleSaveConfirmed = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = `Bearer ${localStorage.getItem('token')}`;
      const meta = { ...(student.metadata_admision || {}) };

      // Empaquetar datos personales actualizados en metadata_admision
      meta.genero = form.genero;
      meta.sexo = form.genero;
      meta.estado_civil = form.estado_civil;
      meta.nacionalidad = form.nacionalidad;
      meta.departamento = form.departamento || null;
      meta.provincia = form.provincia || null;
      meta.distrito = form.distrito || null;
      meta.ubigeo = {
        departamento: form.departamento || null,
        provincia: form.provincia || null,
        distrito: form.distrito || null,
      };
      meta.direccion_residencia = form.direccion_domicilio;
      meta.telefono_movil = form.celular;
      meta.email_personal = form.email_personal;
      meta.contacto_emergencia_nombre = form.contacto_emergencia_nombre;
      meta.contacto_emergencia_telefono = form.contacto_emergencia_telefono;
      meta.emergencia = {
        ...(meta.emergencia || {}),
        contacto_nombre: form.contacto_emergencia_nombre || null,
        contacto_telefono: form.contacto_emergencia_telefono || null,
      };
      meta.apoderado = {
        ...(meta.apoderado || {}),
        nombre: form.contacto_emergencia_nombre || null,
        celular: form.contacto_emergencia_telefono || null,
      };
      meta.ultima_edicion_personal = new Date().toISOString();

      const payload = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        dni: form.dni.trim(),
        fecha_nacimiento: form.fecha_nacimiento || null,
        email_personal: form.email_personal?.trim() || null,
        celular: form.celular?.trim() || null,
        direccion_domicilio: form.direccion_domicilio?.trim() || null,
        metadata_admision: meta,
      };

      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMessage = `Error HTTP ${res.status}`;
        try {
          const data = await res.json();
          errMessage = data.detail || errMessage;
        } catch {
          errMessage = await res.text();
        }
        setError(errMessage);
        setShowConfirmModal(false);
        setLoading(false);
        return;
      }

      setShowConfirmModal(false);
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error de conexión al actualizar los datos personales.");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const carreraNombre = PROGRAMAS[student.programa_id] || (student.programa_id ? `Programa ${student.programa_id}` : 'Sin carrera');

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full sm:max-w-3xl lg:max-w-4xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh] bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-2 border-slate-200">

        {/* Cabecera Hero con tech-bg */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-primary-dark via-primary to-secondary shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
            style={{ backgroundImage: `url(${techBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-primary-dark/60 to-primary/40 pointer-events-none" />

          <div className="relative flex justify-between items-center px-5 sm:px-7 py-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Pencil size={18} />
              </span>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-0.5">
                  <ShieldCheck size={12} />
                  <span>Edición de Datos Personales</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {student.nombres} {student.apellidos}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-xs"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo del formulario con scroll */}
        <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/50">
          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 text-rose-900 p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5 shadow-xs">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-black text-rose-950">No se pudo guardar la modificación</p>
                <p className="mt-0.5 text-rose-800">{error}</p>
              </div>
            </div>
          )}

          {/* Banner explicativo de alcance de edición */}
          <div className="bg-blue-50/80 border-2 border-blue-200 p-4 rounded-2xl text-xs text-blue-900 flex items-start gap-3 shadow-xs">
            <ShieldAlert size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">
              <strong className="text-primary-dark font-black">Ámbito de Edición:</strong> Solo se permite modificar datos personales de contacto, identidad y domicilio del estudiante (corrección de errores tipográficos). La carrera, el código de estudiante y el estado de matrícula son inmutables para preservar la trazabilidad institucional.
            </div>
          </div>

          <form id="edit-student-personal-form" onSubmit={handlePreSubmit} className="space-y-6">

            {/* Bloque 1: Datos Académicos (SOLO LECTURA) */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <SectionHeader icon={GraduationCap} title="Datos Institucionales Asignados" subtitle="Campos protegidos no editables" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <EditField label="Código de Estudiante" value={student.codigo_estudiante} readOnly icon={Lock} />
                <EditField label="Programa de Estudios" value={carreraNombre} readOnly icon={Lock} />
                <EditField label="Estado Académico" value={student.estado_academico || 'postulante'} readOnly icon={Lock} />
              </div>
            </div>

            {/* Bloque 2: Identidad Personal (EDITABLE) */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <SectionHeader icon={User} title="Identidad del Estudiante" subtitle="Corrección de nombres, apellidos y documento" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <EditField
                  label="Nombres"
                  value={form.nombres}
                  onChange={val => handleChange('nombres', val)}
                  required
                  placeholder="Nombres completos"
                />
                <EditField
                  label="Apellidos"
                  value={form.apellidos}
                  onChange={val => handleChange('apellidos', val)}
                  required
                  placeholder="Apellidos paterno y materno"
                />
                <EditField
                  label="DNI / Documento"
                  value={form.dni}
                  onChange={val => handleChange('dni', val)}
                  required
                  onlyDigits
                  maxLength={8}
                  placeholder="8 dígitos"
                />
                <EditField
                  label="Fecha de Nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={val => handleChange('fecha_nacimiento', val)}
                  icon={Calendar}
                />
                <EditField
                  label="Género / Sexo"
                  value={form.genero}
                  onChange={val => handleChange('genero', val)}
                  options={['Masculino', 'Femenino', 'Otro']}
                />
                <EditField
                  label="Estado Civil"
                  value={form.estado_civil}
                  onChange={val => handleChange('estado_civil', val)}
                  options={['Soltero', 'Casado', 'Conviviente', 'Viudo', 'Divorciado']}
                />
                <div className="sm:col-span-2">
                  <EditField
                    label="Nacionalidad"
                    value={form.nacionalidad}
                    onChange={val => handleChange('nacionalidad', val)}
                    placeholder="Ej. Peruana"
                  />
                </div>
              </div>
            </div>

            {/* Bloque 3: Contacto y Residencia (EDITABLE) */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <SectionHeader icon={MapPin} title="Contacto y Domicilio" subtitle="Vías de comunicación y residencia actual" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <EditField
                  label="Teléfono Móvil / Celular"
                  value={form.celular}
                  onChange={val => handleChange('celular', val)}
                  icon={Phone}
                  onlyDigits
                  maxLength={9}
                  placeholder="9 dígitos"
                />
                <EditField
                  label="Email Personal"
                  type="email"
                  value={form.email_personal}
                  onChange={val => handleChange('email_personal', val)}
                  icon={Mail}
                  placeholder="correo@ejemplo.com"
                />

                <div className="sm:col-span-2">
                  <EditField
                    label="Dirección de Domicilio"
                    value={form.direccion_domicilio}
                    onChange={val => handleChange('direccion_domicilio', val)}
                    placeholder="Calle, Jr., Av., N° y urbanización"
                  />
                </div>

                <SearchSelect
                  label="Departamento"
                  icon={MapPin}
                  options={DEPARTAMENTOS}
                  value={form.departamento}
                  onChange={(val) => {
                    handleChange('departamento', val);
                    handleChange('provincia', '');
                    handleChange('distrito', '');
                  }}
                  placeholder="Buscar departamento..."
                />
                <SearchSelect
                  label="Provincia"
                  options={getProvincias(form.departamento)}
                  value={form.provincia}
                  onChange={(val) => {
                    handleChange('provincia', val);
                    handleChange('distrito', '');
                  }}
                  placeholder={form.departamento ? 'Buscar provincia...' : 'Elija departamento primero'}
                  disabled={!form.departamento}
                />
                <div className="sm:col-span-2">
                  <SearchSelect
                    label="Distrito"
                    options={getDistritos(form.departamento, form.provincia)}
                    value={form.distrito}
                    onChange={(val) => handleChange('distrito', val)}
                    placeholder={form.provincia ? 'Buscar distrito...' : 'Elija provincia primero'}
                    disabled={!form.provincia}
                  />
                </div>
              </div>
            </div>

            {/* Bloque 4: Contacto de Emergencia / Apoderado (EDITABLE) */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <SectionHeader icon={HeartPulse} title="Contacto de Emergencia / Apoderado" subtitle="Persona de contacto directo ante incidentes" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <EditField
                  label="Nombre del Contacto"
                  value={form.contacto_emergencia_nombre}
                  onChange={val => handleChange('contacto_emergencia_nombre', val)}
                  placeholder="Nombre de apoderado o familiar"
                />
                <EditField
                  label="Teléfono de Emergencia"
                  value={form.contacto_emergencia_telefono}
                  onChange={val => handleChange('contacto_emergencia_telefono', val)}
                  icon={Phone}
                  onlyDigits
                  maxLength={9}
                  placeholder="9 dígitos"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Pie del modal con acciones */}
        <div className="bg-slate-100 px-5 sm:px-7 py-4 border-t-2 border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] font-bold text-slate-500 text-center sm:text-left">
            Presione Guardar Cambios para confirmar la actualización.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-black text-slate-700 hover:bg-slate-100 transition-colors text-xs uppercase tracking-wide cursor-pointer w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="edit-student-personal-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-black text-xs uppercase tracking-wider shadow-md shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
            >
              <Pencil size={14} />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>

        {/* Modal Centrado de Confirmación */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-2 border-slate-200 text-center animate-scale-up">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-amber-200">
                <AlertTriangle size={32} />
              </div>

              <h4 className="text-lg font-black text-slate-900 mb-2">
                Confirmar Modificación
              </h4>

              <p className="text-sm font-semibold text-slate-600 mb-6 leading-relaxed">
                ¿Está seguro de cambiar los datos personales del estudiante{' '}
                <strong className="text-slate-950 font-black block mt-1 text-base">
                  "{student.nombres} {student.apellidos}"
                </strong>
              </p>

              <div className="flex items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-300 font-extrabold text-slate-700 hover:bg-slate-100 transition-colors text-xs uppercase tracking-wide cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfirmed}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-black text-xs uppercase tracking-wider shadow-md shadow-primary/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Sí, Confirmar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
