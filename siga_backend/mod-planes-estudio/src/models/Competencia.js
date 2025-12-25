export class Competencia {
    constructor({
        id,
        codigo, // UC1, UC2, UC3, UC4, CE1, CE2, etc.
        tipo, // 'tecnica', 'empleabilidad'
        descripcion,
        unidad_competencia,
        ambitos_desempenio = [],
        estado = 'activo'
    }) {
        this.id = id;
        this.codigo = codigo;
        this.tipo = tipo;
        this.descripcion = descripcion;
        this.unidad_competencia = unidad_competencia;
        this.ambitos_desempenio = ambitos_desempenio;
        this.estado = estado;
    }

    esTecnica() {
        return this.tipo === 'tecnica';
    }

    esEmpleabilidad() {
        return this.tipo === 'empleabilidad';
    }
}