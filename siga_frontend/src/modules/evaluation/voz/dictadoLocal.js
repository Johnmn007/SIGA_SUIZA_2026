// Dictado con el motor local (Whisper en un Web Worker). Funciona en Brave, Firefox, Opera, etc.
// Graba el micrófono, va transcribiendo mientras la persona habla y se detiene solo al callar.

const FRECUENCIA = 16000;          // Whisper trabaja a 16 kHz
const UMBRAL_VOZ = 0.012;          // energía mínima para considerar que alguien habla
const SILENCIO_FIN_MS = 1700;      // silencio tras hablar que termina el dictado
const ESPERA_SIN_VOZ_MS = 9000;    // si nadie habla en este tiempo, se cancela
const MAXIMO_MS = 25000;           // duración máxima de un dictado
const INTERVALO_VIVO_MS = 1200;    // cada cuánto se actualiza el texto en vivo
const VIVO_LENTO_MS = 2000;        // si un parcial tarda más, se dejan de pedir parciales

// Frases que Whisper "inventa" con silencio o ruido (entrenado con subtítulos de videos).
const ALUCINACIONES = [
  /subt[ií]tulos? (realizados? )?por la comunidad de amara\.org/gi,
  /subt[ií]tulos? por .*$/gi,
  /gracias por ver(lo| el video)?\.?/gi,
  /¡?suscr[ií]bete.*$/gi,
  /\[(m[uú]sica|aplausos|risas|silencio)\]/gi,
  /\((m[uú]sica|aplausos|risas)\)/gi,
];

export function limpiarTranscripcion(texto) {
  let t = String(texto || '');
  for (const r of ALUCINACIONES) t = t.replace(r, ' ');
  return t.replace(/\s+/g, ' ').replace(/^[\s.,;:¡!¿?-]+|[\s.,;:¡!¿?-]+$/g, '').trim();
}

let worker = null;
let secuencia = 0;
const pendientes = new Map();
let oyentesProgreso = new Set();
let modeloListo = false;
let equipoLento = false; // se recuerda mientras la página siga abierta

