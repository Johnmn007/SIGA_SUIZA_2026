import datos from './boletinMockData.json';

const clave = (estudianteId, periodoId) => `${estudianteId}:${periodoId}`;

const indice = new Map(datos.boletines.map((b) => [clave(b.estudiante_id, b.periodo_id), b]));

export const MOCK_META = datos.meta;
export const MOCK_PERIODOS = datos.periodos;
export const MOCK_ESTUDIANTES = datos.estudiantes;

export function getMockBoletin(estudianteId, periodoId) {
  return indice.get(clave(Number(estudianteId), Number(periodoId))) || null;
}

export function getMockPeriodo(periodoId) {
  return MOCK_PERIODOS.find((p) => p.id === Number(periodoId)) || null;
}

export function getMockEstudiante(estudianteId) {
  return MOCK_ESTUDIANTES.find((e) => e.id === Number(estudianteId)) || null;
}

export function getMockPeriodosDe(estudianteId) {
  const ids = datos.boletines
    .filter((b) => b.estudiante_id === Number(estudianteId))
    .map((b) => b.periodo_id);
  return MOCK_PERIODOS.filter((p) => ids.includes(p.id));
}

export const rangoAprobatorio = `Nota minima aprobatoria: ${datos.meta.nota_minima_aprobatoria} (escala ${datos.meta.escala}) · Asistencia minima ${datos.meta.asistencia_minima}%`;
