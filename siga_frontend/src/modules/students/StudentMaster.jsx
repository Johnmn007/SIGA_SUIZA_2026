import { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { API_BASE } from '../../core/api/client';

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

export function StudentMaster() {
  const { user } = useAuth();
  const userRole = user?.is_superuser ? 'superadmin' : (user?.role || 'invitado');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPrograma, setCurrentPrograma] = useState('ALL');

  const [form, setForm] = useState({
    codigo_estudiante: '', dni: '', nombres: '', apellidos: '',
    fecha_nacimiento: '', genero: 'Masculino', estado_civil: 'Soltero', nacionalidad: 'Peruana',
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
        setCurrentPrograma('1'); // Force default program for secretaria
      } else {
        handleSearch(searchTerm);
      }
    }
  }, [currentPrograma, userRole]);

  const handleSearch = async (val = '') => {

    setSearchTerm(val);
    setLoading(true);
    try {
      // Usar la ruta correcta del módulo integrado
      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;
      
      // Filter if a specific program is selected, regardless of role
      if (currentPrograma && currentPrograma !== 'ALL') {
        url += `?programa_id=${currentPrograma}`;
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      
      if (val.length >= 3) {
        const filtered = data.filter(s => 
          s.dni.includes(val) || 
          s.nombres.toLowerCase().includes(val.toLowerCase()) || 
          s.apellidos.toLowerCase().includes(val.toLowerCase()) || 
          s.codigo_estudiante.includes(val)
        );
        setStudents(filtered);
      } else {
        setStudents(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      // Limpiar campos que no están en el schema de creación si es necesario
      if (payload.fecha_nacimiento === '') payload.fecha_nacimiento = null;
      if (payload.email_institucional === '') payload.email_institucional = null;
      if (payload.email_personal === '') payload.email_personal = null;
      
      // Mapear campos al schema de Pydantic
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
            
            <div className="md:col-span-2 pt-4 border-t border-slate-100">
              <h6 className="font-bold text-slate-700 mb-4 text-xs uppercase">Validación de Expediente</h6>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Registro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Estudiantes</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Censo Institucional y Registro Maestro de Identidad</p>
        </div>
        <div className="flex gap-3">
          {['superadmin', 'admin'].includes(userRole) && (
            <button 
              className="btn-secondary flex items-center space-x-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              onClick={handleSincronizar}
            >
              <span className="text-xl leading-none">📥</span>
              <span>Sincronizar desde Admisión</span>
            </button>
          )}
          <button 
            className="btn-primary flex items-center space-x-2"
            onClick={() => { setForm({...form, codigo_estudiante: 'EST-'+Date.now().toString().slice(-6)}); setShowModal(true); }}
          >
            <span className="text-xl leading-none">+</span>
            <span>Registrar Estudiante Maestro</span>
          </button>
        </div>
      </div>

      <div className="glass-card p-2 mb-8 flex items-center max-w-3xl gap-2">
          <select 
            className="input-field py-3 text-sm bg-slate-50 border-none w-48 font-bold text-primary"
            value={currentPrograma}
            onChange={(e) => {
              setCurrentPrograma(e.target.value);
            }}
          >
            {['superadmin', 'admin'].includes(userRole) && <option value="ALL">Todos los Programas</option>}
            <option value="1">Arquitectura de Plat.</option>
            <option value="2">Enfermería Técnica</option>
            <option value="3">Diseño Gráfico</option>
            <option value="4">Administración</option>
            <option value="5">Contabilidad</option>
            <option value="6">Mecatrónica</option>
          </select>
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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Estudiante</th>
                <th className="py-4 px-6 font-semibold">Código</th>
                <th className="py-4 px-6 font-semibold">DNI</th>
                <th className="py-4 px-6 font-semibold">Estado</th>
                <th className="py-4 px-6 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center opacity-60">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-slate-500 font-medium">No se encontraron estudiantes registrados</p>
                  </td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs mr-3 border border-primary/20">
                          {s.nombres[0]}{s.apellidos[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{s.nombres} {s.apellidos}</p>
                          <p className="text-xs text-slate-500">{s.email_personal || s.email_institucional || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-600 text-sm bg-slate-100 px-2 py-1 rounded">{s.codigo_estudiante}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{s.dni}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${s.estado_academico === 'postulante' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                        {s.estado_academico}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => setSelectedStudent(s)}
                        className="text-primary hover:text-primary-dark text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Ver Detalle →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
