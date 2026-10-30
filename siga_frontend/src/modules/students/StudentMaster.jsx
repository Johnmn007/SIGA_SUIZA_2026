import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../core/auth/useAuth';
import { API_BASE } from '../../core/api/client';
import techBg from '../../assets/tech-bg.jpg';
import { EditStudentModal } from './EditStudentModal';
import { StudentDetail } from './StudentDetail';
import { ProtectedImage } from './ProtectedImage';
import { DEPARTAMENTOS, getProvincias, getDistritos } from './ubigeoPeru';
import { GraduationCap, Search, CloudDownload, Plus, Users, Pencil, ChevronRight, ChevronDown, Check, LayoutGrid, Info, X, Mail, Phone, MapPin, CheckCircle2, FileCheck2, UserPlus, Sparkles, Camera, Trash2, AlertTriangle } from 'lucide-react';

// Puente entre sectores: Línea con puntitos unida a cada extremo con degradé dinámico según el estado
const SectorBridge = ({ fromStepId, currentStep }) => {
  const isCompleted = currentStep > fromStepId;
  const isActive = currentStep === fromStepId;

  return (
    <div className="flex-1 hidden sm:flex items-center self-start mt-3 px-1.5 sm:px-2" aria-hidden="true">
      <div className="w-full flex items-center gap-1 relative">
        {/* Extremo izquierdo: puntito de unión al sector origen */}
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${
            isCompleted
              ? 'bg-emerald-600 ring-2 ring-emerald-300 scale-110 shadow-sm shadow-emerald-600/40'
              : isActive
              ? 'bg-primary ring-4 ring-primary/25 scale-125 animate-pulse shadow-sm shadow-primary/50'
              : 'bg-slate-300 ring-1 ring-slate-200'
          }`}
        />

        {/* Línea puente punteada con degradé según el estado del sector */}
        <div className="flex-1 relative flex items-center justify-between overflow-hidden py-1">
          {/* Línea base punteada con degradé */}
          <div
            className={`w-full h-0 border-b-[3px] border-dotted transition-all duration-500 ${
              isCompleted
                ? 'border-emerald-500 [border-image:linear-gradient(to_right,#059669,#0284c7,#0044B2)_1]'
                : isActive
                ? 'border-primary [border-image:linear-gradient(to_right,#0044B2,#3b82f6,#94a3b8)_1] animate-dotted-bridge'
                : 'border-slate-300'
            }`}
          />

          {/* Puntitos intermedios flotantes en el puente */}
          <div className="absolute inset-0 flex items-center justify-evenly pointer-events-none px-1">
            {[0, 1, 2, 3].map((dotIndex) => (
              <span
                key={dotIndex}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-primary shadow-xs'
                    : isActive
                    ? dotIndex < 2
                      ? 'bg-primary animate-pulse shadow-xs shadow-primary/40'
                      : 'bg-slate-300'
                    : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Extremo derecho: puntito de unión al sector destino */}
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${
            isCompleted
              ? 'bg-primary ring-2 ring-primary/30 scale-110 shadow-sm shadow-primary/40'
              : isActive
              ? 'bg-blue-400 ring-2 ring-blue-300 scale-100'
              : 'bg-slate-300 ring-1 ring-slate-200'
          }`}
        />
      </div>
    </div>
  );
};

