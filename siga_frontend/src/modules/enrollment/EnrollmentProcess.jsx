import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function EnrollmentProcess({ initialStudent, onCancel }) {
  const [step, setStep] = useState(initialStudent ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  
  const [selection, setSelection] = useState({
    student: initialStudent || null,
    program: null,
    period: null,
    tipo: 'Ordinario'
  });

  const [malla, setMalla] = useState([]);
  const [selectedUDs, setSelectedUDs] = useState({}); // { [ud_id]: true/false }

  // 1. Buscar Estudiante Maestro
  const searchStudent = async (val) => {
    setSearchTerm(val);
    if (val.length < 3) return;
    try {
      // Obtenemos el usuario de localStorage para saber el rol
      let url = 'estudiantes/';
      
      const data = await apiClient.callModule('mod-gestion-academica', url);
      const filtered = data.filter(s => 
        s.dni.includes(val) || 
        s.nombres.toLowerCase().includes(val.toLowerCase()) || 
        s.apellidos.toLowerCase().includes(val.toLowerCase()) || 
        s.codigo_estudiante.includes(val)
      );
      setStudents(filtered);
    } catch (e) { console.error(e); }
  };

  // 2. Cargar Datos Académicos
  useEffect(() => {
    const fetchAcademic = async () => {
      try {
        const [pRes, peRes] = await Promise.all([
          apiClient.callModule('mod-programas-estudio', 'programas'),
          apiClient.callModule('mod-programas-estudio', 'periodos')
        ]);
        setPrograms(Array.isArray(pRes) ? pRes : []);
        setPeriods(Array.isArray(peRes) ? peRes : []);
      } catch (e) { console.error(e); }
    };
    fetchAcademic();
  }, []);

  const loadMallaAndContinue = async () => {
    // 0. Validar Pago Financiero
    if (selection.student && !selection.student.pago_matricula) {
      alert("MATRÍCULA BLOQUEADA: El estudiante registra deuda pendiente. Debe realizar el pago físico en Caja/Tesorería antes de proceder.");
      return;
    }

    // 1. Validar Documentos
    if (selection.student && selection.student.documentos_completos === false) {
      if (selection.student.fecha_limite_documentos) {
         const today = new Date();
         const limit = new Date(selection.student.fecha_limite_documentos);
         if (today > limit) {
           alert("MATRÍCULA BLOQUEADA: El periodo de gracia para entregar documentos ha expirado.");
           return;
         } else {
           alert(`ADVERTENCIA: Matrícula Condicional. Tiene hasta el ${limit.toLocaleDateString()} para regularizar sus documentos.`);
         }
      } else {
         alert("MATRÍCULA BLOQUEADA: El estudiante no ha completado sus documentos y no tiene periodo de gracia.");
         return;
      }
    }

    // 2. Validar Fechas del Periodo
    if (selection.period) {
      const today = new Date();
      const finRegular = selection.period.fecha_fin_matricula_regular ? new Date(selection.period.fecha_fin_matricula_regular) : null;
      const finExt = selection.period.fecha_fin_matricula_extemporanea ? new Date(selection.period.fecha_fin_matricula_extemporanea) : null;
      
      if (finExt && today > finExt) {
        alert("MATRÍCULA CERRADA: La fase de matrícula extemporánea ha finalizado definitivamente para este periodo.");
        return;
      } else if (finRegular && today > finRegular) {
        alert("ADVERTENCIA: Fase de Matrícula Extemporánea. Se aplicarán las reglas correspondientes.");
      }
    }

    setLoading(true);
    try {
      const mallaData = await apiClient.callModule('mod-programas-estudio', `programas/${selection.program.id}/malla`);
      setMalla(mallaData);

      // Pre-selección según casuística
      const newSelection = {};
      
      if (selection.tipo === 'Ordinario') {
        // Ingresantes: Pre-cargar todo el Ciclo 1
        mallaData.filter(m => m.periodo === 1).forEach(m => {
          m.unidades.forEach(u => newSelection[u.id] = true);
        });
      }
      
      setSelectedUDs(newSelection);
      setStep(3);
    } catch (e) {
      console.error(e);
      alert("Error al cargar la malla curricular del programa.");
    } finally {
      setLoading(false);
    }
  };

  const toggleUD = (udId) => {
    setSelectedUDs(prev => ({ ...prev, [udId]: !prev[udId] }));
  };

  const checkAllByPeriod = (periodoIndex) => {
    const newSelection = { ...selectedUDs };
    const modulo = malla.find(m => m.periodo === periodoIndex);
    if (modulo) {
      modulo.unidades.forEach(u => newSelection[u.id] = true);
    }
    setSelectedUDs(newSelection);
  };

  const uncheckAll = () => setSelectedUDs({});

  const handleEnroll = async () => {
    setLoading(true);
    try {
      // Filtrar los IDs seleccionados
      const udIds = Object.keys(selectedUDs).filter(id => selectedUDs[id]).map(Number);
      
      // Buscar los créditos para cada UD
      const detalles = [];
      malla.forEach(m => {
        m.unidades.forEach(u => {
          if (udIds.includes(u.id)) {
            detalles.push({ unidad_didactica_id: u.id, creditos: u.creditos });
          }
        });
      });

      // Validar si hay créditos (MVP hack para evitar crasheos)
      if (detalles.length === 0) {
        throw new Error("No hay unidades didácticas seleccionadas");
      }

      await apiClient.callModule('mod-gestion-academica', 'matriculas/', 'POST', {
        estudiante_id: selection.student.id,
        programa_id: selection.program.id,
        periodo_id: selection.period.id,
        tipo_ingreso: selection.tipo,
        detalles: detalles
      });
      
      setStep(4);
    } catch (e) { 
      console.error(e);
      alert("Error al confirmar la matrícula. Verifique que cumpla los créditos requeridos.");
    }
    setLoading(false);
  };

  // Calcular créditos totales seleccionados
  const totalCreditos = malla.reduce((acc, m) => {
    return acc + m.unidades.reduce((accU, u) => accU + (selectedUDs[u.id] ? u.creditos : 0), 0);
  }, 0);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto py-8">
      <div className="glass-panel p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-primary-light"></div>
        
        <div className="text-center mb-10 relative">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="absolute left-0 top-0 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Volver al listado"
            >
              ← Volver
            </button>
          )}
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
            Proceso de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Matrícula Académica</span>
          </h2>
          <p className="text-slate-500 font-medium">Motor Flexible de Matrícula (Selección Asistida)</p>
          
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

        <div className="relative">
          {/* Paso 1: Ubicar Estudiante */}
          {step === 1 && (
            <div className="animate-fade-in-right bg-white/40 p-6 rounded-xl border border-white/60 min-h-[400px]">
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
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
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
            <div className="animate-fade-in-right bg-white/40 p-6 rounded-xl border border-white/60 flex flex-col min-h-[400px]">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                <div>
                  <label className="label uppercase tracking-wider text-xs font-bold">Tipo de Ingreso</label>
                  <select 
                    className="input-field" 
                    value={selection.tipo}
                    onChange={(e) => setSelection({...selection, tipo: e.target.value})}
                  >
                    <option value="Ordinario">Ingresante (Primera Vez)</option>
                    <option value="Regular">Estudiante Regular / Invicto</option>
                    <option value="Irregular">Estudiante Irregular</option>
                    <option value="Reingresante">Reingresante</option>
                  </select>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-slate-200/50 flex gap-4">
                {!initialStudent && (
                  <button className="px-6 py-2.5 font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setStep(1)}>Volver</button>
                )}
                {initialStudent && onCancel && (
                  <button className="px-6 py-2.5 font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={onCancel}>Cancelar</button>
                )}
                <button 
                  className={`flex-1 py-2.5 font-semibold rounded-lg transition-all ${!selection.program || !selection.period ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'btn-primary'}`} 
                  disabled={!selection.program || !selection.period || loading} 
                  onClick={loadMallaAndContinue}
                >
                  {loading ? 'Cargando Malla...' : 'Continuar a Selección de Cursos'}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Selección de Unidades Didácticas (Menú a la carta) */}
          {step === 3 && (
            <div className="animate-fade-in-up bg-white/40 p-6 rounded-xl border border-white/60 flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-xl text-slate-800 tracking-tight flex items-center">
                  <span className="text-2xl mr-3">☑️</span>
                  3. Selección de Unidades Didácticas
                </h4>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${totalCreditos < 1 || totalCreditos > 40 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  Créditos Seleccionados: {totalCreditos} {totalCreditos > 40 && '(Excede el límite)'}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-100 p-3 rounded-lg mb-4 text-sm font-medium gap-3">
                <span className="text-slate-600">Herramientas rápidas:</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={uncheckAll} className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 font-bold">Limpiar Todo</button>
                  {malla.map(m => (
                    <button key={m.periodo} onClick={() => checkAllByPeriod(m.periodo)} className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">
                      Ciclo {m.periodo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 max-h-[500px]">
                {malla.map((modulo, idx) => (
                  <div key={modulo.id || idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                      <h5 className="font-bold text-slate-700">Ciclo {modulo.periodo} - {modulo.nombre}</h5>
                      <button 
                        onClick={() => checkAllByPeriod(modulo.periodo)}
                        className="text-xs font-bold text-primary hover:text-primary-dark"
                      >
                        Seleccionar Todo el Ciclo
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {modulo.unidades.map(ud => (
                        <label key={ud.id} className={`flex items-center p-3 cursor-pointer transition-colors ${selectedUDs[ud.id] ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary mr-4"
                            checked={!!selectedUDs[ud.id]}
                            onChange={() => toggleUD(ud.id)}
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${selectedUDs[ud.id] ? 'text-primary' : 'text-slate-700'}`}>{ud.nombre}</div>
                            <div className="text-xs text-slate-500">{ud.creditos} Créditos • {ud.horas} Horas</div>
                          </div>
                        </label>
                      ))}
                      {(!modulo.unidades || modulo.unidades.length === 0) && (
                        <div className="p-4 text-center text-slate-400 text-sm italic">No hay unidades en este ciclo.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-4 mt-6 pt-4 border-t border-slate-200">
                <button className="flex-1 py-3 font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setStep(2)}>Volver</button>
                <button 
                  className={`flex-1 py-3 font-semibold rounded-lg transition-all ${totalCreditos === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'btn-primary'}`}
                  onClick={handleEnroll} 
                  disabled={loading || totalCreditos === 0}
                >
                  {loading ? (
                    <div className="flex justify-center items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Procesando...
                    </div>
                  ) : 'Confirmar Matrícula Oficial'}
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Éxito */}
          {step === 4 && (
            <div className="animate-bounce-in bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-lg shadow-green-100">
                ✅
              </div>
              <h3 className="font-extrabold text-3xl text-slate-800 mb-3">¡Matrícula Exitosa!</h3>
              <p className="text-slate-500 text-center max-w-sm mb-10 text-lg">El estudiante ha sido matriculado y vinculado correctamente con las unidades seleccionadas.</p>
              
              <button 
                className="btn-primary py-3 px-8 text-lg" 
                onClick={() => {
                  if (onCancel) {
                    onCancel(); 
                  } else {
                    setStep(1); 
                    setSelection({student:null, program:null, period:null, tipo:'Ordinario'}); 
                  }
                }}
              >
                {onCancel ? 'Volver al Inicio' : 'Realizar otra matrícula'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
