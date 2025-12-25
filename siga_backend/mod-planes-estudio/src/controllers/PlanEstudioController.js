import { PlanEstudioRepository } from '../repositories/PlanEstudioRepository.js';

export class PlanEstudioController {
    constructor() {
        this.repository = new PlanEstudioRepository();
    }

    // ✅ MÉTODOS EXISTENTES (mantener compatibilidad)

    crearPlanEstudio = async (req, res) => {
        try {
            const planData = req.body;
            
            // Validar campos requeridos para versionado
            if (!planData.codigo_base || !planData.version) {
                return res.status(400).json({
                    success: false,
                    message: 'codigo_base y version son campos requeridos'
                });
            }

            // Generar código completo si no viene
            if (!planData.codigo_completo) {
                planData.codigo_completo = `${planData.codigo_base}-${planData.version}`;
            }

            const plan = await this.repository.crear(planData);
            
            res.status(201).json({
                success: true,
                data: plan,
                message: 'Plan de estudio creado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al crear plan de estudio',
                error: error.message
            });
        }
    };

    obtenerPlanEstudio = async (req, res) => {
        try {
            const { id } = req.params;
            const plan = await this.repository.obtenerPorId(id);
            
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan de estudio no encontrado'
                });
            }

            res.json({
                success: true,
                data: plan
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener plan de estudio',
                error: error.message
            });
        }
    };

    listarPlanesEstudio = async (req, res) => {
        try {
            const planes = await this.repository.listar();
            
            res.json({
                success: true,
                data: planes,
                total: planes.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al listar planes de estudio',
                error: error.message
            });
        }
    };

    // 🆕 MÉTODOS NUEVOS PARA VERSIONADO

    obtenerVersionesCarrera = async (req, res) => {
        try {
            const { codigoBase } = req.params;
            
            if (!codigoBase) {
                return res.status(400).json({
                    success: false,
                    message: 'codigoBase es requerido'
                });
            }

            const versiones = await this.repository.obtenerVersionesPorCodigoBase(codigoBase);
            
            res.json({
                success: true,
                data: versiones,
                total: versiones.length,
                codigo_base: codigoBase
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener versiones de la carrera',
                error: error.message
            });
        }
    };

    obtenerPlanesVigentes = async (req, res) => {
        try {
            const planes = await this.repository.obtenerPlanesVigentes();
            
            res.json({
                success: true,
                data: planes,
                total: planes.length,
                message: 'Planes que aceptan nuevos estudiantes'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener planes vigentes',
                error: error.message
            });
        }
    };

    obtenerPlanesActivos = async (req, res) => {
        try {
            const planes = await this.repository.obtenerPlanesConEstudiantesActivos();
            
            res.json({
                success: true,
                data: planes,
                total: planes.length,
                message: 'Planes con estudiantes activos'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener planes activos',
                error: error.message
            });
        }
    };

    crearNuevaVersion = async (req, res) => {
        try {
            const { id } = req.params;
            const nuevaVersionData = req.body;

            if (!nuevaVersionData.version) {
                return res.status(400).json({
                    success: false,
                    message: 'El campo version es requerido'
                });
            }

            const nuevaVersion = await this.repository.crearNuevaVersion(id, nuevaVersionData);
            
            res.status(201).json({
                success: true,
                data: nuevaVersion,
                message: 'Nueva versión creada exitosamente (en borrador)'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al crear nueva versión',
                error: error.message
            });
        }
    };

    activarVersion = async (req, res) => {
        try {
            const { id } = req.params;

            const planActivado = await this.repository.activarVersion(id);
            
            if (!planActivado) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan no encontrado'
                });
            }

            res.json({
                success: true,
                data: planActivado,
                message: 'Versión activada exitosamente. Versión anterior marcada como histórico.'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al activar versión',
                error: error.message
            });
        }
    };

    obtenerPlanPorCodigoCompleto = async (req, res) => {
        try {
            const { codigoCompleto } = req.params;
            
            const plan = await this.repository.obtenerPorCodigoCompleto(codigoCompleto);
            
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan de estudio no encontrado'
                });
            }

            res.json({
                success: true,
                data: plan
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener plan de estudio',
                error: error.message
            });
        }
    };
}