import { useState, useEffect } from 'react';
import { apiClient, API_BASE } from '../../core/api/client';
import { QRCodeSVG } from 'qrcode.react';

export function EnrollmentProcess({ initialStudent, onCancel }) {
  const [step, setStep] = useState(initialStudent ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  
  const [selection, setSelection] = useState({
    student: initialStudent || null,
    program: null,
    period: null,
    tipo: 'Ordinario'
  });

  const [malla, setMalla] = useState([]);
  const [selectedUDs, setSelectedUDs] = useState({}); // { [ud_id]: true/false }
  // Resultado del motor de matrícula (secciones 2, 3, 5 del diagrama)
  const [propuesta, setPropuesta] = useState(null);
  // Sección 7-8: matrícula creada, boleta y avance
  const [matricula, setMatricula] = useState(null);
  const [boleta, setBoleta] = useState(null);
  const [avance, setAvance] = useState(null);
  const [consolidacion, setConsolidacion] = useState(null);
  const [consolidando, setConsolidando] = useState(false);

  const [cachedStudents, setCachedStudents] = useState([]);

  // 1. Buscar Estudiante Maestro Optimizado (Caché en cliente para búsqueda instantánea)
  const searchStudent = async (val) => {
    setSearchTerm(val);
    if (!val || val.trim().length < 2) {
      setStudents([]);
      return;
    }
    const term = val.trim().toLowerCase();
    try {
      let pool = cachedStudents;
      if (pool.length === 0) {
        const data = await apiClient.callModule('mod-gestion-academica', 'estudiantes/');
        pool = Array.isArray(data) ? data : [];
        setCachedStudents(pool);
      }
      const filtered = pool.filter(s => 
        (s.dni && s.dni.includes(term)) || 
        (s.nombres && s.nombres.toLowerCase().includes(term)) || 
        (s.apellidos && s.apellidos.toLowerCase().includes(term)) || 
        (s.codigo_estudiante && s.codigo_estudiante.toLowerCase().includes(term))
      );
      setStudents(filtered);
    } catch (e) { 
      console.error(e); 
      setStudents([]);
    }
  };

  // 2. Cargar Datos Académicos
  useEffect(() => {
    const fetchAcademic = async () => {
      try {
      const [pRes, peRes] = await Promise.all([
        apiClient.request('/api/mod-programas-estudio/programas').catch(()=>[]),
        apiClient.callModule('mod-programas-estudio', 'periodos').catch(()=>[])
      ]);
      const fetchedPrograms = Array.isArray(pRes) ? pRes : [];
      const fetchedPeriods = Array.isArray(peRes) ? peRes : [];
      
      console.log("Academic Data Loaded:", {fetchedPrograms, fetchedPeriods, initialStudent});
      
      // Auto-select based on student and active period (usar mismos periodos que Periodos Lectivos)
      if (initialStudent) {
        const studentProgram = fetchedPrograms.find(p => p.id === initialStudent.programa_id || String(p.id) === String(initialStudent.programa_id));
        const activePeriod = fetchedPeriods.find(p => {
          const est = (p.estado || '').toString().toLowerCase();
          return est === 'matricula_abierta' || est === 'abierto' || est === 'activo' || est === 'en_curso';
        }) || fetchedPeriods[0] || null;
        
        console.log("Auto-selecting:", {studentProgram, activePeriod});
        
        setSelection(prev => ({
          ...prev,
          program: studentProgram || fetchedPrograms[0] || null,
          period: activePeriod || fetchedPeriods[0] || null
        }));
      } else {
        // También auto-seleccionar periodo abierto si no hay estudiante inicial
        const activePeriod = fetchedPeriods.find(p => {
          const est = (p.estado || '').toString().toLowerCase();
          return est === 'matricula_abierta' || est === 'abierto' || est === 'activo' || est === 'en_curso';
        }) || fetchedPeriods[0] || null;
        if (activePeriod) {
          setSelection(prev => ({
            ...prev,
            period: prev.period || activePeriod
          }));
        }
      }
      } catch (e) { 
        console.error('Error fetching academic data:', e); 
      }
    };
    fetchAcademic();
  }, [initialStudent]);

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

      // Secciones 2, 3 y 5: el motor del backend determina el ciclo,
      // los cursos a cargo (jalados/arrastre) y las restricciones.
      let prop = null;
      try {
        prop = await apiClient.callModule(
          'mod-gestion-academica',
          `matriculas/propuesta?estudiante_id=${selection.student?.id}&programa_id=${selection.program.id}&periodo_id=${selection.period.id}&casuistica=${encodeURIComponent(selection.tipo)}`
        );
        setPropuesta(prop);
      } catch (motorError) {
        console.warn('No se pudo calcular la propuesta del motor:', motorError);
        setPropuesta(null);
      }

      // Pre-selección: cursos a cargo (obligatorias) + cursos del ciclo (sugeridas).
      const newSelection = {};
      const preCargar = [...(prop?.obligatorias || []), ...(prop?.sugeridas || [])];
      if (preCargar.length > 0) {
        preCargar.forEach(u => { newSelection[u.unidad_didactica_id] = true; });
      } else {
        // Respaldo: comportamiento clásico (pre-cargar el ciclo detectado / Ciclo 1).
        const cicloObjetivo = prop?.ciclo_sugerido || 1;
        mallaData.filter(m => m.periodo === cicloObjetivo).forEach(m => {
          m.unidades.forEach(u => newSelection[u.id] = true);
        });
      }

      // Nunca pre-seleccionar unidades bloqueadas.
      (prop?.bloqueadas || []).forEach(u => { delete newSelection[u.unidad_didactica_id]; });

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

  // UDs bloqueadas por el motor (prerrequisito / tercera vez), con su motivo.
  const bloqueadasMap = new Map((propuesta?.bloqueadas || []).map(u => [u.unidad_didactica_id, u.motivo]));

  const handleEnroll = async () => {
    setLoading(true);
    try {
      // Filtrar los IDs seleccionados (excluyendo bloqueadas).
      const udIds = Object.keys(selectedUDs)
        .filter(id => selectedUDs[id] && !bloqueadasMap.has(Number(id)))
        .map(Number);
      
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

      // Sección 7 (paso 1): crear la matrícula (el backend la confirma y valida con el motor).
      const mat = await apiClient.callModule('mod-gestion-academica', 'matriculas/', 'POST', {
        estudiante_id: selection.student.id,
        programa_id: selection.program.id,
        periodo_id: selection.period.id,
        tipo_ingreso: selection.tipo,
        observaciones: 'Registrada desde el asistente visual de matrícula.',
        detalles: detalles
      });
      setMatricula(mat);      // Emisión de boleta/QR eliminada: corresponde exclusivamente al módulo Finanzas y Pagos.


      // Sección 8: avance de créditos del estudiante.
      try {
        const a = await apiClient.callModule('mod-gestion-academica', `estudiantes/${selection.student.id}/avance`);
        setAvance(a);
      } catch (avanceError) {
        console.warn('No se pudo obtener el avance:', avanceError);
      }

      setStep(4);
    } catch (e) { 
      console.error(e);
      alert(`❌ Error al matricular: ${e.message || "Verifique que cumpla los créditos requeridos."}`);
    }
    setLoading(false);
  };

  // Sección 7: cierre del proceso (consolidación de los 5 pasos).
  const handleConsolidar = async () => {
    if (!matricula) return;
    setConsolidando(true);
    try {
      const res = await apiClient.callModule('mod-gestion-academica', `matriculas/${matricula.id}/consolidar`, 'POST');
      setConsolidacion(res);
    } catch (e) {
      console.error(e);
      alert(`❌ No se pudo consolidar: ${e.message}`);
    } finally {
      setConsolidando(false);
    }
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

              {/* Contexto Operativo y Casuística */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-4 border-l-4 border-l-primary bg-gradient-to-r from-white to-slate-50 flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
                  <p className="font-bold text-slate-800">{selection.program ? selection.program.nombre : 'Buscando...'}</p>
                </div>
                
                <div className="glass-card p-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-slate-50 flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
                  <p className="font-bold text-slate-800">{selection.period ? selection.period.codigo : 'Buscando...'}</p>
                </div>

                <div className="glass-card p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-white to-slate-50">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1 block">Casuística de Matrícula</label>
                  <select 
                    className="w-full bg-transparent border-b-2 border-slate-200 focus:border-amber-500 outline-none font-bold text-slate-700 pb-1" 
                    value={selection.tipo}
                    onChange={(e) => setSelection({...selection, tipo: e.target.value})}
                  >
                    <option value="Ordinario">Cachimbo (Auto-selección C1)</option>
                    <option value="Regular">Estudiante Regular (Invicto)</option>
                    <option value="Irregular">Estudiante Irregular</option>
                    <option value="Reingresante">Reingresante</option>
                    <option value="Traslado">Traslado / Convalidación</option>
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

              {/* Motor de matrícula: ciclo, cursos a cargo y restricciones (secciones 2, 3 y 5) */}
              {propuesta && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-indigo-700 uppercase tracking-wider text-[11px] mr-1">⚙️ Motor de matrícula</span>
                    <span className="px-3 py-1 bg-white rounded-full font-bold text-indigo-700 border border-indigo-100 text-xs">Casuística: {propuesta.casuistica}</span>
                    <span className="px-3 py-1 bg-white rounded-full font-bold text-blue-700 border border-blue-100 text-xs">Ciclo detectado: {propuesta.ciclo_sugerido}</span>
                    {propuesta.tiene_cursos_a_cargo ? (
                      <span className="px-3 py-1 bg-amber-100 rounded-full font-bold text-amber-700 border border-amber-200 text-xs">Cursos a cargo: {propuesta.obligatorias.length} ({propuesta.resumen?.creditos_obligatorios} cr.)</span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 rounded-full font-bold text-slate-600 border border-slate-200 text-xs">Sin cursos a cargo</span>
                    )}
                    {propuesta.resumen?.total_bloqueadas > 0 && (
                      <span className="px-3 py-1 bg-red-100 rounded-full font-bold text-red-700 border border-red-200 text-xs">Bloqueadas: {propuesta.resumen.total_bloqueadas}</span>
                    )}
                    {propuesta.periodo && !propuesta.periodo.abierto && (
                      <span className="px-3 py-1 bg-red-100 rounded-full font-bold text-red-700 border border-red-200 text-xs">🔒 {propuesta.periodo.mensaje}</span>
                    )}
                    {propuesta.periodo && propuesta.periodo.abierto && propuesta.periodo.extemporanea && (
                      <span className="px-3 py-1 bg-amber-100 rounded-full font-bold text-amber-700 border border-amber-200 text-xs">⏰ {propuesta.periodo.mensaje}</span>
                    )}
                  </div>
                  {propuesta.warnings?.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {propuesta.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-700 flex items-start"><span className="mr-1">⚠️</span><span>{w}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

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
                      {modulo.unidades.map(ud => {
                        const motivoBloqueo = bloqueadasMap.get(ud.id);
                        return (
                        <label key={ud.id} className={`flex items-center p-3 transition-colors ${motivoBloqueo ? 'cursor-not-allowed' : 'cursor-pointer'} ${selectedUDs[ud.id] ? 'bg-primary/5' : 'hover:bg-slate-50'} ${motivoBloqueo ? 'opacity-70 bg-red-50/40' : ''}`}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary mr-4"
                            checked={!!selectedUDs[ud.id]}
                            disabled={!!motivoBloqueo}
                            onChange={() => toggleUD(ud.id)}
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${selectedUDs[ud.id] ? 'text-primary' : 'text-slate-700'}`}>{ud.nombre}</div>
                            <div className="text-xs text-slate-500">{ud.creditos} Créditos • {ud.horas} Horas</div>
                            {motivoBloqueo && (
                              <div className="text-xs text-red-600 font-semibold mt-0.5">🚫 {motivoBloqueo}</div>
                            )}
                          </div>
                        </label>
                        );
                      })}
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

          {/* Paso 4: Éxito — Boleta QR (6), Avance (8) y Resultado final (7) */}
          {step === 4 && (
            <div className="animate-bounce-in bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white min-h-[400px]">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg shadow-green-100">
                  ✅
                </div>
                <h3 className="font-extrabold text-3xl text-slate-800 mb-2">¡Matrícula Registrada!</h3>
                <p className="text-slate-500 text-center max-w-lg">La matrícula quedó <b>confirmada</b>. Emita la boleta con su código QR y cierre el proceso.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sección 6: Boleta con QR */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center">🧾 Boleta de Matrícula</h4>
                  {boleta ? (
                    <>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4">
                        <QRCodeSVG
                          value={`${API_BASE}${boleta.qr?.url_validacion || ''}`}
                          size={152}
                          level="M"
                          marginSize={2}
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Código único</div>
                      <div className="font-mono font-bold text-slate-800 mb-2">{boleta.codigo}</div>
                      <p className="text-xs text-slate-500 text-center">Escanea el QR para validar la matrícula en tiempo real (alumno / secretaría).</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Boleta no disponible.</p>
                  )}
                </div>

                {/* Sección 8: Avance de créditos */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center">📈 Avance Académico</h4>
                  {avance ? (
                    <>
                      <div className="text-sm text-slate-600 mb-2 flex justify-between">
                        <span>Créditos aprobados</span><b>{avance.creditos_aprobados} / {avance.creditos_totales}</b>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary-light h-3 transition-all" style={{ width: `${avance.porcentaje_avance}%` }}></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 rounded-lg p-2"><div className="text-lg font-bold text-slate-800">{avance.ciclo_actual}</div><div className="text-[10px] uppercase text-slate-400 font-bold">Ciclo</div></div>
                        <div className="bg-slate-50 rounded-lg p-2"><div className="text-lg font-bold text-slate-800">{avance.unidades_aprobadas}</div><div className="text-[10px] uppercase text-slate-400 font-bold">Aprobadas</div></div>
                        <div className="bg-slate-50 rounded-lg p-2"><div className="text-lg font-bold text-slate-800">{avance.unidades_pendientes}</div><div className="text-[10px] uppercase text-slate-400 font-bold">Pendientes</div></div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">Condición: <b>{avance.condicion}</b></div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">No disponible.</p>
                  )}
                </div>
              </div>

              {/* Sección 7: Resultado final (consolidación) */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
                  <h4 className="font-bold text-slate-700 flex items-center">🏁 Resultado Final del Proceso</h4>
                  <button
                    className="bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={consolidando || !matricula || !!consolidacion}
                    onClick={handleConsolidar}
                  >
                    {consolidando ? 'Consolidando...' : consolidacion ? 'Proceso cerrado ✓' : 'Cerrar proceso de matrícula'}
                  </button>
                </div>
                {consolidacion ? (
                  <ul className="space-y-1.5">
                    {consolidacion.pasos.map(p => (
                      <li key={p.paso} className="text-sm text-slate-600 flex items-start">
                        <span className="text-green-500 mr-2">✔</span>
                        <span><b>Paso {p.paso}:</b> {p.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    Al cerrar el proceso se genera el registro académico, se asignan códigos/horarios/docentes,
                    se emite la boleta y se notifica al estudiante y a la secretaría.
                  </p>
                )}
              </div>

              <div className="flex justify-center mt-8">
                <button 
                  className="btn-primary py-3 px-8 text-lg" 
                  onClick={() => {
                    if (onCancel) {
                      onCancel(); 
                    } else {
                      setStep(1); 
                      setSelection({student:null, program:null, period:null, tipo:'Ordinario'});
                      setPropuesta(null); setBoleta(null); setAvance(null); setConsolidacion(null); setMatricula(null); setMalla([]); setSelectedUDs({});
                    }
                  }}
                >
                  {onCancel ? 'Volver al Inicio' : 'Realizar otra matrícula'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
