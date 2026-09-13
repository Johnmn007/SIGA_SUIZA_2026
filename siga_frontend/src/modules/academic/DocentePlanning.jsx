import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';
import { GraduationCap, Calendar, ClipboardList, BookOpen, FileText, Upload, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';

export function DocentePlanning() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  const [planActual, setPlanActual] = useState(null);
  
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

  const fileInputRefSilabo = useRef(null);
  const fileInputRefPlan = useRef(null);
  const [uploadingTarget, setUploadingTarget] = useState(null); // { type: 'silabo' | 'plan', id?: number }

  const triggerUploadSilabo = (cargaId) => {
    setUploadingTarget({ type: 'silabo', id: cargaId });
    if (fileInputRefSilabo.current) fileInputRefSilabo.current.click();
  };

  const handleUploadSilabo = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingTarget || uploadingTarget.type !== 'silabo') return;
    
    // Simular subida (en producción se subiría a S3/GCS y se obtendría la URL)
    const simulatedUrl = `/docs/silabos/${file.name.replace(/\s+/g, '_')}`;
    const cargaId = uploadingTarget.id;
    
    try {
      const payload = {
        carga_lectiva_id: cargaId,
        estado: "presentado",
        archivo_url: simulatedUrl
      };
      await apiClient.request('/api/mod-programas-estudio/silabos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert("Sílabo enviado correctamente al Coordinador");
      
      // Refresh silabos
      const silabosRes = await apiClient.request(`/api/mod-programas-estudio/docente/${user.id}/silabos`);
      setSilabos(silabosRes || []);
    } catch (e) {
      alert("Error al enviar el sílabo");
    } finally {
      e.target.value = ''; // reset input
      setUploadingTarget(null);
    }
  };

  const triggerUploadPlan = () => {
    setUploadingTarget({ type: 'plan' });
    if (fileInputRefPlan.current) fileInputRefPlan.current.click();
  };

  const handleUploadPlan = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingTarget || uploadingTarget.type !== 'plan') return;
    
    // Simular subida
    const simulatedUrl = `/docs/planes/${file.name.replace(/\s+/g, '_')}`;
    
    try {
      const payload = {
        periodo_id: parseInt(selectedPeriod),
        programa_id: parseInt(selectedProgram),
        docente_id: user.id,
        estado: "presentado",
        archivo_url: simulatedUrl
      };
      await apiClient.request('/api/mod-programas-estudio/planes-trabajo', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert("Plan de Trabajo enviado correctamente al Coordinador");
      
      // Refresh planes
      const planesRes = await apiClient.request(`/api/mod-programas-estudio/docente/${user.id}/planes-trabajo?periodo_id=${selectedPeriod}`);
      setPlanes(planesRes || []);
    } catch (e) {
      alert("Error al enviar el Plan de Trabajo");
    } finally {
      e.target.value = '';
      setUploadingTarget(null);
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
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
              <p className="font-bold text-slate-text">{programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Cargando...'}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
              <p className="font-bold text-slate-text">{periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Cargando...'}</p>
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
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-text">Plan de Trabajo</h3>
                  <p className="text-xs text-slate-500">Documento global del periodo</p>
                </div>
              </div>

              {planActual ? (
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-green-700">Estado: {planActual.estado.toUpperCase()}</span>
                    <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Entregado</span>
                  </div>
                  <a 
                    href={planActual.archivo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-primary hover:text-primary-dark font-medium mb-3"
                  >
                    <ExternalLink className="w-4 h-4" />
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
                      onClick={triggerUploadPlan}
                      className="w-full mt-4 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Actualizar Documento
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-primary"><FileText className="w-6 h-6" /></div>
                  <p className="text-sm text-slate-500 mb-4">Aún no has presentado tu plan de trabajo para este periodo.</p>
                  <button 
                    onClick={triggerUploadPlan}
                    className="btn-primary w-full py-2 rounded-lg text-sm"
                  >
                    <Upload className="w-4 h-4 mr-1 inline" /> Subir Plan de Trabajo
                  </button>
                </div>
              )}
            </div>
            
            {/* Hidden File Inputs */}
            <input type="file" ref={fileInputRefSilabo} onChange={handleUploadSilabo} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" />
            <input type="file" ref={fileInputRefPlan} onChange={handleUploadPlan} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" />
            
          </div>

          {/* Carga Lectiva y Sílabos */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-text">Unidades Didácticas y Sílabos</h3>
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
                            <h4 className="font-bold text-slate-text text-md">{udNombre}</h4>
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
                                  <a href={silabo.archivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center"><ExternalLink className="w-3 h-3 mr-1" />Ver Doc</a>
                                  {silabo.estado !== 'aprobado' && (
                                    <button onClick={() => triggerUploadSilabo(carga.id)} className="text-xs text-slate-500 hover:text-slate-700 underline flex items-center">
                                      <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
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
                                onClick={() => triggerUploadSilabo(carga.id)}
                                className="flex items-center text-xs font-bold text-primary bg-primary-soft hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors border border-primary/20"
                              >
                                <Upload className="w-4 h-4 mr-1" />
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
