import { useState, useEffect, useRef, Fragment } from 'react';
import { API_BASE } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import mockEvaluacion from './mockEvaluacion.json';
import { BoletinImpresion } from './BoletinImpresion';
import { obtenerNotasPorCiclo, resumenDesdeJson, construirListaCiclos } from './notasPorCiclo';
import {
  ArrowUpDown, BadgeCheck, BookOpen, ChevronDown,
  ClipboardList, GraduationCap, Hash, IdCard, Mail,
  MessageSquare, Phone, Search,
} from 'lucide-react';

const normalizarTexto = (texto) =>
  (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const NOTA_MIN_APROBAR = 13;

const ESCALA_CALIFICACION = [
  { min: 18, max: 20, rango: '18 – 20', sigla: 'AD', label: 'Excelente', tone: 'emerald' },
  { min: 14, max: 17.99, rango: '14 – 17', sigla: 'AB', label: 'Bueno', tone: 'blue' },
  { min: 13, max: 13.99, rango: '13', sigla: 'B', label: 'Aprobado', tone: 'amber' },
  { min: 0, max: 12.99, rango: '0 – 12', sigla: 'D', label: 'Desaprobado', tone: 'red' },
];

const escalaDe = (nota) => {
  if (nota === null || nota === undefined) return null;
  return ESCALA_CALIFICACION.find(e => nota >= e.min && nota <= e.max) || null;
};

const hashCorto = (texto) => {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
};

const TONE_BADGE = {
  emerald: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-emerald-500',
  blue: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white border-blue-500',
  purple: 'bg-gradient-to-r from-violet-400 to-purple-500 text-white border-purple-500',
  amber: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-500',
  red: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-500',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

const valorarPromedio = (nota) => {
  if (nota === null || nota === undefined) return { label: 'Sin evaluación', tone: 'slate' };
  if (nota >= 18) return { label: 'AD · Excelente', tone: 'emerald' };
  if (nota >= 14) return { label: 'AB · Bueno', tone: 'blue' };
  if (nota >= NOTA_MIN_APROBAR) return { label: 'B · Aprobado', tone: 'amber' };
  return { label: 'D · Desaprobado', tone: 'red' };
};

const condicionTone = (estado) => {
  const e = normalizarTexto(estado);
  if (['matriculado', 'activo', 'cursando', 'en curso', 'promovido', 'aprobado'].includes(e)) return 'emerald';
  if (['pendiente', 'observado', 'en proceso', 'regularizacion'].includes(e)) return 'amber';
  if (['retirado', 'suspendido', 'excluido', 'desaprobado'].includes(e)) return 'red';
  return 'slate';
};

const AccentStripe = () => (
  <div className="absolute bottom-0 left-0 right-0 h-1 flex">
    <span className="flex-1 bg-emerald-400"></span>
    <span className="flex-1 bg-amber-400"></span>
    <span className="flex-1 bg-fuchsia-500"></span>
    <span className="flex-1 bg-cyan-400"></span>
  </div>
);

function RingProgress({ percent, color, size = 'sm', children }) {
  const isLg = size === 'lg';
  const vb = isLg ? 128 : 56;
  const radius = isLg ? 54 : 22;
  const stroke = isLg ? 12 : 6;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent || 0));
  const dash = (value / 100) * circumference;
  return (
    <div className={`relative flex-shrink-0 ${isLg ? 'w-28 h-28' : 'w-14 h-14'}`}>
      <svg className={`w-full h-full -rotate-90`} viewBox={`0 0 ${vb} ${vb}`} aria-hidden="true">
        <circle cx={vb / 2} cy={vb / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={vb / 2} cy={vb / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {children}
      </span>
    </div>
  );
}

function InfoItem(props) {
  const { icon: Icon, label, value, tone = 'blue' } = props;
  const tones = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600',
  };
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span className={`w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 ${tones[tone] || tones.blue}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.14em]">{label}</p>
        <p className="font-semibold text-slate-800 text-sm truncate" title={value || ''}>{value || '—'}</p>
      </div>
    </div>
  );
}

/* Estado vacío del módulo: réplica visual (solo JSX/CSS) de la referencia.
   No toca lógica: se renderiza únicamente cuando aún no hay estudiante seleccionado. */
function BoletinEmptyState() {
  const cursos = [
    { nombre: 'Programación', nota: '18', pct: '90%', bar: 'bg-teal-400/90' },
    { nombre: 'Base de Datos', nota: '16', pct: '80%', bar: 'bg-blue-500/90' },
    { nombre: 'Diseño Web', nota: '17', pct: '85%', bar: 'bg-violet-500/90' },
    { nombre: 'Redes', nota: '15', pct: '75%', bar: 'bg-amber-500/90' },
    { nombre: 'Análisis de Sistemas', nota: '19', pct: '95%', bar: 'bg-cyan-400/90' },
  ];
  const chips = [
    { label: 'DNI', icon: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-1 6h4m5-6h4m-4 3h4m-4 3h4', color: 'text-blue-500' },
    { label: 'Código', icon: 'M8 9l-3 3 3 3m8-6l3 3-3 3M13 5l-2 14', color: 'text-emerald-600' },
    { label: 'Nombre completo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'text-amber-500' },
    { label: 'Búsqueda por voz', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', color: 'text-violet-500' },
    { label: 'Historial académico', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-slate-500' },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-8 sm:px-8 text-center shadow-[0_24px_60px_-24px_rgba(100,116,139,0.25)]">
      {/* Iluminación mínima: halo tenue + viñeta clara */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-200/60 to-transparent" />
      </div>

      <div className="relative">
        {/* Escena: observaciones / libros+laptop / boletín / créditos+historial */}
        <div className="relative mx-auto flex max-w-[760px] items-end justify-center gap-3 sm:gap-0">
          {/* Hojas decorativas */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-2 bottom-6 hidden opacity-40 md:block">
            <div className="h-16 w-3 rotate-[-24deg] rounded-full bg-emerald-600/15" />
            <div className="ml-3 -mt-10 h-12 w-3 rotate-[-40deg] rounded-full bg-emerald-600/10" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-10 hidden opacity-40 md:block">
            <div className="h-16 w-3 rotate-[24deg] rounded-full bg-emerald-600/15" />
            <div className="mr-3 -mt-10 ml-auto h-12 w-3 rotate-[40deg] rounded-full bg-emerald-600/10" />
          </div>

          {/* Tarjeta Observaciones (fondo, izquierda) */}
          <div className="absolute left-2 top-8 hidden w-40 -rotate-6 rounded-xl border border-[#DDE3EA] bg-white p-3 text-left shadow-[0_10px_30px_-12px_rgba(100,116,139,0.25)] lg:block">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-300/60 bg-amber-100">
                <svg className="h-3 w-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" /></svg>
              </span>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1F2937]">Observaciones</p>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded bg-slate-200" />
              <div className="h-1.5 w-5/6 rounded bg-slate-200/80" />
              <div className="h-1.5 w-4/6 rounded bg-slate-100" />
            </div>
          </div>

          {/* Libros + laptop grandes (decorado, izquierda) */}
          <div aria-hidden="true" className="pointer-events-none relative z-10 hidden w-64 shrink-0 items-end md:flex -mr-8">
            {/* Fondo integrado: silueta académica + follaje + luz dorada tenue */}
            <svg className="absolute -left-5 -top-12 h-24 w-24 rotate-[-10deg] text-slate-400/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
            <div className="absolute -left-2 bottom-0 opacity-70">
              <div className="h-24 w-3 rotate-[-18deg] rounded-full bg-slate-300" />
              <div className="ml-3 -mt-16 h-16 w-2.5 rotate-[-36deg] rounded-full bg-slate-200" />
              <div className="-ml-1 -mt-12 h-12 w-2 rotate-[-4deg] rounded-full bg-[#c9d2c0]" />
            </div>
            {/* Tarjeta secundaria con contenido, detrás de la laptop */}
            <div className="absolute -top-7 right-4 z-0 w-32 rotate-[5deg] rounded-xl border border-[#DDE3EA] bg-white/95 p-2.5 text-left opacity-90 shadow-[0_10px_30px_-12px_rgba(100,116,139,0.3)]">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#64748B]">Periodo actual</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#111827]">2026-I</p>
              <div className="mt-1.5 space-y-1 border-t border-slate-200 pt-1.5">
                <p className="text-[9px] font-semibold text-[#64748B]">5 módulos</p>
                <p className="text-[9px] font-semibold text-[#64748B]">20 créditos</p>
              </div>
            </div>
            <div className="mb-1 w-32">
              <div className="rounded-sm border border-slate-200 border-l-4 border-l-cyan-500/60 bg-white px-2 py-1.5 text-left shadow-sm"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Desarrollo</p></div>
              <div className="rounded-sm border border-slate-200 border-l-4 border-l-amber-500/70 bg-white px-2 py-1.5 text-left shadow-sm"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-600">Base de datos</p></div>
              <div className="rounded-sm border border-slate-200 border-l-4 border-l-blue-500/60 bg-white px-2 py-1.5 text-left shadow-sm"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Redes</p></div>
            </div>
            <div className="-ml-8 mb-1">
              <div className="w-52 overflow-hidden rounded-t-md border border-[#DDE3EA] bg-white px-3 pb-2 pt-1.5 shadow-sm">
                <div className="mb-1.5 flex gap-1"><span className="h-1 w-1 rounded-full bg-red-400" /><span className="h-1 w-1 rounded-full bg-amber-400" /><span className="h-1 w-1 rounded-full bg-emerald-500" /></div>
                <div className="space-y-1.5">
                  <div className="h-1 w-11/12 rounded-sm bg-cyan-500/70" />
                  <div className="h-1 w-3/4 rounded-sm bg-violet-500/70" />
                  <div className="h-1 w-5/6 rounded-sm bg-amber-500/70" />
                  <div className="h-1 w-2/3 rounded-sm bg-blue-500/70" />
                  <div className="h-1 w-4/5 rounded-sm bg-emerald-500/60" />
                  <div className="h-1 w-3/5 rounded-sm bg-slate-400/70" />
                </div>
              </div>
              <div className="h-1.5 w-56 -translate-x-1 rounded-b-lg bg-gradient-to-b from-slate-300 to-slate-400" />
            </div>
            {/* Portalápices + resplandor cálido como en la referencia */}
            <div className="-ml-7 mb-1 hidden w-8 items-end justify-center lg:flex">
              <div className="relative flex h-11 w-7 items-end justify-center overflow-visible rounded-b-md border border-[#DDE3EA] bg-white pb-0 shadow-sm">
                <span className="absolute -top-3 left-1 h-5 w-[3px] rotate-[-8deg] rounded-full bg-amber-500/80" />
                <span className="absolute -top-3.5 left-3 h-6 w-[3px] rotate-[4deg] rounded-full bg-slate-500/80" />
                <span className="absolute -top-2.5 right-1 h-4 w-[3px] rotate-[12deg] rounded-full bg-cyan-600/70" />
              </div>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-4 left-10 h-16 w-72 rounded-full bg-amber-200/50 blur-2xl" />
          </div>

          {/* Tarjeta central: Boletín de Estudiante */}
          <div className="relative z-20 w-full max-w-[310px] shrink-0 rounded-2xl border border-[#DDE3EA] bg-white p-4 text-left shadow-[0_18px_45px_-15px_rgba(100,116,139,0.35)] sm:-mx-2">
            <span aria-hidden="true" className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/60 bg-amber-100">
                <svg className="h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1F2937]">Boletín de Estudiante</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#64748B]">Módulo</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#64748B]">Nota (20)</p>
              </div>
              <div className="space-y-2.5">
                {cursos.map((c) => (
                  <div key={c.nombre}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-[#1F2937]">{c.nombre}</p>
                      <p className="shrink-0 text-xs font-bold text-[#111827]">{c.nota}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: c.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha: Créditos + Historial */}
          <div className="relative z-10 flex w-44 shrink-0 flex-col gap-4 sm:-ml-2">
            <div className="rounded-2xl border border-[#DDE3EA] bg-white p-3 text-left shadow-[0_10px_30px_-12px_rgba(100,116,139,0.25)]">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                  <svg className="h-3 w-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l9 5-9 5-9-5 9-5zm0 0v2m9 3l-9 5-9-5m18 5l-9 5-9-5" /></svg>
                </span>
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#1F2937]">Créditos Académicos</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="8" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#2dd4bf" strokeWidth="8" strokeLinecap="round" strokeDasharray="117.8 163.4" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="30 163.4" strokeDashoffset="-117.8" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="15.6 163.4" strokeDashoffset="-147.8" />
                  </svg>
                  <p className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-[#111827]">72%</p>
                </div>
                <div className="space-y-1">
                  {[
                    { dot: 'bg-emerald-400', label: 'Aprobados', val: '72' },
                    { dot: 'bg-blue-400', label: 'En curso', val: '22' },
                    { dot: 'bg-amber-400', label: 'Pendientes', val: '6' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
                      <p className="text-[9px] font-medium text-[#64748B]">{l.label}</p>
                      <p className="ml-auto pl-2 text-[9px] font-bold text-[#111827]">{l.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDE3EA] bg-white p-3 text-left shadow-[0_10px_30px_-12px_rgba(100,116,139,0.25)]">
              <div className="mb-2 flex items-center gap-1.5">
                <svg className="h-3.5 w-3 text-slate-500" fill="currentColor" viewBox="0 0 12 12"><rect x="0" y="6" width="2" height="6" rx="0.5" opacity="0.45" /><rect x="3" y="3" width="2" height="9" rx="0.5" opacity="0.6" /><rect x="6" y="7" width="2" height="5" rx="0.5" opacity="0.5" /><rect x="9" y="1" width="2" height="11" rx="0.5" /></svg>
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#1F2937]">Historial Académico</p>
              </div>
              <div className="flex h-12 items-end justify-between gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 pb-2 pt-2">
                {[45, 60, 40, 70, 55, 85, 95].map((h, i) => (
                  <div key={i} className={`flex-1 rounded-[3px] ${i >= 4 ? 'bg-gradient-to-t from-amber-500 to-amber-300' : 'bg-slate-300'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Textos */}
        <h2 className="mt-7 text-xl font-extrabold tracking-tight text-[#1F2937] sm:text-2xl">
          Selecciona un estudiante para comenzar
        </h2>
        <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-[#64748B]">
          Consulta sus notas, créditos, historial académico y observaciones en un solo lugar.
        </p>

        {/* Chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {chips.map((chip) => (
            <span key={chip.label} className="inline-flex items-center gap-2 rounded-full border border-[#D7DEE7] bg-white px-4 py-1.5 text-xs font-medium text-[#374151] shadow-sm">
              <svg className={`h-4 w-4 ${chip.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={chip.icon} /></svg>
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


export function StudentReportCard() {
  const { user } = useAuth();
  const userRoles = user?.roles ? user.roles.map(r => typeof r === 'string' ? r : r.nombre || r.name) : [];
  const primaryRole = user?.is_superuser ? 'superadmin' : (userRoles.length > 0 ? userRoles[0] : (user?.role || 'invitado'));
  const isAdmin = primaryRole !== 'estudiante';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const [busquedaCursos, setBusquedaCursos] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [ordenCursos, setOrdenCursos] = useState('nombre');
  const [vista, setVista] = useState('ejecutiva'); // 'ejecutiva' | 'oficial'
  const oficial = vista === 'oficial';

  const [recentStudents, setRecentStudents] = useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('boletin_recent') || '[]'); return Array.isArray(parsed) ? parsed.slice(0, 3) : []; } catch { return []; }
  });

  useEffect(() => {
    if (!isAdmin) return;
    const fetchStudents = async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllStudents(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error('Error fetching students', e); }
      setSearchLoading(false);
    };
    fetchStudents();
  }, [isAdmin]);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      const val = searchTerm.trim().toLowerCase();
      const term = searchTerm.trim();
      const filtered = allStudents.filter(s => {
        const nombres = (s.nombres || '').toLowerCase();
        const apellidos = (s.apellidos || '').toLowerCase();
        const nombreCompleto = `${s.nombres || ''} ${s.apellidos || ''}`.trim().toLowerCase();
        const nombreInverso = `${s.apellidos || ''} ${s.nombres || ''}`.trim().toLowerCase();
        return (
          (s.dni && s.dni.includes(term)) ||
          (nombres && nombres.includes(val)) ||
          (apellidos && apellidos.includes(val)) ||
          (nombreCompleto && nombreCompleto.includes(val)) ||
          (nombreInverso && nombreInverso.includes(val)) ||
          (s.codigo_estudiante && s.codigo_estudiante.toLowerCase().includes(val))
        );
      });
      setFilteredStudents(filtered);
      setShowDropdown(true);
    } else {
      setFilteredStudents([]);
      setShowDropdown(false);
    }
  }, [searchTerm, allStudents]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
    setSelectedStudentName(`${student.apellidos}, ${student.nombres}`);
    setSearchTerm('');
    setShowDropdown(false);
    setData(null);
    setError(null);

    const entry = { id: student.id, nombres: student.nombres, apellidos: student.apellidos, codigo_estudiante: student.codigo_estudiante };
    setRecentStudents(prev => {
      const filtered = prev.filter(s => s.id !== student.id);
      const updated = [entry, ...filtered].slice(0, 3);
      localStorage.setItem('boletin_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearSelection = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setSearchTerm('');
    setData(null);
    setError(null);
  };

  const handleRemoveRecent = (event, studentId) => {
    event.stopPropagation();
    setRecentStudents(prev => {
      const updated = prev.filter(s => s.id !== studentId).slice(0, 3);
      localStorage.setItem('boletin_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const effectiveStudentId = isAdmin ? selectedStudentId : user?.id;

  useEffect(() => {
    if (!effectiveStudentId) {
      setLoading(false);
      return;
    }
    const fetchBoletin = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/mod-gestion-academica/estudiantes/${effectiveStudentId}/boletin`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'No se pudo cargar el boletín');
        }
        const real = await res.json();
        const notasJson = obtenerNotasPorCiclo(effectiveStudentId);
        if (notasJson) {
          const periodoActual = resumenDesdeJson(notasJson);
          setData({
            ...real,
            estudiante: { ...real.estudiante, periodo_codigo: notasJson.periodoActual },
            cursos_periodo: periodoActual.cursos_periodo,
            resumen: { ...real.resumen, ...periodoActual.resumen },
            _notasJson: notasJson,
          });
        } else {
          const evaluacion = mockEvaluacion.evaluaciones.find(
            e => e.codigo_estudiante === real.estudiante.codigo_estudiante
              && e.periodo === real.estudiante.periodo_codigo
          );
          setData(evaluacion ? { ...real, ...evaluacion } : real);
        }
      } catch (e) { setError(e.message); }
      setLoading(false);
    };
    fetchBoletin();
  }, [effectiveStudentId]);

  useEffect(() => {
    setBusquedaCursos('');
    setFiltroEstado('todos');
    setOrdenCursos('nombre');
  }, [data]);

  const Membrete = () => (
    <div className="text-center mb-7">
      <div className="flex items-center justify-center gap-2.5 mb-1">
        <span className="text-2xl">🎓</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-wide">SIGA</h1>
      </div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.28em] mb-3">Sistema de Gestión Académica</p>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-3"></div>
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-[0.2em]">Boletín de Notas Oficial</h2>
      <div className="w-16 h-0.5 bg-primary mx-auto mt-2.5"></div>
      <p className="text-[10px] text-slate-400 mt-2">Conforme al Reglamento de Evaluación y Promoción del Estudiante</p>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        <div className="space-y-5">
          {/* Skeleton: Datos del estudiante */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="h-14 bg-gradient-to-r from-[#001F58] via-primary to-[#00B8FF] opacity-60 animate-pulse relative">
              <div className="absolute bottom-0 left-0 right-0 h-1 flex opacity-70">
                <span className="flex-1 bg-emerald-400"></span>
                <span className="flex-1 bg-amber-400"></span>
                <span className="flex-1 bg-fuchsia-500"></span>
                <span className="flex-1 bg-cyan-400"></span>
              </div>
            </div>
            <div className="p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0"></div>
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="h-6 bg-slate-100 rounded w-64 mx-auto md:mx-0 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-48 mx-auto md:mx-0 animate-pulse"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-2.5 bg-slate-100 rounded w-14 mx-auto md:mx-0 animate-pulse"></div>
                      <div className="h-3.5 bg-slate-100 rounded w-20 mx-auto md:mx-0 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:block w-40 border-l border-slate-100 pl-6 space-y-2">
                <div className="h-2.5 bg-slate-100 rounded w-24 animate-pulse"></div>
                <div className="h-7 bg-slate-100 rounded-full w-28 animate-pulse"></div>
              </div>
            </div>
          </div>
          {/* Skeleton: Franja resumen */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 bg-slate-100 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-slate-100 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton: Tabla */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <div className="h-4 bg-slate-200 rounded w-36 animate-pulse"></div>
            </div>
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-3.5 bg-slate-100 rounded flex-1 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                  <div className="h-5 bg-slate-100 rounded-full w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton: Firmas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-px bg-slate-200 rounded"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        {isAdmin && (
          <div className="mb-6" ref={searchRef}>
            <StudentSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredStudents={filteredStudents}
              showDropdown={showDropdown}
              setShowDropdown={setShowDropdown}
              onSelect={handleSelectStudent}
              searchLoading={searchLoading}
              recentStudents={recentStudents}
              onRemoveRecent={handleRemoveRecent}
            />
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-md py-16 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-slate-700 font-semibold">{error}</p>
          <p className="text-slate-400 text-sm mt-2">Verifica que existan matrículas y evaluaciones registradas para este periodo.</p>
        </div>
      </div>
    );
  }

  if (isAdmin && !selectedStudentId) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        <div ref={searchRef} className="mb-6">
          <StudentSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredStudents={filteredStudents}
            showDropdown={showDropdown}
            onSelect={handleSelectStudent}
            searchLoading={searchLoading}
            recentStudents={recentStudents}
            setShowDropdown={setShowDropdown}
            onRemoveRecent={handleRemoveRecent}
          />
        </div>
        <BoletinEmptyState />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        {isAdmin && (
          <div className="mb-6" ref={searchRef}>
            <StudentSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredStudents={filteredStudents}
              showDropdown={showDropdown}
              setShowDropdown={setShowDropdown}
              onSelect={handleSelectStudent}
              searchLoading={searchLoading}
              recentStudents={recentStudents}
              onRemoveRecent={handleRemoveRecent}
            />
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-md py-16 text-center">
          <div className="text-4xl mb-3 opacity-30">📄</div>
          <p className="text-slate-600 font-medium">No hay información disponible.</p>
        </div>
      </div>
    );
  }

  const { estudiante, matricula_estado, estado_academico, progreso_creditos, cursos_periodo, resumen, observaciones, ciclos, _notasJson } = data;

  const iniciales = `${(estudiante.nombres || '').trim().charAt(0)}${(estudiante.apellidos || '').trim().charAt(0)}`.toUpperCase() || 'ES';
  const creditosRestantes = Math.max(0, (progreso_creditos.creditos_totales || 0) - (progreso_creditos.creditos_aprobados || 0));
  const condicion = condicionTone(estado_academico);

  const cursosConNota = cursos_periodo.filter(c => c.nota_final != null && c.creditos > 0);
  const sumaCreditosEval = cursosConNota.reduce((s, c) => s + c.creditos, 0);
  const promedioPonderado = sumaCreditosEval > 0
    ? Math.round((cursosConNota.reduce((s, c) => s + c.nota_final * c.creditos, 0) / sumaCreditosEval) * 10) / 10
    : null;
  const promedioAritmetico = resumen.promedio_general ?? null;
  const promediosListos = promedioPonderado != null || promedioAritmetico != null;
  const promedioRef = promedioPonderado ?? promedioAritmetico;
  const valoracion = valorarPromedio(promedioRef);
  const escalaNivel = escalaDe(promedioRef);
  const promedioPct = promedioRef != null ? (promedioRef / 20) * 100 : 0;

  const codigoVerificacion = promediosListos
    ? `SIGA-${(estudiante.periodo_codigo || 'P').replace(/[^0-9A-Za-z]/g, '')}-${hashCorto(`${estudiante.codigo_estudiante}|${estudiante.periodo_codigo}|${estudiante.fecha_emision}`)}`
    : null;

  const matriculaVigente = matricula_estado?.pago_matricula === true;

  /* ===== DOCUMENTO HISTÓRICO POR CICLOS ===== */
  const listaCiclos = construirListaCiclos(ciclos, _notasJson, cursos_periodo);
  const unidadesPlan = listaCiclos.flatMap(c => Array.isArray(c.unidades) ? c.unidades : []);

  const notasHistoricas = unidadesPlan.filter(u => u.nota != null).map(u => u.nota);
  const promedioGeneralHistorico = notasHistoricas.length > 0
    ? Math.round((notasHistoricas.reduce((s, n) => s + n, 0) / notasHistoricas.length) * 100) / 100
    : null;
  const ciclosCompletados = _notasJson
    ? listaCiclos.filter(c => c.completado).length
    : (resumen?.ciclos_completados ?? listaCiclos.filter(c => c.completado).length);
  const ciclosTotales = _notasJson ? listaCiclos.length : (resumen?.ciclos_totales ?? listaCiclos.length);

  const conteoEstado = {
    todos: unidadesPlan.length,
    aprobados: unidadesPlan.filter(u => u.estado === 'aprobado').length,
    desaprobados: unidadesPlan.filter(u => u.estado === 'desaprobado').length,
  };

  const ciclosVisibles = listaCiclos
    .map(ciclo => {
      const unidades = (Array.isArray(ciclo.unidades) ? ciclo.unidades : [])
        .filter(u => {
          const coincideBusqueda = !busquedaCursos
            || normalizarTexto(u.nombre).includes(normalizarTexto(busquedaCursos));
          const pasaFiltro = filtroEstado === 'todos'
            || (filtroEstado === 'aprobados' && u.estado === 'aprobado')
            || (filtroEstado === 'desaprobados' && u.estado === 'desaprobado');
          return coincideBusqueda && pasaFiltro;
        })
        .sort((a, b) => {
          switch (ordenCursos) {
            case 'nota_desc': return (b.nota ?? -1) - (a.nota ?? -1);
            case 'nota_asc': return (a.nota ?? 999) - (b.nota ?? 999);
            case 'creditos_desc': return (b.creditos ?? 0) - (a.creditos ?? 0);
            case 'estado': return String(a.estado).localeCompare(String(b.estado), 'es');
            default: return 0;
          }
        });
      return { ...ciclo, unidadesVisibles: unidades };
    })
    .filter(c => c.unidadesVisibles.length > 0);

  const unidadesVisiblesTotal = ciclosVisibles.reduce((s, c) => s + c.unidadesVisibles.length, 0);

  const getNotaChip = (val) => {
    if (val === null || val === undefined) return 'bg-slate-50 text-slate-400 border border-slate-200';
    if (oficial) {
      return val >= NOTA_MIN_APROBAR
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
        : 'bg-red-50 text-red-700 border border-red-300';
    }
    return val >= NOTA_MIN_APROBAR
      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white border border-emerald-500 shadow-card'
      : 'bg-gradient-to-br from-red-500 to-rose-500 text-white border border-red-500 shadow-card';
  };

  const getBadgeColor = (estado) => {
    if (oficial) {
      if (estado === 'aprobado') return 'bg-emerald-50 text-emerald-800 border border-emerald-300';
      if (estado === 'desaprobado') return 'bg-red-50 text-red-700 border border-red-300';
      return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
    if (estado === 'aprobado') return 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white border border-emerald-500 shadow-card';
    if (estado === 'desaprobado') return 'bg-gradient-to-r from-red-500 to-rose-500 text-white border border-red-500 shadow-card';
    return 'bg-slate-100 text-slate-600 border border-slate-200';
  };

  const handlePrint = () => window.print();

  return (
    <>
    <div className="no-print animate-fade-in max-w-4xl mx-auto boletin-container">

      {/* Membrete */}
      <Membrete />

      {isAdmin && selectedStudentName && (
        <div className="no-print mb-6 bg-white border border-slate-200 rounded-md px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Viendo boletín de: <span className="font-semibold text-slate-900">{selectedStudentName}</span>
          </p>
          <button
            onClick={handleClearSelection}
            className="text-xs font-semibold text-primary hover:text-primary-dark underline cursor-pointer ml-4 whitespace-nowrap"
          >
            Cambiar estudiante
          </button>
        </div>
      )}

      {isAdmin && !selectedStudentName && (
        <div ref={searchRef} className="no-print mb-6">
          <StudentSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredStudents={filteredStudents}
            showDropdown={showDropdown}
            onSelect={handleSelectStudent}
            searchLoading={searchLoading}
            recentStudents={recentStudents}
            setShowDropdown={setShowDropdown}
            onRemoveRecent={handleRemoveRecent}
          />
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-6 no-print">
        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
          {[
            { id: 'ejecutiva', label: 'Ejecutiva' },
            { id: 'oficial', label: 'Oficial' },
          ].map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              aria-pressed={vista === v.id}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                vista === v.id ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button onClick={handlePrint} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Imprimir Boletín
        </button>
      </div>

      {/* SECCION 1: Datos del Estudiante */}
      <section className={`bg-white border rounded-xl overflow-hidden mb-5 boletin-section ${oficial ? 'border-slate-300 shadow' : 'border-primary/25 shadow-card-lg'}`}>
        <div className={`relative px-5 py-4 text-white overflow-hidden ${oficial ? 'bg-primary' : 'bg-gradient-to-r from-[#001F58] via-primary to-[#00B8FF]'}`}>
          {!oficial && (
            <>
              <span className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/20"></span>
              <span className="absolute -bottom-20 right-36 w-44 h-44 rounded-full bg-white/10"></span>
            </>
          )}
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-white/25 border border-white/40 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" strokeWidth={2.4} />
              </span>
              Datos del Estudiante
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 ${oficial ? 'bg-white/20 border border-white/40' : 'bg-white/25 border border-white/40 shadow-sm'}`}>
                Periodo {estudiante.periodo_codigo}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 ${oficial ? 'bg-white/20 border border-white/40' : 'bg-cyan-400/90 text-slate-900 border border-white/50 shadow-sm'}`}>
                Emitido {estudiante.fecha_emision}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border ${matriculaVigente ? 'bg-emerald-400/90 text-slate-900 border-emerald-200' : 'bg-amber-400/90 text-slate-900 border-amber-200'}`}>
                Matrícula {matriculaVigente ? 'vigente' : 'pendiente'}
              </span>
            </div>
          </div>
          {!oficial && <AccentStripe />}
        </div>

        <div className="p-6 flex flex-col md:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-3xl font-extrabold overflow-hidden flex-shrink-0 ${
            oficial
              ? 'bg-slate-50 border-slate-300 text-primary'
              : 'bg-gradient-to-br from-cyan-400 via-blue-500 to-primary border-white ring-4 ring-primary/20 shadow-card-lg text-white'
          }`}>
            {estudiante.foto_url ? (
              <img src={estudiante.foto_url} alt="Foto del estudiante" className="w-full h-full object-cover" />
            ) : iniciales}
          </div>

          <div className="flex-1 min-w-0 text-center md:text-left">
            <h2 className={`text-2xl font-extrabold tracking-tight leading-tight break-words ${oficial ? 'text-slate-900' : 'bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent'}`}>
              {estudiante.apellidos}, {estudiante.nombres}
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-1 flex items-center justify-center md:justify-start gap-1.5">
              <span className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-primary" strokeWidth={2.4} />
              </span>
              {estudiante.programa_nombre || 'Programa no registrado'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 mt-5 text-left">
              <InfoItem icon={Hash} label="Código" value={estudiante.codigo_estudiante} tone="blue" />
              <InfoItem icon={IdCard} label="DNI" value={estudiante.dni} tone="cyan" />
              <InfoItem icon={Phone} label="Celular" value={estudiante.celular} tone="emerald" />
              <InfoItem icon={Mail} label="Email" value={estudiante.email_personal} tone="fuchsia" />
            </div>
          </div>

          <div className="text-center md:text-left md:border-l md:border-slate-200 md:pl-6 min-w-[160px]">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em] mb-1.5">Condición académica</p>
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-extrabold uppercase tracking-wider ${oficial ? 'bg-slate-100 border-slate-300 text-slate-700' : `shadow-card ${TONE_BADGE[condicion]}`}`}>
              <BadgeCheck className="w-4 h-4" strokeWidth={2.6} />
              {estado_academico || 'No registrada'}
            </span>
            {codigoVerificacion && (
              <p className="text-[10px] text-slate-400 mt-2.5 leading-snug">
                Código de verificación<br />
                <span className="font-mono font-bold text-slate-600">{codigoVerificacion}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FRANJA RESUMEN EJECUTIVO */}
      <section className={`mb-5 boletin-section bg-white border rounded-xl overflow-hidden ${oficial ? 'border-slate-300 shadow' : 'border-primary/25 shadow-card-lg'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Promedio ponderado */}
          <div className={`p-5 flex items-center gap-4 ${oficial ? 'bg-white' : 'bg-gradient-to-br from-primary/5 to-cyan-50/60'}`}>
            <RingProgress percent={promedioPct} color={promedioRef != null && promedioRef >= NOTA_MIN_APROBAR ? '#059669' : '#dc2626'} size="lg">
              <span className="text-center leading-none">
                <span className={`block text-2xl font-extrabold ${promedioRef != null && promedioRef >= NOTA_MIN_APROBAR ? 'text-emerald-700' : 'text-red-600'}`}>
                  {promedioRef ?? '—'}
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">de 20</span>
              </span>
            </RingProgress>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">Promedio ponderado</p>
              <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${oficial ? 'bg-slate-100 border-slate-300 text-slate-700' : `shadow-card ${TONE_BADGE[valoracion.tone]}`}`}>
                {valoracion.label}
              </span>
              {promedioAritmetico != null && promedioPonderado != null && promedioAritmetico !== promedioPonderado && (
                <p className="text-[10px] text-slate-400 mt-1.5">Aritmético: <b className="text-slate-600">{promedioAritmetico}</b></p>
              )}
            </div>
          </div>

          {/* Resultado del periodo */}
          <div className="p-5">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em] mb-2.5">Resultado del periodo</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-extrabold">
                {resumen.cursos_aprobados} <span className="text-[10px] font-bold uppercase">aprob.</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-extrabold">
                {resumen.cursos_desaprobados} <span className="text-[10px] font-bold uppercase">desap.</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm font-extrabold">
                {resumen.total_cursos} <span className="text-[10px] font-bold uppercase">cursos</span>
              </span>
            </div>
            {resumen.cursos_desaprobados > 0 && (
              <p className="mt-2.5 text-[11px] text-amber-700 font-semibold">Requiere seguimiento académico.</p>
            )}
          </div>

          {/* Avance de plan */}
          <div className="p-5">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em] mb-2.5">Avance del plan</p>
            <p className="text-2xl font-extrabold text-primary leading-none">
              {progreso_creditos.porcentaje}%
              <span className="text-sm font-bold text-slate-400 ml-1.5">
                {progreso_creditos.creditos_aprobados}/{progreso_creditos.creditos_totales} cr.
              </span>
            </p>
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${oficial ? 'bg-primary' : 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-primary'}`}
                style={{ width: `${Math.max(2, progreso_creditos.porcentaje)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">
              {creditosRestantes > 0 ? `Faltan ${creditosRestantes} créditos` : 'Plan completado'}
            </p>
          </div>

          {/* Escala */}
          <div className="p-5">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em] mb-2.5">Escala vigesimal</p>
            <ul className="space-y-1.5">
              {ESCALA_CALIFICACION.map(e => {
                const activo = escalaNivel?.sigla === e.sigla;
                const tones = {
                  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-300',
                  blue: 'text-blue-700 bg-blue-50 border-blue-300',
                  amber: 'text-amber-700 bg-amber-50 border-amber-300',
                  red: 'text-red-600 bg-red-50 border-red-300',
                };
                return (
                  <li key={e.sigla} className={`flex items-center gap-2 text-[11px] rounded-md border px-2 py-1 ${activo ? tones[e.tone] : 'border-transparent text-slate-400'}`}>
                    <span className="font-extrabold w-6">{e.sigla}</span>
                    <span className="font-mono font-semibold">{e.rango}</span>
                    <span className="ml-auto uppercase tracking-wider font-bold text-[9px]">{e.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* SECCION 4: Notas del Periodo */}
      <section className={`bg-white border rounded-xl overflow-hidden mb-5 boletin-section ${oficial ? 'border-slate-300 shadow' : 'border-primary/25 shadow-card-lg'}`}>
        <div className={`relative text-white px-5 py-4 overflow-hidden ${oficial ? 'bg-primary' : 'bg-gradient-to-r from-[#001F58] via-primary to-[#00B8FF]'}`}>
          {!oficial && (
            <>
              <span className="absolute -top-14 right-10 w-44 h-44 rounded-full bg-white/15"></span>
              <span className="absolute -bottom-16 -left-8 w-36 h-36 rounded-full bg-white/10"></span>
            </>
          )}
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/25 border border-white/40 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4.5 h-4.5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 mr-auto">
              <h4 className="font-extrabold text-sm uppercase tracking-wider">Notas por Ciclos</h4>
              <p className="text-[11px] text-white/80 mt-0.5 font-medium">
                {listaCiclos.length} ciclo{listaCiclos.length !== 1 ? 's' : ''} · {unidadesPlan.length} unidad{unidadesPlan.length !== 1 ? 'es' : ''} didáctica{unidadesPlan.length !== 1 ? 's' : ''} · nota mínima aprobatoria {NOTA_MIN_APROBAR}/20
              </p>
            </div>
          </div>

          <div className="no-print relative flex flex-wrap items-center gap-2 mt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/80 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2.2} />
              <input
                type="text"
                value={busquedaCursos}
                onChange={(e) => setBusquedaCursos(e.target.value)}
                placeholder="Buscar unidad didáctica"
                aria-label="Buscar unidad didáctica"
                className="w-48 sm:w-56 bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 pl-8 text-xs text-white font-medium placeholder-white/70 outline-none focus:border-white/70 focus:bg-white/30"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'aprobados', label: 'Aprobados' },
                { id: 'desaprobados', label: 'Desaprobados' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroEstado(f.id)}
                  aria-pressed={filtroEstado === f.id}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    filtroEstado === f.id
                      ? 'bg-white text-primary border-white shadow-card'
                      : 'bg-white/15 text-white border-white/30 hover:bg-white/30'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 ${filtroEstado === f.id ? 'text-cyan-600' : 'text-white/70'}`}>
                    {conteoEstado[f.id]}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-white/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.2} />
              <select
                value={ordenCursos}
                onChange={(e) => setOrdenCursos(e.target.value)}
                aria-label="Ordenar cursos"
                className="appearance-none bg-white/20 border border-white/30 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white font-medium outline-none focus:border-white/70 cursor-pointer"
              >
                <option className="text-slate-800" value="nombre">Curso A-Z</option>
                <option className="text-slate-800" value="nota_desc">Nota mayor</option>
                <option className="text-slate-800" value="nota_asc">Nota menor</option>
                <option className="text-slate-800" value="creditos_desc">Más créditos</option>
                <option className="text-slate-800" value="estado">Por estado</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.2} />
            </div>

            <span className="text-xs bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 font-bold whitespace-nowrap ml-auto">
              {unidadesVisiblesTotal} de {unidadesPlan.length}
            </span>
          </div>
          {!oficial && <AccentStripe />}
        </div>

        {listaCiclos.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.6} />
            <p className="text-slate-400 font-medium text-sm">El plan de estudios no tiene ciclos registrados.</p>
          </div>
        ) : ciclosVisibles.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.6} />
            <p className="text-slate-400 font-medium text-sm">No se encontraron unidades con ese criterio.</p>
            <button
              type="button"
              onClick={() => { setBusquedaCursos(''); setFiltroEstado('todos'); }}
              className="mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className={`p-4 md:p-5 ${oficial ? 'bg-slate-50/60' : 'bg-gradient-to-b from-slate-50/80 to-white'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {ciclosVisibles.map(ciclo => (
                <CicloCard
                  key={ciclo.ciclo}
                  ciclo={ciclo}
                  oficial={oficial}
                  getNotaChip={getNotaChip}
                  getBadgeColor={getBadgeColor}
                />
              ))}
            </div>

            {/* RESUMEN DEL DOCUMENTO */}
            <div className={`mt-5 boletin-section border rounded-xl overflow-hidden ${oficial ? 'border-slate-300 bg-white' : 'border-primary/25 bg-white shadow-card-lg'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className={`p-4 flex items-center justify-between gap-4 ${oficial ? 'bg-slate-100' : 'bg-gradient-to-r from-[#001F58] via-primary to-[#00B8FF]'}`}>
                  <p className={`text-xs md:text-sm font-extrabold uppercase tracking-[0.12em] ${oficial ? 'text-slate-700' : 'text-white/90'}`}>Promedio general</p>
                  <span className={`text-2xl md:text-3xl font-extrabold leading-none ${oficial ? 'text-primary' : 'text-white'}`}>
                    {promedioGeneralHistorico != null ? promedioGeneralHistorico.toFixed(2) : 'S/N'}
                  </span>
                </div>
                <div className={`p-4 flex items-center justify-between gap-4 border-t sm:border-t-0 sm:border-l ${oficial ? 'bg-slate-100 border-slate-200' : 'border-white/20 bg-gradient-to-r from-primary to-[#00B8FF]'}`}>
                  <p className={`text-xs md:text-sm font-extrabold uppercase tracking-[0.12em] ${oficial ? 'text-slate-700' : 'text-white/90'}`}>Ciclos completados</p>
                  <span className={`text-2xl md:text-3xl font-extrabold leading-none whitespace-nowrap ${oficial ? 'text-primary' : 'text-white'}`}>
                    {ciclosCompletados} <span className="text-sm font-bold opacity-80">de {ciclosTotales}</span>
                  </span>
                </div>
              </div>
              <p className="px-4 py-2.5 text-center text-[11px] text-slate-500 font-semibold border-t border-slate-100">
                Escala de calificación: 0 a 20 &middot; Nota mínima aprobatoria: {NOTA_MIN_APROBAR}
              </p>
            </div>

            <div className={`boletin-section border-t mt-4 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] ${oficial ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
              <span className="text-slate-500 font-semibold">Mostrando {unidadesVisiblesTotal} de {unidadesPlan.length} unidades del plan</span>
              <span className="ml-auto text-slate-400 font-semibold">Nota mínima aprobatoria: {NOTA_MIN_APROBAR}</span>
            </div>
          </div>
        )}
      </section>

      {/* OBSERVACIONES (solo si existen) */}
      {observaciones && (
        <div className={`mb-5 boletin-section bg-white border rounded-xl overflow-hidden ${oficial ? 'border-slate-300 shadow' : 'border-amber-200 shadow-card-lg'}`}>
          <div className={`flex items-center gap-2.5 px-5 py-3 ${oficial ? 'bg-slate-50 border-b border-slate-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200'}`}>
            <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2.4} />
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800">Observaciones de Secretaría Académica</p>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-700 leading-relaxed">{observaciones}</p>
          </div>
        </div>
      )}

      {/* FIRMAS */}
      <section className={`mb-6 boletin-section bg-white border rounded-xl px-5 py-6 ${oficial ? 'border-slate-300 shadow' : 'border-primary/25 shadow-card-lg'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div className="w-full border-b border-slate-400 mb-1.5"></div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.15em]">Estudiante</p>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5">{estudiante.apellidos}, {estudiante.nombres}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">DNI: {estudiante.dni || '—'}</p>
          </div>
          <div>
            <div className="w-full border-b border-slate-400 mb-1.5"></div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.15em]">Secretaría Académica</p>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Firma y sello</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Fecha de emisión: {estudiante.fecha_emision}</p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-6 pt-4 border-t border-slate-100 leading-relaxed">
          Este boletín es un documento informativo generado por SIGA. No tiene validez oficial sin la firma y sello de la Secretaría Académica.
          <br />
          Código de verificación: <span className="font-mono font-bold text-slate-500">{codigoVerificacion || 'N/D'}</span>
        </p>
      </section>

    </div>

    <BoletinImpresion
      estudiante={estudiante}
      ciclos={listaCiclos}
      promedioGeneral={promedioGeneralHistorico}
      ciclosCompletados={ciclosCompletados}
      ciclosTotales={ciclosTotales}
      codigoVerificacion={codigoVerificacion}
    />
    </>
  );
}

function DetalleUnidad({ u, cicloTitulo, oficial, getNotaChip, getBadgeColor }) {
  const esOficial = oficial;
  const borde = esOficial ? 'border-slate-200' : 'border-primary/15';
  const caja = `rounded-xl border ${borde} bg-white`;
  const tituloSeccion = `text-[10px] font-extrabold uppercase tracking-[0.18em] ${esOficial ? 'text-slate-600' : 'text-primary-dark'}`;
  const colorBarra = (n) => (n == null ? 'bg-slate-200' : n >= NOTA_MIN_APROBAR ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-red-400 to-rose-500');

  const capacidades = [
    { key: 'C1', nombre: 'Comprensión y análisis', descriptor: 'Prueba escrita: resolución de casos y preguntas teóricas', ponderacion: '33.3%', nota: u.nota_c1 },
    { key: 'C2', nombre: 'Aplicación práctica', descriptor: 'Actividades y prácticas en laboratorio o taller', ponderacion: '33.3%', nota: u.nota_c2 },
    { key: 'C3', nombre: 'Producto y comunicación', descriptor: 'Proyecto integrador, portafolio y exposición', ponderacion: '33.3%', nota: u.nota_c3 },
  ];
  const registradas = capacidades.filter(c => c.nota != null);
  const conParciales = registradas.length > 0;
  const sumaParciales = registradas.reduce((s, c) => s + c.nota, 0);
  const promCalculado = conParciales ? Math.round(sumaParciales / registradas.length) : null;
  const coincide = promCalculado != null && promCalculado === u.nota;
  const aprobado = u.estado === 'aprobado';
  const desaprobado = u.estado === 'desaprobado';
  const nota = u.nota;
  const brecha = nota != null ? nota - NOTA_MIN_APROBAR : null;
  const pctLogro = nota != null ? Math.min(100, Math.round((nota / 20) * 100)) : 0;
  const estadoCapacidad = (n) => {
    if (n == null) return { texto: 'Sin registrar', color: 'text-slate-400' };
    if (n >= NOTA_MIN_APROBAR) return { texto: 'Lograda', color: 'text-emerald-700' };
    return { texto: 'No lograda', color: 'text-red-600' };
  };
  const recomendacion = nota == null
    ? (u.estado === 'no_cursado'
      ? 'Unidad incluida en el plan académico; aún no se encuentra matriculada. Al cursarla, el docente registrará las notas por capacidad.'
      : 'La unidad está en curso. El detalle completo se habilitará cuando el docente registre las notas parciales o el promedio final.')
    : aprobado
      ? `Resultado acreditado. Se recomienda continuar con el siguiente ciclo, considerando que esta unidad aporta ${u.creditos ?? '—'} créditos al avance de su plan de estudios.`
      : desaprobado
        ? `Resultado no acreditado. El estudiante debe reinscribirse en la unidad o presentarse a la convocatoria de evaluación extraordinaria para recuperar ${u.creditos ?? '—'} créditos.`
        : 'Resultado pendiente de consolidación por parte del docente responsable.';
  const meta = [
    { label: 'Código de unidad', value: u.codigo || '—' },
    { label: 'Créditos', value: u.creditos ?? '—' },
    { label: 'Horas de clase', value: u.horas != null ? `${u.horas} h` : '—' },
    { label: 'Tipo de modalidad', value: u.tipo ? String(u.tipo).replace(/-/g, ' ') : '—' },
    { label: 'Docente responsable', value: u.docente || 'Por asignar' },
    { label: 'Turno / Sección', value: (u.turno || u.seccion) ? `${u.turno || '—'} · Sección ${u.seccion || '—'}` : '—' },
    { label: 'Periodo académico', value: u.periodo_codigo || '—' },
    { label: 'Estado registral', value: u.estado === 'no_cursado' ? 'Sin cursar' : u.estado },
  ];

  return (
    <div className={`px-4 py-4 space-y-4 ${esOficial ? 'bg-slate-50' : 'bg-gradient-to-br from-slate-50 via-white to-cyan-50/40'}`}>
      {/* Encabezado del detalle */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[9px] font-extrabold uppercase tracking-[0.2em] ${esOficial ? 'text-slate-400' : 'text-primary/70'}`}>Ficha de evaluación</p>
          <p className="text-sm font-extrabold text-slate-800 leading-snug">{u.nombre}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {cicloTitulo || 'Ciclo'}{u.codigo ? ` · ${u.codigo}` : ''}{u.tipo ? ` · ${String(u.tipo).replace(/-/g, ' ')}` : ''}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(u.estado)}`}>
          {u.estado === 'no_cursado' ? 'Sin cursar' : u.estado}
        </span>
      </div>

      {/* Indicadores principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className={`${caja} p-3`}>
          <p className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${esOficial ? 'text-slate-500' : 'text-primary'}`}>Nota final obtenida</p>
          <p className={`text-2xl font-extrabold mt-1 ${nota != null ? (aprobado ? 'text-emerald-700' : 'text-red-600') : 'text-slate-300'}`}>
            {nota ?? '—'}<span className="text-xs font-bold text-slate-400">/20</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${colorBarra(nota)}`} style={{ width: `${pctLogro}%` }}></div>
          </div>
          <p className="mt-1 text-[9px] text-slate-400">{nota != null ? `${pctLogro}% de logro` : 'Sin registro'}</p>
        </div>
        <div className={`${caja} p-3`}>
          <p className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${esOficial ? 'text-slate-500' : 'text-primary'}`}>Mínimo aprobatorio</p>
          <p className="text-2xl font-extrabold mt-1 text-slate-700">{NOTA_MIN_APROBAR}<span className="text-xs font-bold text-slate-400">/20</span></p>
          <p className="mt-2 text-[9px] text-slate-500 leading-tight">Escala vigesimal institucional. Brecha: <b className={brecha == null ? 'text-slate-400' : brecha >= 0 ? 'text-emerald-700' : 'text-red-600'}>{brecha == null ? '—' : `${brecha > 0 ? '+' : ''}${brecha} pts`}</b></p>
        </div>
        <div className={`${caja} p-3`}>
          <p className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${esOficial ? 'text-slate-500' : 'text-primary'}`}>Efecto en el plan</p>
          <p className={`text-sm font-extrabold mt-1 ${aprobado ? 'text-emerald-700' : desaprobado ? 'text-red-600' : 'text-slate-500'}`}>
            {nota == null ? 'Pendiente' : aprobado ? `${u.creditos ?? '—'} cr. acreditados` : `${u.creditos ?? '—'} cr. no acreditados`}
          </p>
          <p className="mt-2 text-[9px] text-slate-500 leading-tight">Los créditos se reconocen únicamente al superar el mínimo aprobatorio.</p>
        </div>
      </div>

      {/* Sección 1: desglose por capacidades */}
      <div className={caja}>
        <div className={`px-3 py-2 border-b ${esOficial ? 'border-slate-200 bg-slate-100' : 'border-primary/10 bg-primary/5'} rounded-t-xl`}>
          <p className={tituloSeccion}>1 · Desglose por capacidades</p>
        </div>
        <div className="divide-y divide-slate-100">
          {capacidades.map(c => {
            const est = estadoCapacidad(c.nota);
            const pct = c.nota != null ? Math.min(100, Math.round((c.nota / 20) * 100)) : 0;
            return (
              <div key={c.key} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-700">
                      <span className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold ${esOficial ? 'bg-slate-200 text-slate-600' : 'bg-primary/10 text-primary-dark'}`}>{c.key}</span>
                      {c.nombre}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{c.descriptor}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-slate-400">Ponderación {c.ponderacion}</span>
                    <span className={`inline-flex items-center justify-center min-w-[38px] px-2 py-0.5 rounded-md text-[13px] font-extrabold ${getNotaChip(c.nota)}`}>
                      {c.nota ?? '—'}
                    </span>
                    <span className={`text-[9px] font-bold ${est.color}`}>{est.texto}</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${colorBarra(c.nota)}`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección 2: cálculo */}
      <div className={caja}>
        <div className={`px-3 py-2 border-b ${esOficial ? 'border-slate-200 bg-slate-100' : 'border-primary/10 bg-primary/5'} rounded-t-xl`}>
          <p className={tituloSeccion}>2 · Cálculo de la nota final</p>
        </div>
        <div className="px-3 py-3 space-y-2">
          {conParciales ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-700">
                <span className="font-semibold">Promedio = (</span>
                {capacidades.map((c, i) => (
                  <Fragment key={c.key}>
                    <span className={`px-1.5 py-0.5 rounded font-extrabold text-[12px] ${c.nota != null ? (c.nota >= NOTA_MIN_APROBAR ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700') : 'bg-slate-50 text-slate-400'}`}>
                      {c.nota ?? '—'}
                    </span>
                    {i < capacidades.length - 1 && <span className="font-bold text-slate-400">+</span>}
                  </Fragment>
                ))}
                <span className="font-semibold">) ÷ {registradas.length} = <b>{(sumaParciales / registradas.length).toFixed(2)}</b> → redondeo → <b className={aprobado ? 'text-emerald-700' : 'text-red-600'}>{promCalculado}</b></span>
              </div>
              <ul className="text-[10px] text-slate-500 space-y-1 leading-relaxed">
                <li>• Cada capacidad aporta en partes iguales (33.3%) al promedio del curso.</li>
                <li>• Se promedian solo las capacidades registradas ({registradas.length} de 3) y se redondea al entero más cercano.</li>
                <li>• {coincide
                  ? 'El promedio del sistema coincide con el cálculo mostrado; la nota final es consistente.'
                  : 'La nota final fue fijada por el docente responsable y puede diferir del promedio simple de las capacidades.'}</li>
              </ul>
            </>
          ) : nota != null ? (
            <>
              <p className="text-[12px] text-slate-700 font-semibold">
                El docente registró el Promedio Final directamente: <b className={aprobado ? 'text-emerald-700' : 'text-red-600'}>{nota}/20</b>
              </p>
              <ul className="text-[10px] text-slate-500 space-y-1 leading-relaxed">
                <li>• No existe desglose por capacidades (C1/C2/C3) para esta unidad.</li>
                <li>• La nota corresponde al promedio consolidado del curso registrado en el acta del docente.</li>
              </ul>
            </>
          ) : (
            <>
              <p className="text-[12px] text-slate-600 font-semibold">Sin registro de evaluación</p>
              <ul className="text-[10px] text-slate-500 space-y-1 leading-relaxed">
                <li>• Esta unidad aún no tiene notas asociadas al estudiante.</li>
                <li>• El desglose aparecerá automáticamente cuando el docente registre las capacidades o el promedio final.</li>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Sección 3: efecto académico */}
      <div className={caja}>
        <div className={`px-3 py-2 border-b ${esOficial ? 'border-slate-200 bg-slate-100' : 'border-primary/10 bg-primary/5'} rounded-t-xl`}>
          <p className={tituloSeccion}>3 · Interpretación y recomendación</p>
        </div>
        <div className="px-3 py-3 space-y-2">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <b className="text-slate-600">Regla institucional:</b> se acredita la unidad con {NOTA_MIN_APROBAR}/20 o más.{' '}
            {nota != null && (aprobado
              ? `Al obtener ${nota} puntos, el estudiante supera el mínimo por ${brecha} punto${brecha === 1 ? '' : 's'} y sus ${u.creditos ?? '—'} créditos se suman al avance de su plan.`
              : `Al obtener ${nota} puntos, el estudiante no alcanza el mínimo; faltan ${Math.abs(brecha)} punto${Math.abs(brecha) === 1 ? '' : 's'} para acreditar ${u.creditos ?? '—'} créditos.`)}
          </p>
          <div className={`rounded-lg border px-3 py-2 ${esOficial ? 'bg-white border-slate-200' : 'bg-white border-primary/10'}`}>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-1">Recomendación académica</p>
            <p className="text-[11px] text-slate-700 leading-relaxed">{recomendacion}</p>
          </div>
        </div>
      </div>

      {/* Sección 4: trazabilidad */}
      <div className={caja}>
        <div className={`px-3 py-2 border-b ${esOficial ? 'border-slate-200 bg-slate-100' : 'border-primary/10 bg-primary/5'} rounded-t-xl`}>
          <p className={tituloSeccion}>4 · Trazabilidad del registro</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 px-3 py-3">
          {meta.map(m => (
            <div key={m.label}>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{m.label}</p>
              <p className="text-[11px] font-semibold text-slate-700 capitalize">{m.value}</p>
            </div>
          ))}
        </div>
        <p className={`px-3 pb-3 text-[9px] ${esOficial ? 'text-slate-400' : 'text-slate-400'} leading-relaxed`}>
          Información generada por SIGA a partir de los registros de matrícula y evaluación del periodo académico. Conforme al Reglamento de Evaluación y Promoción del Estudiante.
        </p>
      </div>
    </div>
  );
}

