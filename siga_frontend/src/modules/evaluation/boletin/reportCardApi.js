import { apiClient } from '../../../core/api/client';
import {
  MOCK_PERIODOS,
  MOCK_ESTUDIANTES,
  getMockBoletin,
  getMockPeriodo,
  getMockEstudiante,
} from './mock/boletinMock';

const DEMO_STUDENT_ID = Number(import.meta.env.VITE_DEMO_STUDENT_ID) || 2315;

const API_BOLENIN = import.meta.env.VITE_BOLENIN_MOCK === 'false';

export async function fetchPeriods() {
  if (!API_BOLENIN) return MOCK_PERIODOS;
  try {
    const res = await apiClient.request('/api/mod-programas-estudio/periodos');
    return Array.isArray(res) && res.length > 0 ? res : MOCK_PERIODOS;
  } catch (error) {
    console.error('Error fetching periodos', error);
    return MOCK_PERIODOS;
  }
}

export async function fetchStudents() {
  if (!API_BOLENIN) return MOCK_ESTUDIANTES;
  try {
    const res = await apiClient.request('/api/mod-gestion-academica/estudiantes/');
    return Array.isArray(res) && res.length > 0 ? res : MOCK_ESTUDIANTES;
  } catch (error) {
    console.error('Error fetching estudiantes', error);
    return MOCK_ESTUDIANTES;
  }
}

export function resolveStudentId(students, user) {
  const email = user?.email ? String(user.email).trim().toLowerCase() : '';
  if (email) {
    const match = (students || []).find(
      (s) =>
        (s.email_institucional && String(s.email_institucional).trim().toLowerCase() === email) ||
        (s.email_personal && String(s.email_personal).trim().toLowerCase() === email)
    );
    if (match) return match.id;
  }
  return DEMO_STUDENT_ID;
}

export async function fetchEstudiante(estudianteId) {
  if (!API_BOLENIN) return getMockEstudiante(estudianteId);
  try {
    return await apiClient.request(`/api/mod-gestion-academica/estudiantes/${estudianteId}`);
  } catch (error) {
    console.error('Error fetching estudiante', error);
    return getMockEstudiante(estudianteId);
  }
}

export async function fetchPeriodo(periodoId) {
  if (!API_BOLENIN) return getMockPeriodo(periodoId);
  try {
    return await apiClient.request(`/api/mod-programas-estudio/periodos/${periodoId}`);
  } catch (error) {
    console.error('Error fetching periodo', error);
    return getMockPeriodo(periodoId);
  }
}

export async function fetchBoletin(studentId, periodId) {
  if (!API_BOLENIN) return getMockBoletin(studentId, periodId);
  try {
    return await apiClient.request(`/api/mod-evaluacion/boletin/estudiante/${studentId}/periodo/${periodId}`);
  } catch (error) {
    console.error('Error fetching boletin', error);
    return getMockBoletin(studentId, periodId);
  }
}
