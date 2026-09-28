import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { DocentePlanning } from '../academic/DocentePlanning';
import { useAuth } from '../../core/auth/useAuth';
import { Save, GraduationCap, Calendar, BookOpen, ClipboardList, AlertTriangle, Target, FileText, Printer, X, CheckCircle2 } from 'lucide-react';

export function EvaluationDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notas'); // 'notas', 'planificacion'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showActaModal, setShowActaModal] = useState(false);
  
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [malla, setMalla] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [students, setStudents] = useState([]);

  // Cargar Programas, Periodos y Carga del Docente al iniciar
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [progRes, perRes, loadRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas'),
          apiClient.request('/api/mod-programas-estudio/periodos'),
          user?.id ? apiClient.request(`/api/mod-programas-estudio/docentes/${user.id}/carga-lectiva`).catch(() => []) : Promise.resolve([])
        ]);
        setPrograms(progRes || []);
        setPeriods(perRes || []);
        setTeacherLoad(loadRes || []);

        if (loadRes && loadRes.length > 0) {
          setSelectedProgram(loadRes[0].programa_id.toString());
          setSelectedPeriod(loadRes[0].periodo_id.toString());
        } else if (perRes && perRes.length > 0) {
          setSelectedPeriod(perRes[perRes.length - 1].id.toString());
        }
      } catch (e) {
        console.error('Error fetching initial data', e);
      }
    };
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  // Cargar Malla cuando se selecciona un Programa
  useEffect(() => {
    if (!selectedProgram) {
      setMalla([]);
      setSelectedUnit('');
      return;
    }
    const fetchMalla = async () => {
      try {
        const res = await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/malla`);
        setMalla(res || []);
      } catch (e) {
        console.error('Error fetching malla', e);
      }
    };
    fetchMalla();
  }, [selectedProgram]);

  // Cargar Estudiantes matriculados y sus notas cuando se selecciona la Unidad y el Periodo
  useEffect(() => {
    if (!selectedUnit || !selectedPeriod) {
      setStudents([]);
      return;
    }
    
    const fetchStudentsAndGrades = async () => {
      setLoading(true);
      try {
        const enrolled = await apiClient.request(`/api/mod-gestion-academica/matriculas/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []);
        const grades = await apiClient.request(`/api/mod-evaluacion/registros/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []);
        
        const combined = enrolled.map(est => {
          const gradeRecord = grades.find(g => g.matricula_detalle_id === est.matricula_detalle_id);
          return {
            id: est.id,
            matricula_detalle_id: est.matricula_detalle_id,
            name: `${est.apellidos}, ${est.nombres}`,
            registro_id: gradeRecord ? gradeRecord.id : null,
            nota_final: gradeRecord?.nota_final ?? ''
          };
        });
        
        combined.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(combined);
      } catch (e) {
        console.error('Error fetching students and grades', e);
      }
      setLoading(false);
    };
    
    fetchStudentsAndGrades();
  }, [selectedUnit, selectedPeriod]);

  const handleGradeChange = (studentId, criteria, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    const numValue = parseInt(value, 10);
    if (value !== '' && (numValue < 0 || numValue > 20)) return;

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, [criteria]: value };
      }
      return s;
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedUnit || !selectedPeriod || students.length === 0) return;
    
    setSaving(true);
    try {
      const promises = students.map(student => {
        const payload = {
          nota_final: student.nota_final !== '' ? parseInt(student.nota_final) : null
        };
        
        if (student.registro_id) {
          return apiClient.request(`/api/mod-evaluacion/registros/${student.registro_id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          }).then(data => ({ status: 'ok', data }));
        } else {
          return apiClient.request(`/api/mod-evaluacion/registros`, {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              matricula_detalle_id: student.matricula_detalle_id,
              estudiante_id: student.id,
              unidad_didactica_id: parseInt(selectedUnit),
              periodo_id: parseInt(selectedPeriod)
            })
          }).then(data => ({ status: 'ok', data }));
        }
      });
      
      const results = await Promise.all(promises);
      
      const newStudents = [...students];
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'ok' && !newStudents[i].registro_id) {
          newStudents[i].registro_id = res.data.id;
        }
      }
      setStudents(newStudents);
      alert("✅ Calificaciones guardadas exitosamente");
    } catch (e) {
      console.error('Error saving grades', e);
      alert("❌ Ocurrió un error al guardar las calificaciones.");
    }
    setSaving(false);
  };

  const getTipoCompetencia = (unidadNombre, moduloNombre) => {
    const isEmpleabilidad = 
      /comunicaci|ingl[eé]s|ofim[aá]tica|emprendimiento|liderazgo|[eé]tica/i.test(unidadNombre) ||
      /empleabilidad|transversal/i.test(moduloNombre);
    return isEmpleabilidad ? 'Transversal / Empleabilidad' : 'Específica / Técnica';
  };

  const selectedUnitData = malla.flatMap(m => m.unidades.map(u => ({ ...u, moduloNombre: m.nombre }))).find(u => u.id === parseInt(selectedUnit));
  const tipoCompetencia = selectedUnitData ? getTipoCompetencia(selectedUnitData.nombre, selectedUnitData.moduloNombre) : '';

  const numberToWords = (num) => {
    const words = [
      'CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
      'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
    ];
    const n = parseInt(num);
    if (isNaN(n) || n < 0 || n > 20) return '-';
    return words[n];
  };

  const gradedStudents = students.filter(s => s.nota_final !== '' && !isNaN(Number(s.nota_final)));
  const aprobadosCount = gradedStudents.filter(s => Number(s.nota_final) >= 13).length;
  const desaprobadosCount = gradedStudents.filter(s => Number(s.nota_final) < 13).length;
  const porcentajeAprobacion = gradedStudents.length > 0 
    ? ((aprobadosCount / gradedStudents.length) * 100).toFixed(1) 
    : '0';

  const currentProgramName = programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Programa de Estudios';
  const currentPeriodName = periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Periodo';
  const currentUnitName = selectedUnitData?.nombre || 'Unidad Didáctica';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Estilo Linear */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
            <span>Módulo de Evaluación y Calificaciones</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Registro de Calificaciones
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Ingreso y consolidación de promedios finales por unidad didáctica (Escala Vigesimal 0-20).
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setShowActaModal(true)}
            disabled={!selectedUnit || students.length === 0}
            className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-medium text-xs border transition-all ${
              !selectedUnit || students.length === 0 
                ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed' 
                : 'border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 shadow-sm cursor-pointer'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Acta Oficial (PDF)</span>
          </button>

          <button 
            onClick={handleSaveGrades}
            disabled={saving || !selectedUnit || students.length === 0}
            className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-xl font-medium text-xs shadow-sm transition-all ${
              saving || !selectedUnit || students.length === 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
            }`}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Promedios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
        <button
          onClick={() => setActiveTab('notas')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'notas' 
              ? 'bg-white text-slate-900 shadow-sm font-semibold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ingreso de Calificaciones
        </button>
        <button
          onClick={() => setActiveTab('planificacion')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'planificacion' 
              ? 'bg-white text-slate-900 shadow-sm font-semibold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Sílabos y Plan de Trabajo
        </button>
      </div>

      {activeTab === 'planificacion' ? (
        <DocentePlanning />
      ) : (
        <>
          {/* Tarjeta de Contexto y Selección de Curso */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Programa Seleccionado</span>
                  <span className="text-xs font-bold text-slate-900">
                    {programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Seleccione un programa'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Periodo Lectivo</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Cargando...'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen size={14} className="text-slate-400" />
                <span>Seleccionar Unidad Didáctica a Evaluar</span>
              </label>
              
              <div className="relative">
                <select 
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={!selectedProgram || !selectedPeriod || malla.length === 0}
                >
                  <option value="" className="text-slate-400">-- Seleccione el curso a evaluar --</option>
                  {malla.map(modulo => {
                    const assignedUnits = modulo.unidades.filter(u => 
                      teacherLoad.some(t => t.unidad_didactica_id === u.id && t.periodo_id === parseInt(selectedPeriod))
                    );
                    
                    if (assignedUnits.length === 0) return null;
                    
                    return (
                      <optgroup key={`mod-${modulo.id}`} label={`Ciclo ${modulo.periodo} - ${modulo.nombre}`} className="bg-slate-50 font-bold text-slate-500 text-xs">
                        {assignedUnits.map(u => (
                          <option key={u.id} value={u.id} className="font-medium text-slate-800 text-xs">
                            {u.nombre}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>

              {teacherLoad.length === 0 && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-800">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                  <span>No tienes unidades didácticas asignadas en tu carga lectiva para este periodo.</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Registro de Promedios */}
          {selectedUnit && selectedPeriod && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
              {/* Barra superior de estado */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-sm text-slate-900">
                    Nómina de Calificaciones
                  </h4>
                  {tipoCompetencia && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <Target size={12} className="text-slate-500" />
                      <span>{tipoCompetencia}</span>
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Nota mínima aprobatoria: 13 a 20</span>
                </div>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-slate-400 text-xs">Cargando nómina...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-400 text-xs">No hay estudiantes matriculados en esta unidad didáctica.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] w-12 text-center">N°</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Apellidos y Nombres</th>
                        <th className="py-3 px-4 font-semibold text-slate-700 uppercase tracking-wider text-[11px] text-center w-36">Promedio Final</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] text-center w-32">Condición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student, idx) => {
                        const numGrade = parseInt(student.nota_final);
                        const hasGrade = student.nota_final !== '' && !isNaN(numGrade);
                        const isPassed = hasGrade && numGrade >= 13;

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-medium text-slate-800 text-xs">{student.name}</td>
                            <td className="py-2 px-4 text-center">
                              <input 
                                type="text" 
                                className={`w-16 mx-auto text-center py-1.5 px-2 border rounded-xl outline-none font-bold text-sm transition-all ${
                                  student.nota_final === '' 
                                    ? 'border-slate-200 bg-white text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900' 
                                    : isPassed 
                                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50 focus:border-emerald-500 focus:bg-white' 
                                      : 'border-rose-300 text-rose-700 bg-rose-50/50 focus:border-rose-500 focus:bg-white'
                                }`}
                                value={student.nota_final}
                                onChange={(e) => handleGradeChange(student.id, 'nota_final', e.target.value)}
                                maxLength={2}
                                placeholder="--"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              {!hasGrade ? (
                                <span className="text-[11px] text-slate-400 font-medium">Pendiente</span>
                              ) : isPassed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aprobado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Desaprobado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL ACTA OFICIAL IMPRIMIBLE */}
      {showActaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-4xl w-full my-8 overflow-hidden print:shadow-none print:max-w-none print:w-full print:m-0">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-sm text-slate-900">Acta Oficial de Evaluación</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer size={14} />
                  <span>Imprimir / Descargar PDF</span>
                </button>
                <button
                  onClick={() => setShowActaModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Documento Oficial del Acta */}
            <div className="p-8 md:p-10 text-slate-900 print:p-4 text-xs font-sans">
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  República del Perú • Ministerio de Educación
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight mt-0.5 text-slate-900">
                  INSTITUTO DE EDUCACIÓN SUPERIOR TECNOLÓGICO PÚBLICO "SUIZA"
                </h2>
                <div className="inline-block px-3 py-1 bg-slate-100 font-extrabold text-[11px] uppercase mt-2 rounded border border-slate-300">
                  ACTA CONSOLIDADA DE EVALUACIÓN FINAL DE UNIDAD DIDÁCTICA
                </div>
              </div>

              {/* Datos de Cabecera */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Programa de Estudios:</span>
                  <span className="font-extrabold text-slate-800">{currentProgramName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Periodo Académico:</span>
                  <span className="font-bold text-slate-800">{currentPeriodName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Unidad Didáctica:</span>
                  <span className="font-bold text-slate-800">{currentUnitName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Docente Responsable:</span>
                  <span className="font-bold text-slate-800">{user?.full_name || 'Docente Titular'}</span>
                </div>
              </div>

              {/* Tabla de Estudiantes */}
              <table className="w-full text-left border border-slate-400 border-collapse mb-6 text-xs">
                <thead className="bg-slate-100 uppercase font-extrabold text-slate-800 border-b border-slate-400 text-center">
                  <tr>
                    <th className="py-2 px-2 border-r border-slate-400 w-10">N°</th>
                    <th className="py-2 px-3 border-r border-slate-400 text-left">Apellidos y Nombres</th>
                    <th className="py-2 px-2 border-r border-slate-400 w-20">Nota (N°)</th>
                    <th className="py-2 px-3 border-r border-slate-400 w-36">Nota en Letras</th>
                    <th className="py-2 px-3 w-28">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {students.map((st, idx) => {
                    const gradeNum = parseInt(st.nota_final);
                    const hasGrade = st.nota_final !== '' && !isNaN(gradeNum);
                    const isPassed = hasGrade && gradeNum >= 13;
                    return (
                      <tr key={st.id} className="text-center hover:bg-slate-50">
                        <td className="py-2 px-2 border-r border-slate-300 font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-left font-semibold text-slate-800">{st.name}</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-black text-sm">
                          {hasGrade ? String(gradeNum).padStart(2, '0') : '-'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 uppercase text-[10px] font-semibold text-slate-600">
                          {hasGrade ? numberToWords(gradeNum) : 'NO EVALUADO'}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-[10px]">
                          {!hasGrade ? (
                            <span className="text-slate-400">SIN NOTA</span>
                          ) : isPassed ? (
                            <span className="text-blue-800">APROBADO</span>
                          ) : (
                            <span className="text-red-700">DESAPROBADO</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Estadísticas */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl mb-12 text-center text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Matriculados</span>
                  <span className="font-black text-sm text-slate-800">{students.length}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Aprobados</span>
                  <span className="font-black text-sm text-emerald-700">{aprobadosCount}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Desaprobados</span>
                  <span className="font-black text-sm text-red-600">{desaprobadosCount}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">% Aprobación</span>
                  <span className="font-black text-sm text-blue-700">{porcentajeAprobacion}%</span>
                </div>
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div>
                  <div className="w-40 mx-auto border-t border-slate-800 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Firma del Docente</span>
                  <span className="text-[10px] text-slate-500">{user?.full_name || 'Docente Responsable'}</span>
                </div>
                <div>
                  <div className="w-40 mx-auto border-t border-slate-800 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Coordinación de Carrera</span>
                  <span className="text-[10px] text-slate-500">Visto Bueno</span>
                </div>
                <div>
                  <div className="w-40 mx-auto border-t border-slate-800 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Secretaría Académica</span>
                  <span className="text-[10px] text-slate-500">Recepción Oficial</span>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 text-center mt-8 pt-4 border-t border-slate-200">
                Acta oficial generada por el SIGA el {new Date().toLocaleString()} • Válida como registro institucional oficial
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
