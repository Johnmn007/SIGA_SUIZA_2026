import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../core/auth/useAuth';
import { API_BASE } from '../../core/api/client';
import techBg from '../../assets/tech-bg.jpg';
import { EditStudentModal } from './EditStudentModal';
import { GraduationCap, Search, CloudDownload, Plus, Users, Pencil, ChevronRight, ChevronDown, Check, LayoutGrid, Info, X, Mail, Phone, MapPin, CheckCircle2, FileCheck2, UserPlus, Sparkles, Camera, Trash2 } from 'lucide-react';

const InputGroup = ({ label, icon: Icon = null, type = "text", value, onChange, options = null, placeholder = "" }) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
      {Icon && <Icon size={13} className="text-primary/60" />}
      {label}
    </label>
    {options ? (
      <select className="input-field py-2.5 text-sm" value={value} onChange={onChange}>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <input type={type} className="input-field py-2.5 text-sm" value={value} onChange={onChange} placeholder={placeholder} />
    )}
  </div>
);

const CheckboxGroup = ({ label, checked, onChange }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
    <label className="flex items-center space-x-3 cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
      <span className="text-sm font-semibold">{checked ? 'SÍ' : 'NO'}</span>
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

const estadoStyle = {
  postulante: 'badge-amber',
  matriculado: 'badge-green',
  activo: 'badge-green',
  inscrito: 'badge-blue',
  egresado: 'badge-slate',
};

const INITIAL_VISIBLE = 20;

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

function ProgramaFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = PROGRAMAS.find(p => p.id === value) || PROGRAMAS[0];
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
              const active = p.id === value;
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
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [stepDir, setStepDir] = useState('forward');
  const sentinelRef = useRef(null);
  const loadLockRef = useRef(false);

  const [form, setForm] = useState({
    codigo_estudiante: '', dni: '', nombres: '', apellidos: '',
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

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [students]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || students.length <= visibleCount) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadLockRef.current) {
        loadLockRef.current = true;
        setVisibleCount(c => (c < students.length ? c + 1 : c));
        window.setTimeout(() => { loadLockRef.current = false; }, 250);
      }
    }, { rootMargin: '0px 0px 120px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [students, visibleCount]);

  const handleSearch = async (val = '') => {
    setSearchTerm(val);
    setLoading(true);
    try {
      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;

      if (currentPrograma && currentPrograma !== 'ALL') {
        url += `?programa_id=${currentPrograma}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!res.ok) {
        console.error("API Error:", await res.text());
        setStudents([]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const dataArray = Array.isArray(data) ? data : [];
      const sorted = [...dataArray].sort((a, b) => Number(b.id) - Number(a.id));

      if (val.length >= 3) {
        const filtered = sorted.filter(s =>
          s.dni.includes(val) ||
          s.nombres.toLowerCase().includes(val.toLowerCase()) ||
          s.apellidos.toLowerCase().includes(val.toLowerCase()) ||
          s.codigo_estudiante.includes(val)
        );
        setStudents(filtered);
      } else {
        setStudents(sorted);
      }
    } catch (e) {
      console.error(e);
      setStudents([]);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.foto_url === '') payload.foto_url = null;
      if (payload.fecha_nacimiento === '') payload.fecha_nacimiento = null;
      if (payload.email_institucional === '') payload.email_institucional = null;
      if (payload.email_personal === '') payload.email_personal = null;

      payload.celular = payload.telefono_movil;
      payload.direccion_domicilio = payload.direccion_residencia;
      if (payload.fecha_limite_documentos === '') payload.fecha_limite_documentos = null;

      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setWizardStep(1);
        handleSearch('');
      } else {
        const errorText = await res.text();
        console.error("Error creating student:", errorText);
        alert(`Error al registrar el estudiante: ${errorText}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al registrar el estudiante.");
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
      const resAdmision = await fetch('http://localhost:8009/admitidos');
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

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1: return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center">
              <UserPlus size={18} />
            </span>
            <div>
              <h6 className="font-bold text-slate-text"><span className="text-primary">PASO 1</span> · Identidad Básica</h6>
              <p className="text-xs text-slate-500">Datos de identificación personal del postulante</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-5 sm:gap-6 items-start bg-slate-light/60 border border-slate-200/70 rounded-xl p-4 sm:p-5">
            <div className="flex md:block justify-center">
              <label className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden block
                ${form.foto_url ? 'border-primary bg-primary/5' : 'border-slate-300 bg-white hover:border-primary/50 hover:bg-primary/5'} transition-colors`}>
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto del estudiante" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Camera size={26} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-center px-2">Subir Foto</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
              </label>
              {form.foto_url && (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                  onClick={() => setForm({ ...form, foto_url: '' })}
                >
                  <Trash2 size={13} /> Quitar foto
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2"><InputGroup label="Nombres" value={form.nombres} onChange={e=>setForm({...form, nombres: e.target.value})} placeholder="Nombres completos" /></div>
              <InputGroup label="Apellidos" value={form.apellidos} onChange={e=>setForm({...form, apellidos: e.target.value})} placeholder="Apellidos paterno y materno" />
              <InputGroup label="Código de Estudiante" icon={GraduationCap} value={form.codigo_estudiante} onChange={e=>setForm({...form, codigo_estudiante: e.target.value})} placeholder="EST-000123" />
              <InputGroup label="DNI" value={form.dni} onChange={e=>setForm({...form, dni: e.target.value})} placeholder="########" />
              <InputGroup label="Fecha de Nacimiento" type="date" value={form.fecha_nacimiento} onChange={e=>setForm({...form, fecha_nacimiento: e.target.value})} />
              <InputGroup label="Género" options={['Masculino', 'Femenino', 'Otro']} value={form.genero} onChange={e=>setForm({...form, genero: e.target.value})} />
              <InputGroup label="Estado Civil" options={['Soltero', 'Casado', 'Conviviente', 'Viudo', 'Divorciado']} value={form.estado_civil} onChange={e=>setForm({...form, estado_civil: e.target.value})} />
              <InputGroup label="Nacionalidad" value={form.nacionalidad} onChange={e=>setForm({...form, nacionalidad: e.target.value})} />
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center">
              <Mail size={18} />
            </span>
            <div>
              <h6 className="font-bold text-slate-text"><span className="text-primary">PASO 2</span> · Contacto y Ubicación</h6>
              <p className="text-xs text-slate-500">Medios de contacto y datos de domicilio</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-light/60 border border-slate-200/70 rounded-xl p-4 sm:p-5">
            <div className="sm:col-span-2 lg:col-span-3">
              <InputGroup label="Dirección de Residencia" icon={MapPin} value={form.direccion_residencia} onChange={e=>setForm({...form, direccion_residencia: e.target.value})} placeholder="Calle, N°, Urbanización" />
            </div>
            <InputGroup label="Distrito" value={form.distrito} onChange={e=>setForm({...form, distrito: e.target.value})} />
            <InputGroup label="Provincia" value={form.provincia} onChange={e=>setForm({...form, provincia: e.target.value})} />
            <InputGroup label="Departamento" value={form.departamento} onChange={e=>setForm({...form, departamento: e.target.value})} />
            <InputGroup label="Celular / Móvil" icon={Phone} value={form.telefono_movil} onChange={e=>setForm({...form, telefono_movil: e.target.value})} placeholder="9## ### ###" />
            <div className="sm:col-span-2 lg:col-span-2">
              <InputGroup label="Email Personal" icon={Mail} type="email" value={form.email_personal} onChange={e=>setForm({...form, email_personal: e.target.value})} placeholder="correo@dominio.com" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <InputGroup label="Email Institucional" icon={Mail} type="email" value={form.email_institucional} onChange={e=>setForm({...form, email_institucional: e.target.value})} placeholder="usuario@siga.edu.pe" />
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center">
              <MapPin size={18} />
            </span>
            <div>
              <h6 className="font-bold text-slate-text"><span className="text-primary">PASO 3</span> · Perfil Socioeconómico</h6>
              <p className="text-xs text-slate-500">Información para el censo institucional (Fase 2)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-light/60 border border-slate-200/70 rounded-xl p-4 sm:p-5">
            <CheckboxGroup label="¿Trabaja Actualmente?" checked={form.trabaja} onChange={e=>setForm({...form, trabaja: e.target.checked})} />
            {form.trabaja && <InputGroup label="Ingreso Mensual Estimado (S/.)" type="number" value={form.ingreso_mensual} onChange={e=>setForm({...form, ingreso_mensual: e.target.value})} />}
            <InputGroup label="Tipo de Vivienda" options={['Propia', 'Alquilada', 'Cedida']} value={form.tipo_vivienda} onChange={e=>setForm({...form, tipo_vivienda: e.target.value})} />
            <CheckboxGroup label="¿Tiene Internet en casa?" checked={form.tiene_internet_en_casa} onChange={e=>setForm({...form, tiene_internet_en_casa: e.target.checked})} />
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center">
              <FileCheck2 size={18} />
            </span>
            <div>
              <h6 className="font-bold text-slate-text"><span className="text-primary">PASO 4</span> · Salud y Antecedentes</h6>
              <p className="text-xs text-slate-500">Procedencia escolar, salud y contacto de emergencia</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-light/60 border border-slate-200/70 rounded-xl p-4 sm:p-5">
            <InputGroup label="Colegio de Procedencia" value={form.colegio_procedencia} onChange={e=>setForm({...form, colegio_procedencia: e.target.value})} />
            <InputGroup label="Año de Egreso" type="number" value={form.año_egreso_colegio} onChange={e=>setForm({...form, año_egreso_colegio: e.target.value})} />
            <InputGroup label="Tipo de Sangre" value={form.tipo_sangre} onChange={e=>setForm({...form, tipo_sangre: e.target.value})} />
            <InputGroup label="Seguro de Salud" options={['Ninguno', 'SIS', 'EsSalud', 'Privado']} value={form.seguro_salud} onChange={e=>setForm({...form, seguro_salud: e.target.value})} />
            <InputGroup label="Teléfono de Emergencia" icon={Phone} value={form.contacto_emergencia_telefono} onChange={e=>setForm({...form, contacto_emergencia_telefono: e.target.value})} />
            <InputGroup label="Contacto de Emergencia (Nombre)" value={form.contacto_emergencia_nombre} onChange={e=>setForm({...form, contacto_emergencia_nombre: e.target.value})} />

            <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-slate-200 mt-2">
              <h6 className="font-bold text-slate-700 mb-4 text-xs uppercase flex items-center gap-2">
                <FileCheck2 size={14} className="text-primary" /> Validación de Expediente
              </h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CheckboxGroup label="¿Entregó todos los documentos?" checked={form.documentos_completos} onChange={e=>setForm({...form, documentos_completos: e.target.checked})} />
                {!form.documentos_completos && (
                  <InputGroup label="Fecha Límite de Subsanación" type="date" value={form.fecha_limite_documentos} onChange={e=>setForm({...form, fecha_limite_documentos: e.target.value})} />
                )}
              </div>
            </div>
          </div>
        </div>
      );
      case 5: return (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center gap-3 mb-6 self-start">
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </span>
            <h6 className="font-bold text-slate-text"><span className="text-primary">PASO 5</span> · Revisión de Datos</h6>
          </div>
          <div className="surface-card p-4 sm:p-6 w-full max-w-3xl">
            {form.foto_url && (
              <div className="flex justify-center pb-4">
                <img src={form.foto_url} alt="Foto del estudiante" className="w-20 h-20 rounded-full object-cover shadow-md shadow-primary/20" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-primary" /> Alumno
                </span>
                <span className="block font-bold text-slate-900 break-words">{form.nombres} {form.apellidos}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Identidad</span>
                <span className="block text-slate-700 break-words">DNI {form.dni || '—'} · {form.codigo_estudiante || 'Sin código'}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ubicación</span>
                <span className="block text-slate-700 break-words">{form.distrito || '—'}, {form.departamento || '—'}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Contacto</span>
                <span className="block text-slate-700 break-all">{form.telefono_movil || '—'} {form.email_personal ? '· ' + form.email_personal : ''}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Salud</span>
                <span className="block text-slate-700">Seguro {form.seguro_salud}</span>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Socioeconómico</span>
                <span className="block text-slate-700">{form.trabaja ? 'Trabajador' : 'No trabaja'} · Vivienda {form.tipo_vivienda}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 bg-primary-soft text-primary-dark p-4 rounded-xl text-sm border border-primary/20 flex gap-3 w-full max-w-3xl">
            <Info size={20} className="flex-shrink-0 mt-0.5" />
            <p>Al guardar, se creará el perfil único e inmutable en el Maestro de Datos.</p>
          </div>
        </div>
      );
      default: return null;
    }
  };

  const visibleStudents = students.slice(0, visibleCount);

  return (
    <div className="animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-secondary p-5 sm:p-6 mb-6 shadow-xl shadow-primary/25">
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
              onClick={() => { setForm({...form, codigo_estudiante: 'EST-'+Date.now().toString().slice(-6)}); setShowModal(true); }}
            >
              <Plus size={18} className="shrink-0" />
              <span>Registrar Estudiante</span>
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-3 mb-6 flex flex-col md:flex-row md:items-center gap-3 relative z-30">
        {['superadmin', 'admin'].includes(userRole) && (
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

      <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden relative z-0">
        {/* Vista tabla (lg+) */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="data-table">
            <thead>
              <tr>
                <th className="!bg-slate-200 !text-slate-700 !border-b !border-slate-300">Estudiante</th>
                <th className="!bg-slate-200 !text-slate-700 !border-b !border-slate-300">Código</th>
                <th className="!bg-slate-200 !text-slate-700 !border-b !border-slate-300">DNI</th>
                <th className="!bg-slate-200 !text-slate-700 !border-b !border-slate-300">Contacto</th>
                <th className="!bg-slate-200 !text-slate-700 !border-b !border-slate-300">Estado</th>
                <th className="!bg-slate-200 !text-slate-700 !border-b !border-slate-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                      <Users size={30} />
                    </div>
                    <p className="text-slate-500 font-medium">No se encontraron estudiantes registrados</p>
                    {!loading && (
                      <button className="btn-primary mt-4 inline-flex" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Registrar el primer estudiante
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleStudents.map(s => (
                  <tr key={s.id} className="odd:bg-white even:bg-slate-100 hover:bg-slate-200 transition-colors group">
                    <td className="py-4 px-4 xl:px-6">
                      <div className="flex items-center min-w-0">
                        {s.foto_url ? (
                          <img src={s.foto_url} alt={`Foto de ${s.nombres} ${s.apellidos}`} className="w-10 h-10 rounded-full object-cover mr-3 shadow-sm shadow-primary/30 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-xs mr-3 shadow-sm shadow-primary/30 flex-shrink-0">
                            {s.nombres[0]}{s.apellidos[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{s.nombres} {s.apellidos}</p>
                          <p className="text-xs text-slate-500 truncate">{s.email_personal || s.email_institucional || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 xl:px-6">
                      <span className="font-semibold text-slate-800 text-sm bg-slate-300/70 px-2 py-1 rounded whitespace-nowrap">{s.codigo_estudiante}</span>
                    </td>
                    <td className="py-4 px-4 xl:px-6">
                      <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{s.dni}</span>
                    </td>
                    <td className="py-4 px-4 xl:px-6">
                      <div className="flex flex-col space-y-1 text-xs text-slate-600">
                        {s.telefono_movil && <span className="flex items-center gap-1.5"><Phone size={12} className="text-primary/50 flex-shrink-0" /> {s.telefono_movil}</span>}
                        {s.distrito && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary/50 flex-shrink-0" /> {s.distrito}</span>}
                        {!s.telefono_movil && !s.distrito && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 xl:px-6">
                      <span className={`badge ${estadoStyle[s.estado_academico] || 'badge-slate'}`}>
                        {s.estado_academico || 'Sin estado'}
                      </span>
                    </td>
                    <td className="py-4 px-4 xl:px-6 text-right">
                      <div className="flex justify-end gap-3 lg:gap-2 xl:gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingStudent(s)}
                          className="text-amber-600 hover:text-amber-800 text-sm font-semibold flex items-center gap-1"
                          title="Corregir Errores de Tipeo"
                        >
                          <Pencil size={14} className="flex-shrink-0" /> Editar
                        </button>
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="text-primary hover:text-primary-dark text-sm font-semibold flex items-center gap-1"
                        >
                          Ver Detalle <ChevronRight size={14} className="flex-shrink-0" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Vista tarjetas (móvil / tablet) */}
        <div className="lg:hidden p-3 sm:p-4 space-y-3">
          {students.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                <Users size={30} />
              </div>
              <p className="text-slate-500 font-medium">No se encontraron estudiantes registrados</p>
              {!loading && (
                <button className="btn-primary mt-4 inline-flex" onClick={() => setShowModal(true)}>
                  <Plus size={16} /> Registrar el primer estudiante
                </button>
              )}
            </div>
          ) : (
            visibleStudents.map(s => (
              <div key={s.id} className="bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-300 rounded-xl shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:border-slate-400 transition-all">
                <div className="flex items-start gap-3">
                  {s.foto_url ? (
                    <img src={s.foto_url} alt={`Foto de ${s.nombres} ${s.apellidos}`} className="w-11 h-11 rounded-full object-cover mr-1 shadow-sm shadow-primary/30 flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-xs mr-1 shadow-sm shadow-primary/30 flex-shrink-0">
                      {s.nombres[0]}{s.apellidos[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{s.nombres} {s.apellidos}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email_personal || s.email_institucional || 'Sin correo'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="font-semibold text-slate-800 text-xs bg-slate-300/70 px-2 py-0.5 rounded">{s.codigo_estudiante}</span>
                      <span className="text-xs font-medium text-slate-700">{s.dni}</span>
                      <span className={`badge ${estadoStyle[s.estado_academico] || 'badge-slate'}`}>
                        {s.estado_academico || 'Sin estado'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-700 border-t border-slate-300 pt-2">
                  {s.telefono_movil && <span className="flex items-center gap-1.5"><Phone size={12} className="text-primary/50" /> {s.telefono_movil}</span>}
                  {s.distrito && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary/50" /> {s.distrito}</span>}
                  {!s.telefono_movil && !s.distrito && <span className="text-slate-400">—</span>}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setEditingStudent(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 border border-amber-200 text-amber-600 hover:bg-amber-50 text-sm font-semibold py-2 rounded-lg transition-colors"
                    title="Corregir Errores de Tipeo"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => setSelectedStudent(s)}
                    className="btn-primary flex-1 !py-2"
                  >
                    Ver Detalle <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {students.length > 0 && visibleCount < students.length && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center gap-2 py-4 border-t border-slate-100 text-slate-400 text-sm"
          >
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Cargando más estudiantes...
          </div>
        )}
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

            {/* Stepper Indicator with labels */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
              <p className="sm:hidden text-center text-xs font-bold text-primary mb-3">
                {WIZARD_STEPS.find(s => s.id === wizardStep)?.label}
              </p>
              <div className="flex justify-between relative px-1">
                <div className="absolute top-5 left-8 right-8 hidden sm:block h-0.5 bg-slate-200 -z-10"></div>
                <div
                  className="absolute top-5 left-8 hidden sm:block h-0.5 bg-primary rounded-full -z-10 transition-all duration-500 ease-out"
                  style={{ width: `calc((100% - 4rem) * ${(wizardStep - 1) / (WIZARD_STEPS.length - 1)})` }}
                ></div>
                {WIZARD_STEPS.map(step => {
                  const StepIcon = step.icon;
                  const isActive = wizardStep === step.id;
                  const isDone = wizardStep > step.id;
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 flex-shrink-0 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/30 scale-110' : isDone ? 'bg-primary-light text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {isDone ? <CheckCircle2 size={18} /> : <StepIcon size={18} />}
                      </div>
                      <span className={`hidden sm:block text-[10px] font-bold uppercase tracking-wide text-center px-1 ${isActive ? 'text-primary' : isDone ? 'text-primary/60' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              <div key={wizardStep} className={stepDir === 'back' ? 'animate-step-in-left' : 'animate-step-in-right'}>
                {renderWizardStep()}
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-light shrink-0">
              {wizardStep > 1 ? (
                <button className="btn-ghost px-4 sm:px-6 !text-sm sm:!text-base" onClick={() => { setStepDir('back'); setWizardStep(wizardStep - 1); }}>
                  Anterior
                </button>
              ) : <div></div>}

              {wizardStep < 5 ? (
                <button className="btn-primary px-5 sm:px-8 !text-sm sm:!text-base" onClick={() => { setStepDir('forward'); setWizardStep(wizardStep + 1); }}>
                  Siguiente
                </button>
              ) : (
                <button className="btn-primary px-4 sm:px-8 !text-sm sm:!text-base gap-1.5" onClick={handleCreate}>
                  <Sparkles size={18} className="flex-shrink-0" /> <span className="truncate">Guardar Registro</span>
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
    </div>
  );
}