import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import {
  CARRUSEL_AUTOPLAY_MS,
  IMAGEN_POR_DEFECTO,
  getCarreraImagenes,
} from './carrerasImagenes';

/**
 * Carrusel de imágenes de una carrera.
 *
 * Se inserta como primer elemento dentro de la tarjeta del programa y se
 * ("sangra") hasta los bordes usando márgenes negativos, de modo que el
 * `p-6` y el resto del contenido de la tarjeta quedan intactos.
 *
 * @param {string} nombreCarrera Nombre del programa de estudio (viene del backend).
 * @param {string} className     Clases extra para el bloque completo.
 */
export function CareerCarousel({ nombreCarrera, className = '' }) {
  const imagenes = useMemo(() => getCarreraImagenes(nombreCarrera), [nombreCarrera]);
  const total = imagenes.length;

  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [errores, setErrores] = useState({});
  const [defaultRoto, setDefaultRoto] = useState(false);
  const [carreraPrevia, setCarreraPrevia] = useState(nombreCarrera);

  // Si cambia la carrera, el carrusel vuelve al primer slide.
  if (carreraPrevia !== nombreCarrera) {
    setCarreraPrevia(nombreCarrera);
    setIndice(0);
    setErrores({});
    setDefaultRoto(false);
  }

  // Autoplay (3-4 s). Se detiene al pasar el mouse o al enfocar con teclado.
  useEffect(() => {
    if (pausado || total < 2) return undefined;
    const timer = setInterval(() => {
      setIndice(prev => (prev + 1) % total);
    }, CARRUSEL_AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [pausado, total]);

  const irA = useCallback((nuevo) => {
    setIndice((nuevo % total + total) % total);
  }, [total]);

  const anterior = useCallback(() => irA(indice - 1), [irA, indice]);
  const siguiente = useCallback(() => irA(indice + 1), [irA, indice]);

  // Navegación con teclado cuando el carrusel tiene el foco.
  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
  }, [anterior, siguiente]);

  // Si una imagen no carga se sustituye por la imagen por defecto.
  // Si tampoco existe la imagen por defecto, se muestra un bloque neutro.
  const manejarError = useCallback((i) => {
    setErrores(prev => (prev[i] ? prev : { ...prev, [i]: true }));
  }, []);

  const manejarErrorDefault = useCallback(() => {
    setDefaultRoto(true);
  }, []);

  const srcDe = useCallback(
    (i) => (errores[i] ? IMAGEN_POR_DEFECTO : imagenes[i]),
    [errores, imagenes]
  );

  return (
    <div className={`-mx-6 -mt-6 mb-5 ${className}`}>
      <div
        role="group"
        aria-roledescription="carrusel"
        aria-label={`Galería de imágenes de ${nombreCarrera}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        onFocus={() => setPausado(true)}
        onBlur={() => setPausado(false)}
        className="relative h-40 sm:h-44 w-full overflow-hidden rounded-t-2xl border-b border-slate-200/80 bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
      >
        {/* Pista de slides */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${indice * 100}%)` }}
        >
          {imagenes.map((_, i) => {
            const src = srcDe(i);

            return (
              <div key={i} className="h-full w-full min-w-0 flex-shrink-0">
                {defaultRoto ? (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-300">
                    <ImageOff size={28} />
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={`${nombreCarrera} — imagen ${i + 1} de ${total}`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onError={errores[i] ? manejarErrorDefault : () => manejarError(i)}
                    className="h-full w-full object-cover select-none"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Velo inferior para que los indicadores resalten sobre cualquier foto */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-900/45 via-slate-900/10 to-transparent"
        />

        {/* Flechas */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/85 hover:bg-white text-slate-800 shadow-sm border border-slate-200/80 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={siguiente}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/85 hover:bg-white text-slate-800 shadow-sm border border-slate-200/80 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Indicadores */}
        {total > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {imagenes.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irA(i)}
                aria-label={`Ir a la imagen ${i + 1}`}
                aria-current={i === indice}
                className={`h-1.5 rounded-full border border-white/70 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                  i === indice
                    ? 'w-5 bg-white shadow-sm'
                    : 'w-1.5 bg-white/55 hover:bg-white/85'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CareerCarousel;
