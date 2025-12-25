export class Capacidad {
    constructor({
        id,
        competencia_id,
        codigo, // UC1.C1, UC2.C1, CE1.C1, etc.
        tipo, // 'tecnica', 'empleabilidad'
        verbo,
        objeto,
        condicion,
        contenidos = [],
        indicadores_logro = [],
        estado = 'activo'
    }) {
        this.id = id;
        this.competencia_id = competencia_id;
        this.codigo = codigo;
        this.tipo = tipo;
        this.verbo = verbo;
        this.objeto = objeto;
        this.condicion = condicion;
        this.contenidos = contenidos;
        this.indicadores_logro = indicadores_logro;
        this.estado = estado;
    }

    get descripcion_completa() {
        return `${this.verbo} ${this.objeto} ${this.condicion}`;
    }
}