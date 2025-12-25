export class PlanEstudio {
    constructor({
        id,
        codigo,                    // Campo existente - mantener
        codigo_base,               // 🆕 NUEVO: "J2662-3" (identificador de carrera)
        version,                   // 🆕 NUEVO: "2023", "2024", "2027" (SOBREESCRIBE la versión técnica)
        codigo_completo,           // 🆕 NUEVO: "J2662-3-2023" (codigo_base + version)
        nombre,                    // Campo existente - mantener
        nivel_formativo,           // Campo existente - mantener
        total_horas,               // Campo existente - mantener
        total_creditos,            // Campo existente - mantener
        modalidad,                 // Campo existente - mantener
        sector_economico,          // Campo existente - mantener
        familia_productiva,        // Campo existente - mantener
        actividad_economica,       // Campo existente - mantener
        perfil_egreso,             // Campo existente - mantener
        estado = 'activo',         // Campo existente - mantener
        estado_version = 'vigente', // 🆕 NUEVO: 'borrador', 'vigente', 'historico'
        vigente_desde,             // 🆕 NUEVO: Fecha de inicio de vigencia
        vigente_hasta,             // 🆕 NUEVO: Fecha fin para nuevos estudiantes
        fecha_retiro,              // 🆕 NUEVO: Fecha retiro último estudiante
        version_anterior_id,       // 🆕 NUEVO: ID del plan que reemplaza
        version_tecnica = '1.0',   // 🆕 RENOMBRADO: versión técnica del modelo (antes 'version')
        fecha_creacion = new Date(), // Campo existente - mantener
        fecha_actualizacion = new Date() // Campo existente - mantener
    }) {
        // ✅ CAMPOS EXISTENTES (no cambiar)
        this.id = id;
        this.codigo = codigo;
        this.nombre = nombre;
        this.nivel_formativo = nivel_formativo;
        this.total_horas = total_horas;
        this.total_creditos = total_creditos;
        this.modalidad = modalidad;
        this.sector_economico = sector_economico;
        this.familia_productiva = familia_productiva;
        this.actividad_economica = actividad_economica;
        this.perfil_egreso = perfil_egreso;
        this.estado = estado;
        this.version = version_tecnica; // Mantener compatibilidad con campo existente
        this.fecha_creacion = fecha_creacion;
        this.fecha_actualizacion = fecha_actualizacion;

        // 🆕 CAMPOS NUEVOS PARA VERSIONADO
        this.codigo_base = codigo_base;
        this.version_academica = version; // 🆕 NUEVO nombre para evitar conflicto
        this.codigo_completo = codigo_completo;
        this.estado_version = estado_version;
        this.vigente_desde = vigente_desde;
        this.vigente_hasta = vigente_hasta;
        this.fecha_retiro = fecha_retiro;
        this.version_anterior_id = version_anterior_id;
    }

    // 🆕 MÉTODOS PARA GESTIÓN DE CONVIVENCIA DE VERSIONES

    /**
     * Verifica si este plan acepta nuevos estudiantes
     * @returns {boolean} True si acepta nuevos estudiantes
     */
    aceptaNuevosEstudiantes() {
        const hoy = new Date();
        const vigenteHasta = this.vigente_hasta ? new Date(this.vigente_hasta) : null;
        
        return this.estado_version === 'vigente' && 
               this.estado === 'activo' &&
               (!vigenteHasta || hoy <= vigenteHasta);
    }

    /**
     * Verifica si este plan tiene estudiantes activos
     * @returns {boolean} True si tiene estudiantes activos
     */
    tieneEstudiantesActivos() {
        const hoy = new Date();
        const fechaRetiro = this.fecha_retiro ? new Date(this.fecha_retiro) : null;
        
        return this.estado === 'activo' && 
               (this.estado_version === 'vigente' || 
                (this.estado_version === 'historico' && 
                 (!fechaRetiro || hoy <= fechaRetiro)));
    }

    /**
     * Verifica si esta es la versión actual (acepta nuevos estudiantes)
     * @returns {boolean} True si es la versión actual
     */
    esVersionActual() {
        return this.estado_version === 'vigente' && this.aceptaNuevosEstudiantes();
    }

    /**
     * Verifica si el plan está en periodo de transición
     * @returns {boolean} True si está en transición
     */
    enTransicion() {
        return this.estado_version === 'vigente' && 
               this.vigente_hasta && 
               new Date() <= new Date(this.vigente_hasta);
    }

    /**
     * Obtiene el estado descriptivo del plan
     * @returns {string} Estado descriptivo
     */
    get estadoDescriptivo() {
        if (!this.aceptaNuevosEstudiantes() && this.tieneEstudiantesActivos()) {
            return 'Solo estudiantes activos';
        }
        if (this.aceptaNuevosEstudiantes()) {
            return 'Acepta nuevos estudiantes';
        }
        if (this.estado_version === 'historico') {
            return 'Plan histórico';
        }
        if (this.estado_version === 'borrador') {
            return 'En borrador';
        }
        return 'Estado desconocido';
    }

    // ✅ MÉTODOS EXISTENTES (mantener compatibilidad)
    
    /**
     * @deprecated Usar estado_version en su lugar
     */
    get estaActivo() {
        return this.estado === 'activo';
    }

    /**
     * @deprecated Usar estadoDescriptivo en su lugar  
     */
    get descripcionEstado() {
        return this.estadoDescriptivo;
    }
}