import boletinData from '../../data/boletin.json';

const NOTA_MIN_APROBAR = 13;

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const tituloCiclo = (numero) =>
  ROMANOS[numero - 1] ? `CICLO ${ROMANOS[numero - 1]}` : `CICLO ${numero}`;

export const estudiantesBoletin = boletinData.estudiantes || [];

const ESTUDIANTES_BY_ID = new Map(estudiantesBoletin.map(e => [Number(e.id), e]));
const ESTUDIANTES_BY_DNI = new Map(estudiantesBoletin.map(e => [String(e.dni).trim(), e]));
const ESTUDIANTES_BY_COD = new Map(estudiantesBoletin.map(e => [String(e.codigo_estudiante).trim().toUpperCase(), e]));

export function buscarEstudianteEnJson(identifier) {
  if (identifier == null) return null;
  if (typeof identifier === 'object') {
    if (identifier.id != null && ESTUDIANTES_BY_ID.has(Number(identifier.id))) {
      return ESTUDIANTES_BY_ID.get(Number(identifier.id));
    }
    if (identifier.dni != null && ESTUDIANTES_BY_DNI.has(String(identifier.dni).trim())) {
      return ESTUDIANTES_BY_DNI.get(String(identifier.dni).trim());
    }
    if (identifier.codigo_estudiante != null && ESTUDIANTES_BY_COD.has(String(identifier.codigo_estudiante).trim().toUpperCase())) {
      return ESTUDIANTES_BY_COD.get(String(identifier.codigo_estudiante).trim().toUpperCase());
    }
    return null;
  }
  const num = Number(identifier);
  if (!isNaN(num) && ESTUDIANTES_BY_ID.has(num)) {
    return ESTUDIANTES_BY_ID.get(num);
  }
  const str = String(identifier).trim();
  if (ESTUDIANTES_BY_DNI.has(str)) {
    return ESTUDIANTES_BY_DNI.get(str);
  }
  const cod = str.toUpperCase();
  if (ESTUDIANTES_BY_COD.has(cod)) {
    return ESTUDIANTES_BY_COD.get(cod);
  }
  return null;
}

const PERIODOS = new Map((boletinData.periodos || []).map(p => [p.id, p]));
const REGISTROS = new Map((boletinData.registros || []).map(r => [r.matricula_detalle_id, r]));
const DOCENTES = new Map((boletinData.docentes || []).map(d => [d.id, d.nombre]));

const estadoDeNota = (nota, estadoGuardado) => {
  if (nota === null || nota === undefined) return estadoGuardado || 'no_cursado';
  return nota >= NOTA_MIN_APROBAR ? 'aprobado' : 'desaprobado';
};

/**
 * Devuelve las notas del estudiante agrupadas por ciclo.
 * Regla: el periodo registrado mas antiguo es el CICLO I y cada semestre
 * siguiente avanza un ciclo (cadencia DOC-15: 2025-I=I, 2025-II=II,
 * 2026-I=III, 2026-II=IV). El campo `ciclo` del JSON NO se usa como ancla
 * porque quedo desfasado respecto a los periodos realmente matriculados.
 */
export function obtenerNotasPorCiclo(estudianteId, studentExtra = null) {
  const estudiante = buscarEstudianteEnJson(estudianteId) || (studentExtra ? buscarEstudianteEnJson(studentExtra) : null);
  if (!estudiante) return null;

  const matriculas = (boletinData.matriculas || [])
    .filter(m => m.estudiante_id === estudiante.id)
    .map(m => ({ ...m, periodo: PERIODOS.get(m.periodo_id) }))
    .sort((a, b) =>
      String(a.periodo?.fecha_inicio || '').localeCompare(String(b.periodo?.fecha_inicio || ''))
    );

  if (matriculas.length === 0) return null;

  const primerCiclo = 1;
  const cicloActual = primerCiclo + matriculas.length - 1;

  const porCiclo = new Map();
  let periodoActual = null;
  let unidadesPeriodoActual = [];

  matriculas.forEach((matricula, indice) => {
    const ciclo = primerCiclo + indice;

    const unidades = (matricula.detalles || []).map(detalle => {
      const registro = REGISTROS.get(detalle.matricula_detalle_id) || null;
      const nota = registro?.nota_final ?? null;
      return {
        nombre: detalle.nombre,
        creditos: detalle.creditos,
        nota,
        nota_c1: registro?.nota_c1 ?? null,
        nota_c2: registro?.nota_c2 ?? null,
        nota_c3: registro?.nota_c3 ?? null,
        estado: estadoDeNota(nota, registro?.estado || detalle.estado_curso),
        periodo_codigo: matricula.periodo_codigo,
        docente: DOCENTES.get(detalle.docente_id) || null,
      };
    });

    porCiclo.set(ciclo, {
      ciclo,
      titulo: tituloCiclo(ciclo),
      periodo_codigo: matricula.periodo_codigo,
      unidades,
      completado: unidades.length > 0 && unidades.every(u => u.estado === 'aprobado'),
    });

    periodoActual = matricula.periodo_codigo;
    unidadesPeriodoActual = unidades;
  });

  return { cicloActual, porCiclo, periodoActual, unidadesPeriodoActual };
}

/**
 * Franja ejecutiva (promedios del periodo) calculada desde el JSON,
 * para que los KPI coincidan con las notas mostradas por ciclo.
 */
