import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

// Mapeo canónico de las 11 carreras a sus 3 imágenes de referencia
const CAREER_IMAGES = {
  sistemas: [
    { src: '/carreras/sistemas_1.jpg', title: 'Laboratorio de Software y Redes', tag: 'Desarrollo & IA' },
    { src: '/carreras/sistemas_2.jpg', title: 'Programación Full-Stack & Cloud', tag: 'Cloud & Web' },
    { src: '/carreras/sistemas_3.jpg', title: 'Infraestructura y Gestión de Datos', tag: 'Bases de Datos & TI' }
  ],
  enfermeria: [
    { src: '/carreras/enfermeria_1.jpg', title: 'Cuidado y Atención Integral al Paciente', tag: 'Atención Primaria' },
    { src: '/carreras/enfermeria_2.jpg', title: 'Práctica Clínica Hospitalaria', tag: 'Cuidados Clínicos' },
    { src: '/carreras/enfermeria_3.jpg', title: 'Procedimientos y Salud Comunitaria', tag: 'Salud & Bienestar' }
  ],
  construccion: [
    { src: '/carreras/construccion_1.jpg', title: 'Planificación y Dirección de Obras', tag: 'Gestión de Obra' },
    { src: '/carreras/construccion_2.jpg', title: 'Estructuras y Edificaciones Modernas', tag: 'Diseño Estructural' },
    { src: '/carreras/construccion_3.jpg', title: 'Topografía y Mediciones de Terreno', tag: 'Topografía Digital' }
  ],
  contabilidad: [
    { src: '/carreras/contabilidad_1.jpg', title: 'Auditoría y Estados Financieros', tag: 'Finanzas & Balances' },
    { src: '/carreras/contabilidad_2.jpg', title: 'Análisis de Rentabilidad y Gestión Fiscal', tag: 'Gestión Tributaria' },
    { src: '/carreras/contabilidad_3.jpg', title: 'Sistemas Contables y Costos Empresariales', tag: 'Costos & Presupuestos' }
  ],
  mecanica: [
    { src: '/carreras/mecanica_1.jpg', title: 'Diagnóstico Electrónico Automotriz', tag: 'Escaneo & Sensores' },
    { src: '/carreras/mecanica_2.jpg', title: 'Mantenimiento y Reparación de Motores', tag: 'Motores & Sistemas' },
    { src: '/carreras/mecanica_3.jpg', title: 'Vehículos Híbridos y Nuevas Tecnologías', tag: 'Electromovilidad' }
  ],
  electricidad: [
    { src: '/carreras/electricidad_1.jpg', title: 'Tableros de Control y Automatización', tag: 'Automatización PLC' },
    { src: '/carreras/electricidad_2.jpg', title: 'Mantenimiento de Redes de Fuerza', tag: 'Fuerza & Control' },
    { src: '/carreras/electricidad_3.jpg', title: 'Instalaciones Industriales y Transformadores', tag: 'Energía & Potencia' }
  ],
  agropecuaria: [
    { src: '/carreras/agropecuaria_1.jpg', title: 'Cultivos Protegidos y Agroecología', tag: 'Producción Agrícola' },
    { src: '/carreras/agropecuaria_2.jpg', title: 'Mecanización y Cosecha Tecnificada', tag: 'Maquinaria Agraria' },
    { src: '/carreras/agropecuaria_3.jpg', title: 'Manejo Pecuario y Ganadería Sostenible', tag: 'Sanidad Animal' }
  ],
  forestal: [
    { src: '/carreras/forestal_1.jpg', title: 'Conservación de Bosques Amazónicos', tag: 'Biodiversidad & Selva' },
    { src: '/carreras/forestal_2.jpg', title: 'Inventario y Aprovechamiento Sostenible', tag: 'Gestión Silvícola' },
    { src: '/carreras/forestal_3.jpg', title: 'Reforestación y Viveros Forestales', tag: 'Ecología Forestal' }
  ],
  turismo: [
    { src: '/carreras/turismo_1.jpg', title: 'Gestión de Hotelería y Destinos Turísticos', tag: 'Hotelería & Servicios' },
    { src: '/carreras/turismo_2.jpg', title: 'Ecoturismo y Circuitos de Aventura', tag: 'Turismo Sostenible' },
    { src: '/carreras/turismo_3.jpg', title: 'Operación de Agencias y Guías de Turismo', tag: 'Operaciones & Rutas' }
  ],
  asistencia_admin: [
    { src: '/carreras/asistencia_admin_1.jpg', title: 'Gestión Documental y Asistencia Ejecutiva', tag: 'Gestión Ejecutiva' },
    { src: '/carreras/asistencia_admin_2.jpg', title: 'Organización de Archivos y Correspondencia', tag: 'Flujo Corporativo' },
    { src: '/carreras/asistencia_admin_3.jpg', title: 'Atención al Público y Protocolo Institucional', tag: 'Relaciones Públicas' }
  ],
  gestion_admin: [
    { src: '/carreras/gestion_admin_1.jpg', title: 'Liderazgo y Gestión de Equipos de Trabajo', tag: 'Estrategia Empresarial' },
    { src: '/carreras/gestion_admin_2.jpg', title: 'Planificación de Proyectos y Negocios', tag: 'Gestión Estratégica' },
    { src: '/carreras/gestion_admin_3.jpg', title: 'Toma de Decisiones y Dirección Corporativa', tag: 'Administración Global' }
  ]
};

