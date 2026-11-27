// Búsqueda de estudiantes a partir de lo dictado por voz.
// El reconocimiento escribe los nombres poco comunes "como suenan" ("ya que lineo chavano lo pez"
// por "Jackeline Ochavano López"), así que se compara por sonido y con tolerancia a errores.

const sinTildes = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Representación fonética en español: lo que suena igual se escribe igual. */
export function fonetica(texto) {
  return sinTildes(texto)
    .replace(/[^a-z]/g, '')
    .replace(/ch/g, '§')              // conserva "ch" antes de quitar la h muda
    .replace(/ph/g, 'f')
    .replace(/ck|qu|q|k/g, 'k')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/g(?=[ei])/g, 'j')
    .replace(/[zx]/g, 's')
    .replace(/v/g, 'b')
    .replace(/w/g, 'u')
    .replace(/ll/g, 'y')
    .replace(/j/g, 'y')               // "Jackeline", "Jhon" se pronuncian con y en Perú
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')         // letras dobles: rr, ss, nn...
    .replace(/§/g, 'ch');
}

// Distancia de edición clásica.
function distancia(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return fila[b.length];
}

// Distancia del texto a la parte más parecida de un nombre (por si dicen solo un apellido).
function distanciaParcial(texto, nombre) {
  const fila = new Array(nombre.length + 1).fill(0);
  for (let i = 1; i <= texto.length; i++) {
    let diag = fila[0];
    fila[0] = i;
    for (let j = 1; j <= nombre.length; j++) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diag + (texto[i - 1] === nombre[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return Math.min(...fila);
}

function puntaje(textoFon, estudiante) {
  const nombres = fonetica(estudiante.nombres);
  const apellidos = fonetica(estudiante.apellidos);
  let mejor = 0;
  for (const completo of [nombres + apellidos, apellidos + nombres]) {
    const largo = Math.max(textoFon.length, completo.length) || 1;
    mejor = Math.max(mejor, 1 - distancia(textoFon, completo) / largo);
  }
  if (textoFon.length >= 5) {
    // Coincidencia con una parte del nombre (dijo solo el apellido, o apellido y nombre).
    const parcial = 1 - distanciaParcial(textoFon, nombres + apellidos + nombres) / textoFon.length;
    mejor = Math.max(mejor, parcial * 0.97);
  }
  return mejor;
}

const MINIMO = 0.72;   // parecido mínimo para sugerir
const SEGURO = 0.8;    // parecido para abrir directo si además destaca sobre el segundo
const VENTAJA = 0.08;

/**
 * Devuelve { unico, lista } para lo dictado:
 * - si dice un DNI o código (6+ dígitos) busca esos números;
 * - si no, compara por sonido contra nombres y apellidos.
 * `unico` es el estudiante a abrir directamente cuando no hay duda.
 */
export function buscarPorVoz(estudiantes, texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  if (digitos.length >= 6) {
    const lista = estudiantes.filter((s) =>
      String(s.dni ?? '') === digitos || String(s.codigo_estudiante ?? '').replace(/\D/g, '').includes(digitos));
    return { unico: lista.length === 1 ? lista[0] : null, lista };
  }
  const textoFon = fonetica(texto);
  if (textoFon.length < 3) return { unico: null, lista: [] };
  const ordenados = estudiantes
    .map((s) => ({ s, p: puntaje(textoFon, s) }))
    .filter((x) => x.p >= MINIMO)
    .sort((a, b) => b.p - a.p);
  if (ordenados.length === 0) return { unico: null, lista: [] };
  const [primero, segundo] = ordenados;
  const unico = primero.p >= SEGURO && (!segundo || primero.p - segundo.p >= VENTAJA) ? primero.s : null;
  const lista = ordenados.filter((x) => x.p >= primero.p - 0.15).slice(0, 8).map((x) => x.s);
  return { unico, lista };
}
