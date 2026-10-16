import { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';
import { CoordinatorReview } from './CoordinatorReview';
import { CoordinatorTutorias } from './CoordinatorTutorias';
import { ScheduleBuilder } from './ScheduleBuilder';
import { GraduationCap, Calendar, BookOpen, ClipboardCheck, UserCog, Clock, X, ClipboardList, BarChart3, ExternalLink, Trash2, Download, Copy, AlertTriangle } from 'lucide-react';
import { AssignmentModal } from './AssignmentModal';

export function CoordinatorAcademic() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('carga'); // 'carga', 'horarios'
  const [horariosSubTab, setHorariosSubTab] = useState('visual'); // 'excel', 'visual'
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
        
        let hasProgram = false;
        if (personalRes && user) {
          const myProfile = personalRes.find(p => p?.usuario?.id === user.id);
          if (myProfile?.perfil?.programa_estudio_id) {
            setSelectedProgram(myProfile.perfil.programa_estudio_id.toString());
            hasProgram = true;
          }
        }
        
        if (!hasProgram && progRes && progRes.length > 0) {
          setSelectedProgram(progRes[0].id.toString());
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
      p?.perfil && 
      (p.perfil.programa_estudio_id === parseInt(selectedProgram) || p.perfil.programa_estudio_id == selectedProgram) &&
      p.perfil.cargo_funcional !== 'SECRETARIA_PROGRAMA' &&
      p?.usuario
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
      alert("Docente asignado correctamente a los cursos seleccionados.");
    } catch (error) {
      console.error("Error saving carga", error);
      alert("Error al guardar la carga lectiva (verifique que el curso no esté ya asignado en esa sección).");
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

  const handleDeleteCarga = async (id) => {
    if (!window.confirm("¿Seguro que desea eliminar esta asignación?")) return;
    try {
      await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/carga-lectiva/${id}`, { method: 'DELETE' });
      fetchCargaYHorarios();
    } catch (error) {
      console.error("Error deleting carga", error);
      alert("No se pudo eliminar la carga");
    }
  };

  const handleDeleteHorario = async (id) => {
    if (!window.confirm("¿Seguro que desea eliminar este horario?")) return;
    try {
      await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/horarios/${id}`, { method: 'DELETE' });
      fetchCargaYHorarios();
    } catch (error) {
      console.error("Error deleting horario", error);
      alert("No se pudo eliminar el horario");
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

  const handleExportCSV = () => {
    const headers = "Unidad Didactica,Docente,Turno,Seccion,Estado\n";
    const rows = cargaLectiva.map(c => `"${getUDName(c.unidad_didactica_id)}","${getDocenteName(c.docente_id)}",${c.turno},${c.seccion},${c.estado}`).join('\n');
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' }); // \uFEFF para soportar caracteres UTF-8 en Excel
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Carga_Lectiva_${selectedProgram}_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloneCarga = async () => {
    const prevPeriodId = prompt("Ingrese el ID del periodo anterior desde el cual desea clonar (Ej. 1):");
    if (!prevPeriodId) return;
    setLoading(true);
    try {
      const res = await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/carga-lectiva/clonar`, {
        method: 'POST',
        body: JSON.stringify({ from_periodo_id: parseInt(prevPeriodId), to_periodo_id: parseInt(selectedPeriod) })
      });
      alert(res.message);
      fetchCargaYHorarios();
    } catch (e) {
      alert("Error al clonar la carga lectiva. Verifique que el periodo origen tenga registros.");
    } finally {
      setLoading(false);
    }
  };

  const isCoordinador = user?.rol === 'coordinador_programa';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <AssignmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        docenteId={cargaForm.docente_id}
        docenteName={getDocenteName(parseInt(cargaForm.docente_id))}
        periodoObj={periods.find(p => p.id == selectedPeriod)}
        unidadesFlat={unidadesFlat}
        cargaForm={cargaForm}
        setCargaForm={setCargaForm}
        handleCreateCarga={handleCreateCarga}
        saving={saving}
        teacherLoad={cargaLectiva.filter(c => c.docente_id === parseInt(cargaForm.docente_id)).length}
        isOverloaded={cargaLectiva.filter(c => c.docente_id === parseInt(cargaForm.docente_id)).length >= 4}
      />
      
      <div className="glass-panel p-6 mb-8 flex justify-between items-center bg-gradient-to-r from-primary-soft to-primary-soft/40">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-text">
            Coordinación Académica
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de Carga Lectiva y Horarios del Programa de Estudios
          </p>
        </div>
      </div>

      {/* Contexto Operativo Informativo */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-l-4 border-l-primary mb-8 bg-gradient-to-r from-white to-slate-50">
        <div className="flex items-center space-x-3 w-full md:w-auto flex-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
          <div className="w-full">
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
            {isCoordinador ? (
              <div className="w-full bg-transparent font-bold text-slate-800 border-none p-0 text-sm mt-1">
                {programs.find(p => p.id.toString() === selectedProgram)?.nombre || "Cargando..."}
              </div>
            ) : (
              <select 
                className="w-full bg-transparent font-bold text-slate-800 border-none p-0 focus:ring-0 cursor-pointer text-sm"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="" disabled>Seleccione un programa...</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id.toString()}>{p.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex-shrink-0 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div className="w-full">
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
            {isCoordinador ? (
              <div className="w-full bg-transparent font-bold text-slate-800 border-none p-0 text-sm mt-1">
                {periods.find(p => p.id.toString() === selectedPeriod)?.codigo || "Cargando..."}
              </div>
            ) : (
              <select 
                className="w-full bg-transparent font-bold text-slate-800 border-none p-0 focus:ring-0 cursor-pointer text-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="" disabled>Seleccione un periodo...</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id.toString()}>{p.codigo}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {selectedProgram && selectedPeriod && (
        <>
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white">
              <div>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Cursos Asignados</p>
                <p className="text-3xl font-black text-slate-800 flex items-baseline gap-2">
                  {cargaLectiva.length} 
                  <span className="text-sm font-bold text-slate-400">/ {unidadesFlat.length}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100/50 flex items-center justify-center text-blue-600 shadow-sm">
                <BookOpen size={24} />
              </div>
            </div>
            
            <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 to-white">
              <div>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Docentes Asignados</p>
                <p className="text-3xl font-black text-slate-800 flex items-baseline gap-2">
                  {new Set(cargaLectiva.map(c => c.docente_id)).size}
                  <span className="text-sm font-bold text-slate-400">docentes</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shadow-sm">
                <UserCog size={24} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'carga' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('carga')}
            >
              <BookOpen size={16} /> Carga Lectiva (Asignación)
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'revision' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('revision')}
            >
              <ClipboardCheck size={16} /> Revisión (Sílabos y Planes)
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'tutorias' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('tutorias')}
            >
              <UserCog size={16} /> Asignar Tutorías
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'horarios' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              onClick={() => setActiveTab('horarios')}
            >
              <Clock size={16} /> Horarios del Periodo
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-slate-500 text-sm">Cargando datos del periodo...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Carga Lectiva Tab */}
              {activeTab === 'carga' && (
                <>
                  <div className="lg:col-span-1">
                    <form className="glass-card p-6 sticky top-6 mb-6">
                      <h3 className="text-lg font-semibold text-slate-text mb-4">Nueva Asignación</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="label">Docente</label>
                          <select 
                            required
                            className="input-field w-full"
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
                            className="w-full py-2 px-4 border border-primary-light rounded-xl shadow-sm text-sm font-bold text-primary bg-primary-soft hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                          >
                            <ClipboardList size={16} /> Seleccionar Cursos ({cargaForm.unidades_didacticas_ids.length} seleccionados)
                          </button>
                        )}
                      </div>
                    </form>
                    
                    {/* Botón de Clonar */}
                    <div className="glass-card p-5 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                      <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2"><Copy size={16}/> Ahorra tiempo</h4>
                      <p className="text-xs text-indigo-700/80 mb-4 leading-relaxed">¿Mismos cursos y docentes que el ciclo anterior? Copia toda la carga lectiva con un clic.</p>
                      <button 
                        onClick={handleCloneCarga}
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex justify-center items-center gap-2"
                      >
                        Clonar periodo anterior
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="glass-card p-6 overflow-hidden">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold text-slate-text">Carga Lectiva Actual</h3>
                        {cargaLectiva.length > 0 && (
                          <button 
                            onClick={handleExportCSV}
                            className="text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors border border-emerald-200"
                          >
                            <Download size={16} /> Exportar CSV
                          </button>
                        )}
                      </div>
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
                                <th className="px-4 py-3 bg-slate-50 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {cargaLectiva.map((carga) => (
                                <tr key={carga.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-sm text-slate-text font-medium">
                                    {getUDName(carga.unidad_didactica_id)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600">
                                    {getDocenteName(carga.docente_id)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-500">
                                    <span className="badge-blue mr-2">
                                      {carga.turno}
                                    </span>
                                    <span className="badge-slate">
                                      Sec {carga.seccion}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    <span className={`badge ${carga.estado === 'publicado' ? 'badge-green' : 'badge-amber'}`}>
                                      {carga.estado}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-right">
                                    <button 
                                      onClick={() => handleDeleteCarga(carga.id)} 
                                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                      title="Eliminar asignación"
                                    >
                                      <Trash2 size={16} />
                                    </button>
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
                <div className="lg:col-span-3">
                  <div className="flex space-x-2 border-b border-slate-200 mb-6">
                    <button
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${horariosSubTab === 'excel' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      onClick={() => setHorariosSubTab('excel')}
                    >
                      Opción 1: Subir Excel
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${horariosSubTab === 'visual' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      onClick={() => setHorariosSubTab('visual')}
                    >
                      Opción 2: Constructor Visual (Beta - D.S.I)
                    </button>
                  </div>

                  {horariosSubTab === 'excel' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                          className={`w-full py-2.5 rounded-xl font-medium text-white transition-all ${saving ? 'bg-slate-400 cursor-not-allowed' : 'btn-primary justify-center'}`}
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
                                <div className="h-10 w-10 bg-primary-soft rounded-full flex items-center justify-center text-primary">
                                  <BarChart3 size={20} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-slate-text">Horario Consolidado</h4>
                                  <p className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString()}</p>
                                  {h.observaciones && (
                                    <p className="text-sm text-slate-600 mt-1 italic">"{h.observaciones}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <a 
                                  href={h.archivo_excel_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                  <ExternalLink size={16} className="mr-2" /> Abrir Archivo
                                </a>
                                <button 
                                  onClick={() => handleDeleteHorario(h.id)} 
                                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                                  title="Eliminar horario"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <ScheduleBuilder 
                  cargaLectiva={cargaLectiva} 
                  getUDName={getUDName} 
                  getDocenteName={getDocenteName} 
                />
              )}
            </div>
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