const InputGroup = ({
  label,
  icon: Icon = null,
  type = "text",
  value,
  onChange,
  options = null,
  placeholder = "",
  required = false,
  showMissing = false,
  disabled = false,
}) => {
  const isMissing = required && (!value || String(value).trim() === '');

  return (
    <div className="flex flex-col space-y-1.5 relative">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-primary flex-shrink-0" />}
          <span>{label}</span>
          {required && <span className="text-rose-600 font-black text-sm" title="Campo requerido">*</span>}
        </label>

        {/* Glovito con signo de interrogación cuando falta rellenar */}
        {isMissing && showMissing && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 animate-bounce-subtle">
            <span className="w-3.5 h-3.5 rounded-full bg-white text-amber-800 flex items-center justify-center text-[10px] font-black shadow-xs">
              ?
            </span>
            <span className="text-[10px] font-black tracking-tight">Falta rellenar datos necesarios</span>
          </div>
        )}
      </div>

      <div className="relative">
        {options ? (
          <select
            className={`w-full px-3.5 py-2.5 bg-white border-2 rounded-xl text-slate-950 font-bold text-sm focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:shadow-none ${
              isMissing && showMissing
                ? 'border-amber-400 ring-2 ring-amber-400/20 focus:border-amber-500 focus:ring-amber-400/25'
                : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-primary/20'
            }`}
            value={value}
            onChange={onChange}
            disabled={disabled}
          >
            {options.map(option => {
              const optionValue = typeof option === 'string' ? option : option.value;
              const optionLabel = typeof option === 'string' ? option : option.label;
              return <option key={optionValue} value={optionValue} className="text-slate-950 font-semibold">{optionLabel}</option>;
            })}
          </select>
        ) : (
          <input
            type={type}
            className={`w-full px-3.5 py-2.5 bg-white border-2 rounded-xl text-slate-950 font-bold text-sm placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 shadow-sm ${
              isMissing && showMissing
                ? 'border-amber-400 ring-2 ring-amber-400/20 focus:border-amber-500 focus:ring-amber-400/25'
                : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-primary/20'
            }`}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
          />
        )}

        {/* Bocadillo emergente con flecha apuntando al input cuando está vacío y se intentó avanzar */}
        {isMissing && showMissing && (
          <div className="absolute -bottom-6 left-3 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black shadow-lg shadow-amber-600/30 animate-fade-in pointer-events-none">
            <div className="absolute -top-1 left-4 w-2 h-2 bg-amber-600 rotate-45"></div>
            <span className="w-3.5 h-3.5 rounded-full bg-white text-amber-700 flex items-center justify-center text-[10px] font-black">?</span>
            <span>Dato necesario por rellenar</span>
          </div>
        )}
      </div>
    </div>
  );
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
  showMissing = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null);
  const containerRef = useRef(null);
  const isMissing = required && (!value || String(value).trim() === '');

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
    <div ref={containerRef} className="flex flex-col space-y-1.5 relative">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-primary flex-shrink-0" />}
          <span>{label}</span>
          {required && <span className="text-rose-600 font-black text-sm" title="Campo requerido">*</span>}
        </label>
        {isMissing && showMissing && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 animate-bounce-subtle">
            <span className="w-3.5 h-3.5 rounded-full bg-white text-amber-800 flex items-center justify-center text-[10px] font-black shadow-xs">?</span>
            <span className="text-[10px] font-black tracking-tight">Falta rellenar datos necesarios</span>
          </div>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          className={`w-full px-3.5 py-2.5 pr-16 bg-white border-2 rounded-xl text-slate-950 font-bold text-sm placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:ring-4 focus:outline-none transition-all duration-200 shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:shadow-none ${
            isMissing && showMissing
              ? 'border-amber-400 ring-2 ring-amber-400/20 focus:border-amber-500 focus:ring-amber-400/25'
              : 'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-primary/20'
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
            className="w-6 h-6 flex items-center justify-center rounded-md text-primary hover:bg-primary-soft transition-colors disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full origin-top rounded-xl border border-primary/20 bg-white shadow-2xl shadow-primary/15 overflow-hidden animate-fade-in-up">
            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5" role="listbox">
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
                        active ? 'bg-primary-soft text-primary-dark font-bold' : 'text-slate-700 font-medium hover:bg-slate-100'
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

const CheckboxGroup = ({ label, checked, onChange }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-xs font-black text-slate-950 uppercase tracking-wider">{label}</label>
    <label className="flex items-center space-x-3 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`block w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'transform translate-x-5 shadow-sm' : ''}`}></div>
      </div>
      <span className="text-sm font-black text-slate-950">{checked ? 'SÍ' : 'NO'}</span>
    </label>
  </div>
);

const WIZARD_STEPS = [
  { id: 1, label: 'Identidad', icon: UserPlus },
  { id: 2, label: 'Contacto', icon: Mail },
  { id: 3, label: 'Socioeconómico', icon: MapPin },
  { id: 4, label: 'Salud y Académico', icon: FileCheck2 },
  { id: 5, label: 'Revisión', icon: CheckCircle2 },
];

// Datos mínimos por sector: alimentan los puentes, el badge "?" y el bloqueo de avance
const SECTOR_REQUIRED = {
  1: [
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'dni', label: 'DNI / Documento' },
    { key: 'codigo_estudiante', label: 'Código de Estudiante' },
    { key: 'programa_id', label: 'Carrera / Programa de Estudios' },
    { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento' },
    { key: 'genero', label: 'Género' },
    { key: 'estado_civil', label: 'Estado Civil' },
    { key: 'nacionalidad', label: 'Nacionalidad' },
  ],
  2: [
    { key: 'direccion_residencia', label: 'Dirección de Residencia' },
    { key: 'departamento', label: 'Departamento' },
    { key: 'provincia', label: 'Provincia' },
    { key: 'distrito', label: 'Distrito' },
    { key: 'telefono_movil', label: 'Celular / Móvil' },
    { key: 'email_personal', label: 'Email Personal' },
    { key: 'email_institucional', label: 'Email Institucional' },
  ],
  3: [
    { key: 'tipo_vivienda', label: 'Tipo de Vivienda' },
    { key: 'ingreso_mensual', label: 'Ingreso Mensual Estimado', when: (data) => data.trabaja },
  ],
  4: [
    { key: 'colegio_procedencia', label: 'Colegio de Procedencia' },
    { key: 'año_egreso_colegio', label: 'Año de Egreso' },
    { key: 'tipo_sangre', label: 'Tipo de Sangre' },
    { key: 'seguro_salud', label: 'Seguro de Salud' },
    { key: 'contacto_emergencia_telefono', label: 'Teléfono de Emergencia' },
    { key: 'contacto_emergencia_nombre', label: 'Contacto de Emergencia (Nombre)' },
    { key: 'fecha_limite_documentos', label: 'Fecha Límite de Subsanación', when: (data) => !data.documentos_completos },
  ],
  5: [],
};

const createEmptyStudentForm = (programaId = '') => ({
  codigo_estudiante: '2026-' + Date.now().toString().slice(-6).padStart(6, '0'),
  dni: '', nombres: '', apellidos: '', programa_id: programaId ? String(programaId) : '',
  fecha_nacimiento: '', genero: 'Masculino', estado_civil: 'Soltero', nacionalidad: 'Peruana',
  foto_url: '',
  email_institucional: '', email_personal: '', telefono_movil: '', direccion_residencia: '',
  distrito: '', provincia: '', departamento: '',
  trabaja: false, ingreso_mensual: 0, tipo_vivienda: 'Alquilada', tiene_internet_en_casa: false,
  tipo_sangre: 'O+', seguro_salud: 'Ninguno', discapacidad: false,
  colegio_procedencia: '', año_egreso_colegio: 2023,
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
  nombre_padre: '', nombre_madre: '', estado_academico: 'postulante',
  documentos_completos: true, fecha_limite_documentos: ''
});

const PROGRAMAS = [
  { id: 'ALL', label: 'Todos los Programas' },
  { id: '1', label: 'Administración de Operaciones Turísticas' },
  { id: '2', label: 'Asistencia Administrativa' },
  { id: '3', label: 'Contabilidad' },
  { id: '4', label: 'Construcción Civil' },
  { id: '5', label: 'Gestión Administrativa' },
  { id: '6', label: 'Desarrollo de Sistemas de Información' },
  { id: '7', label: 'Electricidad Industrial' },
  { id: '8', label: 'Enfermería Técnica' },
  { id: '9', label: 'Manejo Forestal' },
  { id: '10', label: 'Mecatrónica Automotriz' },
  { id: '11', label: 'Producción Agropecuaria' },
];

const PROGRAMAS_OPTIONS = [
  { value: '', label: 'Seleccione una carrera...' },
  ...PROGRAMAS.filter(programa => programa.id !== 'ALL').map(programa => ({
    value: programa.id,
    label: programa.label,
  })),
];

const getProgramaLabel = (programaId) => {
  const programa = PROGRAMAS.find(item => item.id === String(programaId));
  return programa ? programa.label : 'Sin carrera seleccionada';
};

const compareStudentsByCarrera = (a, b) => {
  const carreraA = a.programa_id ? getProgramaLabel(a.programa_id) : '';
  const carreraB = b.programa_id ? getProgramaLabel(b.programa_id) : '';
  if (!carreraA !== !carreraB) return carreraA ? -1 : 1;
  const porCarrera = carreraA.localeCompare(carreraB, 'es', { sensitivity: 'base' });
  if (porCarrera !== 0) return porCarrera;
  const porApellidos = String(a.apellidos ?? '').localeCompare(String(b.apellidos ?? ''), 'es', { sensitivity: 'base' });
  if (porApellidos !== 0) return porApellidos;
  return String(a.nombres ?? '').localeCompare(String(b.nombres ?? ''), 'es', { sensitivity: 'base' });
};

function ProgramaFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = PROGRAMAS.find(p => String(p.id) === String(value)) || PROGRAMAS[0];
  const isAll = selected.id === 'ALL';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full md:w-80">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group w-full flex items-center gap-3 h-[56px] pl-3 pr-4 rounded-xl border-2 bg-gradient-to-r from-white to-primary/5 shadow-md transition-all duration-200
          ${open ? 'border-primary ring-4 ring-primary/15 shadow-lg shadow-primary/25' : 'border-primary/30 shadow-primary/10 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20'}`}
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md transition-all
          ${isAll ? 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/30' : 'bg-gradient-to-br from-primary to-primary-dark shadow-primary/40'}`}>
          {isAll ? <LayoutGrid size={18} /> : <GraduationCap size={18} />}
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary/70 leading-none mb-1">Programa de Estudio</span>
          <span className="block text-sm font-bold text-slate-text truncate">{selected.label}</span>
        </span>
        {!isAll && (
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold shadow-sm shadow-primary/40">
            {selected.id}
          </span>
        )}
        <ChevronDown size={18} className={`flex-shrink-0 text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full origin-top rounded-xl border border-primary/20 bg-white/95 backdrop-blur-md shadow-2xl shadow-primary/15 overflow-hidden animate-fade-in-up">
          <div className="px-4 py-2.5 bg-gradient-to-r from-primary/5 to-transparent border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Filtrar por programa</span>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar p-1.5" role="listbox">
            {PROGRAMAS.map(p => {
              const active = String(p.id) === String(value);
              const all = p.id === 'ALL';
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors
                    ${active ? 'bg-primary-soft text-primary-dark font-bold' : 'text-slate-600 font-medium hover:bg-slate-100'}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                    ${active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {active ? <Check size={15} /> : all ? <LayoutGrid size={14} /> : <GraduationCap size={14} />}
                  </span>
                  <span className="flex-1 truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentMaster() {
  const { user } = useAuth();
  const userRoles = user?.roles ? user.roles.map(r => typeof r === 'string' ? r : r.nombre || r.name) : [];
  const primaryRole = user?.is_superuser ? 'superadmin' : (userRoles.length > 0 ? userRoles[0] : (user?.role || 'invitado'));
  const userRole = primaryRole;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPrograma, setCurrentPrograma] = useState('ALL');
  const [stepDir, setStepDir] = useState('forward');
  const [loadError, setLoadError] = useState(null);
  const wizardBodyRef = useRef(null);

  const [form, setForm] = useState(() => createEmptyStudentForm());
  const [submitting, setSubmitting] = useState(false);

  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    if (wizardBodyRef.current) {
      wizardBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [wizardStep, showMissing]);

  const isBlank = (key) => {
    const value = form[key];
    return value === undefined || value === null || String(value).trim() === '';
  };
  const isFieldMissing = (field) => {
    if (field.when && !field.when(form)) return false;
    if (field.key === 'ingreso_mensual') return !(Number(form.ingreso_mensual) > 0);
    return isBlank(field.key);
  };
  const missingBySector = (stepId) => (SECTOR_REQUIRED[stepId] || []).filter(isFieldMissing);
  const sectorHasMissing = (stepId) => missingBySector(stepId).length > 0;
  const defaultProgramaId = () => {
    if (currentPrograma !== 'ALL') return currentPrograma;
    if (form.programa_id) return form.programa_id;
    return user?.programa_id ? String(user.programa_id) : '';
  };

  useEffect(() => {
    if (userRole !== 'invitado') {
      if (userRole === 'secretaria_programa' && currentPrograma === 'ALL') {
        const fallbackId = user?.email === 'secretaria_prog@siga.edu' ? '2' : '1';
        setCurrentPrograma(user?.programa_id ? String(user.programa_id) : fallbackId);
      } else {
        handleSearch(searchTerm);
      }
    }
  }, [currentPrograma, userRole]);

  useEffect(() => {
    if (!showModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showModal]);

  const handleSearch = async (val = '') => {
    setSearchTerm(val);
    setLoading(true);
    setLoadError(null);
    try {
      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;

      if (currentPrograma && currentPrograma !== 'ALL') {
        url += `?programa_id=${currentPrograma}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!res.ok) {
        let detalle = `El servicio de estudiantes respondio ${res.status}.`;
        try {
          const cuerpo = await res.json();
          detalle = cuerpo.detail || cuerpo.message || detalle;
        } catch { /* cuerpo no-JSON */ }
        console.error('API Error:', detalle);
        setStudents([]);
        setLoadError(detalle);
        setLoading(false);
        return;
      }

      if (res.headers.get('X-Fallback') === 'true') {
        const detalle = res.headers.get('X-Fallback-Message')
          || 'El servicio de estudiantes respondio con datos degradados.';
        console.error('Respuesta degradada:', detalle);
        setStudents([]);
        setLoadError(detalle);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const dataArray = Array.isArray(data) ? data : [];
      const sorted = [...dataArray].sort(compareStudentsByCarrera);

      const term = String(val || '').trim();
      if (term.length >= 3) {
        const lowerTerm = term.toLowerCase();
        const filtered = sorted.filter(s => {
          const dni = String(s.dni ?? '');
          const nombres = String(s.nombres ?? '').toLowerCase();
          const apellidos = String(s.apellidos ?? '').toLowerCase();
          const codigo = String(s.codigo_estudiante ?? '');
          return dni.includes(term)
            || nombres.includes(lowerTerm)
            || apellidos.includes(lowerTerm)
            || codigo.includes(term);
        });
        setStudents(filtered);
      } else {
        setStudents(sorted);
      }
    } catch (e) {
      console.error(e);
      setStudents([]);
      setLoadError('No se pudo conectar con el servidor. Verifique que el backend este levantado.');
    }
    setLoading(false);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecciona un archivo de imagen válido (JPG o PNG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 240;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm({ ...form, foto_url: canvas.toDataURL('image/jpeg', 0.82) });
      };
      img.onerror = () => alert('No se pudo leer la imagen seleccionada.');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleDepartamentoChange = (departamento) => {
    setForm(prev => ({ ...prev, departamento, provincia: '', distrito: '' }));
  };

  const handleProvinciaChange = (provincia) => {
    setForm(prev => ({ ...prev, provincia, distrito: '' }));
  };

  const handleDistritoChange = (distrito) => {
    setForm(prev => ({ ...prev, distrito }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const firstInvalid = WIZARD_STEPS.find(step => sectorHasMissing(step.id));
    if (firstInvalid) {
      setShowMissing(true);
      setStepDir(firstInvalid.id < wizardStep ? 'back' : 'forward');
      setWizardStep(firstInvalid.id);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Tu sesión expiró. Vuelve a iniciar sesión para registrar al estudiante.');
      window.location.reload();
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.foto_url === '') payload.foto_url = null;
      if (payload.fecha_nacimiento === '') payload.fecha_nacimiento = null;
      if (payload.email_institucional === '') payload.email_institucional = null;
      if (payload.email_personal === '') payload.email_personal = null;

      payload.celular = payload.telefono_movil;
      payload.direccion_domicilio = payload.direccion_residencia;
      if (payload.fecha_limite_documentos === '') payload.fecha_limite_documentos = null;

      const programaId = form.programa_id
        || (currentPrograma !== 'ALL' ? currentPrograma : (user?.programa_id ? String(user.programa_id) : ''));
      if (programaId) payload.programa_id = Number(programaId);
      else delete payload.programa_id;

      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setForm(createEmptyStudentForm(form.programa_id));
        setWizardStep(1);
        setShowMissing(false);
        handleSearch('');
        return;
      }

      const errorText = await res.text();
      console.error("Error creating student:", errorText);

      if (res.status === 401) {
        localStorage.removeItem('token');
        alert('Tu sesión expiró. Vuelve a iniciar sesión para registrar al estudiante.');
        window.location.reload();
        return;
      }

      let mensaje = `No se pudo registrar al estudiante (HTTP ${res.status}).`;
      try {
        const data = JSON.parse(errorText);
        if (Array.isArray(data.detail)) {
          mensaje = data.detail
            .map(item => `${(item.loc || []).slice(-1)[0] || 'campo'}: ${item.msg}`)
            .join('\n');
        } else if (typeof data.detail === 'string') {
          mensaje = data.detail;
        } else if (data.detail) {
          mensaje = JSON.stringify(data.detail);
        }
      } catch {
        if (errorText) mensaje = errorText;
      }
      alert(`No se pudo registrar al estudiante.\n\n${mensaje}`);
    } catch (e) {
      console.error(e);
      alert("Error de conexión al registrar el estudiante.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSincronizar = async () => {
    if (userRole !== 'superadmin' && userRole !== 'admin') {
      alert("Solo el Super Admin puede ejecutar la ingesta de Admisión.");
      return;
    }

    if (!window.confirm("¿Sincronizar lista de ingresantes desde el módulo de Admisión?")) return;
    setLoading(true);
    try {
      // via gateway, do not puncture the module directly
      const resAdmision = await fetch(`${API_BASE}/api/mod-admision/admitidos`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!resAdmision.ok) throw new Error("No se pudo conectar con Admisión Piloto");
      let admisionData = await resAdmision.json();

      if (admisionData.admitidos.length === 0) {
        alert("No se encontraron ingresantes para el programa seleccionado.");
        setLoading(false);
        return;
      }

      const resIngesta = await fetch(`${API_BASE}/api/mod-gestion-academica/admision/ingesta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(admisionData)
      });

      if (resIngesta.ok) {
        const result = await resIngesta.json();
        alert(`Sincronización exitosa. ${result.estudiantes_creados} nuevos estudiantes ingresados al Core.`);
        handleSearch('');
      } else {
        const err = await resIngesta.text();
        alert(`Error en la ingesta: ${err}`);
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (sectorHasMissing(wizardStep)) {
      setShowMissing(true);
      return;
    }
    setShowMissing(false);
    setStepDir('forward');
    setWizardStep(wizardStep + 1);
  };

  const handleBack = () => {
    setShowMissing(false);
    setStepDir('back');
    setWizardStep(wizardStep - 1);
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 animate-sector-badge">
                <UserPlus size={20} />
              </span>
              <div>
                <h6 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-xs uppercase tracking-wide">SECTOR 1</span>
                  <span>Identidad Básica</span>
                </h6>
                <p className="text-xs font-semibold text-slate-700">Datos de identificación personal y programa de estudios</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-900 border border-slate-300">
              Paso 1 de 5
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-5 sm:gap-6 items-start bg-slate-50/90 border-2 border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <label className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden block
                ${form.foto_url ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-300 bg-white hover:border-primary hover:bg-primary/5'} transition-all`}>
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto del estudiante" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-primary transition-colors">
                    <Camera size={26} className="text-slate-500" />
                    <span className="text-[11px] font-black uppercase tracking-wide text-center px-2 text-slate-950">Subir Foto</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
              </label>
              {form.foto_url && (
                <button
                  type="button"
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-black text-rose-600 hover:text-rose-800 transition-colors"
                  onClick={() => setForm({ ...form, foto_url: '' })}
                >
                  <Trash2 size={13} /> Quitar foto
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <SearchSelect
                  label="Carrera / Programa de Estudios"
                  icon={GraduationCap}
                  required
                  showMissing={showMissing}
                  options={PROGRAMAS_OPTIONS}
                  value={form.programa_id}
                  onChange={(programaId) => setForm({ ...form, programa_id: programaId })}
                  placeholder="Buscar carrera..."
                />
              </div>
              <div className="sm:col-span-2">
                <InputGroup label="Nombres" required showMissing={showMissing} value={form.nombres} onChange={e=>setForm({...form, nombres: e.target.value})} placeholder="Nombres completos" />
              </div>
              <InputGroup label="Apellidos" required showMissing={showMissing} value={form.apellidos} onChange={e=>setForm({...form, apellidos: e.target.value})} placeholder="Apellidos paterno y materno" />
              <InputGroup label="Código de Estudiante" icon={GraduationCap} required showMissing={showMissing} value={form.codigo_estudiante} onChange={e=>setForm({...form, codigo_estudiante: e.target.value})} placeholder="2026-000123" />
              <InputGroup label="DNI / Documento" required showMissing={showMissing} value={form.dni} onChange={e=>setForm({...form, dni: e.target.value})} placeholder="8 dígitos" />
              <InputGroup label="Fecha de Nacimiento" type="date" required showMissing={showMissing} value={form.fecha_nacimiento} onChange={e=>setForm({...form, fecha_nacimiento: e.target.value})} />
              <InputGroup label="Género" options={['Masculino', 'Femenino', 'Otro']} required showMissing={showMissing} value={form.genero} onChange={e=>setForm({...form, genero: e.target.value})} />
              <InputGroup label="Estado Civil" options={['Soltero', 'Casado', 'Conviviente', 'Viudo', 'Divorciado']} required showMissing={showMissing} value={form.estado_civil} onChange={e=>setForm({...form, estado_civil: e.target.value})} />
              <InputGroup label="Nacionalidad" required showMissing={showMissing} value={form.nacionalidad} onChange={e=>setForm({...form, nacionalidad: e.target.value})} />
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 animate-sector-badge">
                <Mail size={20} />
              </span>
              <div>
                <h6 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-xs uppercase tracking-wide">SECTOR 2</span>
                  <span>Contacto y Ubicación</span>
                </h6>
                <p className="text-xs font-semibold text-slate-700">Medios de contacto directo y datos de domicilio</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-900 border border-slate-300">
              Paso 2 de 5
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/90 border-2 border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="sm:col-span-2 lg:col-span-3">
              <InputGroup label="Dirección de Residencia" icon={MapPin} required showMissing={showMissing} value={form.direccion_residencia} onChange={e=>setForm({...form, direccion_residencia: e.target.value})} placeholder="Calle, Av., N°, Urbanización" />
            </div>
            <SearchSelect
              label="Departamento"
              icon={MapPin}
              required
              showMissing={showMissing}
              options={DEPARTAMENTOS}
              value={form.departamento}
              onChange={handleDepartamentoChange}
              placeholder="Buscar departamento..."
            />
            <SearchSelect
              label="Provincia"
              required
              showMissing={showMissing}
              options={getProvincias(form.departamento)}
              value={form.provincia}
              onChange={handleProvinciaChange}
              placeholder={form.departamento ? 'Buscar provincia...' : 'Elija departamento'}
              disabled={!form.departamento}
            />
            <SearchSelect
              label="Distrito"
              required
              showMissing={showMissing}
              options={getDistritos(form.departamento, form.provincia)}
              value={form.distrito}
              onChange={handleDistritoChange}
              placeholder={form.provincia ? 'Buscar distrito...' : 'Elija provincia'}
              disabled={!form.provincia}
            />
            <InputGroup label="Celular / Móvil" icon={Phone} required showMissing={showMissing} value={form.telefono_movil} onChange={e=>setForm({...form, telefono_movil: e.target.value})} placeholder="9## ### ###" />
            <div className="sm:col-span-2 lg:col-span-2">
              <InputGroup label="Email Personal" icon={Mail} type="email" required showMissing={showMissing} value={form.email_personal} onChange={e=>setForm({...form, email_personal: e.target.value})} placeholder="correo.estudiante@gmail.com" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <InputGroup label="Email Institucional" icon={Mail} type="email" required showMissing={showMissing} value={form.email_institucional} onChange={e=>setForm({...form, email_institucional: e.target.value})} placeholder="usuario@siga.edu.pe" />
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 animate-sector-badge">
                <MapPin size={20} />
              </span>
              <div>
                <h6 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-xs uppercase tracking-wide">SECTOR 3</span>
                  <span>Perfil Socioeconómico</span>
                </h6>
                <p className="text-xs font-semibold text-slate-700">Información para el censo socioeconómico institucional</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-900 border border-slate-300">
              Paso 3 de 5
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-50/90 border-2 border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <CheckboxGroup label="¿Trabaja Actualmente?" checked={form.trabaja} onChange={e=>setForm({...form, trabaja: e.target.checked})} />
            {form.trabaja && <InputGroup label="Ingreso Mensual Estimado (S/.)" type="number" required showMissing={showMissing} value={form.ingreso_mensual} onChange={e=>setForm({...form, ingreso_mensual: e.target.value})} placeholder="S/. 0.00" />}
            <InputGroup label="Tipo de Vivienda" options={['Propia', 'Alquilada', 'Cedida']} required showMissing={showMissing} value={form.tipo_vivienda} onChange={e=>setForm({...form, tipo_vivienda: e.target.value})} />
            <CheckboxGroup label="¿Tiene Internet en casa?" checked={form.tiene_internet_en_casa} onChange={e=>setForm({...form, tiene_internet_en_casa: e.target.checked})} />
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 animate-sector-badge">
                <FileCheck2 size={20} />
              </span>
              <div>
                <h6 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-xs uppercase tracking-wide">SECTOR 4</span>
                  <span>Salud y Antecedentes</span>
                </h6>
                <p className="text-xs font-semibold text-slate-700">Procedencia escolar, datos de salud y validación de expediente</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-900 border border-slate-300">
              Paso 4 de 5
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/90 border-2 border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <InputGroup label="Colegio de Procedencia" required showMissing={showMissing} value={form.colegio_procedencia} onChange={e=>setForm({...form, colegio_procedencia: e.target.value})} placeholder="Nombre del colegio secundario" />
            <InputGroup label="Año de Egreso" type="number" required showMissing={showMissing} value={form.año_egreso_colegio} onChange={e=>setForm({...form, año_egreso_colegio: e.target.value})} />
            <InputGroup label="Tipo de Sangre" required showMissing={showMissing} value={form.tipo_sangre} onChange={e=>setForm({...form, tipo_sangre: e.target.value})} placeholder="Ej. O+, A+" />
            <InputGroup label="Seguro de Salud" options={['Ninguno', 'SIS', 'EsSalud', 'Privado']} required showMissing={showMissing} value={form.seguro_salud} onChange={e=>setForm({...form, seguro_salud: e.target.value})} />
            <InputGroup label="Teléfono de Emergencia" icon={Phone} required showMissing={showMissing} value={form.contacto_emergencia_telefono} onChange={e=>setForm({...form, contacto_emergencia_telefono: e.target.value})} placeholder="9## ### ###" />
            <InputGroup label="Contacto de Emergencia (Nombre)" required showMissing={showMissing} value={form.contacto_emergencia_nombre} onChange={e=>setForm({...form, contacto_emergencia_nombre: e.target.value})} placeholder="Familiar o apoderado" />

            <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t-2 border-slate-200 mt-2">
              <h6 className="font-black text-slate-950 mb-4 text-xs uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 size={16} className="text-primary" /> Validación de Expediente Físico
              </h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CheckboxGroup label="¿Entregó todos los documentos?" checked={form.documentos_completos} onChange={e=>setForm({...form, documentos_completos: e.target.checked})} />
                {!form.documentos_completos && (
                  <InputGroup label="Fecha Límite de Subsanación" type="date" required showMissing={showMissing} value={form.fecha_limite_documentos} onChange={e=>setForm({...form, fecha_limite_documentos: e.target.value})} />
                )}
              </div>
            </div>
          </div>
        </div>
      );
      case 5: return (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 w-full max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 animate-sector-badge">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <h6 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-xs uppercase tracking-wide">SECTOR 5</span>
                  <span>Revisión y Confirmación</span>
                </h6>
                <p className="text-xs font-semibold text-slate-700">Verifica la información registrada antes de ingresarla al sistema</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
              Paso Final
            </span>
          </div>

          <div className="bg-slate-50/90 border-2 border-slate-200 rounded-2xl p-5 sm:p-7 w-full max-w-3xl shadow-sm">
            {form.foto_url && (
              <div className="flex justify-center pb-5">
                <img src={form.foto_url} alt="Foto del estudiante" className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-white ring-4 ring-primary/20" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div className="sm:col-span-2 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1 flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-primary" /> Estudiante
                </span>
                <span className="block font-black text-slate-950 text-base sm:text-lg break-words">{form.nombres} {form.apellidos}</span>
              </div>
              <div className="sm:col-span-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                  <GraduationCap size={14} /> Carrera / Programa de Estudios
                </span>
                <span className="block text-slate-950 font-black break-words">{getProgramaLabel(form.programa_id)}</span>
              </div>
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3.5 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1">Identidad</span>
                <span className="block text-slate-950 font-bold break-words">DNI: {form.dni || '—'} · Código: {form.codigo_estudiante || 'Sin código'}</span>
              </div>
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3.5 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1">Ubicación</span>
                <span className="block text-slate-950 font-bold break-words">{form.distrito || '—'}, {form.departamento || '—'}</span>
              </div>
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3.5 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1">Contacto</span>
                <span className="block text-slate-950 font-bold break-all">Móvil: {form.telefono_movil || '—'} {form.email_personal ? '· ' + form.email_personal : ''}</span>
              </div>
              <div className="rounded-xl border-2 border-slate-200 bg-white p-3.5 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1">Salud</span>
                <span className="block text-slate-950 font-bold">Seguro: {form.seguro_salud} · Sangre: {form.tipo_sangre}</span>
              </div>
              <div className="sm:col-span-2 rounded-xl border-2 border-slate-200 bg-white p-3.5 shadow-sm">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1">Socioeconómico</span>
                <span className="block text-slate-950 font-bold">{form.trabaja ? 'Condición: Trabajador' : 'Condición: No trabaja'} · Vivienda: {form.tipo_vivienda} · Internet: {form.tiene_internet_en_casa ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 bg-primary-soft text-primary-dark p-4 rounded-xl text-sm border-2 border-primary/25 flex gap-3 w-full max-w-3xl shadow-sm">
            <Info size={20} className="flex-shrink-0 mt-0.5 text-primary" />
            <p className="font-bold text-slate-950">Al guardar, se creará el expediente institucional del estudiante en la base de datos central.</p>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in lg:flex lg:flex-col lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-secondary p-5 sm:p-6 mb-6 shadow-xl shadow-primary/25 lg:shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${techBg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/85 via-primary-dark/65 to-primary/55 pointer-events-none"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-6 w-48 h-48 rounded-full bg-secondary/30 blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
              <GraduationCap size={26} />
            </span>
            <div className="min-w-0">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Registro de Estudiantes
              </h3>
              <p className="text-white/80 text-sm mt-1">Censo Institucional y Registro Maestro de Identidad</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                  <Users size={13} /> {students.length} registrados
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                  <CheckCircle2 size={13} /> Maestro de Datos
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {['superadmin', 'admin'].includes(userRole) && (
              <button
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white font-semibold text-sm backdrop-blur-sm hover:bg-white/25 active:scale-[0.98] transition-all duration-200 min-h-[44px] w-full sm:w-auto"
                onClick={handleSincronizar}
              >
                <CloudDownload size={18} className="shrink-0" />
                <span className="whitespace-nowrap">Sincronizar desde Admisión</span>
              </button>
            )}
            <button
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary font-bold text-sm shadow-lg shadow-black/10 hover:bg-primary-soft active:scale-[0.98] transition-all duration-200 min-h-[44px] w-full sm:w-auto"
              onClick={() => {
                setForm(createEmptyStudentForm(defaultProgramaId()));
                setWizardStep(1);
                setStepDir('forward');
                setShowMissing(false);
                setShowModal(true);
              }}
            >
              <Plus size={18} className="shrink-0" />
              <span>Registrar Estudiante</span>
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-3 mb-6 flex flex-col md:flex-row md:items-center gap-3 relative z-30 lg:shrink-0">
        {['superadmin', 'admin', 'secretaria_academica', 'admin_admision'].includes(userRole) && (
          <ProgramaFilter value={currentPrograma} onChange={setCurrentPrograma} />
        )}
        <div className="group flex-1 flex items-center gap-3 h-[56px] pl-3 pr-3 rounded-xl border-2 border-slate-200 bg-white shadow-md transition-all duration-200 focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/15 focus-within:shadow-lg focus-within:shadow-primary/10">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/40 transition-transform duration-200 group-focus-within:scale-105">
            <Search size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-primary/70 leading-none mb-1">Buscar Estudiante</span>
            <input
              type="text"
              className="w-full bg-transparent border-none focus:ring-0 focus:shadow-none p-0 text-sm font-medium text-slate-text placeholder:text-slate-400 outline-none"
              placeholder="DNI, nombre o código..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="w-5 h-5 shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          ) : (
            students.length > 0 && (
              <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-soft text-primary-dark text-xs font-bold border border-primary/15">
                <Users size={13} className="text-primary" /> {students.length}
              </span>
            )
          )}
          {searchTerm.length > 0 && (
            <button
              onClick={() => handleSearch('')}
              aria-label="Limpiar busqueda"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-3 lg:shrink-0">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">No se pudieron cargar los estudiantes</p>
            <p className="mt-0.5 text-red-700">{loadError}</p>
          </div>
          <button
            onClick={() => handleSearch(searchTerm)}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="glass-card overflow-hidden lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[70vh] lg:max-h-none lg:flex-1 lg:min-h-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Carrera</th>
                <th>DNI</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                      <Users size={30} />
                    </div>
                    <p className="text-slate-500 font-medium">
                      {loadError
                        ? 'Datos no disponibles'
                        : 'No se encontraron estudiantes registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <ProtectedImage
                          src={s.foto_url}
                          alt={`${s.nombres} ${s.apellidos}`}
                          className="w-9 h-9 rounded-full border border-primary/20 mr-3 flex-shrink-0 overflow-hidden bg-white"
                          lazy
                          fallback={
                            <div className="w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {s.nombres[0]}{s.apellidos[0]}
                            </div>
                          }
                        />
                        <div>
                          <p className="font-bold text-slate-text text-sm">{s.nombres} {s.apellidos}</p>
                          <p className="text-xs text-slate-500">{s.email_personal || s.email_institucional || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className="inline-block max-w-[220px] truncate align-middle rounded-md border border-primary/15 bg-primary/5 px-2 py-1 text-sm font-semibold text-primary-dark"
                        title={s.programa_id ? getProgramaLabel(s.programa_id) : 'Sin carrera'}
                      >
                        {s.programa_id ? getProgramaLabel(s.programa_id) : 'Sin carrera'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{s.dni}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`badge ${s.estado_academico === 'postulante' ? 'badge-amber' : 'badge-green'}`}>
                        {s.estado_academico}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingStudent(s)}
                          className="text-amber-600 hover:text-amber-800 text-sm font-semibold flex items-center gap-1"
                          title="Corregir Errores de Tipeo"
                        >
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center gap-1"
                        >
                          Ver Detalle <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Multi-Step Wizard Modal */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="glass-card w-full sm:max-w-5xl lg:max-w-6xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden bg-white shadow-2xl animate-fade-in-up">

            <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-primary to-secondary shrink-0">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
                style={{ backgroundImage: `url(${techBg})` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/80 via-primary-dark/40 to-primary/10 pointer-events-none"></div>
              <div className="relative flex justify-between items-center gap-4 px-5 sm:px-8 py-6 sm:py-9 min-h-[106px] sm:min-h-[144px]">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center flex-shrink-0">
                    <UserPlus size={22} />
                  </span>
                  <div className="min-w-0">
                    <h5 className="font-bold text-lg sm:text-2xl text-white tracking-tight truncate">Nuevo Registro de Estudiante</h5>
                    <p className="text-white/75 text-xs sm:text-sm truncate">Censo Institucional · Maestro de Identidad</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0" aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stepper con puentes de avance y alertas por sector */}
            <div className="px-4 sm:px-8 py-4 sm:py-5 bg-slate-50 border-b border-slate-200 shrink-0">
              <p className="sm:hidden text-center text-xs font-black text-slate-950 mb-3 uppercase tracking-wider">
                Sector {wizardStep} de 5: <span className="text-primary font-black">{WIZARD_STEPS.find(s => s.id === wizardStep)?.label}</span>
                {sectorHasMissing(wizardStep) && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black align-middle">
                    <span className="w-3.5 h-3.5 rounded-full bg-white text-amber-700 flex items-center justify-center">?</span>
                    {missingBySector(wizardStep).length} por completar
                  </span>
                )}
              </p>
              <div className="flex items-start justify-between px-1">
                {WIZARD_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = wizardStep === step.id;
                  const isDone = wizardStep > step.id;
                  const missing = missingBySector(step.id);
                  const hasMissing = missing.length > 0;
                  return (
                    <Fragment key={step.id}>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-12 sm:w-24 min-w-0">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-300 flex-shrink-0 ${
                            isActive
                              ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-110 ring-4 ring-primary/25'
                              : isDone
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'bg-white text-slate-700 border-2 border-slate-300'
                          }`}>
                            {isDone ? <CheckCircle2 size={20} className="stroke-[2.5]" /> : <StepIcon size={18} />}
                          </div>
                          {hasMissing && (
                            <span
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center ring-2 ring-white shadow-md animate-bounce-subtle"
                              title={`Faltan ${missing.length} dato(s): ${missing.map(field => field.label).join(', ')}`}
                            >
                              ?
                            </span>
                          )}
                        </div>
                        <span className={`hidden sm:block text-[11px] uppercase tracking-wider text-center leading-tight px-1 transition-colors duration-200 ${
                          isActive ? 'text-slate-950 font-black' : isDone ? 'text-slate-800 font-bold' : hasMissing ? 'text-amber-700 font-bold' : 'text-slate-500 font-semibold'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {index < WIZARD_STEPS.length - 1 && (
                        <SectorBridge fromStepId={step.id} currentStep={wizardStep} />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <div ref={wizardBodyRef} className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar bg-white">
              <div key={wizardStep} className={stepDir === 'back' ? 'animate-step-in-left-vibrant' : 'animate-step-in-right-vibrant'}>
                {sectorHasMissing(wizardStep) && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-amber-500 text-white font-black flex items-center justify-center flex-shrink-0 animate-bounce-subtle">?</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-amber-900">Faltan datos por completar en este sector</p>
                      <p className="text-xs font-semibold text-amber-800 break-words">
                        {missingBySector(wizardStep).map(field => field.label).join(' · ')}
                      </p>
                    </div>
                  </div>
                )}
                {renderWizardStep()}
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t-2 border-slate-200 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  className="px-5 sm:px-7 py-2.5 rounded-xl font-black text-slate-900 bg-white border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-sm sm:text-base transition-all shadow-sm"
                  onClick={handleBack}
                >
                  ← Anterior
                </button>
              ) : <div></div>}

              {wizardStep < 5 ? (
                <button
                  type="button"
                  className="btn-primary px-6 sm:px-9 py-2.5 !text-sm sm:!text-base font-black shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={handleNext}
                >
                  <span>Siguiente Sector</span>
                  <ChevronRight size={18} className="stroke-[3]" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  className={`btn-primary px-6 sm:px-9 py-2.5 !text-sm sm:!text-base font-black gap-2 shadow-lg shadow-primary/30 transition-all ${
                    submitting ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                  onClick={handleCreate}
                >
                  <Sparkles size={18} className="flex-shrink-0" />
                  <span className="truncate">{submitting ? 'Guardando Registro...' : 'Guardar Registro Completo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onUpdated={() => {
            setEditingStudent(null);
            handleSearch('');
          }}
        />
      )}

      {selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}