function CicloCard({ ciclo, oficial, getNotaChip, getBadgeColor }) {
  const unidades = ciclo.unidadesVisibles || [];
  const [abierta, setAbierta] = useState(null);

  const toggle = (nombre) => setAbierta(prev => (prev === nombre ? null : nombre));

  return (
    <div className={`boletin-section bg-white border rounded-xl overflow-hidden ${oficial ? 'border-slate-300 shadow' : 'border-primary/25 shadow-card-lg'}`}>
      <div className={`px-4 py-2.5 text-white text-center ${oficial ? 'bg-primary' : 'bg-gradient-to-r from-[#001F58] via-primary to-[#00B8FF]'}`}>
        <p className="text-xs font-extrabold uppercase tracking-[0.22em]">{ciclo.titulo}</p>
      </div>

      <table className="w-full text-left boletin-table">
        <thead>
          <tr className={`${oficial ? 'bg-slate-100 border-b border-slate-200' : 'bg-primary/10 border-b border-primary/20'}`}>
            <th className={`py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-[0.14em] ${oficial ? 'text-slate-600' : 'text-primary-dark'}`}>Unidad Didáctica</th>
            <th className={`py-2.5 px-2 font-extrabold uppercase text-[10px] tracking-[0.14em] text-center ${oficial ? 'text-slate-600' : 'text-primary-dark'}`}>Créd.</th>
            <th className={`py-2.5 px-2 font-extrabold uppercase text-[10px] tracking-[0.14em] text-center ${oficial ? 'text-slate-600' : 'text-primary-dark'}`}>Nota</th>
            <th className={`py-2.5 px-2 font-extrabold uppercase text-[10px] tracking-[0.14em] text-center ${oficial ? 'text-slate-600' : 'text-primary-dark'}`}>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {unidades.map((u, i) => {
            const aprobado = u.estado === 'aprobado';
            const desaprobado = u.estado === 'desaprobado';
            const abiertaFila = abierta === u.nombre;
            return (
              <Fragment key={`${ciclo.ciclo}-${i}`}>
                <tr
                  className={`cursor-pointer transition-colors ${abiertaFila ? (oficial ? 'bg-slate-100' : 'bg-primary/5') : 'hover:bg-slate-50'}`}
                  onClick={() => toggle(u.nombre)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(u.nombre); } }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={abiertaFila}
                  title="Ver detalle del porqué de la nota"
                >
                  <td className={`py-2.5 px-3 border-l-[4px] text-[13px] font-semibold text-slate-800 ${aprobado ? 'border-l-emerald-500' : desaprobado ? 'border-l-red-500' : 'border-l-slate-300'}`}>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block text-[9px] text-slate-400 transition-transform ${abiertaFila ? 'rotate-90' : ''}`}>▶</span>
                      <span className="flex-1">
                        {u.nombre}
                        {u.codigo && <span className="ml-1.5 text-[9px] font-normal text-slate-400">{u.codigo}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600 font-semibold text-[13px]">{u.creditos ?? '—'}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[38px] px-2 py-0.5 rounded-md text-[13px] font-extrabold ${getNotaChip(u.nota)}`}>
                      {u.nota ?? '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getBadgeColor(u.estado)}`}>
                      {u.estado === 'no_cursado' ? 'Sin cursar' : u.estado}
                    </span>
                  </td>
                </tr>
                {abiertaFila && (
                  <tr>
                    <td colSpan={4} className="p-0 border-t border-dashed border-slate-200">
                      <DetalleUnidad u={u} cicloTitulo={ciclo.titulo} oficial={oficial} getNotaChip={getNotaChip} getBadgeColor={getBadgeColor} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={`${oficial ? 'bg-slate-100 border-t border-slate-300' : 'bg-gradient-to-r from-primary/10 via-cyan-50 to-fuchsia-50 border-t-2 border-primary/20'}`}>
            <td colSpan={2} className={`px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] ${oficial ? 'text-slate-600' : 'text-primary-dark'}`}>
              Promedio del ciclo
            </td>
            <td className="px-2 py-2.5 text-center">
              <span className={`text-sm font-extrabold ${ciclo.promedio != null ? (ciclo.promedio >= NOTA_MIN_APROBAR ? 'text-emerald-700' : 'text-red-600') : 'text-slate-400'}`}>
                {ciclo.promedio != null ? ciclo.promedio.toFixed(2) : 'S/N'}
              </span>
            </td>
            <td className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">
              {ciclo.creditos_aprobados ?? 0}/{ciclo.creditos_ciclo ?? 0} cr.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function StudentSearchBar({ searchTerm, setSearchTerm, filteredStudents, showDropdown, onSelect, searchLoading, recentStudents, setShowDropdown, onRemoveRecent }) {
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort?.(); } catch { /* noop */ }
    };
  }, []);

  const handleVoiceSearch = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceMsg('Búsqueda por voz no disponible en este dispositivo.');
        return;
      }
      // Si ya está escuchando, cancelar (permite probar "cancelar reconocimiento")
      if (listening && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* noop */ }
        return;
      }
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-PE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setVoiceMsg('Escuchando...');
      };
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript || '';
        if (text.trim()) {
          // Reutiliza el MISMO searchTerm del buscador existente:
          // el useEffect de filtrado (DNI, código, nombres, apellidos) reacciona solo.
          setSearchTerm(text.trim());
          setVoiceMsg('');
        } else {
          setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
        }
      };
      recognition.onerror = (event) => {
        const err = event?.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setVoiceMsg('Permiso de micrófono denegado.');
        } else if (err === 'no-speech' || err === 'audio-capture' || err === 'no-match') {
          setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
        } else if (err === 'aborted') {
          setVoiceMsg('');
        } else {
          setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
        }
        setListening(false);
      };
      recognition.onend = () => {
        setListening(false);
        setVoiceMsg((prev) => (prev === 'Escuchando...' ? '' : prev));
      };

      recognition.start();
    } catch {
      // No romper nunca el buscador escrito
      setListening(false);
      setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
    }
  };
  const showRecent = showDropdown && searchTerm.length === 0 && recentStudents.length > 0;
  const showResults = showDropdown && searchTerm.length >= 3;

  return (
    <div className="relative">
      <div className="bg-white border border-slate-200 rounded-md flex items-center gap-2 px-4 py-2 shadow-sm">
        <span className="px-1 text-slate-400 text-lg">🔍</span>
        <input
          type="text"
          className="w-full bg-transparent border-none focus:ring-0 py-1.5 text-slate-700 placeholder-slate-400 outline-none text-sm"
          placeholder="Buscar estudiante por DNI, nombre, apellido o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown?.(true)}
        />
        {searchLoading && <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div>}
        <button
          type="button"
          onClick={handleVoiceSearch}
          aria-label="Buscar estudiante por voz"
          title={listening ? 'Escuchando... pulsa para cancelar' : 'Buscar estudiante por voz'}
          className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border transition-colors cursor-pointer ${
            listening
              ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
              : 'border-slate-200 text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5'
          }`}
        >
          {listening && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-30 animate-ping"></span>
          )}
          <svg className="relative w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>
      {(voiceMsg || listening) && (
        <p className={`mt-1.5 ml-1 text-xs font-medium flex items-center gap-1.5 ${listening ? 'text-red-600' : 'text-slate-500'}`} role="status" aria-live="polite">
          {listening && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
          {voiceMsg || 'Escuchando...'}
        </p>
      )}

      {showRecent && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <p className="px-4 pt-3 pb-1 text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Consultados recientemente</p>
          {recentStudents.map((student) => (
            <div
              key={student.id}
              className="w-full flex items-center gap-2 pl-4 pr-2 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <button
                onClick={() => onSelect(student)}
                className="flex-1 text-left cursor-pointer"
              >
                <p className="font-semibold text-slate-800 text-sm">{student.apellidos}, {student.nombres}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Cód: {student.codigo_estudiante}</p>
              </button>
              <button
                type="button"
                onClick={(e) => onRemoveRecent?.(e, student.id)}
                aria-label="Eliminar de recientes"
                title="Eliminar de recientes"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showResults && filteredStudents.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredStudents.map((student) => (
            <button
              key={student.id}
              onClick={() => onSelect(student)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
            >
              <p className="font-semibold text-slate-800 text-sm">{student.apellidos}, {student.nombres}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Cód: {student.codigo_estudiante} · DNI: {student.dni}</p>
            </button>
          ))}
        </div>
      )}
      {showResults && searchTerm.length >= 3 && filteredStudents.length === 0 && !searchLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-4 text-center">
          <p className="text-slate-400 text-sm">No se encontraron estudiantes con "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
