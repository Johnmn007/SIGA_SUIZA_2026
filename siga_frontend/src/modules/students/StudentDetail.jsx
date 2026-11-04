import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../../core/api/client';
import techBg from '../../assets/tech-bg.jpg';
import { ProtectedImage } from './ProtectedImage';
import {
  X, Mail, Phone, MapPin, Calendar, BookOpen,
  FileText, CreditCard, Award, BadgeCheck, User, Building2,
  GraduationCap, Clock, School, HeartPulse, Shield, Home,
  Briefcase, Wifi, AlertTriangle, CheckCircle2, FileCheck2,
  Users, AlertCircle, Info, Sparkles, DollarSign, Activity
} from 'lucide-react';

const PROGRAMAS = {
  1: 'Administración de Operaciones Turísticas',
  2: 'Asistencia Administrativa',
  3: 'Contabilidad',
  4: 'Construcción Civil',
  5: 'Gestión Administrativa',
  6: 'Desarrollo de Sistemas de Información',
  7: 'Electricidad Industrial',
  8: 'Enfermería Técnica',
  9: 'Manejo Forestal',
  10: 'Mecatrónica Automotriz',
  11: 'Producción Agropecuaria',
};

const ESTADO_COLORS = {
  postulante: 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-300/30',
  ingresante: 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-300/30',
  matriculado: 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-300/30',
  egresado: 'bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-300/30',
  titulado: 'bg-green-100 text-green-900 border-green-300 ring-2 ring-green-300/30',
  abandonado: 'bg-rose-100 text-rose-900 border-rose-300 ring-2 ring-rose-300/30',
  reservado: 'bg-slate-100 text-slate-900 border-slate-300 ring-2 ring-slate-300/30',
};

