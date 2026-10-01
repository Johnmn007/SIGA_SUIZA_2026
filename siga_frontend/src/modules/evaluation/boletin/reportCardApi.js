import { apiClient } from '../../../core/api/client';

const DEMO_STUDENT_ID = Number(import.meta.env.VITE_DEMO_STUDENT_ID) || 2315;

export async function fetchPeriods() {
  try {
    const res = await apiClient.request('/api/mod-programas-estudio/periodos');
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error('Error fetching periodos', error);
    throw new Error('No se pudo conectar con el servicio de periodos académicos. Verifica tu conexión e inténtalo nuevamente.');
  }
}

export async function fetchStudents() {
  try {
    const res = await apiClient.request('/api/mod-gestion-academica/estudiantes/');
    return Array.isArray(res) ? res : [];
  } catch (error) {
    // No es bloqueante: si no se puede resolver el estudiante por email,
    // el boletín usará el estudiante demo configurado para el entorno.
    console.error('Error fetching estudiantes', error);
    return [];
  }
}

export function resolveStudentId(students, user) {
  const email = user?.email ? String(user.email).trim().toLowerCase() : '';
  if (email) {
    const match = students.find(s =>
      (s.email_institucional && String(s.email_institucional).trim().toLowerCase() === email) ||
      (s.email_personal && String(s.email_personal).trim().toLowerCase() === email)
    );
    if (match) return match.id;
  }
  return DEMO_STUDENT_ID;
}

export async function fetchBoletin(studentId, periodId) {
  return apiClient.request(`/api/mod-evaluacion/boletin/estudiante/${studentId}/periodo/${periodId}`);
}