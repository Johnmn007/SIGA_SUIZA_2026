import { useState } from 'react';
import { API_BASE } from '../../core/api/client';

export function StudentMaster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [form, setForm] = useState({
    codigo_estudiante: '', dni: '', nombres: '', apellidos: '',
    fecha_nacimiento: '', genero: 'Masculino', estado_civil: 'Soltero', nacionalidad: 'Peruana',
    email_institucional: '', email_personal: '', telefono_movil: '', direccion_residencia: '',
    distrito: '', provincia: '', departamento: '',
    trabaja: false, ingreso_mensual: 0, tipo_vivienda: 'Alquilada', tiene_internet_en_casa: false,
    tipo_sangre: 'O+', seguro_salud: 'Ninguno', discapacidad: false,
    colegio_procedencia: '', año_egreso_colegio: 2023,
    contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
    nombre_padre: '', nombre_madre: '', estado_academico: 'postulante'
  });

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (val.length < 3) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mod-estudiantes/buscar?query=${val}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/mod-estudiantes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setWizardStep(1);
        handleSearch(searchTerm);
      }
    } catch (e) { console.error(e); }
  };

  const InputGroup = ({ label, type = "text", value, onChange, options = null }) => (
    <div className="flex flex-col space-y-1">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
      {options ? (
        <select className="input-field py-2.5 text-sm" value={value} onChange={onChange}>
          {options.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      ) : (
        <input type={type} className="input-field py-2.5 text-sm" value={value} onChange={onChange} />
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

  const renderWizardStep = () => {
    switch(wizardStep) {
      case 1: return (
        <div className="animate-fade-in-right">
          <h6 className="font-bold text-primary mb-4 border-b border-primary/20 pb-2">PASO 1: IDENTIDAD BÁSICA</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Código" value={form.codigo_estudiante} onChange={e=>setForm({...form, codigo_estudiante: e.target.value})} />
            <InputGroup label="DNI" value={form.dni} onChange={e=>setForm({...form, dni: e.target.value})} />
            <InputGroup label="Nombres" value={form.nombres} onChange={e=>setForm({...form, nombres: e.target.value})} />
            <InputGroup label="Apellidos" value={form.apellidos} onChange={e=>setForm({...form, apellidos: e.target.value})} />
            <InputGroup label="Fecha Nacimiento" type="date" value={form.fecha_nacimiento} onChange={e=>setForm({...form, fecha_nacimiento: e.target.value})} />
            <InputGroup label="Género" options={['Masculino', 'Femenino', 'Otro']} value={form.genero} onChange={e=>setForm({...form, genero: e.target.value})} />
          </div>
        </div>
      );
      case 2: return (
        <div className="animate-fade-in-right">
          <h6 className="font-bold text-primary mb-4 border-b border-primary/20 pb-2">PASO 2: CONTACTO Y UBICACIÓN</h6>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <InputGroup label="Dirección de Residencia" value={form.direccion_residencia} onChange={e=>setForm({...form, direccion_residencia: e.target.value})} />
            </div>
            <InputGroup label="Distrito" value={form.distrito} onChange={e=>setForm({...form, distrito: e.target.value})} />
            <InputGroup label="Provincia" value={form.provincia} onChange={e=>setForm({...form, provincia: e.target.value})} />
            <InputGroup label="Departamento" value={form.departamento} onChange={e=>setForm({...form, departamento: e.target.value})} />
            <div className="md:col-span-1">
              <InputGroup label="Celular" value={form.telefono_movil} onChange={e=>setForm({...form, telefono_movil: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <InputGroup label="Email Personal" type="email" value={form.email_personal} onChange={e=>setForm({...form, email_personal: e.target.value})} />
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="animate-fade-in-right">
          <h6 className="font-bold text-primary mb-4 border-b border-primary/20 pb-2">PASO 3: PERFIL SOCIOECONÓMICO</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CheckboxGroup label="¿Trabaja Actualmente?" checked={form.trabaja} onChange={e=>setForm({...form, trabaja: e.target.checked})} />
            {form.trabaja && <InputGroup label="Ingreso Mensual Estimado (S/.)" type="number" value={form.ingreso_mensual} onChange={e=>setForm({...form, ingreso_mensual: e.target.value})} />}
            <InputGroup label="Tipo de Vivienda" options={['Propia', 'Alquilada', 'Cedida']} value={form.tipo_vivienda} onChange={e=>setForm({...form, tipo_vivienda: e.target.value})} />
            <CheckboxGroup label="¿Tiene Internet en casa?" checked={form.tiene_internet_en_casa} onChange={e=>setForm({...form, tiene_internet_en_casa: e.target.checked})} />
          </div>
        </div>
      );
      case 4: return (
        <div className="animate-fade-in-right">
          <h6 className="font-bold text-primary mb-4 border-b border-primary/20 pb-2">PASO 4: SALUD Y ACADÉMICO</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Colegio de Procedencia" value={form.colegio_procedencia} onChange={e=>setForm({...form, colegio_procedencia: e.target.value})} />
            <InputGroup label="Año de Egreso" type="number" value={form.año_egreso_colegio} onChange={e=>setForm({...form, año_egreso_colegio: e.target.value})} />
            <InputGroup label="Tipo de Sangre" value={form.tipo_sangre} onChange={e=>setForm({...form, tipo_sangre: e.target.value})} />
            <InputGroup label="Seguro de Salud" options={['Ninguno', 'SIS', 'EsSalud', 'Privado']} value={form.seguro_salud} onChange={e=>setForm({...form, seguro_salud: e.target.value})} />
            <div className="md:col-span-2">
              <InputGroup label="Contacto Emergencia (Nombre)" value={form.contacto_emergencia_nombre} onChange={e=>setForm({...form, contacto_emergencia_nombre: e.target.value})} />
            </div>
            <InputGroup label="Teléfono Emergencia" value={form.contacto_emergencia_telefono} onChange={e=>setForm({...form, contacto_emergencia_telefono: e.target.value})} />
          </div>
        </div>
      );
      case 5: return (
        <div className="animate-fade-in-right flex flex-col items-center">
          <h6 className="font-bold text-primary mb-6">PASO 5: REVISIÓN DE DATOS</h6>
          <div className="glass-panel p-6 w-full max-w-md text-sm space-y-3 bg-white/90">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Alumno:</span>
              <span className="font-bold text-slate-800">{form.nombres} {form.apellidos}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Identidad:</span>
              <span className="text-slate-700">DNI {form.dni} | {form.codigo_estudiante}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Ubicación:</span>
              <span className="text-slate-700">{form.distrito}, {form.departamento}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Salud:</span>
              <span className="text-slate-700">Seguro {form.seguro_salud}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Socioeconómico:</span>
              <span className="text-slate-700">{form.trabaja ? 'Trabajador' : 'No trabaja'} | {form.tipo_vivienda}</span>
            </div>
          </div>
          <div className="mt-6 bg-blue-50 text-blue-700 p-4 rounded-xl text-sm border border-blue-100 flex space-x-3 w-full max-w-md">
            <span className="text-xl">ℹ️</span>
            <p>Al guardar, se creará el perfil único e inmutable en el Maestro de Datos.</p>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Maestro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Estudiantes</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Censo Institucional y Registro Maestro de Identidad</p>
        </div>
        <button 
          className="btn-primary flex items-center space-x-2"
          onClick={() => { setForm({...form, codigo_estudiante: 'EST-'+Date.now().toString().slice(-6)}); setShowModal(true); }}
        >
          <span className="text-xl leading-none">+</span>
          <span>Registrar Estudiante Maestro</span>
        </button>
      </div>

      <div className="glass-card p-2 mb-8 flex items-center max-w-2xl">
        <span className="px-4 text-slate-400 text-xl">🔍</span>
        <input 
          type="text" 
          className="w-full bg-transparent border-none focus:ring-0 py-3 text-slate-700 placeholder-slate-400 outline-none"
          placeholder="Buscar por DNI, Nombre o Código Maestro..."
          value={searchTerm} 
          onChange={(e) => handleSearch(e.target.value)}
        />
        {loading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-4"></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 opacity-60">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-slate-500 font-medium">Usa el buscador para localizar perfiles maestros</p>
          </div>
        ) : (
          students.map(s => (
            <div key={s.id} className="glass-card p-6 flex flex-col h-full group">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mr-4 border border-primary/20 group-hover:scale-110 transition-transform">
                  {s.nombres[0]}{s.apellidos[0]}
                </div>
                <div>
                  <h6 className="font-bold text-slate-800 leading-tight">{s.nombres} {s.apellidos}</h6>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.codigo_estudiante}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-6 mt-auto">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">DNI</span>
                  <span className="font-bold text-sm text-slate-700">{s.dni}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500 mb-1">Estado</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded border border-green-200">
                    {s.estado_academico}
                  </span>
                </div>
              </div>
              
              <button 
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                onClick={() => setSelectedStudent(s)}
              >
                Detalle Completo
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modern Multi-Step Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white/95 shadow-2xl animate-fade-in-up">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h5 className="font-bold text-xl text-slate-800 tracking-tight">Nuevo Registro Maestro</h5>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            {/* Stepper Indicator */}
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between relative">
              <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${wizardStep === i ? 'bg-primary text-white shadow-md shadow-primary/30' : wizardStep > i ? 'bg-primary-light text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                  {i}
                </div>
              ))}
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {renderWizardStep()}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-between bg-slate-50">
              {wizardStep > 1 ? (
                <button className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setWizardStep(wizardStep - 1)}>
                  Anterior
                </button>
              ) : <div></div>}
              
              {wizardStep < 5 ? (
                <button className="btn-primary px-8" onClick={() => setWizardStep(wizardStep + 1)}>
                  Siguiente
                </button>
              ) : (
                <button className="btn-primary px-8 bg-green-600 hover:bg-green-700 hover:shadow-green-500/30" onClick={handleCreate}>
                  Guardar Registro Completo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
