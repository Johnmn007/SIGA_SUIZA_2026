import { useEffect, useRef, useState } from 'react';
import { crearDictadoNavegador, hayDictadoNavegador } from './dictadoNavegador';
import { crearDictadoLocal } from './dictadoLocal';

const CLAVE_LOCAL = 'siga_voz_local';

const MENSAJES = {
  'not-allowed': 'Permiso de micrófono denegado. Actívalo en el candado de la barra de direcciones y vuelve a intentarlo.',
  'audio-capture': 'No se detectó ningún micrófono. Conecta uno y vuelve a intentarlo.',
  'no-speech': 'No se escuchó nada. Pulsa el micrófono y di el nombre, apellido, DNI o código.',
  'no-match': 'No se entendió lo dictado. Inténtalo de nuevo hablando más despacio.',
};
const SIN_VOZ = MENSAJES['no-speech'];
// Errores que dependen del micrófono o de quien habla: cambiar de motor no los arregla.
const ERRORES_DEL_USUARIO = new Set(Object.keys(MENSAJES));

const leerPreferenciaLocal = () => {
  try { return sessionStorage.getItem(CLAVE_LOCAL) === '1'; } catch { return false; }
};
const guardarPreferenciaLocal = () => {
  try { sessionStorage.setItem(CLAVE_LOCAL, '1'); } catch { /* noop */ }
};

/**
 * Dictado por voz. En Chrome/Edge usa el reconocimiento del navegador; en Brave, Firefox,
 * Opera o si ese servicio falla, usa el motor local (Whisper dentro del navegador).
 * onTexto(texto): se llama en vivo mientras la persona habla. onFinal(texto): al terminar.
 */
export function useDictado({ onTexto, onFinal }) {
  const [escuchando, setEscuchando] = useState(false);
  const [estado, setEstado] = useState('');
  const [esError, setEsError] = useState(false);
  const motorRef = useRef(null);
  const callbacks = useRef({ onTexto, onFinal });
  useEffect(() => { callbacks.current = { onTexto, onFinal }; });
  useEffect(() => () => motorRef.current?.cancelar(), []);

  const mostrar = (mensaje, error = false) => { setEstado(mensaje); setEsError(error); };

  const terminar = (texto) => {
    setEscuchando(false);
    motorRef.current = null;
    if (texto && texto.trim()) {
      mostrar('');
      callbacks.current.onFinal?.(texto.trim());
    } else {
      mostrar(SIN_VOZ, true);
    }
  };

  const arrancarLocal = () => {
    const motor = crearDictadoLocal({
      onTexto: (t) => callbacks.current.onTexto?.(t),
      onFinal: terminar,
      onEstado: (m) => mostrar(m),
      onError: (m) => { setEscuchando(false); motorRef.current = null; mostrar(m, true); },
    });
    motorRef.current = motor;
    setEscuchando(true);
    motor.iniciar();
  };

  const arrancarNavegador = () => {
    const motor = crearDictadoNavegador({
      onTexto: (t) => callbacks.current.onTexto?.(t),
      onFinal: terminar,
      onEstado: (m) => mostrar(m),
      onError: (codigo) => {
        // Solo los problemas del micrófono o de la persona se informan; cualquier otro fallo
        // del servicio del navegador (red, Brave, servicio no disponible...) pasa al motor local.
        if (!ERRORES_DEL_USUARIO.has(codigo)) {
          console.warn(`Dictado del navegador falló (${codigo}); usando el motor de voz local.`);
          guardarPreferenciaLocal();
          mostrar('El dictado del navegador no está disponible; activando el motor de voz local...');
          arrancarLocal();
          return;
        }
        setEscuchando(false);
        motorRef.current = null;
        mostrar(MENSAJES[codigo], true);
      },
    });
    motorRef.current = motor;
    setEscuchando(true);
    motor.iniciar();
  };

  const alternar = () => {
    if (escuchando) {
      motorRef.current?.detener();
      return;
    }
    mostrar('');
    const usarLocal = !hayDictadoNavegador() || Boolean(navigator.brave) || leerPreferenciaLocal();
    if (usarLocal) arrancarLocal();
    else arrancarNavegador();
  };

  return { escuchando, estado, esError, alternar };
}