export function resumenDesdeJson(notasJson) {
  if (!notasJson) return null;
  const unidades = notasJson.unidadesPeriodoActual || [];
  const conNota = unidades.filter(u => u.nota != null);
  const promedio = conNota.length > 0
    ? Math.round(conNota.reduce((s, u) => s + u.nota, 0) / conNota.length)
    : null;

  return {
    periodo_codigo: notasJson.periodoActual,
    cursos_periodo: unidades.map(u => ({
      unidad_nombre: u.nombre,
      creditos: u.creditos,
      nota_c1: u.nota_c1,
      nota_c2: u.nota_c2,
      nota_c3: u.nota_c3,
      nota_final: u.nota,
      promedio_curso: u.nota,
      estado: u.estado,
    })),
    resumen: {
      promedio_general: promedio,
      cursos_aprobados: unidades.filter(u => u.estado === 'aprobado').length,
      cursos_desaprobados: unidades.filter(u => u.estado === 'desaprobado').length,
      total_cursos: unidades.length,
    },
  };
}

const promediar = (unidades) => {
  const notas = unidades.filter(u => u.nota != null).map(u => u.nota);
  return notas.length > 0
    ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 100) / 100
    : null;
};

/**
 * Construye la lista final de ciclos para la vista "Notas por Ciclos".
 * - Ciclos cubiertos por el JSON (I..cicloActual): sus unidades salen del JSON (nombre y nota reales).
 * - Ciclos posteriores del plan (p.ej. V y VI): se conservan con sus unidades del plan y SIN notas.
 * - Sin JSON: se aplica el overlay de `notasDemo` (mock) por nombre de unidad.
 */
export function construirListaCiclos(planCiclos, notasJson, notasDemo) {
  const demo = new Map(
    (Array.isArray(notasDemo) ? notasDemo : [])
      .filter(c => c && c.nota_final != null)
      .map(c => [c.unidad_nombre, c])
  );

  const mapa = new Map();

  (Array.isArray(planCiclos) ? planCiclos : []).forEach(ciclo => {
    const unidades = (Array.isArray(ciclo.unidades) ? ciclo.unidades : []).map(u => {
      const registro = !notasJson && u.nota == null ? demo.get(u.nombre) : null;
      if (!registro) return u;
      return {
        ...u,
        nota: registro.nota_final,
        nota_c1: registro.nota_c1,
        nota_c2: registro.nota_c2,
        nota_c3: registro.nota_c3,
        estado: registro.estado,
      };
    });
    mapa.set(ciclo.ciclo, { ...ciclo, unidades });
  });

  if (notasJson) {
    notasJson.porCiclo.forEach((cicloJson, numero) => {
      const existente = mapa.get(numero);
      mapa.set(numero, {
        ...existente,
        ciclo: numero,
        titulo: existente?.titulo || cicloJson.titulo,
        periodo_codigo: cicloJson.periodo_codigo,
        unidades: cicloJson.unidades,
      });
    });
  }

  return [...mapa.values()]
    .sort((a, b) => a.ciclo - b.ciclo)
    .map(ciclo => {
      const unidades = ciclo.unidades || [];
      return {
        ...ciclo,
        unidades,
        promedio: promediar(unidades),
        creditos_ciclo: unidades.reduce((s, u) => s + (u.creditos || 0), 0),
        creditos_aprobados: unidades
          .filter(u => u.estado === 'aprobado')
          .reduce((s, u) => s + (u.creditos || 0), 0),
        completado: unidades.length > 0 && unidades.every(u => u.estado === 'aprobado'),
      };
    });
}

/**
 * Genera el objeto completo del boletín cuando no existe registro en backend DB
 * pero sí está presente en boletin.json.
 */
export function generarBoletinDesdeJson(estudianteId, studentExtra = null) {
  const estudiante = buscarEstudianteEnJson(estudianteId) || (studentExtra ? buscarEstudianteEnJson(studentExtra) : null);
  if (!estudiante) return null;

  const notasJson = obtenerNotasPorCiclo(estudiante.id);
  if (!notasJson) return null;

  const periodoActual = resumenDesdeJson(notasJson);
  const ciclos = construirListaCiclos([], notasJson, null);

  const totalAprobados = ciclos.reduce((s, c) => s + (c.creditos_aprobados || 0), 0);
  const creditosTotales = 126;

  return {
    estudiante: {
      foto_url: null,
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      codigo_estudiante: estudiante.codigo_estudiante,
      dni: estudiante.dni,
      celular: estudiante.celular,
      email_personal: estudiante.email,
      programa_nombre: estudiante.programa?.nombre || 'DESARROLLO DE SISTEMAS DE INFORMACION',
      periodo_codigo: notasJson.periodoActual,
      fecha_emision: new Date().toLocaleDateString('es-PE'),
    },
    matricula_estado: {
      pago_matricula: true,
      tipo_ingreso: 'regular',
      estado_matricula: estudiante.estado_academico || 'matriculado',
      fecha_fin_matricula_regular: null,
      fecha_fin_matricula_extemporanea: null,
    },
    estado_academico: estudiante.estado_academico || 'matriculado',
    progreso_creditos: {
      creditos_aprobados: totalAprobados,
      creditos_totales: creditosTotales,
      porcentaje: Math.round((totalAprobados / creditosTotales) * 100),
    },
    cursos_periodo: periodoActual.cursos_periodo,
    ciclos: ciclos,
    resumen: {
      ...periodoActual.resumen,
      ciclos_completados: ciclos.filter(c => c.completado).length,
      ciclos_totales: 6,
    },
    historial: [],
    observaciones: 'El estudiante mantiene su plan de estudios regular.',
    _notasJson: notasJson,
  };
}
