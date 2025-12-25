import express from 'express';
import { PlanEstudioController } from '../controllers/PlanEstudioController.js';

const router = express.Router();
const planEstudioController = new PlanEstudioController();

// ✅ RUTAS EXISTENTES (mantener compatibilidad)

// POST /api/v1/planes-estudio
router.post('/', planEstudioController.crearPlanEstudio);

// GET /api/v1/planes-estudio
router.get('/', planEstudioController.listarPlanesEstudio);

// GET /api/v1/planes-estudio/:id
router.get('/:id', planEstudioController.obtenerPlanEstudio);

// 🆕 RUTAS NUEVAS PARA VERSIONADO

// GET /api/v1/planes-estudio/codigo-completo/:codigoCompleto
router.get('/codigo-completo/:codigoCompleto', planEstudioController.obtenerPlanPorCodigoCompleto);

// GET /api/v1/planes-estudio/carrera/:codigoBase/versiones
router.get('/carrera/:codigoBase/versiones', planEstudioController.obtenerVersionesCarrera);

// GET /api/v1/planes-estudio/estado/vigentes
router.get('/estado/vigentes', planEstudioController.obtenerPlanesVigentes);

// GET /api/v1/planes-estudio/estado/activos
router.get('/estado/activos', planEstudioController.obtenerPlanesActivos);

// POST /api/v1/planes-estudio/:id/versionar
router.post('/:id/versionar', planEstudioController.crearNuevaVersion);

// PUT /api/v1/planes-estudio/:id/activar
router.put('/:id/activar', planEstudioController.activarVersion);

export default router;