function InfoField({ icon: Icon, label, value, wide, highlight }) {
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all duration-200 ${
      highlight
        ? 'bg-primary/5 border-primary/25 shadow-xs'
        : 'bg-slate-50/90 border-slate-200/90 hover:border-primary/30 hover:bg-white shadow-xs'
    } ${wide ? 'sm:col-span-2' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
        highlight ? 'bg-primary text-white shadow-xs' : 'bg-primary/10 text-primary'
      }`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-extrabold text-slate-950 break-words leading-snug">
          {value || <span className="text-slate-400 font-semibold italic text-xs">No registrado</span>}
        </p>
      </div>
    </div>
  );
}

function StatusCard({ active, labelActive, labelInactive, icon: Icon, subtitle }) {
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all shadow-xs ${
      active
        ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300'
        : 'bg-amber-50/90 text-amber-950 border-amber-300'
    }`}>
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
        active ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
      }`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
          {active ? 'Conforme' : 'Pendiente'}
        </p>
        <p className="text-xs font-black truncate">{active ? labelActive : labelInactive}</p>
        {subtitle && <p className="text-[11px] font-bold text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-200" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 shadow-inner">
        <Icon size={24} />
      </div>
      <p className="text-sm font-extrabold text-slate-700 mb-1">{title}</p>
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
  const [activeTab, setActiveTab] = useState('expediente');

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
  const programaNombre = PROGRAMAS[s.programa_id] || (s.programa_id ? `Programa ${s.programa_id}` : 'Sin carrera asignada');

  const fechaNac = s.fecha_nacimiento
    ? new Date(s.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const edad = s.fecha_nacimiento ? (() => {
    const diff = Date.now() - new Date(s.fecha_nacimiento).getTime();
    const ageDate = new Date(diff);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    return !isNaN(calculatedAge) && calculatedAge > 0 ? `${calculatedAge} años` : null;
  })() : null;

  const meta = s.metadata_admision || {};

  // Ubigeo y Domicilio
  const depto = meta.departamento || meta.ubigeo?.departamento || null;
  const prov = meta.provincia || meta.ubigeo?.provincia || null;
  const dist = meta.distrito || meta.ubigeo?.distrito || null;
  const direccion = s.direccion_domicilio || meta.direccion_residencia || null;
  const ubicacionCompleta = (dist || prov || depto)
    ? [dist, prov, depto].filter(Boolean).join(', ')
    : null;

  // Identidad
  const genero = meta.genero || meta.sexo || null;
  const estadoCivil = meta.estado_civil || null;
  const nacionalidad = meta.nacionalidad || 'Peruana';
  const discapacidad = meta.discapacidad === true || meta.discapacidad === 'SI' || (meta.tipo_discapacidad && meta.tipo_discapacidad !== 'NO');
  const tipoDiscapacidad = meta.tipo_discapacidad || (discapacidad ? 'Presenta discapacidad' : 'Ninguna');

  // Socioeconómico
  const socio = meta.socioeconomico || {};
  const trabaja = socio.trabaja !== undefined ? Boolean(socio.trabaja) : (meta.trabaja !== undefined ? Boolean(meta.trabaja) : null);
  const ingresoMensual = socio.ingreso_mensual !== undefined ? socio.ingreso_mensual : meta.ingreso_mensual;
  const tipoVivienda = socio.tipo_vivienda || meta.tipo_vivienda || null;
  const tieneInternet = socio.tiene_internet_en_casa !== undefined ? Boolean(socio.tiene_internet_en_casa) : (meta.tiene_internet_en_casa !== undefined ? Boolean(meta.tiene_internet_en_casa) : null);

  // Salud y Procedencia
  const salud = meta.salud_procedencia || {};
  const ie = meta.institucion_educativa || {};
  const colegio = salud.colegio_procedencia || ie.nombre || meta.colegio_procedencia || null;
  const anioEgreso = salud.año_egreso_colegio || salud.anio_egreso_colegio || ie.anio_egreso || meta.anio_termino_secundaria || meta.año_egreso_colegio || null;
  const tipoSangre = salud.tipo_sangre || meta.tipo_sangre || null;
  const seguroSalud = salud.seguro_salud || meta.seguro_salud || null;

  // Contacto de Emergencia / Apoderado
  const emergencia = meta.emergencia || {};
  const apoderado = meta.apoderado || {};
  const contactoNombre = emergencia.contacto_nombre || apoderado.nombre || meta.contacto_emergencia_nombre || null;
  const contactoTelefono = emergencia.contacto_telefono || apoderado.celular || meta.contacto_emergencia_telefono || null;
  const padre = apoderado.nombre_padre || emergencia.nombre_padre || meta.nombre_padre || null;
  const madre = apoderado.nombre_madre || emergencia.nombre_madre || meta.nombre_madre || null;

  // Expediente
  const fechaLimiteDocs = s.fecha_limite_documentos
    ? new Date(s.fecha_limite_documentos).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const tabs = [
    { key: 'expediente', label: 'Expediente & Censo', icon: FileCheck2 },
    { key: 'matriculas', label: 'Matrículas', icon: BookOpen, count: matriculas.length },
    { key: 'beneficios', label: 'Becas & Beneficios', icon: Award, count: beneficios.length },
    { key: 'convalidaciones', label: 'Convalidaciones', icon: GraduationCap, count: convalidaciones.length },
    { key: 'tramites', label: 'Trámites', icon: FileText, count: tramites.length },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl lg:max-w-5xl overflow-hidden flex flex-col max-h-[92vh] bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-2 border-slate-200">

        {/* Cabecera Hero con tech-bg degradado */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-primary-dark via-primary to-secondary shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
            style={{ backgroundImage: `url(${techBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-primary-dark/60 to-primary/40 pointer-events-none" />

          {/* Barra superior de la cabecera */}
          <div className="relative flex justify-between items-center px-5 sm:px-8 pt-5 pb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-black backdrop-blur-sm shadow-xs">
              <Sparkles size={13} className="text-amber-300" />
              <span>FICHA INTEGRAL DEL ESTUDIANTE</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-xs"
              aria-label="Cerrar Ficha"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner de perfil del estudiante */}
          <div className="relative px-5 sm:px-8 pb-6 pt-2 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <ProtectedImage
              src={s.foto_url}
              alt={`${s.nombres || ''} ${s.apellidos || ''}`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-white shadow-xl shadow-primary-dark/40 flex-shrink-0 bg-white"
              fallback={
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-3xl font-black shadow-xl border-2 border-white/50 flex-shrink-0">
                  {initials || 'ST'}
                </div>
              }
            />

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-2 justify-center sm:justify-start flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-xl">
                  {s.nombres} {s.apellidos}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs self-center sm:self-start ${ESTADO_COLORS[s.estado_academico] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {s.estado_academico || 'postulante'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-white/90">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 font-mono font-bold backdrop-blur-xs">
                  <BadgeCheck size={14} className="text-emerald-300" />
                  {s.codigo_estudiante || 'Sin código'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 font-mono font-bold backdrop-blur-xs">
                  <User size={13} className="text-blue-300" />
                  DNI {s.dni}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 font-bold backdrop-blur-xs max-w-[320px] truncate">
                  <GraduationCap size={14} className="text-primary-light shrink-0" />
                  <span className="truncate">{programaNombre}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de pestañas */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 sm:px-6 shrink-0 custom-scrollbar">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-xs sm:text-sm font-extrabold whitespace-nowrap border-b-3 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <TabIcon size={16} className={isActive ? 'text-primary' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cuerpo del modal con scroll */}
        <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/50">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* PESTAÑA 1: EXPEDIENTE Y CENSO COMPLETO */}
              {activeTab === 'expediente' && (
                <div className="space-y-6 animate-fade-in">

                  {/* Tarjetas Bento de Estado Administrativo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatusCard
                      active={s.pago_matricula}
                      labelActive="Matrícula Pagada"
                      labelInactive="Pago Pendiente de Regularizar"
                      icon={CreditCard}
                      subtitle={s.pago_matricula ? 'Tasa arancelaria al día' : 'Pendiente de comprobante en tesorería'}
                    />
                    <StatusCard
                      active={s.documentos_completos}
                      labelActive="Expediente Completo"
                      labelInactive="Documentos Faltantes"
                      icon={FileCheck2}
                      subtitle={fechaLimiteDocs ? `Subsanación hasta: ${fechaLimiteDocs}` : (s.documentos_completos ? 'Expediente físico verificado' : 'Sin fecha límite definida')}
                    />
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                        <BookOpen size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                          Modalidad de Ingreso
                        </p>
                        <p className="text-xs font-black text-slate-900 truncate">
                          {s.modalidad_admision || 'ORDINARIO'}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                          Ciclo Actual: Ciclo {s.ciclo_actual || 1}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sector 1 & 2: Identidad, Contacto y Ubicación */}
                  <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                        <User size={16} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                          Identidad Básica y Ubicación
                        </h4>
                        <p className="text-xs font-bold text-slate-500">Datos personales, domicilio y vías de comunicación</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <InfoField icon={Calendar} label="Fecha de Nacimiento" value={fechaNac ? `${fechaNac} ${edad ? `(${edad})` : ''}` : null} />
                      <InfoField icon={User} label="Género / Sexo" value={genero} />
                      <InfoField icon={Activity} label="Estado Civil" value={estadoCivil} />
                      <InfoField icon={Building2} label="Nacionalidad" value={nacionalidad} />
                      <InfoField icon={HeartPulse} label="Condición de Discapacidad" value={tipoDiscapacidad} highlight={discapacidad} />
                      <InfoField icon={Phone} label="Teléfono Celular" value={s.celular} highlight />

                      <div className="sm:col-span-2 lg:col-span-3">
                        <InfoField icon={MapPin} label="Dirección de Domicilio" value={direccion} wide />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <InfoField
                          icon={MapPin}
                          label="Ubigeo Político (Distrito · Provincia · Departamento)"
                          value={ubicacionCompleta}
                          wide
                          highlight
                        />
                      </div>

                      <InfoField icon={Mail} label="Email Personal" value={s.email_personal} />
                      <InfoField icon={Mail} label="Email Institucional" value={s.email_institucional} wide />
                    </div>
                  </div>

                  {/* Sector 3: Perfil Socioeconómico */}
                  <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                      <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                        <DollarSign size={16} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                          Perfil Socioeconómico Institucional
                        </h4>
                        <p className="text-xs font-bold text-slate-500">Censo de condiciones socioeconómicas del estudiante</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <InfoField
                        icon={Briefcase}
                        label="Situación Laboral"
                        value={trabaja === true ? 'Trabaja actualmente' : trabaja === false ? 'No trabaja' : 'No declarado'}
                        highlight={trabaja === true}
                      />
                      <InfoField
                        icon={DollarSign}
                        label="Ingreso Mensual Estimado"
                        value={trabaja && ingresoMensual ? `S/. ${Number(ingresoMensual).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : (trabaja ? 'No especificado' : 'S/. 0.00')}
                      />
                      <InfoField
                        icon={Home}
                        label="Tipo de Vivienda"
                        value={tipoVivienda}
                      />
                      <InfoField
                        icon={Wifi}
                        label="Internet en Casa"
                        value={tieneInternet === true ? 'Sí cuenta con servicio' : tieneInternet === false ? 'No cuenta con internet' : 'No declarado'}
                        highlight={tieneInternet === false}
                      />
                    </div>
                  </div>

                  {/* Sector 4: Salud, Procedencia y Contactos de Emergencia */}
                  <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                      <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black">
                        <HeartPulse size={16} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                          Salud, Procedencia Escolar y Emergencia
                        </h4>
                        <p className="text-xs font-bold text-slate-500">Colegio secundario, grupo sanguíneo, seguro y apoderados</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2">
                        <InfoField
                          icon={School}
                          label="Colegio de Procedencia"
                          value={colegio}
                        />
                      </div>
                      <InfoField
                        icon={GraduationCap}
                        label="Año de Egreso Secundario"
                        value={anioEgreso}
                      />

                      <InfoField
                        icon={HeartPulse}
                        label="Tipo de Sangre"
                        value={tipoSangre}
                        highlight
                      />
                      <InfoField
                        icon={Shield}
                        label="Seguro de Salud"
                        value={seguroSalud}
                      />
                      <InfoField
                        icon={Phone}
                        label="Teléfono de Emergencia"
                        value={contactoTelefono}
                        highlight
                      />

                      <div className="sm:col-span-2 lg:col-span-3">
                        <InfoField
                          icon={Users}
                          label="Contacto de Emergencia / Apoderado"
                          value={contactoNombre ? `${contactoNombre} ${contactoTelefono ? `(Tel: ${contactoTelefono})` : ''}` : null}
                          wide
                        />
                      </div>

                      {(padre || madre) && (
                        <>
                          <InfoField icon={User} label="Nombre del Padre" value={padre} />
                          <InfoField icon={User} label="Nombre de la Madre" value={madre} wide />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Observaciones generales */}
                  {s.observaciones && (
                    <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-xs">
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600" />
                        Observaciones del Expediente
                      </h4>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {s.observaciones}
                      </p>
                    </div>
                  )}

                </div>
              )}

              {/* PESTAÑA 2: MATRÍCULAS */}
              {activeTab === 'matriculas' && (
                <div className="animate-fade-in">
                  {matriculas.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="Sin matrículas registradas"
                      description="Este estudiante aún no cuenta con historial de matrícula consolidado."
                    />
                  ) : (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Periodo</th>
                            <th className="py-3 px-4">Programa</th>
                            <th className="py-3 px-4">Tipo Ingreso</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                            <th className="py-3 px-4 text-right">Carga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {matriculas.map(m => (
                            <tr key={m.id} className="hover:bg-primary/5 transition-colors">
                              <td className="py-3 px-4 font-extrabold text-slate-900">Periodo {m.periodo_id}</td>
                              <td className="py-3 px-4 text-slate-700 font-semibold">{PROGRAMAS[m.programa_id] || `Programa ${m.programa_id}`}</td>
                              <td className="py-3 px-4 text-slate-600 font-bold">{m.tipo_ingreso}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                                  m.estado_matricula === 'activa' ? 'bg-emerald-100 text-emerald-800' : m.estado_matricula === 'pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {m.estado_matricula}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-500">
                                {m.detalles?.length || 0} UDs
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 3: BENEFICIOS */}
              {activeTab === 'beneficios' && (
                <div className="animate-fade-in">
                  {beneficios.length === 0 ? (
                    <EmptyState
                      icon={Award}
                      title="Sin beneficios o becas"
                      description="No se registran becas o exoneraciones arancelarias asignadas a este estudiante."
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {beneficios.map(b => (
                        <div key={b.id} className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-primary/30 shadow-xs transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-black text-slate-950">{b.tipo_beneficio}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${b.activo ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
                              {b.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-600 font-semibold">
                            <p>Descuento aplicable: <span className="font-extrabold text-primary text-sm">{b.porcentaje_descuento}%</span></p>
                            {b.condicion_mantenimiento && <p>Condición: {b.condicion_mantenimiento}</p>}
                            <p className="font-mono text-[11px] text-slate-400">Validez: Periodo {b.periodo_validez_inicio_id}{b.periodo_validez_fin_id ? ` al ${b.periodo_validez_fin_id}` : ' en adelante'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 4: CONVALIDACIONES */}
              {activeTab === 'convalidaciones' && (
                <div className="animate-fade-in">
                  {convalidaciones.length === 0 ? (
                    <EmptyState
                      icon={GraduationCap}
                      title="Sin convalidaciones"
                      description="No existen resoluciones de convalidación académica registradas."
                    />
                  ) : (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Resolución</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Institución Origen</th>
                            <th className="py-3 px-4">Fecha</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {convalidaciones.map(c => (
                            <tr key={c.id} className="hover:bg-primary/5 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.numero_resolucion}</td>
                              <td className="py-3 px-4 text-slate-700 font-semibold">{c.tipo_convalidacion}</td>
                              <td className="py-3 px-4 text-slate-600 font-semibold">{c.institucion_origen || 'N/A'}</td>
                              <td className="py-3 px-4 text-slate-500 font-bold">{c.fecha_emision}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black uppercase ${c.estado === 'aprobado' ? 'badge-green' : c.estado === 'pendiente' ? 'badge-amber' : 'badge-red'}`}>
                                  {c.estado}
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

              {/* PESTAÑA 5: TRÁMITES */}
              {activeTab === 'tramites' && (
                <div className="animate-fade-in">
                  {tramites.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Sin trámites registrados"
                      description="El estudiante no ha solicitado trámites o certificados académicos."
                    />
                  ) : (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Trámite</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                            <th className="py-3 px-4">Fecha Solicitud</th>
                            <th className="py-3 px-4">Resolución</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {tramites.map(t => (
                            <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">{t.tipo_tramite}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black uppercase ${
                                  t.estado === 'emitido' ? 'bg-emerald-100 text-emerald-800' :
                                  t.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                                  t.estado === 'rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {t.estado}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-bold">{t.fecha_solicitud}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-xs">{t.fecha_resolucion || 'En trámite'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del modal */}
        <div className="bg-slate-100 px-6 py-4 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Info size={15} className="text-primary shrink-0" />
            <span>Expediente oficial institucional del Sistema Integrado de Gestión Académica (SIGA).</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-black text-sm transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2"
          >
            <X size={16} /> Cerrar Ficha
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
