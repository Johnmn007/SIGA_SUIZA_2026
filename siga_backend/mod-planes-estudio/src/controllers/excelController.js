import XLSX from 'xlsx';

// Importar según cómo esté exportado en tu modelo
// Primero veamos qué exporta PlanEstudio
import * as PlanEstudioModule from '../models/PlanEstudio.js';

class ExcelController {
  
  static async uploadExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se envió ningún archivo Excel'
        });
      }

      console.log('📤 Procesando archivo Excel:', req.file.originalname);

      // Leer el archivo Excel
      const workbook = XLSX.readFile(req.file.path);
      const resultado = await this.procesarExcel(workbook);

      res.json({
        success: true,
        message: 'Excel procesado exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error procesando Excel:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async procesarExcel(workbook) {
    const resultado = {
      planCreado: null,
      modulosCreados: 0,
      unidadesCreadas: 0
    };

    // 1. PROCESAR ESTRUCTURA GENERAL
    if (workbook.Sheets['Estructura_General']) {
      const estructura = this.extraerEstructura(workbook.Sheets['Estructura_General']);
      
      // Usar el método create correcto según tu modelo
      if (PlanEstudioModule.PlanEstudio && PlanEstudioModule.PlanEstudio.create) {
        resultado.planCreado = await PlanEstudioModule.PlanEstudio.create(estructura);
      } else if (PlanEstudioModule.default && PlanEstudioModule.default.create) {
        resultado.planCreado = await PlanEstudioModule.default.create(estructura);
      } else {
        console.log('⚠️  Modelo PlanEstudio no disponible para crear planes');
      }
    }

    // 2. PROCESAR MÓDULOS (futura implementación)
    if (workbook.Sheets['Modulos_Formativos']) {
      console.log('📝 Módulos detectados - listos para procesar');
      resultado.modulosCreados = 0;
    }

    // 3. PROCESAR UNIDADES (futura implementación)  
    if (workbook.Sheets['Unidades_Didacticas']) {
      console.log('📚 Unidades detectadas - listas para procesar');
      resultado.unidadesCreadas = 0;
    }

    return resultado;
  }

  static extraerEstructura(sheet) {
    const data = XLSX.utils.sheet_to_json(sheet);
    const primeraFila = data[0] || {};
    
    return {
      nombre: primeraFila.Nombre || 'Plan desde Excel',
      codigo: primeraFila.Codigo || 'EXCEL-001',
      descripcion: primeraFila.Descripcion || 'Cargado automáticamente desde Excel',
      duracion_horas: parseInt(primeraFila.HorasTotales) || 3264,
      creditos_totales: parseInt(primeraFila.Creditos) || 127,
      estado: 'activo'
    };
  }
}

export default ExcelController;