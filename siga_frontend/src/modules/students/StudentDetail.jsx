import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../../core/api/client';
import { ProtectedImage } from './ProtectedImage';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen,
  FileText, CreditCard, Award, BadgeCheck, User, Building2,
  GraduationCap, Clock
} from 'lucide-react';

const PROGRAMAS = {
  1: 'Administracion de Operaciones Turisticas',
  2: 'Asistencia Administrativa',
  3: 'Contabilidad',
  4: 'Construccion Civil',
  5: 'Gestion Administrativa',
  6: 'Desarrollo de Sistemas de Informacion',
  7: 'Electricidad Industrial',
  8: 'Enfermeria Tecnica',
  9: 'Manejo Forestal',
  10: 'Mecatronica Automotriz',
  11: 'Produccion Agropecuaria',
};

const ESTADO_COLORS = {
  postulante: 'bg-amber-50 text-amber-700 border-amber-200',
  ingresante: 'bg-blue-50 text-blue-700 border-blue-200',
  matriculado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  egresado: 'bg-purple-50 text-purple-700 border-purple-200',
  titulado: 'bg-green-50 text-green-700 border-green-200',
  abandonado: 'bg-red-50 text-red-600 border-red-200',
  reservado: 'bg-slate-100 text-slate-600 border-slate-200',
};

function InfoField({ icon: Icon, label, value, wide }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all duration-200 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-text truncate">
          {value || <span className="text-slate-300 font-normal italic">No registrado</span>}
        </p>
      </div>
    </div>
  );
}

function StatusCard({ active, labelActive, labelInactive, icon: Icon }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      {Icon && <Icon size={14} />}
      <span>{active ? labelActive : labelInactive}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mb-4">
        <Icon size={24} />
      </div>
      <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
      <p className="text-xs text-slate-400 max-w-xs">{description}</p>
    </div>
  );
}

