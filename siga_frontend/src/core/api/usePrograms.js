import { useEffect, useState } from 'react';
import { apiClient } from './client';

/** Carreras registradas en Gestión Académica (las que se importan desde los planes MINEDU). */
// `recargar`: cambie su valor para volver a pedir la lista (p. ej. tras vincular un plan).
export function usePrograms(recargar = 0) {
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    let active = true;
    apiClient.request('/api/mod-programas-estudio/programas')
      .then((data) => {
        if (active) setPrograms(Array.isArray(data) ? data.filter((p) => p.estado !== 'inactivo') : []);
      })
      .catch((e) => console.error('No se pudieron cargar los programas de estudio:', e));
    return () => { active = false; };
  }, [recargar]);

  return programs;
}