// Función auxiliar para detectar la clave de carrera a partir del nombre
function getCareerImageKey(programName = '') {
  const norm = programName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('sistema') || norm.includes('computacion') || norm.includes('informacion')) return 'sistemas';
  if (norm.includes('enferm')) return 'enfermeria';
  if (norm.includes('construc') || norm.includes('civil')) return 'construccion';
  if (norm.includes('contab')) return 'contabilidad';
  if (norm.includes('meca') || norm.includes('automot') || norm.includes('motor')) return 'mecanica';
  if (norm.includes('electr')) return 'electricidad';
  if (norm.includes('agro') || norm.includes('pecuar')) return 'agropecuaria';
  if (norm.includes('forest') || norm.includes('madera')) return 'forestal';
  if (norm.includes('turis') || norm.includes('hotel')) return 'turismo';
  if (norm.includes('asist') && norm.includes('admin')) return 'asistencia_admin';
  if (norm.includes('gest') && norm.includes('admin')) return 'gestion_admin';
  if (norm.includes('admin')) return 'gestion_admin';
  return 'sistemas'; // fallback por defecto
}

export function CareerCarousel({ programName, className = '' }) {
  const careerKey = getCareerImageKey(programName);
  const slides = CAREER_IMAGES[careerKey] || CAREER_IMAGES.sistemas;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState({});
  const timerRef = useRef(null);

  // Auto-play cada 4 segundos si no está pausado con el mouse encima
  useEffect(() => {
    if (!isHovered) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % slides.length);
      }, 4200);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, slides.length]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % slides.length);
  };

  const handleDotClick = (e, index) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const currentSlide = slides[currentIndex];

  return (
    <div 
      className={`relative w-full h-44 overflow-hidden rounded-xl bg-slate-900 select-none group/carousel shadow-inner ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides con transición suave */}
      {slides.map((slide, idx) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {!imgError[slide.src] ? (
            <img
              src={slide.src}
              alt={slide.title}
              onError={() => setImgError(prev => ({ ...prev, [slide.src]: true }))}
              className="w-full h-full object-cover transform scale-100 group-hover/carousel:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4 text-center">
              <span className="text-xs text-slate-300 font-medium">{slide.title}</span>
            </div>
          )}
        </div>
      ))}

      {/* Degradado para legibilidad del texto y controles */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

      {/* Badge superior contador 1/3, 2/3, 3/3 */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/10 shadow-sm pointer-events-none">
        <span>{currentIndex + 1}</span>
        <span className="text-white/40">/</span>
        <span className="text-white/60">{slides.length}</span>
      </div>

      {/* Tag temático de la foto activa */}
      <div className="absolute bottom-2.5 left-2.5 right-14 z-30 pointer-events-none">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white border border-white/20 mb-1">
          <Sparkles size={10} className="text-amber-300" />
          {currentSlide.tag}
        </span>
        <p className="text-[11px] font-medium text-slate-100 truncate drop-shadow-sm">
          {currentSlide.title}
        </p>
      </div>

      {/* Botones Anterior / Siguiente (visibles al hover o en pantallas táctiles) */}
      <button
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all duration-200 opacity-0 group-hover/carousel:opacity-100 border border-white/15 cursor-pointer hover:scale-110 active:scale-95"
        title="Imagen anterior"
        aria-label="Anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all duration-200 opacity-0 group-hover/carousel:opacity-100 border border-white/15 cursor-pointer hover:scale-110 active:scale-95"
        title="Siguiente imagen"
        aria-label="Siguiente"
      >
        <ChevronRight size={16} />
      </button>

      {/* Indicadores de bolitas / barras clickeables */}
      <div className="absolute bottom-2.5 right-2.5 z-30 flex items-center gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => handleDotClick(e, idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              idx === currentIndex 
                ? 'w-4 h-1.5 bg-white shadow-sm' 
                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
            }`}
            title={`Ver imagen ${idx + 1}`}
            aria-label={`Ir a diapositiva ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
