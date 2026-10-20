import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileJson,
  FileSpreadsheet,
  GitBranch,
  Handshake,
  Lock,
  QrCode,
  RefreshCw,
  Repeat,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react';
import { SectionInfoBlock } from './SectionInfoBlock';

const TONES = {
  green: { card: 'border-emerald-200 bg-emerald-50/70', chip: 'bg-emerald-600', text: 'text-emerald-900' },
  blue: { card: 'border-sky-200 bg-sky-50/70', chip: 'bg-sky-600', text: 'text-sky-900' },
  violet: { card: 'border-violet-200 bg-violet-50/70', chip: 'bg-violet-600', text: 'text-violet-900' },
  orange: { card: 'border-orange-200 bg-orange-50/70', chip: 'bg-orange-600', text: 'text-orange-900' },
  pink: { card: 'border-pink-200 bg-pink-50/70', chip: 'bg-pink-600', text: 'text-pink-900' },
  amber: { card: 'border-amber-200 bg-amber-50/70', chip: 'bg-amber-600', text: 'text-amber-900' },
  red: { card: 'border-red-200 bg-red-50/70', chip: 'bg-red-600', text: 'text-red-900' },
  slate: { card: 'border-slate-200 bg-slate-50/80', chip: 'bg-slate-800', text: 'text-slate-900' },
};

function BlockHeader({ number, title, icon: Icon, tone = 'slate' }) {
  const chip = TONES[tone].chip;
  return (
    <header className="flex items-center gap-3 bg-slate-800 px-5 py-3.5 text-white">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-extrabold tabular-nums">
        {number}
      </span>
      <Icon className="h-5 w-5 shrink-0 text-sky-300" />
      <h4 className="text-[13px] font-extrabold uppercase leading-tight tracking-wide">{title}</h4>
      <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chip }} />
    </header>
  );
}

function Block({ number, title, icon: Icon, tone = 'slate', children, className = '' }) {
  return (
    <section className={`flex flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-glass ${className}`}>
      <BlockHeader number={number} title={title} icon={Icon} tone={tone} />
      <div className="flex flex-1 flex-col p-5">{children}</div>
    </section>
  );
}

function SubCard({ icon: Icon, title, tone = 'blue', meta, children }) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border p-4 ${t.card}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.chip} text-white`}>
          <Icon className="h-4 w-4" />
        </span>
        <h5 className={`text-xs font-extrabold uppercase tracking-wide ${t.text}`}>{title}</h5>
        {meta && <span className="ml-auto text-[10px] font-bold uppercase text-slate-400">{meta}</span>}
      </div>
      <p className={`text-xs leading-relaxed ${t.text} opacity-80`}>{children}</p>
    </div>
  );
}

function Bullets({ items, className = '' }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-600">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedSteps({ items, className = '' }) {
  return (
    <ol className={`space-y-2.5 ${className}`}>
      {items.map((item, i) => (
        <li key={item} className="flex gap-3 text-xs leading-relaxed text-slate-600">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-extrabold text-primary shadow-sm ring-1 ring-slate-200 tabular-nums">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function FlowDown({ label }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>}
      <ArrowDown className="h-5 w-5 text-primary/70" />
    </div>
  );
}

function FlowRight({ label }) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-1">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>}
      <ArrowRight className="h-5 w-5 shrink-0 text-primary/70" />
    </div>
  );
}

function Diamond({ children }) {
  return (
    <div className="relative mx-auto h-28 w-52 shrink-0">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-violet-800 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]" />
      <div className="absolute inset-0 flex items-center justify-center px-11">
        <p className="-translate-y-0.5 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white">
          {children}
        </p>
      </div>
    </div>
  );
}

function Branch({ label, tone, icon: Icon, children }) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border-2 p-3.5 ${t.card}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${t.chip} text-white`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={`text-[11px] font-extrabold uppercase tracking-widest ${t.text}`}>{label}</span>
      </div>
      <p className={`text-xs leading-relaxed ${t.text} opacity-80`}>{children}</p>
    </div>
  );
}

