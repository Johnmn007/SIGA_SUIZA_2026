// Catálogo Oficial de Tasas Educativas y Aranceles (TUPA) - IESTP Suiza 2026
export const TUPA_CONCEPTS = [
  {
    id: 'MAT-01',
    codigo: 'MAT-01',
    nombre: 'Derecho de Matrícula Regular 2026-I',
    categoria: 'Matrícula',
    monto: 120.00,
    liberaMatricula: true,
    descripcion: 'Inscripción y ratificación del periodo académico regular 2026-I.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'MAT-02',
    codigo: 'MAT-02',
    nombre: 'Matrícula Extemporánea 2026-I',
    categoria: 'Matrícula',
    monto: 150.00,
    liberaMatricula: true,
    descripcion: 'Inscripción académica fuera del cronograma ordinario oficial.',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'CAR-01',
    codigo: 'CAR-01',
    nombre: 'Carnet Estudiantil / Fotocheck Institucional',
    categoria: 'Identificación',
    monto: 15.00,
    liberaMatricula: false,
    descripcion: 'Expedición y laminado de carnet de estudiante con código QR y chip de acceso.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'CAR-02',
    codigo: 'CAR-02',
    nombre: 'Duplicado de Carnet Estudiantil',
    categoria: 'Identificación',
    monto: 20.00,
    liberaMatricula: false,
    descripcion: 'Emisión por pérdida, deterioro o robo de carnet estudiantil.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'CON-01',
    codigo: 'CON-01',
    nombre: 'Constancia de Matrícula y Estudios',
    categoria: 'Certificaciones',
    monto: 20.00,
    liberaMatricula: false,
    descripcion: 'Acreditación formal del ciclo, semestre y programa de estudio matriculado.',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    id: 'CON-02',
    codigo: 'CON-02',
    nombre: 'Constancia de No Adeudo Institucional',
    categoria: 'Certificaciones',
    monto: 15.00,
    liberaMatricula: false,
    descripcion: 'Certificación de libre deuda con biblioteca, talleres y tesorería.',
    badge: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'CER-01',
    codigo: 'CER-01',
    nombre: 'Certificado Modular Oficial (DOC-10/15)',
    categoria: 'Certificaciones',
    monto: 50.00,
    liberaMatricula: false,
    descripcion: 'Emisión de diploma de Certificación Modular con valor oficial MINEDU.',
    badge: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'EXA-01',
    codigo: 'EXA-01',
    nombre: 'Examen Extraordinario / Recuperación',
    categoria: 'Evaluación',
    monto: 30.00,
    liberaMatricula: false,
    descripcion: 'Derecho a evaluación extraordinaria por unidad didáctica no aprobada.',
    badge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'TIT-01',
    codigo: 'TIT-01',
    nombre: 'Derecho de Titulación Profesional Técnico',
    categoria: 'Grados y Títulos',
    monto: 250.00,
    liberaMatricula: false,
    descripcion: 'Revisión de expediente, asesoría de proyecto y expedición de Título a Nombre de la Nación.',
    badge: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  {
    id: 'TRM-01',
    codigo: 'TRM-01',
    nombre: 'Convalidación y Reconocimiento de Asignaturas',
    categoria: 'Trámites',
    monto: 80.00,
    liberaMatricula: false,
    descripcion: 'Evaluación técnica de syllabus y tabla de equivalencias por traslado o reingreso.',
    badge: 'bg-slate-100 text-slate-700 border-slate-300'
  }
];

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

// Helper: Genera el historial completo de pagos realizados por el estudiante durante todo el año
export function getStudentAnnualPayments(student, allTransactions = []) {
  if (!student) return [];
  const payments = [];

  // 1. Pago de Admisión del Estudiante (obtenido de metadata_admision o generado por derecho de ingreso 2026)
  const meta = student.metadata_admision || {};
  const costoAdm = parseFloat(meta['S/. COSTO (S/. 250):']) || 250.00;
  const fechaAdmRaw = meta['Fecha de inscripcion:'];
  const fechaAdm = fechaAdmRaw ? new Date(fechaAdmRaw).toLocaleDateString() : '04/04/2026';
  const codigoAdm = meta['CODIGO'] || (student.id * 7 % 900 + 100);
  const modalidadAdm = student.modalidad_admision || meta['MODALIDAD (EBR O EBA)'] || 'ORDINARIO';

  payments.push({
    id: `adm-${student.id}`,
    codigoRecibo: `ADM-2026-${String(codigoAdm).padStart(5, '0')}`,
    fechaHora: `${fechaAdm}, 08:30:00`,
    estudianteNombre: `${student.nombres} ${student.apellidos}`,
    dni: student.dni,
    codigoEstudiante: student.codigo_estudiante,
    carreraNombre: CAREERS_MAP[student.programa_id] || 'General',
    conceptoCodigo: 'ADM-01',
    conceptoNombre: `Derecho de Inscripción y Carpeta de Admisión 2026 (${modalidadAdm})`,
    conceptoCategoria: 'Admisión Institucional',
    monto: costoAdm,
    metodoPagoId: 'banco_nacion',
    metodoPagoNombre: 'Banco de la Nación (Cta. Admisión)',
    numeroOperacion: `BN-${String(student.dni).slice(0, 6)}`,
    estado: 'PAGADO',
    cajero: 'Comisión Central de Admisión 2026',
    liberaMatricula: false
  });

  // 2. Transacciones registradas en caja para este estudiante
  const studentTx = allTransactions.filter(t => 
    String(t.estudianteId) === String(student.id) || 
    (t.dni && String(t.dni) === String(student.dni))
  );

  studentTx.forEach(tx => {
    payments.push({
      ...tx,
      estado: 'PAGADO'
    });
  });

  // 3. Matrícula regular: si student.pago_matricula === true y no estaba ya en studentTx
  const hasMatriculaTx = studentTx.some(p => p.conceptoCodigo === 'MAT-01' || p.conceptoCodigo === 'MAT-02');
  if (student.pago_matricula && !hasMatriculaTx) {
    payments.push({
      id: `mat-${student.id}`,
      codigoRecibo: `REC-2026-${String(student.id * 17 % 90000 + 10000)}`,
      fechaHora: '15/10/2026, 09:30:00',
      estudianteNombre: `${student.nombres} ${student.apellidos}`,
      dni: student.dni,
      codigoEstudiante: student.codigo_estudiante,
      carreraNombre: CAREERS_MAP[student.programa_id] || 'General',
      conceptoCodigo: 'MAT-01',
      conceptoNombre: 'Derecho de Matrícula Regular 2026-I',
      conceptoCategoria: 'Matrícula',
      monto: 120.00,
      metodoPagoId: 'banco_nacion',
      metodoPagoNombre: 'Banco de la Nación (BN)',
      numeroOperacion: `BN-94${String(student.dni).slice(0, 4)}`,
      estado: 'PAGADO',
      cajero: 'Caja Central - Tesorería',
      liberaMatricula: true
    });
  } else if (!student.pago_matricula && !hasMatriculaTx) {
    // Compromiso pendiente de matrícula
    payments.push({
      id: `pending-mat-${student.id}`,
      codigoRecibo: 'PENDIENTE',
      fechaHora: 'Vence: 30/10/2026',
      estudianteNombre: `${student.nombres} ${student.apellidos}`,
      dni: student.dni,
      codigoEstudiante: student.codigo_estudiante,
      carreraNombre: CAREERS_MAP[student.programa_id] || 'General',
      conceptoCodigo: 'MAT-01',
      conceptoNombre: 'Derecho de Matrícula Regular 2026-I',
      conceptoCategoria: 'Matrícula',
      monto: 120.00,
      metodoPagoId: 'pendiente',
      metodoPagoNombre: 'Pendiente en Caja',
      numeroOperacion: '-',
      estado: 'PENDIENTE',
      cajero: '-',
      liberaMatricula: true
    });
  }

  return payments;
}
