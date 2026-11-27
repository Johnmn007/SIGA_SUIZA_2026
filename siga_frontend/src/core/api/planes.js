// Vincula una carrera con su plan de estudios (mod-planes-estudio).
// Las carreras importadas desde el Excel MINEDU ya traen plan; las creadas a mano no tenían ninguno,
// y sin plan vigente se desactiva la detección de alumnos "Histórico".
import { apiClient } from './client';

export async function registrarPlanDeCarrera(programa) {
  if (!programa?.id) throw new Error('Carrera no válida.');
  if (programa.plan_estudio_id) return programa.plan_estudio_id;

  // Reutilizar un plan con el mismo código si ya existe (p. ej. un intento anterior)
  const planes = await apiClient.request('/api/mod-planes-estudio/planes').catch(() => []);
  let plan = (Array.isArray(planes) ? planes : []).find(
    (p) => String(p.codigo).trim().toUpperCase() === String(programa.codigo).trim().toUpperCase()
  );

  if (!plan) {
    plan = await apiClient.request('/api/mod-planes-estudio/planes', {
      method: 'POST',
      body: JSON.stringify({
        codigo: programa.codigo,
        nombre: programa.nombre,
        descripcion: 'Plan registrado desde SIGA para una carrera creada manualmente',
        nivel_formativo: 'Profesional Técnico',
        creditos_totales: parseInt(programa.creditos_totales, 10) || 0,
        estado: 'activo',
      }),
    });
  }

  await apiClient.request(`/api/mod-programas-estudio/programas/${programa.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      nombre: programa.nombre,
      codigo: programa.codigo,
      descripcion: programa.descripcion || '',
      creditos_totales: parseInt(programa.creditos_totales, 10) || 0,
      duracion_periodos: parseInt(programa.duracion_periodos, 10) || 6,
      modalidad: programa.modalidad || 'presencial',
      estado: programa.estado || 'activo',
      plan_estudio_id: plan.id,
    }),
  });
  return plan.id;
}
