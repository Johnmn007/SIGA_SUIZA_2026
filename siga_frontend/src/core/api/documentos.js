// Subida y apertura de documentos (sílabos, planes de trabajo) guardados en la base de datos.
import { apiClient, API_BASE } from './client';

export const MAX_DOCUMENTO_MB = 8;

const leerComoBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',', 2)[1] || '');
  reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  reader.readAsDataURL(file);
});

// Sube el archivo y devuelve la URL con la que queda registrado (archivo_url).
export async function subirDocumento(file) {
  if (!file) throw new Error('Seleccione un archivo.');
  if (file.size > MAX_DOCUMENTO_MB * 1024 * 1024) {
    throw new Error(`El archivo supera el máximo de ${MAX_DOCUMENTO_MB} MB.`);
  }
  const contenido_base64 = await leerComoBase64(file);
  const res = await apiClient.request('/api/mod-programas-estudio/archivos', {
    method: 'POST',
    body: JSON.stringify({ nombre: file.name, content_type: file.type, contenido_base64 }),
  });
  return res.url;
}

// Documentos registrados antes de que existiera la subida real: solo tienen un nombre, no el archivo.
export const esDocumentoReal = (url) => typeof url === 'string' && url.startsWith('/api/');

// Abre el documento en una pestaña nueva usando la sesión actual (el servidor exige el token).
export async function abrirDocumento(url) {
  if (!esDocumentoReal(url)) {
    throw new Error('Este documento se registró antes de que el sistema guardara los archivos. Pida al docente que lo vuelva a subir.');
  }
  // La pestaña se abre de inmediato (dentro del clic) para que el navegador no la bloquee.
  const ventana = window.open('', '_blank');
  try {
    const token = localStorage.getItem('token');
    const resp = await fetch(`${API_BASE}${url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) {
      let detalle = `No se pudo abrir el documento (error ${resp.status}).`;
      try { detalle = (await resp.json()).detail || detalle; } catch { /* sin detalle */ }
      throw new Error(detalle);
    }
    const blobUrl = URL.createObjectURL(await resp.blob());
    if (ventana) {
      ventana.location.href = blobUrl;
    } else {
      // Ventanas emergentes bloqueadas: se descarga sin salir del sistema.
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = url.split('/').pop() || 'documento';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
  } catch (err) {
    if (ventana) ventana.close();
    throw err;
  }
}
