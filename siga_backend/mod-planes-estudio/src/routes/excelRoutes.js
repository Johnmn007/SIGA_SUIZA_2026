import express from 'express';
import ExcelController from '../controllers/excelController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Ruta para upload de Excel - NO INTERFIERE con rutas existentes
router.post('/upload-excel', upload.single('excelFile'), ExcelController.uploadExcel);

export default router;