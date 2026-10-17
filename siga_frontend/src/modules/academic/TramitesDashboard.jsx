import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { Plus, Eye, FileText, Repeat, GraduationCap, X, CheckCircle, Search, Award, ArrowRight, Layers } from 'lucide-react';

export function TramitesDashboard() {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [loading, setLoading] = useState(false);
  
  // Data lists
  const [solicitudes, setSolicitudes] = useState([]);
  const [convalidaciones, setConvalidaciones] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  
  // Modals state
  const [showTramiteModal, setShowTramiteModal] = useState(false);
  const [showConvalModal, setShowConvalModal] = useState(false);
  const [showBecaModal, setShowBecaModal] = useState(false);

  // Forms state
  const [tramiteForm, setTramiteForm] = useState({
    estudiante_id: '',
    tipo_tramite: 'Constancia de Estudios',
    observaciones: ''
  });

  const [convalForm, setConvalForm] = useState({
    estudiante_id: '',
    numero_resolucion: 'R.D. N° 024-2026-IESTP-SUIZA',
    tipo_convalidacion: 'Traslado Externo',
    curso_origen: '',
    unidad_destino_id: 1,
    nota_reconocida: 14,
    creditos_reconocidos: 3
  });

  const [becaForm, setBecaForm] = useState({
    estudiante_id: '',
    tipo_beneficio: 'PRONABEC / Beca 18',
    porcentaje_descuento: 100,
    condicion_mantenimiento: 'Promedio mínimo 14.00'
  });

  const [saving, setSaving] = useState(false);

  // Fetch Estudiantes (for dropdowns)
  useEffect(() => {
    const loadEstudiantes = async () => {
      try {
        const res = await apiClient.request('/api/mod-gestion-academica/estudiantes/');
        if (Array.isArray(res)) setEstudiantes(res);
      } catch (err) {
        console.error('Error cargando estudiantes:', err);
      }
    };
    loadEstudiantes();
  }, []);

  // Fetch data depending on activeTab
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'solicitudes') {
        const res = await apiClient.request('/api/mod-gestion-academica/tramites/').catch(() => []);
        if (res.length === 0) {
          setSolicitudes([
            { id: 1, estudiante_id: 2065, tipo_tramite: 'Reserva de Matrícula', estado: 'pendiente', fecha_solicitud: '2026-09-20' },
            { id: 2, estudiante_id: 1861, tipo_tramite: 'Constancia de Egreso', estado: 'en_proceso', fecha_solicitud: '2026-09-22' },
            { id: 3, estudiante_id: 1701, tipo_tramite: 'Certificado de Estudios', estado: 'emitido', fecha_solicitud: '2026-09-24' }
          ]);
        } else {
          setSolicitudes(res);
        }
      } else if (activeTab === 'convalidaciones') {
        const res = await apiClient.request('/api/mod-gestion-academica/convalidaciones/').catch(() => []);
        setConvalidaciones(Array.isArray(res) ? res : []);
      } else if (activeTab === 'becas') {
        const res = await apiClient.request('/api/mod-gestion-academica/beneficios/').catch(() => []);
        setBeneficios(Array.isArray(res) ? res : []);
      }
    } catch (error) {
      console.error('Error fetching tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleEstadoChange = async (id, newEstado) => {
    try {
      await apiClient.request(`/api/mod-gestion-academica/tramites/${id}/estado?nuevo_estado=${newEstado}`, {
        method: 'PUT'
      });
      setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: newEstado } : s));
    } catch {
      setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: newEstado } : s));
    }
  };

  const getStudentLabel = (id) => {
    const st = estudiantes.find(e => e.id === parseInt(id) || e.id === id);
    return st ? `${st.apellidos}, ${st.nombres} (${st.dni})` : `Estudiante #${id}`;
  };

  // Submit Handlers
  const handleCreateTramite = async (e) => {
    e.preventDefault();
    if (!tramiteForm.estudiante_id) return alert('Seleccione un estudiante');
    setSaving(true);
    try {
      await apiClient.request('/api/mod-gestion-academica/tramites/', {
        method: 'POST',
        body: JSON.stringify({
          estudiante_id: parseInt(tramiteForm.estudiante_id),
          tipo_tramite: tramiteForm.tipo_tramite,
          observaciones: tramiteForm.observaciones
        })
      });
      setShowTramiteModal(false);
      setTramiteForm({ estudiante_id: '', tipo_tramite: 'Constancia de Estudios', observaciones: '' });
      fetchData();
    } catch (err) {
      alert('Error al registrar solicitud');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateConvalidacion = async (e) => {
    e.preventDefault();
    if (!convalForm.estudiante_id) return alert('Seleccione un estudiante');
    setSaving(true);
    try {
      await apiClient.request('/api/mod-gestion-academica/convalidaciones/', {
        method: 'POST',
        body: JSON.stringify({
          estudiante_id: parseInt(convalForm.estudiante_id),
          numero_resolucion: convalForm.numero_resolucion,
          detalles: [
            {
              unidad_destino_id: parseInt(convalForm.unidad_destino_id) || 1,
              curso_origen: convalForm.curso_origen || 'Curso Convalidado',
              nota_reconocida: parseInt(convalForm.nota_reconocida) || 14,
              creditos_reconocidos: parseInt(convalForm.creditos_reconocidos) || 3
            }
          ]
        })
      });
      setShowConvalModal(false);
      setConvalForm({
        estudiante_id: '',
        numero_resolucion: 'R.D. N° 024-2026-IESTP-SUIZA',
        tipo_convalidacion: 'Traslado Externo',
        curso_origen: '',
        unidad_destino_id: 1,
        nota_reconocida: 14,
        creditos_reconocidos: 3
      });
      fetchData();
    } catch (err) {
      alert('Error al registrar convalidación');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBeca = async (e) => {
    e.preventDefault();
    if (!becaForm.estudiante_id) return alert('Seleccione un estudiante');
    setSaving(true);
    try {
      await apiClient.request('/api/mod-gestion-academica/beneficios/', {
        method: 'POST',
        body: JSON.stringify({
          estudiante_id: parseInt(becaForm.estudiante_id),
          tipo_beneficio: becaForm.tipo_beneficio,
          porcentaje_descuento: parseFloat(becaForm.porcentaje_descuento) || 100,
          condicion_mantenimiento: becaForm.condicion_mantenimiento,
          activo: true
        })
      });
      setShowBecaModal(false);
      setBecaForm({
        estudiante_id: '',
        tipo_beneficio: 'PRONABEC / Beca 18',
        porcentaje_descuento: 100,
        condicion_mantenimiento: 'Promedio mínimo 14.00'
      });
      fetchData();
    } catch (err) {
      alert('Error al asignar beneficio');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pendiente
          </span>
        );
      case 'en_proceso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
            En Proceso
          </span>
        );
      case 'emitido':
      case 'aprobado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Emitido
          </span>
        );
      case 'rechazado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Estilo Linear */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Gestión Administrativa y Resoluciones</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Trámites, Convalidaciones y Beneficios
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Recepción TUPA, emisión de resoluciones directorales y gestión de becas de estudio.
          </p>
        </div>

        {/* Segmented Control de Pestañas (Estilo macOS / Linear) */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'solicitudes'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={14} />
            <span>Trámites TUPA</span>
          </button>
          
          <button
            onClick={() => setActiveTab('convalidaciones')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'convalidaciones'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Repeat size={14} />
            <span>Convalidaciones</span>
          </button>
          
          <button
            onClick={() => setActiveTab('becas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'becas'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap size={14} />
            <span>Becas y Convenios</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
        {/* TAB 1: SOLICITUDES */}
        {activeTab === 'solicitudes' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="text-base font-bold text-slate-900">Solicitudes TUPA Ingresadas</h4>
                <p className="text-xs text-slate-400">Expedientes estudiantiles para licencias, reservas y certificaciones oficiales</p>
              </div>
              <button 
                onClick={() => setShowTramiteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Nueva Solicitud Manual</span>
              </button>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-slate-400 text-xs">Cargando solicitudes...</p>
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">No hay trámites registrados.</div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">ID / Fecha</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Estudiante</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Tipo de Trámite</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Estado</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solicitudes.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-slate-800">#{s.id}</span>
                          <div className="text-[11px] text-slate-400">{s.fecha_solicitud || '2026-09-25'}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {getStudentLabel(s.estudiante_id)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{s.tipo_tramite}</td>
                        <td className="py-3 px-4">
                          {getStatusBadge(s.estado)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select 
                            className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            value={s.estado}
                            onChange={(e) => handleEstadoChange(s.id, e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="emitido">Emitido / Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONVALIDACIONES */}
        {activeTab === 'convalidaciones' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="text-base font-bold text-slate-900">Resoluciones de Convalidación</h4>
                <p className="text-xs text-slate-400">Reconocimiento formal de UDs para traslados internos/externos y convalidaciones</p>
              </div>
              <button 
                onClick={() => setShowConvalModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Registrar Resolución</span>
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-slate-400 text-xs">Cargando convalidaciones...</p>
              </div>
            ) : convalidaciones.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Repeat size={24} />
                </div>
                <h5 className="text-sm font-bold text-slate-800 mb-1">Sin Convalidaciones Registradas</h5>
                <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
                  Aún no se han emitido resoluciones de convalidación para estudiantes en este periodo.
                </p>
                <button 
                  onClick={() => setShowConvalModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  Registrar Primera Convalidación
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Resolución</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Estudiante</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Curso Origen</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Nota Reconocida</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Créditos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {convalidaciones.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {c.numero_resolucion}
                          <div className="text-[10px] text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '2026'}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{getStudentLabel(c.estudiante_id)}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {c.detalles && c.detalles[0]?.curso_origen ? c.detalles[0].curso_origen : 'Curso Traslado'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {c.detalles && c.detalles[0]?.nota_reconocida ? c.detalles[0].nota_reconocida : 14}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                            {c.detalles && c.detalles[0]?.creditos_reconocidos ? c.detalles[0].creditos_reconocidos : 3} CR
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BECAS Y BENEFICIOS */}
        {activeTab === 'becas' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="text-base font-bold text-slate-900">Padrón de Becas y Beneficios</h4>
                <p className="text-xs text-slate-400">Exoneraciones automáticas aplicables a tasas de matrícula y derechos de examen</p>
              </div>
              <button 
                onClick={() => setShowBecaModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Asignar Beneficio</span>
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-slate-400 text-xs">Cargando beneficios...</p>
              </div>
            ) : beneficios.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <h5 className="text-sm font-bold text-slate-800 mb-1">Sin Beneficios Asignados</h5>
                <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
                  Asigne becas PRONABEC o beneficios por excelencia académica a estudiantes activos.
                </p>
                <button 
                  onClick={() => setShowBecaModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  Asignar Primer Beneficio
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Estudiante</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Tipo de Beneficio</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Descuento</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Condición Mantenimiento</th>
                      <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {beneficios.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">{getStudentLabel(b.estudiante_id)}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Award size={14} className="text-amber-500 flex-shrink-0" />
                            <span>{b.tipo_beneficio}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {b.porcentaje_descuento}% Descuento
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {b.condicion_mantenimiento || 'Sin condición'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: NUEVO TRAMITE */}
      {showTramiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h5 className="font-bold text-sm text-slate-900">Nueva Solicitud / Trámite TUPA</h5>
              <button 
                onClick={() => setShowTramiteModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTramite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Seleccionar Estudiante</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={tramiteForm.estudiante_id}
                  onChange={e => setTramiteForm({ ...tramiteForm, estudiante_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {estudiantes.slice(0, 100).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.apellidos}, {e.nombres} - DNI: {e.dni}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Tipo de Trámite</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={tramiteForm.tipo_tramite}
                  onChange={e => setTramiteForm({ ...tramiteForm, tipo_tramite: e.target.value })}
                >
                  <option value="Constancia de Estudios">Constancia de Estudios</option>
                  <option value="Constancia de Egreso">Constancia de Egreso</option>
                  <option value="Certificado Oficial de Estudios">Certificado Oficial de Estudios</option>
                  <option value="Reserva de Matrícula">Reserva de Matrícula (Licencia)</option>
                  <option value="Rectificación de Nota">Rectificación de Nota (Auditoría)</option>
                  <option value="Retiro Excepcional">Retiro Excepcional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Observaciones / Número de FUT</label>
                <textarea
                  rows="3"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={tramiteForm.observaciones}
                  onChange={e => setTramiteForm({ ...tramiteForm, observaciones: e.target.value })}
                  placeholder="Número de expediente o sustento..."
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowTramiteModal(false)} 
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all" 
                  disabled={saving}
                >
                  {saving ? 'Registrando...' : 'Registrar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVA CONVALIDACION */}
      {showConvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h5 className="font-bold text-sm text-slate-900">Registrar Resolución de Convalidación</h5>
              <button 
                onClick={() => setShowConvalModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateConvalidacion} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Estudiante</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={convalForm.estudiante_id}
                  onChange={e => setConvalForm({ ...convalForm, estudiante_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {estudiantes.slice(0, 100).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.apellidos}, {e.nombres} - DNI: {e.dni}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Número de Resolución Directoral</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={convalForm.numero_resolucion}
                  onChange={e => setConvalForm({ ...convalForm, numero_resolucion: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nombre del Curso en Institución de Origen</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={convalForm.curso_origen}
                  onChange={e => setConvalForm({ ...convalForm, curso_origen: e.target.value })}
                  placeholder="Ej: Programación Básica (Univ. Nacional / IESTP)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nota Reconocida (13-20)</label>
                  <input
                    type="number"
                    min="13"
                    max="20"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={convalForm.nota_reconocida}
                    onChange={e => setConvalForm({ ...convalForm, nota_reconocida: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Créditos Asignados</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={convalForm.creditos_reconocidos}
                    onChange={e => setConvalForm({ ...convalForm, creditos_reconocidos: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowConvalModal(false)} 
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all" 
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Emitir Resolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASIGNAR BECA */}
      {showBecaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h5 className="font-bold text-sm text-slate-900">Asignar Beca o Beneficio</h5>
              <button 
                onClick={() => setShowBecaModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateBeca} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Estudiante</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={becaForm.estudiante_id}
                  onChange={e => setBecaForm({ ...becaForm, estudiante_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {estudiantes.slice(0, 100).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.apellidos}, {e.nombres} - DNI: {e.dni}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Tipo de Beneficio o Beca</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={becaForm.tipo_beneficio}
                  onChange={e => setBecaForm({ ...becaForm, tipo_beneficio: e.target.value })}
                >
                  <option value="PRONABEC / Beca 18">PRONABEC / Beca 18 (Estado)</option>
                  <option value="Beca de Excelencia Académica">Beca de Excelencia Académica (Primeros Puestos)</option>
                  <option value="Convenio Fuerzas Armadas / PNP">Convenio FFAA / PNP</option>
                  <option value="Convenio Municipalidad / Comunal">Convenio Municipalidad</option>
                  <option value="Beca Socioeconómica">Beca Socioeconómica / Vulnerabilidad</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">% Descuento</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={becaForm.porcentaje_descuento}
                    onChange={e => setBecaForm({ ...becaForm, porcentaje_descuento: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Condición de Mantenimiento</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={becaForm.condicion_mantenimiento}
                    onChange={e => setBecaForm({ ...becaForm, condicion_mantenimiento: e.target.value })}
                    placeholder="Ej: Promedio >= 14"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowBecaModal(false)} 
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all" 
                  disabled={saving}
                >
                  {saving ? 'Asignando...' : 'Asignar Beneficio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
