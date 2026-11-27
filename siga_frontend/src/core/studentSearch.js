/** Utilidades compartidas para buscar estudiantes y elegir la carrera inicial. */

export const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Filtra estudiantes por carrera (opcional) y por texto. El texto se compara sin tildes
 * ni mayúsculas y cada palabra puede estar en nombres, apellidos, DNI o código,
 * así "garcia juan" encuentra a "JUAN GARCÍA".
 */
export function filtrarEstudiantes(estudiantes, texto, programaId) {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  return estudiantes.filter((s) => {
    if (programaId && String(s.programa_id) !== String(programaId)) return false;
    if (palabras.length === 0) return true;
    const ficha = normalizar(`${s.nombres} ${s.apellidos} ${s.dni} ${s.codigo_estudiante}`);
    return palabras.every((p) => ficha.includes(p));
  });
}

/** Carrera inicial: la del usuario si existe en la lista; si no, la primera. */
export function programaInicial(programas, user) {
  const propio = user?.programa_id != null
    && programas.find((p) => String(p.id) === String(user.programa_id));
  if (propio) return String(propio.id);
  return programas.length > 0 ? String(programas[0].id) : '';
}
