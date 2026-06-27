import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';

export function EnrollmentProcess() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  
  const [selection, setSelection] = useState({
    student: null,
    program: null,
    period: null,
    tipo: 'Ordinario'
  });

  // 1. Buscar Estudiante Maestro
  const searchStudent = async (val) => {
    setSearchTerm(val);
    if (val.length < 3) return;
    try {
      const res = await fetch(`${API_BASE}/api/mod-estudiantes/buscar?query=${val}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  // 2. Cargar Datos Académicos
  useEffect(() => {
    const fetchAcademic = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const [pRes, peRes] = await Promise.all([
          fetch(`${API_BASE}/api/mod-programas-estudio/programas`, { headers }),
          fetch(`${API_BASE}/api/mod-programas-estudio/periodos`, { headers })
        ]);
        setPrograms(await pRes.json());
        setPeriods(await peRes.json());
      } catch (e) { console.error(e); }
    };
    fetchAcademic();
  }, []);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mod-matriculas/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          estudiante_id: selection.student.id,
          programa_id: selection.program.id,
          periodo_id: selection.period.id,
          tipo_ingreso: selection.tipo
        })
      });
      if (res.ok) setStep(4);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto py-8">
      <div className="glass-panel p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-primary-light"></div>
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
            Proceso de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Matrícula Académica</span>
          </h2>
          <p className="text-slate-500 font-medium">Vinculación de identidad maestra con programas profesionales</p>
          
          <div className="flex justify-center items-center mt-8 relative">
            <div className="absolute left-1/2 top-1/2 w-64 h-0.5 bg-slate-200 -translate-x-1/2 -translate-y-1/2 -z-10"></div>
            <div className="flex gap-8 bg-white/50 px-6 py-2 rounded-full backdrop-blur-sm border border-white">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${step >= s ? 'bg-primary text-white scale-110' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[400px]">
          {/* Paso 1: Ubicar Estudiante */}
          {step === 1 && (
            <div className="animate-fade-in-right absolute inset-0 bg-white/40 p-6 rounded-xl border border-white/60">
              <h5 className="font-bold text-xl text-slate-800 mb-6">1. Identificar Estudiante Maestro</h5>
              <div className="mb-6 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all shadow-sm" 
                  placeholder="Busca por DNI, Apellidos o Código Maestro..."
                  value={searchTerm} 
                  onChange={(e) => searchStudent(e.target.value)}
                />
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {students.map(s => (
                  <button 
                    key={s.id} 
                    className="w-full text-left p-4 rounded-xl bg-white border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all flex justify-between items-center group"
                    onClick={() => { setSelection({...selection, student: s}); setStep(2); }}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mr-4 group-hover:scale-110 transition-transform">
                        {s.nombres[0]}{s.apellidos[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{s.nombres} {s.apellidos}</div>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">DNI: {s.dni} <span className="mx-2 text-slate-300">|</span> {s.codigo_estudiante}</div>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 bg-primary/10 text-primary font-semibold text-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Seleccionar</span>
                  </button>
                ))}
                {students.length === 0 && searchTerm.length >= 3 && (
                  <div className="text-center py-8 text-slate-500">No se encontraron estudiantes que coincidan con la búsqueda.</div>
                )}
              </div>
            </div>
          )}

          {/* Paso 2: Selección Académica */}
          {step === 2 && (
            <div className="animate-fade-in-right absolute inset-0 bg-white/40 p-6 rounded-xl border border-white/60 flex flex-col">
              <h5 className="font-bold text-xl text-slate-800 mb-6 flex items-center">
                <span className="text-2xl mr-3">📚</span>
                2. Selección de Programa y Periodo
              </h5>
              
              {selection.student && (
                <div className="mb-8 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center">
                  <div className="w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center font-bold text-lg shadow-sm mr-4">
                    {selection.student.nombres[0]}{selection.student.apellidos[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Estudiante Seleccionado</div>
                    <div className="font-semibold text-slate-800">{selection.student.nombres} {selection.student.apellidos}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="label uppercase tracking-wider text-xs font-bold">Carrera Profesional</label>
                  <select 
                    className="input-field" 
                    onChange={(e) => setSelection({...selection, program: programs.find(p => p.id == e.target.value)})}
                  >
                    <option value="">Seleccione Carrera...</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label uppercase tracking-wider text-xs font-bold">Periodo Académico</label>
                  <select 
                    className="input-field" 
                    onChange={(e) => setSelection({...selection, period: periods.find(p => p.id == e.target.value)})}
                  >
                    <option value="">Seleccione Periodo...</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-slate-200/50 flex gap-4">
                <button className="px-6 py-2.5 font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setStep(1)}>Volver</button>
                <button 
                  className={`flex-1 py-2.5 font-semibold rounded-lg transition-all ${!selection.program || !selection.period ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'btn-primary'}`} 
                  disabled={!selection.program || !selection.period} 
                  onClick={() => setStep(3)}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Confirmación */}
          {step === 3 && (
            <div className="animate-fade-in-up absolute inset-0 bg-white/40 p-6 rounded-xl border border-white/60 flex flex-col items-center">
              <div className="text-5xl mb-4">📋</div>
              <h4 className="font-bold text-2xl text-slate-800 tracking-tight">Resumen de Matrícula</h4>
              
              <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-sm border border-slate-100 my-8 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-slate-500 font-semibold">Estudiante:</span>
                  <span className="font-bold text-slate-800 text-right">{selection.student?.nombres} {selection.student?.apellidos}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-slate-500 font-semibold">Carrera:</span>
                  <span className="font-semibold text-primary text-right">{selection.program?.nombre}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-slate-500 font-semibold">Periodo:</span>
                  <span className="font-semibold text-slate-700 text-right">{selection.period?.codigo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Tipo Ingreso:</span>
                  <span className="font-semibold text-slate-700 text-right bg-slate-100 px-2 py-1 rounded">{selection.tipo}</span>
                </div>
              </div>
              
              <div className="flex gap-4 w-full max-w-md mt-auto">
                <button className="flex-1 py-3 font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setStep(2)}>Modificar</button>
                <button 
                  className="flex-1 py-3 font-semibold btn-primary" 
                  onClick={handleEnroll} 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex justify-center items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Procesando...
                    </div>
                  ) : 'Confirmar Matrícula'}
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Éxito */}
          {step === 4 && (
            <div className="animate-bounce-in absolute inset-0 bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-lg shadow-green-100">
                ✅
              </div>
              <h3 className="font-extrabold text-3xl text-slate-800 mb-3">¡Matrícula Exitosa!</h3>
              <p className="text-slate-500 text-center max-w-sm mb-10 text-lg">El estudiante ha sido matriculado y vinculado correctamente al programa académico.</p>
              
              <button 
                className="btn-primary py-3 px-8 text-lg" 
                onClick={() => { setStep(1); setSelection({student:null, program:null, period:null, tipo:'Ordinario'}); }}
              >
                Realizar otra matrícula
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
