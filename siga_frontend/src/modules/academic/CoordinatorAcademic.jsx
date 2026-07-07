import { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';
import { CoordinatorReview } from './CoordinatorReview';
import { CoordinatorTutorias } from './CoordinatorTutorias';

export function CoordinatorAcademic() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('carga'); // 'carga', 'horarios'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Selectors
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  // Data
  const [personal, setPersonal] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [malla, setMalla] = useState([]);
  const [unidadesFlat, setUnidadesFlat] = useState([]);
  const [cargaLectiva, setCargaLectiva] = useState([]);
  const [horarios, setHorarios] = useState([]);
  
  // Forms
  const [cargaForm, setCargaForm] = useState({ docente_id: '', unidades_didacticas_ids: [], turno: 'Mañana', seccion: 'A' });
  const [horarioForm, setHorarioForm] = useState({ archivo_excel_url: '', observaciones: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [progRes, perRes, personalRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
          apiClient.request('/api/mod-usuarios/personal').catch(() => [])
        ]);
        
        setPrograms(progRes);
        setPeriods(perRes);
        setPersonal(personalRes || []);
        
        if (personalRes && user) {
          const myProfile = personalRes.find(p => p.usuario?.id === user.id);
          if (myProfile?.perfil?.programa_estudio_id) {
            setSelectedProgram(myProfile.perfil.programa_estudio_id.toString());
          }
        }
        
        if (perRes && perRes.length > 0) {
          const active = perRes.find(p => p.estado === 'ACTIVO');
          setSelectedPeriod(active ? active.id.toString() : perRes[perRes.length - 1].id.toString());
        }
        
      } catch (error) {
        console.error("Error loading initial data", error);
      }
    };
    
    if (user) fetchInitial();
  }, [user]);

  // 2. Load Malla and filter docentes when Program changes
  useEffect(() => {
    if (!selectedProgram) {
      setMalla([]);
      setUnidadesFlat([]);
      setDocentes([]);
      return;
    }
    
    // Filter personal for the selected program and exclude secretaries
    const filteredStaff = personal.filter(p => 
      p.perfil && 
      (p.perfil.programa_estudio_id === parseInt(selectedProgram) || p.perfil.programa_estudio_id == selectedProgram) &&
      p.perfil.cargo_funcional !== 'SECRETARIA_PROGRAMA'
    );
    // Map to the format the form expects (d.id, d.full_name)
    const staffFormat = filteredStaff.map(p => p.usuario);
    setDocentes(staffFormat);

    const fetchMalla = async () => {
      try {
        const res = await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/malla`);
        setMalla(res || []);
        
        // Flatten unidades for easy select dropdown
        const flat = [];
        (res || []).forEach(modulo => {
          (modulo.unidades || []).forEach(ud => {
            flat.push({ ...ud, modulo_nombre: modulo.nombre, periodo_sugerido: modulo.periodo });
          });
        });
        setUnidadesFlat(flat);
      } catch (error) {
        console.error("Error fetching malla", error);
      }
    };
    fetchMalla();
  }, [selectedProgram, personal]);

  // 3. Load Carga & Horarios when Program AND Period change
  useEffect(() => {
    if (!selectedProgram || !selectedPeriod) {
      setCargaLectiva([]);
      setHorarios([]);
      return;
    }
    fetchCargaYHorarios();
  }, [selectedProgram, selectedPeriod]);

  const fetchCargaYHorarios = async () => {
    setLoading(true);
    try {
      const [cargaRes, horRes] = await Promise.all([
        apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/carga-lectiva?periodo_id=${selectedPeriod}`).catch(() => []),
        apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/horarios?periodo_id=${selectedPeriod}`).catch(() => [])
      ]);
      setCargaLectiva(cargaRes || []);
      setHorarios(horRes || []);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCarga = async (e) => {
    e.preventDefault();
    if (!selectedProgram || !selectedPeriod) return alert("Seleccione Programa y Periodo primero");
    if (!cargaForm.unidades_didacticas_ids || cargaForm.unidades_didacticas_ids.length === 0) return alert("Seleccione al menos una unidad didáctica");
    if (!cargaForm.docente_id) return alert("Seleccione un docente");
    
    setSaving(true);
    try {
      const promises = cargaForm.unidades_didacticas_ids.map(ud_id => {
        const payload = {
          periodo_id: parseInt(selectedPeriod),
          docente_id: parseInt(cargaForm.docente_id),
          unidad_didactica_id: parseInt(ud_id),
          turno: cargaForm.turno,
          seccion: cargaForm.seccion,
          estado: 'publicado' // auto-publish for MVP
        };
        return apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/carga-lectiva`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      });
      
      await Promise.all(promises);
      setCargaForm({ ...cargaForm, unidades_didacticas_ids: [] });
      setIsModalOpen(false);
      fetchCargaYHorarios();
      alert("✅ Docente asignado correctamente a los cursos seleccionados.");
    } catch (error) {
      console.error("Error saving carga", error);
      alert("❌ Error al guardar la carga lectiva (verifique que el curso no esté ya asignado en esa sección).");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadHorario = async (e) => {
    e.preventDefault();
    if (!selectedProgram || !selectedPeriod) return alert("Seleccione Programa y Periodo primero");
    
    setSaving(true);
    try {
      const payload = {
        periodo_id: parseInt(selectedPeriod),
        archivo_excel_url: horarioForm.archivo_excel_url,
        observaciones: horarioForm.observaciones,
        estado: 'publicado'
      };
      await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/horarios`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setHorarioForm({ archivo_excel_url: '', observaciones: '' });
      fetchCargaYHorarios();
    } catch (error) {
      console.error("Error saving horario", error);
      alert("Error al subir el horario");
    } finally {
      setSaving(false);
    }
  };

  const getDocenteName = (id) => {
    const doc = docentes.find(d => d.id === id);
    return doc ? doc.full_name || doc.email : `ID: ${id}`;
  };

  const getUDName = (id) => {
    const ud = unidadesFlat.find(u => u.id === id);
    return ud ? ud.nombre : `ID: ${id}`;
  };

  // Render Modal helper
  const renderModal = () => {
    if (!isModalOpen) return null;
    
    const periodoObj = periods.find(p => p.id == selectedPeriod);
    const isOdd = periodoObj?.codigo?.endsWith('-I');
    const isEven = periodoObj?.codigo?.endsWith('-II');
    
    const filteredUnidades = unidadesFlat.filter(u => {
      if (isOdd) return [1, 3, 5].includes(u.periodo_sugerido);
      if (isEven) return [2, 4, 6].includes(u.periodo_sugerido);
      return true; // Fallback if no strict matching
    });

    // Group by cycle for better UI
    const grouped = filteredUnidades.reduce((acc, u) => {
      acc[u.periodo_sugerido] = acc[u.periodo_sugerido] || [];
      acc[u.periodo_sugerido].push(u);
      return acc;
    }, {});

    const toggleCurso = (id) => {
      const idStr = String(id);
      let newIds = [...cargaForm.unidades_didacticas_ids];
      if (newIds.includes(idStr)) {
        newIds = newIds.filter(i => i !== idStr);
      } else {
        newIds.push(idStr);
      }
      setCargaForm({ ...cargaForm, unidades_didacticas_ids: newIds });
    };

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Asignar Cursos - {getDocenteName(parseInt(cargaForm.docente_id))}</h3>
              <p className="text-sm text-slate-500">Periodo: {periodoObj?.codigo} (Filtrado automáticamente)</p>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            {Object.keys(grouped).sort().map(ciclo => (
              <div key={ciclo} className="mb-6">
                <h4 className="font-bold text-slate-700 border-b pb-2 mb-3 text-sm uppercase tracking-wider flex items-center">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-2 text-xs">{ciclo}</span>
                  Ciclo {ciclo}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped[ciclo].map(u => (
                    <label key={u.id} className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${cargaForm.unidades_didacticas_ids.includes(String(u.id)) ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          checked={cargaForm.unidades_didacticas_ids.includes(String(u.id))}
                          onChange={() => toggleCurso(u.id)}
                        />
                      </div>
                      <div className="ml-3">
                        <span className="block text-sm font-semibold text-slate-800 leading-tight">{u.nombre}</span>
                        <span className="block text-xs text-slate-500 mt-1">{u.creditos} Créditos</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredUnidades.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                No hay cursos disponibles para este periodo.
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
            <div className="text-sm text-slate-600 font-medium">
              <span className="text-indigo-600 font-bold">{cargaForm.unidades_didacticas_ids.length}</span> cursos seleccionados
            </div>
            
            <div className="flex space-x-3 items-center">
              <div className="flex space-x-2 mr-4">
                <select 
                  className="rounded-lg border-slate-200 text-sm"
                  value={cargaForm.turno}
                  onChange={e => setCargaForm({...cargaForm, turno: e.target.value})}
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
                <select 
                  className="rounded-lg border-slate-200 text-sm"
                  value={cargaForm.seccion}
                  onChange={e => setCargaForm({...cargaForm, seccion: e.target.value})}
                >
                  <option value="A">Sec A</option>
                  <option value="B">Sec B</option>
                  <option value="C">Sec C</option>
                </select>
              </div>
              
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleCreateCarga}
                disabled={saving || cargaForm.unidades_didacticas_ids.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Asignación'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {renderModal()}
      <div className="glass-panel p-6 mb-8 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Coordinación Académica
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de Carga Lectiva y Horarios del Programa de Estudios
          </p>
        </div>
      </div>

      {/* Contexto Operativo Informativo */}
      {selectedProgram && selectedPeriod && (
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-l-4 border-l-primary mb-8 bg-gradient-to-r from-white to-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🎓</div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
              <p className="font-bold text-slate-800">{programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Cargando...'}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl">📅</div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
              <p className="font-bold text-slate-800">{periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Cargando...'}</p>
            </div>
          </div>
        </div>
      )}

      {selectedProgram && selectedPeriod && (
        <>
          {/* Tabs */}
          <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'carga' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('carga')}
            >
              📚 Carga Lectiva (Asignación)
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'revision' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('revision')}
            >
              📝 Revisión (Sílabos y Planes)
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tutorias' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('tutorias')}
            >
              🧑‍🏫 Asignar Tutorías
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'horarios' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('horarios')}
            >
              📅 Horarios del Periodo
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-500 text-sm">Cargando datos del periodo...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Carga Lectiva Tab */}
              {activeTab === 'carga' && (
                <>
                  <div className="lg:col-span-1">
                    <form className="glass-card p-6 sticky top-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Nueva Asignación</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Docente</label>
                          <select 
                            required
                            className="w-full rounded-xl border-slate-200"
                            value={cargaForm.docente_id}
                            onChange={e => setCargaForm({...cargaForm, docente_id: e.target.value})}
                          >
                            <option value="">Seleccione Docente</option>
                            {docentes.map(d => (
                              <option key={d.id} value={d.id}>{d.full_name || d.email}</option>
                            ))}
                          </select>
                        </div>
                        
                        {cargaForm.docente_id && (
                          <button 
                            type="button" 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full py-2 px-4 border border-indigo-200 rounded-xl shadow-sm text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            📝 Seleccionar Cursos ({cargaForm.unidades_didacticas_ids.length} seleccionados)
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="glass-card p-6 overflow-hidden">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Carga Lectiva Actual</h3>
                      {cargaLectiva.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          No hay asignaciones para este periodo.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                              <tr>
                                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad Didáctica</th>
                                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Docente</th>
                                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalles</th>
                                <th className="px-4 py-3 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {cargaLectiva.map((carga) => (
                                <tr key={carga.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                                    {getUDName(carga.unidad_didactica_id)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600">
                                    {getDocenteName(carga.docente_id)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-500">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                      {carga.turno}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      Sec {carga.seccion}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${carga.estado === 'publicado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {carga.estado}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Horarios Tab */}
              {activeTab === 'horarios' && (
                <>
                  <div className="lg:col-span-1">
                    <div className="glass-card p-6">
                      <h3 className="text-lg font-bold text-slate-700 mb-4">Subir Horario General</h3>
                      <form onSubmit={handleUploadHorario} className="space-y-4">
                        <div>
                          <label className="label">Archivo Excel (URL por MVP)</label>
                          <input 
                            type="text" 
                            className="input-field w-full" 
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            required
                            value={horarioForm.archivo_excel_url}
                            onChange={e => setHorarioForm({...horarioForm, archivo_excel_url: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="label">Observaciones</label>
                          <textarea 
                            className="input-field w-full" 
                            placeholder="Versión inicial..."
                            value={horarioForm.observaciones}
                            onChange={e => setHorarioForm({...horarioForm, observaciones: e.target.value})}
                          ></textarea>
                        </div>
                        <button 
                          type="submit" 
                          disabled={saving}
                          className={`w-full py-2.5 rounded-xl font-medium text-white transition-all ${saving ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}
                        >
                          {saving ? 'Guardando...' : 'Publicar Horario'}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                      <h3 className="text-lg font-bold text-slate-700 mb-4">Horarios Publicados</h3>
                      {horarios.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No hay horarios subidos para este periodo.</p>
                      ) : (
                        <div className="space-y-4">
                          {horarios.map((h) => (
                            <div key={h.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                              <div className="flex items-center space-x-4">
                                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl">
                                  📊
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-slate-900">Horario Consolidado</h4>
                                  <p className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString()}</p>
                                  {h.observaciones && (
                                    <p className="text-sm text-slate-600 mt-1 italic">"{h.observaciones}"</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <a 
                                  href={h.archivo_excel_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  🔗 Abrir Archivo
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* External Tabs */}
          {!loading && activeTab === 'revision' && (
            <CoordinatorReview 
              programId={selectedProgram}
              periodId={selectedPeriod}
              docentes={docentes}
              cargaLectiva={cargaLectiva}
              unidadesFlat={unidadesFlat}
            />
          )}

          {!loading && activeTab === 'tutorias' && (
            <CoordinatorTutorias 
              programId={selectedProgram}
              periodId={selectedPeriod}
              docentes={docentes}
            />
          )}
        </>
      )}
    </div>
  );
}