function Note({ icon: Icon = Sparkles, tone = 'violet', children }) {
  const t = TONES[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border-2 border-dashed p-3.5 ${t.card}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.text}`} />
      <p className={`text-[11px] font-semibold leading-relaxed ${t.text}`}>{children}</p>
    </div>
  );
}

function Restricciones() {
  const items = [
    'Máximo de créditos por ciclo según lo establecido en el plan de estudios vigente.',
    'El alumno con cursos a cargo no puede exceder el límite de unidades reprobadas admitidas.',
    'No se admite la matrícula en una unidad didáctica sin haber aprobado su prerrequisito.',
    'Una unidad didáctica no puede cursarse por tercera vez.',
  ];
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border-2 border-pink-200 bg-white shadow-glass">
      <header className="flex items-center gap-3 bg-pink-600 px-5 py-3.5 text-white">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <Lock className="h-4 w-4" />
        </span>
        <Coins className="h-5 w-5 shrink-0 text-pink-100" />
        <h4 className="text-[13px] font-extrabold uppercase leading-tight tracking-wide">
          Restricciones de Créditos
        </h4>
        <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Validación
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {items.map((item) => (
          <div key={item} className="flex gap-2.5 rounded-lg border border-pink-100 bg-pink-50/60 px-3 py-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-500" />
            <p className="text-xs leading-relaxed text-pink-900/80">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EnrollmentFlowDiagram() {
  return (
    <div className="animate-fade-in">
      <SectionInfoBlock
        icon={Workflow}
        ghostIcon={GitBranch}
        title="9. Diagrama de flujo"
        description={
          <>
            Visualiza el flujo general del proceso de matrícula desde la admisión hasta la validación
            y resultado final, según el tipo de alumno y sus condiciones académicas.
          </>
        }
        chips={['Admisión', 'Matrícula', 'Validación', 'Resultado']}
      />

      <div className="mt-6 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Block number="1" title="Admisión" icon={UserPlus} tone="slate" className="h-full">
            <div className="flex flex-wrap gap-1.5">
              {['FileSpreadsheet', 'FileJson'].map((name) => {
                const Icon = name === 'FileSpreadsheet' ? FileSpreadsheet : FileJson;
                return (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {name === 'FileSpreadsheet' ? 'Excel' : 'JSON'}
                  </span>
                );
              })}
            </div>
            <FlowDown />
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
              Se carga la relación de ingresantes al sistema en formato JSON o Excel.
            </p>
            <FlowDown />
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
              Matrícula de alumnos por primera vez de manera automática.
            </p>
            <FlowDown />
            <div className="mt-auto rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-2.5 text-center">
              <UserCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                Se genera la ficha
              </p>
            </div>
          </Block>
        </div>

        <div className="hidden items-center xl:col-span-1 xl:flex">
          <FlowRight />
        </div>

        <div className="xl:col-span-5">
          <Block number="2" title="Tipos de alumnos históricos" icon={Users} tone="violet" className="h-full">
            <div className="grid gap-3">
              <SubCard icon={UserCheck} title="A. Alumnos invictos" tone="green">
                Alumno que no ha reprobado ninguna unidad didáctica en toda su trayectoria.
                Mantiene un promedio acumulado no menor a 13 y se matricula de forma automática en
                el ciclo siguiente, sin cursos a cargo.
              </SubCard>
              <SubCard icon={BookOpen} title="B. Alumnos jalados (cursos a cargo)" tone="blue">
                Alumno con una o más unidades didácticas reprobadas. El sistema recupera su
                historial, identifica las unidades jaladas y las incorpora como cursos a cargo
                dentro de su nueva matrícula.
              </SubCard>
              <SubCard icon={Repeat} title="C. Alumnos históricos" tone="violet">
                Alumno que pertenece a un plan de estudios anterior al vigente. Se matricula según
                su plan de origen, validando la equivalencia de unidades y el cumplimiento de los
                créditos mínimos del ciclo.
              </SubCard>
            </div>
            <Note className="mt-3" icon={BookOpen}>
              El alumno jalado tiene derecho a llevar su curso a cargo (jala/arrastre).
            </Note>
          </Block>
        </div>

        <div className="hidden items-center xl:col-span-1 xl:flex">
          <FlowRight />
        </div>

        <div className="xl:col-span-2">
          <section className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-sky-200 bg-white shadow-glass">
            <header className="flex items-center gap-2.5 bg-sky-700 px-4 py-3 text-white">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <QrCode className="h-4 w-4" />
              </span>
              <h4 className="text-[12px] font-extrabold uppercase leading-tight tracking-wide">
                Boleta con QR
              </h4>
            </header>
            <div className="flex flex-1 flex-col justify-center gap-3 p-4">
              <NumberedSteps
                items={[
                  'El sistema emite la boleta con un código QR único por ciclo.',
                  'El alumno escanea el QR y visualiza su matrícula en tiempo real.',
                  'La secretaría escanea para validar y archivar el registro.',
                ]}
              />
            </div>
          </section>
        </div>
      </div>

      <div className="mt-2 flex justify-center">
        <FlowDown label=" Continúa al cálculo" />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <Block number="3" title="Determinación del ciclo y cursos" icon={CalendarDays} tone="blue">
          <div className="flex items-start gap-2.5 rounded-lg bg-sky-50 px-3 py-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p className="text-xs font-semibold text-sky-900">
              El sistema detecta automáticamente:
            </p>
          </div>
          <Bullets
            className="mt-2.5"
            items={[
              'El siguiente ciclo según el avance de su plan de estudios.',
              'Los cursos correspondientes a ese ciclo.',
            ]}
          />
          <FlowDown />
          <Diamond>¿Tiene cursos a cargo? (jalados / arrastre)</Diamond>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Branch label="Sí" tone="green" icon={CheckCircle2}>
              Se asignan los cursos a cargo según su historial académico.
            </Branch>
            <Branch label="No" tone="red" icon={GitBranch}>
              Se asignan los cursos del ciclo correspondiente.
            </Branch>
          </div>
        </Block>

        <Block number="4" title="Tipos de alumnos especiales" icon={Sparkles} tone="orange">
          <div className="grid gap-3">
            <div>
              <SubCard icon={RefreshCw} title="Reingresante" tone="orange" meta="4 condiciones">
                No alcanzó a concluir el ciclo, no superó el máximo de ciclos de su plan, registró
                la solicitud dentro del plazo y canceló la tasa de reinscripción vigente.
              </SubCard>
              <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {[
                  'Dejó la institución antes de concluir el ciclo en curso.',
                  'No superó el máximo de ciclos permitido por su plan.',
                  'Registró la solicitud dentro del plazo establecido.',
                  'Canceló la tasa de reinscripción vigente.',
                ].map((item, i) => (
                  <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-slate-600">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-orange-100 text-[9px] font-extrabold text-orange-700 tabular-nums">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                <h5 className="text-xs font-extrabold uppercase tracking-wide text-sky-900">
                  Traslado
                </h5>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-sky-100 bg-white/80 p-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                    Interno
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    Entre programas de la misma institución, con equivalencia curricular validada
                    por la dirección de estudios.
                  </p>
                </div>
                <div className="rounded-lg border border-sky-100 bg-white/80 p-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                    Externo
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    Desde otra institución, con carta de presentación, certificado de estudios y
                    convalidación de asignaturas.
                  </p>
                </div>
              </div>
            </div>

            <SubCard icon={Handshake} title="Estudiante de convenios" tone="green">
              Alumno procedente de una institución o programa con convenio vigente. Se matricula
              según el plan acordado, con las equivalencias y créditos definidos en el instrumento
              de cooperación.
            </SubCard>
          </div>
        </Block>
      </div>

      <div className="mt-2 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Restricciones />
        </div>
        <div className="hidden items-center xl:col-span-1 xl:flex">
          <FlowRight label=" Valida" />
        </div>
        <div className="xl:col-span-6">
          <section className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-slate-800 bg-white shadow-glass">
            <header className="flex items-center gap-3 bg-emerald-600 px-5 py-3.5 text-white">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <h4 className="text-[13px] font-extrabold uppercase leading-tight tracking-wide">
                Resultado final
              </h4>
              <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                5 pasos
              </span>
            </header>
            <div className="flex flex-1 flex-col justify-center p-5">
              <NumberedSteps
                items={[
                  'Se consolida la matrícula y se genera el registro académico del ciclo.',
                  'Se asignan códigos, horarios y docentes de cada unidad didáctica.',
                  'Se emite la boleta de matrícula con su código QR de validación.',
                  'Se notifica al estudiante y a la secretaría el cierre del proceso.',
                  'Se actualiza el historial académico y el avance de créditos del alumno.',
                ]}
              />
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-6 flex flex-col items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/70 px-5 py-3 text-center backdrop-blur-md sm:flex-row sm:text-left">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-700">
          SIGA
        </span>
        <span className="text-[11px] text-slate-500">
          Matrícula inteligente <span className="text-slate-300">•</span> Procesos automáticos{' '}
          <span className="text-slate-300">•</span> Información confiable
        </span>
      </footer>
    </div>
  );
}
