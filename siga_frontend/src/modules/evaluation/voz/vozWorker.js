// Worker del motor de voz local: transcribe audio en español con Whisper dentro del navegador.
// No depende del servicio de Google (bloqueado en Brave). El modelo se descarga una sola vez
// desde Hugging Face y el navegador lo guarda en caché.
const LIBRERIA = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const MODELO = 'onnx-community/whisper-base';
// Tamaño de los archivos del modelo (encoder + decoder q8), para un porcentaje que no retroceda
// aunque los archivos se descarguen uno detrás de otro.
const BYTES_MODELO = 23201314 + 53693315;

let transcriptorPromesa = null;

function cargarTranscriptor() {
  if (!transcriptorPromesa) {
    transcriptorPromesa = (async () => {
      const { pipeline, env } = await import(/* @vite-ignore */ LIBRERIA);
      env.allowLocalModels = false;
      const progreso = {};
      let ultimo = 0;
      return pipeline('automatic-speech-recognition', MODELO, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p) => {
          if (p.status !== 'progress' || !p.file) return;
          progreso[p.file] = p.loaded || 0;
          const cargado = Object.values(progreso).reduce((a, b) => a + b, 0);
          ultimo = Math.max(ultimo, Math.min(99, Math.round((cargado / BYTES_MODELO) * 100)));
          self.postMessage({ tipo: 'progreso', porcentaje: ultimo });
        },
      });
    })().catch((e) => {
      transcriptorPromesa = null; // permite reintentar
      throw e;
    });
  }
  return transcriptorPromesa;
}

self.onmessage = async ({ data }) => {
  try {
    if (data.tipo === 'cargar') {
      await cargarTranscriptor();
      self.postMessage({ tipo: 'listo' });
      return;
    }
    if (data.tipo === 'transcribir') {
      const transcriptor = await cargarTranscriptor();
      const salida = await transcriptor(data.audio, { language: 'spanish', task: 'transcribe' });
      self.postMessage({ tipo: 'texto', id: data.id, texto: (salida?.text || '').trim() });
    }
  } catch (e) {
    self.postMessage({ tipo: 'error', id: data.id, mensaje: e?.message || String(e) });
  }
};
