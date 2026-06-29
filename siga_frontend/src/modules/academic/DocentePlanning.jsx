import { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';

export function DocentePlanning() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  const [cargaLectiva, setCargaLectiva] = useState([]);
  const [mallaFlat, setMallaFlat] = useState([]);
  const [silabos, setSilabos] = useState([]);
  const [planes, setPlanes] = useState([]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [progRes, perRes, loadRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
          user?.id ? apiClient.request(`/api/mod-programas-estudio/docentes/${user.id}/carga-lectiva`).catch(() => []) : Promise.resolve([])
        ]);
        setPrograms(progRes || []);
        setPeriods(perRes || []);
        setCargaLectiva(loadRes || []);

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
      fetchInitial();
    }
  }, [user]);

  // Fetch malla when program changes (to get unidad names)
  useEffect(() => {
    if (!selectedProgram) {
      setMallaFlat([]);
      return;
    }
    const fetchMalla = async () => {
      try {
        const res = await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/malla`);
        const flat = [];
        (res || []).forEach(modulo => {
          (modulo.unidades || []).forEach(ud => {
            flat.push({ ...ud, modulo_nombre: modulo.nombre, periodo_sugerido: modulo.periodo });
          });
        });
        setMallaFlat(flat);
      } catch (e) {
        console.error('Error fetching malla', e);
      }
    };
    fetchMalla();
  }, [selectedProgram]);

  // Fetch Silabos and Planes when Period changes
  useEffect(() => {
    if (!selectedProgram || !selectedPeriod || !user?.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Planes
        const planesRes = await apiClient.request(`/api/mod-programas-estudio/docente/${user.id}/planes-trabajo?periodo_id=${selectedPeriod}`).catch(() => []);
        // Silabos
        const silabosRes = await apiClient.request(`/api/mod-programas-estudio/docente/${user.id}/silabos`).catch(() => []);
        
        setPlanes(planesRes || []);
        setSilabos(silabosRes || []);
      } catch (e) {
        console.error('Error fetching planning data', e);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedProgram, selectedPeriod, user?.id]);

  const handleUploadSilabo = async (cargaId) => {
    const url = prompt("Ingrese la URL del Sílabo (Google Drive, OneDrive, etc.):");
    if (!url) return;
    
    try {
      const payload = {
        carga_lectiva_id: cargaId,
        estado: "presentado",
        archivo_url: url
      };
      await apiClient.request('/api/mod-programas-estudio/silabos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert("✅ Sílabo enviado correctamente al Coordinador");
      
      // Refresh silabos
      const silabosRes = await apiClient.request(`/api/mod-programas-estudio/docente/${user.id}/silabos`);
      setSilabos(silabosRes || []);
    } catch (e) {
      alert("❌ Error al enviar el sílabo");
    }
  };

  const handleUploadPlan = async () => {
    const url = prompt("Ingrese la URL del Plan de Trabajo (Excel/PDF):");
    if (!url) return;
    
    try {
      const payload = {
        periodo_id: parseInt(selectedPeriod),
        programa_id: parseInt(selectedProgram),
        docente_id: user.id,
        estado: "presentado",
        archivo_url: url
      };
      await apiClient.request('/api/mod-programas-estudio/planes-trabajo', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert("✅ Plan de Trabajo enviado correctamente al Coordinador");
      
      // Refresh planes
      const planesRes = await apiClient.request(`/api/mod-programas-estudio/docente/${user.id}/planes-trabajo?periodo_id=${selectedPeriod}`);
      setPlanes(planesRes || []);
    } catch (e) {
      alert("❌ Error al enviar el Plan de Trabajo");
    }
  };

  const getUnidadNombre = (udId) => {
    const ud = mallaFlat.find(u => u.id === udId);
    return ud ? ud.nombre : `Unidad #${udId}`;
  };

  // Filtrar carga lectiva del periodo activo
  const cargaActiva = cargaLectiva.filter(c => c.periodo_id === parseInt(selectedPeriod));
  const planActivo = planes.length > 0 ? planes[0] : null;

  return (
    <div className="space-y-6">
      {/* Cabecera Informativa del Docente */}
      {selectedProgram && selectedPeriod && (
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-l-4 border-l-primary mb-6 bg-gradient-to-r from-white to-slate-50">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan de Trabajo Global */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Plan de Trabajo</h3>
                  <p className="text-xs text-slate-500">Documento global del periodo</p>
                </div>
              </div>

              {planActual ? (
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-green-700">Estado: {planActual.estado.toUpperCase()}</span>
                    <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">✅ Entregado</span>
                  </div>
                  <a 
                    href={planActual.archivo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    <span>Ver Documento</span>
                  </a>
                  {planActual.observaciones && (
                    <div className="mt-3 bg-white p-3 rounded-lg border border-red-100">
                      <p className="text-xs font-bold text-red-600 mb-1">Observaciones del Coordinador:</p>
                      <p className="text-xs text-slate-600">{planActual.observaciones}</p>
                    </div>
                  )}
                  {planActual.estado !== 'aprobado' && (
                    <button 
                      onClick={handleUploadPlan}
                      className="w-full mt-4 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Actualizar Documento
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">📄</div>
                  <p className="text-sm text-slate-500 mb-4">Aún no has presentado tu plan de trabajo para este periodo.</p>
                  <button 
                    onClick={handleUploadPlan}
                    className="btn-primary w-full py-2 rounded-lg text-sm"
                  >
                    Subir Plan de Trabajo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Carga Lectiva y Sílabos */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Unidades Didácticas y Sílabos</h3>
                  <p className="text-xs text-slate-500">Carga lectiva asignada por el coordinador</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : cargaLectiva.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500">No tienes carga lectiva asignada para este periodo en este programa.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cargaLectiva.map(carga => {
                    const udNombre = getUnidadNombre(carga.unidad_didactica_id);
                    const silabo = silabos.find(s => s.carga_lectiva_id === carga.id);
                    
                    return (
                      <div key={carga.id} className="border border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                        <div className="flex flex-col md:flex-row justify-between md:items-center">
                          <div className="mb-4 md:mb-0">
                            <h4 className="font-bold text-slate-800 text-md">{udNombre}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Turno: {carga.turno}
                              </span>
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Sección: {carga.seccion}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            {silabo ? (
                              <div className="text-right">
                                <div className="flex items-center space-x-2 mb-1 justify-end">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    silabo.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                                    silabo.estado === 'observado' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {silabo.estado.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex space-x-2 items-center">
                                  <a href={silabo.archivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver Doc</a>
                                  {silabo.estado !== 'aprobado' && (
                                    <button onClick={() => handleUploadSilabo(carga.id)} className="text-xs text-slate-500 hover:text-slate-700 underline">
                                      Actualizar
                                    </button>
                                  )}
                                </div>
                                {silabo.observaciones && (
                                  <p className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={silabo.observaciones}>
                                    Obs: {silabo.observaciones}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleUploadSilabo(carga.id)}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                              >
                                Subir Sílabo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
