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
  const [docentes, setDocentes] = useState([]);
  const [malla, setMalla] = useState([]);
  const [unidadesFlat, setUnidadesFlat] = useState([]);
  const [cargaLectiva, setCargaLectiva] = useState([]);
  const [horarios, setHorarios] = useState([]);
  
  // Forms
  const [cargaForm, setCargaForm] = useState({ docente_id: '', unidad_didactica_id: '', turno: 'Mañana', seccion: 'A' });
  const [horarioForm, setHorarioForm] = useState({ archivo_excel_url: '', observaciones: '' });

  // 1. Initial Load
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [progRes, perRes, usersRes, rolesRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
          apiClient.request('/api/mod-usuarios/usuarios').catch(() => []),
          apiClient.request('/api/mod-usuarios/roles').catch(() => [])
        ]);
        
        setPrograms(progRes);
        setPeriods(perRes);
        
        // Find docente role id
        const docenteRole = rolesRes.find(r => r.nombre === 'docente' || r.name === 'docente');
        if (docenteRole) {
          const onlyDocentes = usersRes.filter(u => u.roles && u.roles.some(r => r.id === docenteRole.id || r.name === 'docente'));
          setDocentes(onlyDocentes.length > 0 ? onlyDocentes : usersRes); // fallback to all users if none found for testing
        } else {
          setDocentes(usersRes); // fallback
        }
      } catch (error) {
        console.error("Error loading initial data", error);
      }
    };
    fetchInitial();
  }, []);

  // 2. Load Malla when Program changes
  useEffect(() => {
    if (!selectedProgram) {
      setMalla([]);
      setUnidadesFlat([]);
      return;
    }
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
  }, [selectedProgram]);

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
    
    setSaving(true);
    try {
      const payload = {
        periodo_id: parseInt(selectedPeriod),
        docente_id: parseInt(cargaForm.docente_id),
        unidad_didactica_id: parseInt(cargaForm.unidad_didactica_id),
        turno: cargaForm.turno,
        seccion: cargaForm.seccion,
        estado: 'publicado' // auto-publish for MVP
      };
      await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/carga-lectiva`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setCargaForm({ ...cargaForm, unidad_didactica_id: '' });
      fetchCargaYHorarios();
    } catch (error) {
      console.error("Error saving carga", error);
      alert("Error al guardar la carga lectiva");
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

  return (
    <div className="animate-fade-in pb-12">
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

      {/* Global Selectors */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
          <span className="mr-2">⚙️</span> Contexto Operativo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Programa de Estudios</label>
            <select 
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white/50 backdrop-blur-sm"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              <option value="">-- Seleccionar Programa --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Periodo Académico</label>
            <select 
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white/50 backdrop-blur-sm"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="">-- Seleccionar Periodo --</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.estado}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
                    <form onSubmit={handleCreateCarga} className="glass-card p-6 sticky top-6">
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
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Unidad Didáctica</label>
                          <select 
                            required
                            className="w-full rounded-xl border-slate-200"
                            value={cargaForm.unidad_didactica_id}
                            onChange={e => setCargaForm({...cargaForm, unidad_didactica_id: e.target.value})}
                          >
                            <option value="">Seleccione Unidad (Curso)</option>
                            {unidadesFlat.map(u => (
                              <option key={u.id} value={u.id}>[Ciclo {u.periodo_sugerido}] {u.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                            <select 
                              className="w-full rounded-xl border-slate-200"
                              value={cargaForm.turno}
                              onChange={e => setCargaForm({...cargaForm, turno: e.target.value})}
                            >
                              <option value="Mañana">Mañana</option>
                              <option value="Tarde">Tarde</option>
                              <option value="Noche">Noche</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sección</label>
                            <select 
                              className="w-full rounded-xl border-slate-200"
                              value={cargaForm.seccion}
                              onChange={e => setCargaForm({...cargaForm, seccion: e.target.value})}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={saving}
                          className="w-full py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {saving ? 'Asignando...' : 'Asignar Docente a Curso'}
                        </button>
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
