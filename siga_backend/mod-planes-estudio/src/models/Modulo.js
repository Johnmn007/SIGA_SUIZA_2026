export class Modulo {
    constructor({
        id,
        plan_estudio_id,
        nombre,
        numero, // 1, 2, 3
        descripcion,
        competencias_tecnicas = [],
        competencias_empleabilidad = [],
        creditos_tecnicos = 0,
        creditos_empleabilidad = 0,
        creditos_esrt = 0,
        horas_tecnicas = 0,
        horas_empleabilidad = 0,
        horas_esrt = 0,
        estado = 'activo'
    }) {
        this.id = id;
        this.plan_estudio_id = plan_estudio_id;
        this.nombre = nombre; // "Arquitectura de computadoras y desarrollo de Software"
        this.numero = numero;
        this.descripcion = descripcion;
        this.competencias_tecnicas = competencias_tecnicas;
        this.competencias_empleabilidad = competencias_empleabilidad;
        this.creditos_tecnicos = creditos_tecnicos;
        this.creditos_empleabilidad = creditos_empleabilidad;
        this.creditos_esrt = creditos_esrt;
        this.horas_tecnicas = horas_tecnicas;
        this.horas_empleabilidad = horas_empleabilidad;
        this.horas_esrt = horas_esrt;
        this.estado = estado;
    }
}