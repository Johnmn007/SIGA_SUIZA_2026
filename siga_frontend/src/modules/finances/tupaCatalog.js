import { useState, useEffect, useCallback } from 'react';
import { tesoreriaApi } from './lib/tesoreriaApi';

// Tarifario TUPA, métodos de pago y reglas de cobro de Tesorería - IESTP Suiza 2026.
// El catálogo y la configuración se guardan en la base de datos (mod-gestion-academica /tesoreria).

export const TUPA_CATEGORIES = ['Matrícula', 'Identificación', 'Certificaciones', 'Evaluación', 'Grados y Títulos', 'Trámites', 'Otros'];

// Tipos de precio que puede tener un concepto
export const PRICE_TYPES = {
  fijo: { label: 'Precio fijo', descripcion: 'Un único monto oficial para todos los alumnos.' },
  tarifas: { label: 'Varias tarifas', descripcion: 'Se elige la tarifa al cobrar (ej. Regular, Extemporáneo, Beca 50%).' },
  libre: { label: 'Monto libre', descripcion: 'El cajero digita el monto al cobrar (con mínimo opcional).' },
};

export const DEFAULT_CAJA_CONFIG = {
  yapeNumero: '961-824-192',
  yapeTitular: 'IESTP Suiza',
  yapeQrImagen: '',
  bnCuenta: '00-521-029481',
  urlPublica: '',
};

// Tarifario TUPA vigente (base de datos): agregar, editar precios y eliminar conceptos
export function useTupaCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState('');

  const reloadCatalog = useCallback(async () => {
    try {
      setCatalog(await tesoreriaApi.listarConceptos());
      setCatalogError('');
    } catch (e) {
      setCatalogError(e.message);
    }
  }, []);

  // Devuelve el concepto guardado; lanza el error del servidor (ej. código duplicado)
  const saveConcept = useCallback(async (concept, originalId = null) => {
    const saved = originalId
      ? await tesoreriaApi.actualizarConcepto(originalId, concept)
      : await tesoreriaApi.crearConcepto(concept);
    setCatalog(prev => (originalId ? prev.map(c => (c.id === originalId ? saved : c)) : [...prev, saved]));
    return saved;
  }, []);

  const deleteConcept = useCallback(async (id) => {
    await tesoreriaApi.eliminarConcepto(id);
    setCatalog(prev => prev.filter(c => c.id !== id));
  }, []);

  const resetCatalog = useCallback(async () => {
    setCatalog(await tesoreriaApi.restaurarConceptos());
  }, []);

  return { catalog, catalogError, reloadCatalog, saveConcept, deleteConcept, resetCatalog };
}

// Datos de cobro de la institución (Yape/Plin, Banco de la Nación, URL pública de los QR)
export function useCajaConfig() {
  const [config, setConfig] = useState(DEFAULT_CAJA_CONFIG);

  useEffect(() => {
    let cancelled = false;
    tesoreriaApi.leerConfig()
      .then(saved => { if (!cancelled) setConfig({ ...DEFAULT_CAJA_CONFIG, ...saved }); })
      .catch(e => console.error('Error cargando la configuración de caja:', e));
    return () => { cancelled = true; };
  }, []);

  const saveConfig = useCallback(async (next) => {
    const saved = await tesoreriaApi.guardarConfig(next);
    setConfig({ ...DEFAULT_CAJA_CONFIG, ...saved });
    return saved;
  }, []);

  return { config, saveConfig };
}

// Movimiento con el nombre, código y categoría vigentes de su concepto en el tarifario.
// El monto cobrado no cambia; `original` conserva el recibo tal como se emitió (para la boleta y su QR).
export function withCurrentConcept(movement, catalog = []) {
  const code = String(movement.conceptoCodigo || '').toUpperCase();
  const concept = catalog.find(c => movement.conceptoId != null && c.id === movement.conceptoId)
    || catalog.find(c => String(c.codigo).toUpperCase() === code);
  const original = movement.original || movement;
  if (!concept) return { ...movement, original };
  return { ...movement, conceptoCodigo: concept.codigo, conceptoNombre: concept.nombre, conceptoCategoria: concept.categoria, original };
}

// Conceptos que el alumno aún puede pagar.
// - Los que habilitan la matrícula dependen SOLO de estudiantes.pago_matricula (base de datos):
//   si el alumno tiene deuda de matrícula siempre podrá pagarla, y si está habilitado no se le vuelve a cobrar.
// - El resto se oculta cuando ya fue pagado, salvo que el concepto sea repetible.
export function getAvailableConcepts(catalog, student, payments) {
  const paidCodes = new Set(payments.filter(p => p.estado === 'PAGADO').map(p => String(p.conceptoCodigo).toUpperCase()));
  const matriculaPagada = Boolean(student?.pago_matricula);
  const available = [];
  const hidden = [];
  catalog.forEach(c => {
    const yaPagado = c.liberaMatricula
      ? matriculaPagada
      : !c.permiteRepetir && paidCodes.has(String(c.codigo).toUpperCase());
    (yaPagado ? hidden : available).push(c);
  });
  return { available, hidden };
}

export const PAYMENT_METHODS = [
  { id: 'efectivo', nombre: 'Efectivo en Ventanilla', icono: 'Banknote', descripcion: 'Cobro en caja física del instituto' },
  { id: 'banco_nacion', nombre: 'Banco de la Nación (BN)', icono: 'Building2', descripcion: 'Depósito en cuenta o agente BN con N° Operación' },
  { id: 'yape_plin', nombre: 'Billetera Digital (Yape / Plin)', icono: 'QrCode', descripcion: 'Transferencia móvil con comprobante digital' },
  { id: 'tarjeta_pos', nombre: 'Tarjeta POS (Débito/Crédito)', icono: 'CreditCard', descripcion: 'Pago con tarjeta Visa / Mastercard en módulo' }
];

export const CAREERS_MAP = {
  2: 'Enfermería Técnica',
  3: 'Gestión Administrativa',
  4: 'Asistencia Administrativa',
  5: 'Contabilidad',
  6: 'Mecatrónica Automotriz',
  7: 'Electricidad Industrial',
  8: 'Administración de Operaciones Turísticas',
  9: 'Construcción Civil',
  10: 'Producción Agropecuaria',
  11: 'Manejo Forestal',
  15: 'Desarrollo de Sistemas de Información'
};
