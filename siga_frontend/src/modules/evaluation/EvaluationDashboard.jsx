import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { DocentePlanning } from '../academic/DocentePlanning';

export function EvaluationDashboard() {
  const [activeTab, setActiveTab] = useState('notas'); // 'notas', 'planificacion'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [malla, setMalla] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [students, setStudents] = useState([]);

  // Cargar Programas y Periodos al iniciar
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [progRes, perRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas'),
          apiClient.request('/api/mod-programas-estudio/periodos')
        ]);
        setPrograms(progRes || []);
        setPeriods(perRes || []);
      } catch (e) {
        console.error('Error fetching initial data', e);
      }
    };
    fetchInitialData();
  }, []);

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
        // 1. Obtener estudiantes matriculados en esta unidad/periodo
        const enrolled = await apiClient.request(`/api/mod-gestion-academica/matriculas/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []);
        
        // 2. Obtener registros de notas existentes
        const grades = await apiClient.request(`/api/mod-evaluacion/registros/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []);
        
        // 3. Combinar datos
        const combined = enrolled.map(est => {
          // buscar si tiene notas registradas
          const gradeRecord = grades.find(g => g.matricula_detalle_id === est.matricula_detalle_id);
          return {
            id: est.id, // estudiante_id
            matricula_detalle_id: est.matricula_detalle_id,
            name: `${est.apellidos}, ${est.nombres}`,
            registro_id: gradeRecord ? gradeRecord.id : null,
            c1: gradeRecord?.nota_c1 ?? '',
            c2: gradeRecord?.nota_c2 ?? '',
            c3: gradeRecord?.nota_c3 ?? ''
          };
        });
        
        // Ordenar alfabéticamente
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

  const calculateAverage = (student) => {
    const grades = [student.c1, student.c2, student.c3]
      .filter(g => g !== '')
      .map(g => parseInt(g, 10));
    
    if (grades.length === 0) return '-';
    
    const sum = grades.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / grades.length);
    return avg;
  };

  const getGradeColorClass = (grade) => {
    if (grade === '' || grade === '-') return 'text-slate-500';
    const num = parseInt(grade, 10);
    return num >= 13 ? 'text-blue-600 font-bold' : 'text-red-600 font-bold';
  };
  
  const handleSaveGrades = async () => {
    if (!selectedUnit || !selectedPeriod || students.length === 0) return;
    
    setSaving(true);
    try {
      const promises = students.map(student => {
        const payload = {
          nota_c1: student.c1 !== '' ? parseInt(student.c1) : null,
          nota_c2: student.c2 !== '' ? parseInt(student.c2) : null,
          nota_c3: student.c3 !== '' ? parseInt(student.c3) : null
        };
        
        if (student.registro_id) {
          // UPDATE
          return apiClient.request(`/api/mod-evaluacion/registros/${student.registro_id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          }).then(data => ({ status: 'ok', data }));
        } else {
          // CREATE
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
      
      // Actualizar registro_ids para los nuevos creados
      const newStudents = [...students];
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'ok' && !newStudents[i].registro_id) {
          newStudents[i].registro_id = res.data.id;
        }
      }
      setStudents(newStudents);
      
      // Mostrar alerta de éxito bonita en vez del alert nativo (simulado con alert para MVP)
      alert("✅ ¡Calificaciones guardadas exitosamente!");
      
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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Registro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Evaluaciones</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Ingreso de calificaciones por Unidad Didáctica (Sistema Vigesimal)</p>
        </div>
        <button 
          onClick={handleSaveGrades}
          disabled={saving || !selectedUnit || students.length === 0}
          className={`mt-4 md:mt-0 flex items-center space-x-2 shadow-glow ${saving || !selectedUnit || students.length === 0 ? 'bg-slate-300 cursor-not-allowed px-5 py-2.5 rounded-xl text-white font-medium transition-all' : 'btn-primary px-5 py-2.5 rounded-xl'}`}
        >
          {saving ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Guardando...</span></>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              <span>Guardar Acta</span>
            </>
          )}
        </button>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('notas')}
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'notas' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Ingreso de Calificaciones
        </button>
        <button
          onClick={() => setActiveTab('planificacion')}
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'planificacion' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Sílabos y Plan de Trabajo
        </button>
      </div>

      {activeTab === 'planificacion' ? (
        <DocentePlanning />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-primary md:col-span-3">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">1. Seleccionar Programa</label>
          <select 
            className="input-field w-full text-sm font-medium"
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
          >
            <option value="">-- Programa --</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        
        <div className="glass-card p-5 border-l-4 border-l-blue-400 md:col-span-3">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">2. Periodo Académico</label>
          <select 
            className="input-field w-full text-sm font-medium"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            disabled={!selectedProgram}
          >
            <option value="">-- Periodo --</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
          </select>
        </div>
        
        <div className="glass-card p-5 border-l-4 border-l-purple-400 md:col-span-6">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">3. Unidad Didáctica</label>
          <select 
            className="input-field w-full text-sm font-bold text-slate-700"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={!selectedProgram || !selectedPeriod || malla.length === 0}
          >
            <option value="">-- Seleccione Unidad --</option>
            {malla.map(modulo => (
              <optgroup key={`mod-${modulo.id}`} label={`Ciclo ${modulo.periodo} - ${modulo.nombre}`}>
                {modulo.unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {selectedUnit && selectedPeriod && (
        <div className="glass-card p-0 overflow-hidden animate-fade-in-up border border-slate-200/60 shadow-lg">
          <div className="bg-slate-800 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="font-bold flex items-center text-xl">
                <span className="text-3xl mr-3">📋</span>
                Acta de Evaluaciones
              </h4>
              {tipoCompetencia && (
                <div className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tipoCompetencia.includes('Transversal') ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {tipoCompetencia.includes('Transversal') ? '🌐' : '🎯'} {tipoCompetencia}
                </div>
              )}
            </div>
            <div className="text-sm text-slate-300 bg-white/10 px-4 py-2 rounded-xl flex items-center border border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
              Aprobatorio: <span className="font-bold text-white ml-2 text-base">13 a 20</span>
            </div>
          </div>
          
          <div className="overflow-x-auto p-0 bg-white/50">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Cargando nómina de estudiantes...</p>
              </div>
            ) : students.length === 0 ? (
               <div className="py-20 text-center flex flex-col items-center">
                <div className="text-6xl mb-4 opacity-40">📭</div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Sin estudiantes matriculados</h3>
                <p className="text-slate-500 max-w-md">No hay registros de matrícula para esta Unidad Didáctica en el periodo seleccionado.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80">
                    <th className="py-4 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider w-16 text-center">N°</th>
                    <th className="py-4 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider">Apellidos y Nombres</th>
                    <th className="py-4 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center w-28">Capacidad 1<br/><span className="text-[10px] text-slate-400 font-normal">PC1 + Tareas</span></th>
                    <th className="py-4 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center w-28">Capacidad 2<br/><span className="text-[10px] text-slate-400 font-normal">Ex. Parcial</span></th>
                    <th className="py-4 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center w-28">Capacidad 3<br/><span className="text-[10px] text-slate-400 font-normal">Ex. Final</span></th>
                    <th className="py-4 px-6 font-extrabold text-slate-800 uppercase text-xs tracking-wider text-center w-32 bg-slate-200/50 shadow-inner">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const avg = calculateAverage(student);
                    return (
                      <tr key={student.id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-4 px-6 text-slate-400 font-medium text-sm text-center">{idx + 1}</td>
                        <td className="py-4 px-6 font-semibold text-slate-700">{student.name}</td>
                        
                        <td className="py-2 px-3">
                          <input 
                            type="text" 
                            className={`w-full text-center py-2.5 px-1 border-2 rounded-xl outline-none transition-all focus:shadow-md ${student.c1 === '' ? 'border-slate-200 focus:border-primary bg-white' : parseInt(student.c1) >= 13 ? 'border-blue-200 text-blue-700 bg-blue-50/80 focus:border-blue-500 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]' : 'border-red-200 text-red-700 bg-red-50/80 focus:border-red-500 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'} font-bold text-lg`}
                            value={student.c1}
                            onChange={(e) => handleGradeChange(student.id, 'c1', e.target.value)}
                            maxLength={2}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input 
                            type="text" 
                            className={`w-full text-center py-2.5 px-1 border-2 rounded-xl outline-none transition-all focus:shadow-md ${student.c2 === '' ? 'border-slate-200 focus:border-primary bg-white' : parseInt(student.c2) >= 13 ? 'border-blue-200 text-blue-700 bg-blue-50/80 focus:border-blue-500 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]' : 'border-red-200 text-red-700 bg-red-50/80 focus:border-red-500 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'} font-bold text-lg`}
                            value={student.c2}
                            onChange={(e) => handleGradeChange(student.id, 'c2', e.target.value)}
                            maxLength={2}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input 
                            type="text" 
                            className={`w-full text-center py-2.5 px-1 border-2 rounded-xl outline-none transition-all focus:shadow-md ${student.c3 === '' ? 'border-slate-200 focus:border-primary bg-white' : parseInt(student.c3) >= 13 ? 'border-blue-200 text-blue-700 bg-blue-50/80 focus:border-blue-500 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]' : 'border-red-200 text-red-700 bg-red-50/80 focus:border-red-500 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'} font-bold text-lg`}
                            value={student.c3}
                            onChange={(e) => handleGradeChange(student.id, 'c3', e.target.value)}
                            maxLength={2}
                          />
                        </td>
                        
                        <td className={`py-4 px-6 text-center text-2xl bg-slate-100/50 group-hover:bg-slate-200/50 transition-colors shadow-[inset_1px_0_0_rgba(0,0,0,0.02)] ${getGradeColorClass(avg)}`}>
                          {avg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