function obtenerWorker() {
  if (!worker) {
    worker = new Worker(new URL('./vozWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.tipo === 'progreso') oyentesProgreso.forEach((f) => f(data.porcentaje));
      if (data.tipo === 'listo') { modeloListo = true; pendientes.get('carga')?.resolve(); pendientes.delete('carga'); }
      if (data.tipo === 'texto') { pendientes.get(data.id)?.resolve(data.texto); pendientes.delete(data.id); }
      if (data.tipo === 'error') {
        const clave = data.id ?? 'carga';
        pendientes.get(clave)?.reject(new Error(data.mensaje));
        pendientes.delete(clave);
      }
    };
    worker.onerror = (e) => {
      pendientes.forEach((p) => p.reject(new Error(e.message || 'Error en el motor de voz')));
      pendientes.clear();
      worker = null;
      modeloListo = false;
    };
  }
  return worker;
}

function cargarModelo() {
  if (modeloListo) return Promise.resolve();
  if (pendientes.has('carga')) return pendientes.get('carga').promesa;
  let resolve; let reject;
  const promesa = new Promise((res, rej) => { resolve = res; reject = rej; });
  pendientes.set('carga', { resolve, reject, promesa });
  obtenerWorker().postMessage({ tipo: 'cargar' });
  return promesa;
}

function transcribir(audio) {
  const id = ++secuencia;
  return new Promise((resolve, reject) => {
    pendientes.set(id, { resolve, reject });
    obtenerWorker().postMessage({ tipo: 'transcribir', id, audio }, [audio.buffer]);
  });
}

// Une los fragmentos grabados y los lleva a 16 kHz si el navegador grabó a otra frecuencia.
function unirAudio(trozos, frecuenciaOrigen) {
  const largo = trozos.reduce((a, t) => a + t.length, 0);
  const junto = new Float32Array(largo);
  let pos = 0;
  for (const t of trozos) { junto.set(t, pos); pos += t.length; }
  if (frecuenciaOrigen === FRECUENCIA) return junto;
  const factor = frecuenciaOrigen / FRECUENCIA;
  const salida = new Float32Array(Math.floor(junto.length / factor));
  for (let i = 0; i < salida.length; i++) {
    const x = i * factor; const i0 = Math.floor(x); const i1 = Math.min(i0 + 1, junto.length - 1);
    salida[i] = junto[i0] + (junto[i1] - junto[i0]) * (x - i0);
  }
  return salida;
}

/**
 * Crea un dictado local.
 * onTexto(texto): texto parcial mientras se habla · onFinal(texto): resultado al terminar
 * onEstado(mensaje): mensajes para el usuario · onError(mensaje): error definitivo
 */
export function crearDictadoLocal({ onTexto, onFinal, onEstado, onError }) {
  let stream = null; let ctx = null; let fuente = null; let procesador = null;
  let trozos = []; let frecuencia = FRECUENCIA;
  let hablo = false; let inicio = 0; let ultimoSonido = 0;
  let reloj = null; let vivo = null; let ocupado = false; let largoTranscrito = 0;
  let activo = false; let terminando = false;
  const alProgreso = (p) => { if (!modeloListo) onEstado?.(`Cargando el motor de voz: ${p}% (la primera vez se descarga y tarda más)`); };

  const liberar = () => {
    clearInterval(reloj); clearInterval(vivo);
    try { procesador?.disconnect(); fuente?.disconnect(); } catch { /* noop */ }
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close().catch(() => {});
    oyentesProgreso.delete(alProgreso);
    stream = null; ctx = null; fuente = null; procesador = null;
  };

  const transcribirVivo = async () => {
    // En equipos lentos los parciales harían esperar al resultado final: se omiten.
    if (!modeloListo || ocupado || !hablo || !activo || equipoLento) return;
    const largo = trozos.reduce((a, t) => a + t.length, 0);
    if (largo === largoTranscrito) return;
    ocupado = true;
    largoTranscrito = largo;
    const t0 = performance.now();
    try {
      const texto = limpiarTranscripcion(await transcribir(unirAudio(trozos, frecuencia)));
      if (activo && texto) onTexto?.(texto);
    } catch { /* el texto final lo reintenta */ }
    if (performance.now() - t0 > VIVO_LENTO_MS) equipoLento = true;
    ocupado = false;
  };

  const detener = async () => {
    if (!activo || terminando) return;
    terminando = true;
    activo = false;
    liberar();
    if (!hablo) { onFinal?.(''); return; }
    onEstado?.('Transcribiendo lo que dijiste...');
    try {
      await cargarModelo();
      const texto = limpiarTranscripcion(await transcribir(unirAudio(trozos, frecuencia)));
      onFinal?.(texto);
    } catch (e) {
      onError?.(`No se pudo transcribir: ${e.message}`);
    }
  };

  const iniciar = async () => {
    if (activo) return;
    activo = true; terminando = false; trozos = []; hablo = false; largoTranscrito = 0;
    oyentesProgreso.add(alProgreso);
    onEstado?.(modeloListo ? 'Escuchando... habla ahora.' : 'Preparando el motor de voz...');
    cargarModelo()
      .then(() => { if (activo) onEstado?.('Escuchando... habla ahora.'); })
      .catch((e) => { if (activo) { activo = false; liberar(); onError?.(`No se pudo cargar el motor de voz: ${e.message}. Revisa tu conexión a internet.`); } });
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      activo = false; liberar();
      onError?.(e?.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado. Actívalo en el candado de la barra de direcciones y vuelve a intentarlo.'
        : 'No se encontró un micrófono disponible.');
      return;
    }
    const Contexto = window.AudioContext || window.webkitAudioContext;
    try { ctx = new Contexto({ sampleRate: FRECUENCIA }); } catch { ctx = new Contexto(); }
    await ctx.resume().catch(() => {});
    frecuencia = ctx.sampleRate;
    fuente = ctx.createMediaStreamSource(stream);
    procesador = ctx.createScriptProcessor(4096, 1, 1);
    procesador.onaudioprocess = (ev) => {
      if (!activo) return;
      const datos = new Float32Array(ev.inputBuffer.getChannelData(0));
      trozos.push(datos);
      let suma = 0;
      for (let i = 0; i < datos.length; i++) suma += datos[i] * datos[i];
      if (Math.sqrt(suma / datos.length) > UMBRAL_VOZ) { hablo = true; ultimoSonido = Date.now(); }
    };
    fuente.connect(procesador);
    procesador.connect(ctx.destination);
    inicio = Date.now(); ultimoSonido = inicio;
    reloj = setInterval(() => {
      const ahora = Date.now();
      if (hablo && ahora - ultimoSonido > SILENCIO_FIN_MS && modeloListo) detener();
      else if (!hablo && ahora - inicio > ESPERA_SIN_VOZ_MS) detener();
      else if (ahora - inicio > MAXIMO_MS) detener();
    }, 250);
    vivo = setInterval(transcribirVivo, INTERVALO_VIVO_MS);
  };

  return { iniciar, detener, cancelar: () => { activo = false; terminando = true; liberar(); } };
}
