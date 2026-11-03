import { createPortal } from 'react-dom';

// Renderiza los modales sobre document.body: el panel usa animaciones con transform,
// que convierten a "position: fixed" en relativo al contenido en lugar de a la pantalla.
export function ModalPortal({ children }) {
  return createPortal(children, document.body);
}
