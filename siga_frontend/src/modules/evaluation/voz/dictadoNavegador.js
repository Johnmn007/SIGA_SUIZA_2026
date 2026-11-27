// Dictado con el reconocimiento de voz del navegador (Chrome y Edge, vía servicio en la nube).
// Escribe en vivo todo lo que la persona dice y termina solo cuando se queda en silencio.

const SILENCIO_FIN_MS = 1800;
const ESPERA_SIN_VOZ_MS = 9000;


export function hayDictadoNavegador() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * onTexto(texto) parcial · onFinal(texto) al terminar · onEstado(mensaje)
 * onError(codigo) con el código de error del navegador (p. ej. 'network', 'not-allowed').
 */
export function crearDictadoNavegador({ onTexto, onFinal, onEstado, onError }) {
  const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null; let activo = false; let fallo = false;
  let finalTexto = ''; let textoActual = ''; let silencio = null; let sinVoz = null;

  const limpiarRelojes = () => { clearTimeout(silencio); clearTimeout(sinVoz); };

  const detener = () => {
    if (!rec) return;
    limpiarRelojes();
    try { rec.stop(); } catch { /* noop */ }
  };

  const iniciar = () => {
    if (activo) return;
    activo = true; fallo = false; finalTexto = ''; textoActual = '';
    rec = new Reconocimiento();
    rec.lang = 'es-PE';
    rec.continuous = true;      // no se corta en la primera pausa
    rec.interimResults = true;  // texto en vivo mientras se habla
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      onEstado?.('Escuchando... habla ahora.');
      sinVoz = setTimeout(detener, ESPERA_SIN_VOZ_MS);
    };
    rec.onresult = (event) => {
      clearTimeout(sinVoz);
      let interino = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const fragmento = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalTexto += ` ${fragmento}`;
        else interino += ` ${fragmento}`;
      }
      textoActual = `${finalTexto} ${interino}`.replace(/\s+/g, ' ').trim();
      if (textoActual) onTexto?.(textoActual);
      clearTimeout(silencio);
      silencio = setTimeout(detener, SILENCIO_FIN_MS);
    };
    rec.onerror = (event) => {
      if (event?.error === 'aborted') return;
      fallo = true;
      limpiarRelojes();
      onError?.(event?.error || 'desconocido');
    };
    rec.onend = () => {
      limpiarRelojes();
      activo = false;
      rec = null;
      if (!fallo) onFinal?.(textoActual);
    };
    try {
      rec.start();
    } catch {
      activo = false; fallo = true;
      onError?.('desconocido');
    }
  };

  return {
    iniciar,
    detener,
    cancelar: () => { fallo = true; limpiarRelojes(); try { rec?.abort(); } catch { /* noop */ } },
  };
}