export function StudentDetail({ student, onClose }) {
  const [detail, setDetail] = useState(null);
  const [matriculas, setMatriculas] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [convalidaciones, setConvalidaciones] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matriculas');

  useEffect(() => {
    if (!student?.id) return;
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const base = `${API_BASE}/api/mod-gestion-academica`;

      try {
        const [detailRes, matRes, benRes, convRes, tramRes] = await Promise.allSettled([
          fetch(`${base}/estudiantes/${student.id}`, { headers }),
          fetch(`${base}/matriculas/estudiante/${student.id}`, { headers }),
          fetch(`${base}/beneficios/estudiante/${student.id}`, { headers }),
          fetch(`${base}/convalidaciones/estudiante/${student.id}`, { headers }),
          fetch(`${base}/tramites/`, { headers }),
        ]);

        if (cancelled) return;

        if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
          setDetail(await detailRes.value.json());
        } else {
          setDetail(student);
        }

        if (matRes.status === 'fulfilled' && matRes.value.ok) {
          const data = await matRes.value.json();
          setMatriculas(Array.isArray(data) ? data : []);
        }

        if (benRes.status === 'fulfilled' && benRes.value.ok) {
          const data = await benRes.value.json();
          setBeneficios(Array.isArray(data) ? data : []);
        }

        if (convRes.status === 'fulfilled' && convRes.value.ok) {
          const data = await convRes.value.json();
          setConvalidaciones(Array.isArray(data) ? data : []);
        }

        if (tramRes.status === 'fulfilled' && tramRes.value.ok) {
          const allTramites = await tramRes.value.json();
          if (Array.isArray(allTramites)) {
            setTramites(allTramites.filter(t => t.estudiante_id === student.id));
          }
        }
      } catch {
        setDetail(student);
      }

      if (!cancelled) setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [student?.id]);

  useEffect(() => {
    if (!student) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [student]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!student) return null;

  const s = detail || student;
  const initials = `${(s.nombres || '')[0] || ''}${(s.apellidos || '')[0] || ''}`.toUpperCase();
  const programa = s.programa_id ? PROGRAMAS[s.programa_id] : null;
  const fechaNac = s.fecha_nacimiento
    ? new Date(s.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const tabs = [
    { key: 'matriculas', label: 'Matriculas', icon: BookOpen, count: matriculas.length },
    { key: 'beneficios', label: 'Beneficios', icon: Award, count: beneficios.length },
    { key: 'convalidaciones', label: 'Convalidaciones', icon: GraduationCap, count: convalidaciones.length },
    { key: 'tramites', label: 'Tramites', icon: FileText, count: tramites.length },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-fade-in">
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-100 hover:bg-primary/10 text-slate-500 hover:text-primary flex items-center justify-center transition-all duration-200"
              aria-label="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-text truncate">Ficha del Estudiante</h2>
              <p className="text-xs text-slate-400 hidden sm:block">{s.codigo_estudiante} &middot; {s.dni}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="glass-card p-5 sm:p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <ProtectedImage
                src={s.foto_url}
                alt={`${s.nombres || ''} ${s.apellidos || ''}`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-lg shadow-primary/20 flex-shrink-0"
                fallback={
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg shadow-primary/20 flex-shrink-0">
                    {initials}
                  </div>
                }
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-text truncate">
                    {s.nombres} {s.apellidos}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border self-start ${ESTADO_COLORS[s.estado_academico] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {s.estado_academico}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck size={14} className="text-primary" />
                    {s.codigo_estudiante}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" />
                    DNI {s.dni}
                  </span>
                  {programa && (
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      {programa}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="glass-card p-5 sm:p-6 animate-fade-in">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-primary" />
                  Datos de Contacto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoField icon={Mail} label="Email Personal" value={s.email_personal} />
                  <InfoField icon={Mail} label="Email Institucional" value={s.email_institucional} />
                  <InfoField icon={Phone} label="Celular" value={s.celular} />
                  <InfoField icon={MapPin} label="Direccion" value={s.direccion_domicilio} wide />
                  <InfoField icon={Calendar} label="Fecha de Nacimiento" value={fechaNac} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                <StatusCard
                  active={s.pago_matricula}
                  labelActive="Matricula Pagada"
                  labelInactive="Matricula Pendiente"
                  icon={CreditCard}
                />
                <StatusCard
                  active={s.documentos_completos}
                  labelActive="Documentos Completos"
                  labelInactive="Documentos Incompletos"
                  icon={FileText}
                />
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold bg-white/60 border-slate-100 text-slate-600">
                  <BookOpen size={14} />
                  <span>Modalidad: {s.modalidad_admision || 'ORDINARIO'}</span>
                </div>
              </div>

              <div className="glass-card animate-fade-in overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-200/60 bg-white/40">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-200 ${
                        activeTab === tab.key
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon size={15} />
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          activeTab === tab.key ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-6">
                  {activeTab === 'matriculas' && (
                    matriculas.length === 0 ? (
                      <EmptyState
                        icon={BookOpen}
                        title="Sin matriculas registradas"
                        description="Este estudiante aun no tiene matriculas en el sistema."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Periodo</th>
                              <th>Programa</th>
                              <th>Tipo Ingreso</th>
                              <th>Estado</th>
                              <th className="text-right">Detalles</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {matriculas.map(m => (
                              <tr key={m.id} className="hover:bg-primary/5 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="text-sm font-semibold text-slate-700">Periodo {m.periodo_id}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{PROGRAMAS[m.programa_id] || `Programa ${m.programa_id}`}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{m.tipo_ingreso}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`badge text-xs ${m.estado_matricula === 'activa' ? 'badge-green' : m.estado_matricula === 'pendiente' ? 'badge-amber' : 'badge-slate'}`}>
                                    {m.estado_matricula}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-xs text-slate-400">{m.detalles?.length || 0} UDs</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {activeTab === 'beneficios' && (
                    beneficios.length === 0 ? (
                      <EmptyState
                        icon={Award}
                        title="Sin beneficios registrados"
                        description="No se encontraron becas o beneficios asignados a este estudiante."
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {beneficios.map(b => (
                          <div key={b.id} className="p-4 rounded-xl bg-white/60 border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-sm font-bold text-slate-text">{b.tipo_beneficio}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {b.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-slate-500">
                              <p>Descuento: <span className="font-semibold text-primary">{b.porcentaje_descuento}%</span></p>
                              {b.condicion_mantenimiento && <p>Condicion: {b.condicion_mantenimiento}</p>}
                              <p>Periodo: {b.periodo_validez_inicio_id}{b.periodo_validez_fin_id ? ` - ${b.periodo_validez_fin_id}` : ' en adelante'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {activeTab === 'convalidaciones' && (
                    convalidaciones.length === 0 ? (
                      <EmptyState
                        icon={GraduationCap}
                        title="Sin convalidaciones"
                        description="No existen resoluciones de convalidacion para este estudiante."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Resolucion</th>
                              <th>Tipo</th>
                              <th>Institucion</th>
                              <th>Fecha</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {convalidaciones.map(c => (
                              <tr key={c.id} className="hover:bg-primary/5 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="text-sm font-semibold text-slate-700">{c.numero_resolucion}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{c.tipo_convalidacion}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{c.institucion_origen || 'N/A'}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{c.fecha_emision}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`badge text-xs ${c.estado === 'aprobado' ? 'badge-green' : c.estado === 'pendiente' ? 'badge-amber' : 'badge-red'}`}>
                                    {c.estado}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {activeTab === 'tramites' && (
                    tramites.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="Sin tramites registrados"
                        description="No se encontraron solicitudes de tramite para este estudiante."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Tipo</th>
                              <th>Estado</th>
                              <th>Fecha Solicitud</th>
                              <th>Resolucion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tramites.map(t => (
                              <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="text-sm font-semibold text-slate-700">{t.tipo_tramite}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`badge text-xs ${
                                    t.estado === 'emitido' ? 'badge-green' :
                                    t.estado === 'en_proceso' ? 'badge-blue' :
                                    t.estado === 'rechazado' ? 'badge-red' : 'badge-amber'
                                  }`}>
                                    {t.estado}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{t.fecha_solicitud}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-600">{t.fecha_resolucion || <Clock size={14} className="text-slate-300" />}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              </div>

              {s.observaciones && (
                <div className="glass-card p-5 sm:p-6 animate-fade-in">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-amber-400" />
                    Observaciones
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{s.observaciones}</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>,
    document.body
  );
}
