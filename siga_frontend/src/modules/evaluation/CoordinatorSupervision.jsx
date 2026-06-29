import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function CoordinatorSupervision() {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [malla, setMalla] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  const [selectedViewUD, setSelectedViewUD] = useState(null);
  const [udStudents, setUdStudents] = useState([]);
  const [loadingUD, setLoadingUD] = useState(false);

  // Initial data load
  useEffect(() => {
    const fetchInitial = async () => {
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
    fetchInitial();
  }, []);

  // Load Malla when program is selected
  useEffect(() => {
    if (!selectedProgram) {
      setMalla([]);
      setSelectedViewUD(null);
      return;
    }
    const fetchMalla = async () => {
      setLoading(true);
      try {
        const res = await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/malla`);
        // We simulate a completion percentage for the MVP dashboard
        const enhancedMalla = (res || []).map(modulo => ({
          ...modulo,
          unidades: modulo.unidades.map(u => ({
            ...u,
            // Mock completion percentage for visual dashboard (in a real app, this would come from a backend aggregation endpoint)
            completion: Math.floor(Math.random() * 40) + 60, // random 60-100%
            isEmpleabilidad: /comunicaci|ingl[eé]s|ofim[aá]tica|emprendimiento/i.test(u.nombre) || /empleabilidad|transversal/i.test(modulo.nombre)
          }))
        }));
        setMalla(enhancedMalla);
      } catch (e) {
        console.error('Error fetching malla', e);
      }
      setLoading(false);
    };
    fetchMalla();
  }, [selectedProgram]);

  const handleViewActa = async (unidad, moduloNombre) => {
    if (!selectedPeriod) {
      alert("Por favor, seleccione un periodo académico primero.");
      return;
    }
    setSelectedViewUD({ ...unidad, moduloNombre });
    setLoadingUD(true);
    try {
      const enrolled = await apiClient.request(`/api/mod-gestion-academica/matriculas/unidad/${unidad.id}/periodo/${selectedPeriod}`).catch(() => []);
      const grades = await apiClient.request(`/api/mod-evaluacion/registros/unidad/${unidad.id}/periodo/${selectedPeriod}`).catch(() => []);
      
      const combined = enrolled.map(est => {
        const gradeRecord = grades.find(g => g.matricula_detalle_id === est.matricula_detalle_id);
        
        let avg = '-';
        if (gradeRecord) {
          const vals = [gradeRecord.nota_c1, gradeRecord.nota_c2, gradeRecord.nota_c3].filter(g => g !== null && g !== undefined);
          if (vals.length > 0) {
            avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          }
        }
        
        return {
          id: est.id,
          name: `${est.apellidos}, ${est.nombres}`,
          c1: gradeRecord?.nota_c1 ?? '-',
          c2: gradeRecord?.nota_c2 ?? '-',
          c3: gradeRecord?.nota_c3 ?? '-',
          avg,
          estado: gradeRecord?.estado || 'Sin Registrar'
        };
      });
      
      combined.sort((a, b) => a.name.localeCompare(b.name));
      setUdStudents(combined);
    } catch (e) {
      console.error('Error fetching actas', e);
    }
    setLoadingUD(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Supervisión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Actas y Evaluación</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Vista gerencial para Coordinadores de Programa y Secretaría</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-indigo-500">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">1. Programa de Estudio</label>
          <select 
            className="input-field w-full text-sm font-medium"
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
          >
            <option value="">-- Seleccionar Programa a Supervisar --</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        
        <div className="glass-card p-5 border-l-4 border-l-teal-500">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">2. Periodo Académico</label>
          <select 
            className="input-field w-full text-sm font-medium"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            disabled={!selectedProgram}
          >
            <option value="">-- Seleccionar Periodo --</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {selectedProgram && selectedPeriod && !loading && (
        <div className="space-y-6 mt-6">
          <h4 className="text-xl font-bold text-slate-700 border-b pb-2">Estado de Actas por Módulo Formativo</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {malla.map(modulo => (
              <div key={modulo.id} className="glass-card p-0 overflow-hidden shadow-md">
                <div className="bg-slate-800 text-white p-4">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Ciclo {modulo.periodo}</div>
                  <h5 className="font-semibold">{modulo.nombre}</h5>
                </div>
                <div className="p-4 space-y-4">
                  {modulo.unidades.map(u => (
                    <div key={u.id} className="flex flex-col border border-slate-100 rounded-lg p-3 hover:shadow-sm transition-all bg-white/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-slate-700 text-sm block">{u.nombre}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${u.isEmpleabilidad ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {u.isEmpleabilidad ? 'Transversal / Empleabilidad' : 'Específica'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleViewActa(u, modulo.nombre)}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-1.5 px-3 rounded-lg transition-colors border border-indigo-200"
                        >
                          Ver Acta
                        </button>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${u.completion === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${u.completion}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500 mt-1">
                        <span>Avance de Registro</span>
                        <span className={u.completion === 100 ? 'text-green-600' : ''}>{u.completion}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal / Vista Detallada de Acta */}
      {selectedViewUD && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedViewUD.isEmpleabilidad ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selectedViewUD.isEmpleabilidad ? 'Transversal / Empleabilidad' : 'Específica'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                    Periodo: {periods.find(p => p.id === parseInt(selectedPeriod))?.codigo}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{selectedViewUD.nombre}</h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{selectedViewUD.moduloNombre}</p>
              </div>
              <button 
                onClick={() => setSelectedViewUD(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-slate-50/50">
              {loadingUD ? (
                <div className="py-20 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-500 font-medium text-sm">Recuperando registros oficiales...</p>
                </div>
              ) : udStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No hay estudiantes matriculados en esta UD.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-800 text-white sticky top-0">
                    <tr>
                      <th className="py-3 px-4 font-semibold w-12 text-center">N°</th>
                      <th className="py-3 px-4 font-semibold">Estudiante</th>
                      <th className="py-3 px-3 font-semibold text-center w-20">Cap. 1</th>
                      <th className="py-3 px-3 font-semibold text-center w-20">Cap. 2</th>
                      <th className="py-3 px-3 font-semibold text-center w-20">Cap. 3</th>
                      <th className="py-3 px-4 font-bold text-center w-24 bg-slate-700/50">Nota Final</th>
                      <th className="py-3 px-4 font-semibold text-center w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {udStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{s.name}</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-medium">{s.c1}</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-medium">{s.c2}</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-medium">{s.c3}</td>
                        <td className={`py-3 px-4 text-center font-bold text-lg bg-slate-50 shadow-[inset_1px_0_0_rgba(0,0,0,0.05)] ${
                          s.avg === '-' ? 'text-slate-400' : 
                          parseInt(s.avg) >= 13 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {s.avg}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                            s.estado === 'aprobado' ? 'bg-green-100 text-green-700 border border-green-200' :
                            s.estado === 'desaprobado' ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {s.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-between items-center">
              <div className="text-xs text-slate-500 font-medium flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Modo Auditoría: Solo Lectura
              </div>
              <button 
                className="btn-primary text-sm px-4 py-2"
                onClick={() => alert("Función 'Exportar a PDF (MINEDU)' en desarrollo.")}
              >
                📄 Exportar Acta Oficial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
