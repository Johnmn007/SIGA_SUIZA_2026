export class UnidadDidactica {
    constructor({
        id,
        modulo_id,
        nombre,
        periodo_academico, // I, II, III, IV, V, VI
        creditos_teoricos,
        creditos_practicos,
        horas_teoricas,
        horas_practicas,
        tipo, // 'tecnica', 'empleabilidad', 'esrt'
        competencias_asociadas = [],
        perfil_docente,
        estado = 'activo'
    }) {
        this.id = id;
        this.modulo_id = modulo_id;
        this.nombre = nombre; // "Lenguaje de programación"
        this.periodo_academico = periodo_academico;
        this.creditos_teoricos = creditos_teoricos;
        this.creditos_practicos = creditos_practicos;
        this.horas_teoricas = horas_teoricas;
        this.horas_practicas = horas_practicas;
        this.tipo = tipo;
        this.competencias_asociadas = competencias_asociadas;
        this.perfil_docente = perfil_docente;
        this.estado = estado;
    }

    get creditos_totales() {
        return this.creditos_teoricos + this.creditos_practicos;
    }

    get horas_totales() {
        return this.horas_teoricas + this.horas_practicas;
    }
}