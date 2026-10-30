import { useState, useEffect, useRef } from 'react';
import { QrCode, ScanLine, Camera, StopCircle, Search, FileText, X } from 'lucide-react';
import { SectionInfoBlock } from './SectionInfoBlock';
import { getPaymentByQr, getAvailablePayments } from '../../services/paymentService';
import { Html5Qrcode } from 'html5-qrcode/esm/index.js';

export function BoletaQRPanel() {
  const [status, setStatus] = useState('QR NO LEÍDO / BOLETA NO SELECCIONADA');
  const [scannedCode, setScannedCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [paymentData, setPaymentData] = useState(null);
  const [consultaMsg, setConsultaMsg] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeBoletas, setFinanceBoletas] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState('');
  const [financeSearch, setFinanceSearch] = useState('');
  const scannerRef = useRef(null);
  const readerId = 'qr-reader';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch(e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);

  const consultarFinanzas = async (code) => {
    setConsultando(true);
    setConsultaMsg('');
    try {
      const data = await getPaymentByQr(code);
      setPaymentData(data);
      setConsultaMsg('Datos recibidos del módulo Finanzas y Pagos.');
      setStatus('PENDIENTE DE VALIDACIÓN');
    } catch(e) {
      setConsultaMsg('Código QR leído, pero el módulo Finanzas y Pagos aún no está disponible para validar este pago.');
      setStatus('PENDIENTE DE VALIDACIÓN');
      setPaymentData(null);
    } finally {
      setConsultando(false);
    }
  };

  const onScanSuccess = async (decodedText) => {
    const code = (decodedText || '').trim();
    if (!code) return;
    setScannedCode(code);
    setStatus('Código QR leído correctamente');
    setCameraError('');
    setPaymentData(null);
    setConsultaMsg('');
    await stopScanner();
    await consultarFinanzas(code);
  };

  const startCamera = async () => {
    setCameraError(''); 
    setStatus('QR NO LEÍDO / BOLETA NO SELECCIONADA'); 
    setScannedCode(''); 
    setPaymentData(null); 
    setConsultaMsg('');
    try {
      if (scannerRef.current) await stopScanner();
      const html5QrCode = new Html5Qrcode(readerId);
      scannerRef.current = html5QrCode;
      setScanning(true);
      await html5QrCode.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, () => {});
    } catch(e) {
      console.error(e);
      setCameraError('No se pudo acceder a la cámara. Verifique permisos.');
      setScanning(false);
      scannerRef.current = null;
    }
  };

  const openFinanceModal = async () => {
    setShowFinanceModal(true);
    setFinanceError('');
    setFinanceSearch('');
    await fetchFinanceBoletas();
  };

  const fetchFinanceBoletas = async (searchTerm = '') => {
    setFinanceLoading(true);
    setFinanceError('');
    try {
      const filters = {
        status: 'PAGADO',
        concepto: 'MATRICULA',
        used: false
      };
      if (searchTerm && searchTerm.trim()) {
        filters.q = searchTerm.trim();
      }
      const boletas = await getAvailablePayments(filters);
      setFinanceBoletas(Array.isArray(boletas) ? boletas : []);
    } catch (e) {
      setFinanceBoletas([]);
      setFinanceError('Finanzas y Pagos aún no dispone de un servicio para consultar boletas.');
    } finally {
      setFinanceLoading(false);
    }
  };

  const handleFinanceSearch = async (e) => {
    e.preventDefault();
    await fetchFinanceBoletas(financeSearch);
  };

  const selectFinanceBoleta = async (boleta) => {
    const identifier = boleta.qr_code || boleta.payment_id || boleta.codigo || boleta.boleta_codigo || boleta.receipt_number || boleta.numero_boleta || '';
    setShowFinanceModal(false);
    setScannedCode(identifier);
    setStatus('Boleta seleccionada desde Finanzas');
    setPaymentData(boleta);
    setCameraError('');
    setConsultaMsg('');
    setConsultando(true);
    try {
      if (identifier) {
        const data = await getPaymentByQr(identifier);
        setPaymentData(data);
        setConsultaMsg('Datos recibidos del módulo Finanzas y Pagos.');
        setStatus('PENDIENTE DE VALIDACIÓN');
      } else {
        setConsultaMsg('Datos recibidos del módulo Finanzas y Pagos.');
        setStatus('PENDIENTE DE VALIDACIÓN');
      }
    } catch (e) {
      setConsultaMsg('Código QR leído, pero el módulo Finanzas y Pagos aún no está disponible para validar este pago.');
      setStatus('PENDIENTE DE VALIDACIÓN');
    } finally {
      setConsultando(false);
    }
  };

  const getBoletaField = (b, keys, fallback = '-') => {
    for (let k of keys) {
      if (b[k] !== undefined && b[k] !== null && b[k] !== '') return b[k];
    }
    return fallback;
  };

  const getEstudianteNombre = (b) => {
    if (b.estudiante && typeof b.estudiante === 'object') {
      const n = ((b.estudiante.nombres || b.estudiante.nombre || '') + ' ' + (b.estudiante.apellidos || b.estudiante.apellido || '')).trim();
      if (n) return n;
    }
    const n2 = ((b.nombres || b.nombre_estudiante || '') + ' ' + (b.apellidos || b.apellido_estudiante || '')).trim();
    if (n2) return n2;
    return getBoletaField(b, ['estudiante_nombre', 'alumno'], '-');
  };

  return (
    <div className='animate-fade-in space-y-6'>
      <SectionInfoBlock icon={QrCode} ghostIcon={ScanLine} title='3. Validación de Boleta QR' description={<>
        La boleta y el código QR son emitidos por el módulo Finanzas y Pagos. Gestión Académica únicamente lee y valida el pago para continuar con el proceso de matrícula.
      </>} chips={['Validación','Escaneo QR','Consulta a Finanzas']} />
      <div className='glass-card p-6'>
        <h5 className='font-bold text-slate-800 mb-3'>Validación de Boleta QR</h5>
        <p className='text-sm text-slate-600 mb-4'>La boleta y el QR son emitidos por Finanzas y Pagos.</p>
        <div className='flex flex-wrap gap-3 mb-4'>
          {!scanning ? (
            <button onClick={startCamera} className='btn-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2'>
              <Camera size={18}/> Escanear con cámara
            </button>
          ) : (
            <button onClick={stopScanner} className='px-5 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-2'>
              <StopCircle size={18}/> Detener cámara
            </button>
          )}
          <button onClick={openFinanceModal} className='px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-2'>
            <FileText size={18}/> Consultar boleta en Finanzas
          </button>
        </div>
        <div className='mb-4'><div id={readerId} className='w-full max-w-md'></div></div>
        {cameraError && (<div className='mt-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium'>{cameraError}</div>)}
        <div className='mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50'>
          <div className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-1'>Estado</div>
          <div className='font-bold text-slate-800'>{status}</div>
          {scannedCode && (<div className='mt-2'><div className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-1'>Identificador</div><div className='font-mono font-bold text-slate-800'>{scannedCode}</div></div>)}
          {consultando && (<div className='mt-2 text-sm text-slate-600'>Consultando Finanzas y Pagos...</div>)}
          {consultaMsg && (<div className='mt-2 text-sm text-slate-700'>{consultaMsg}</div>)}
        </div>
        {paymentData && (<div className='mt-4 p-4 rounded-xl border border-green-200 bg-green-50'>
          <div className='font-extrabold text-green-700 mb-2'>BOLETA LISTA PARA MATRÍCULA / BOLETA ENCONTRADA</div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700'>
            {(paymentData.payment_id || paymentData.receipt_number || paymentData.boleta_codigo || paymentData.numero_boleta) && <div><span className='font-bold'>Boleta:</span> {paymentData.payment_id || paymentData.receipt_number || paymentData.boleta_codigo || paymentData.numero_boleta}</div>}
            <div><span className='font-bold'>Estudiante:</span> {getEstudianteNombre(paymentData)}</div>
            {(paymentData.dni || paymentData.estudiante?.dni) && <div><span className='font-bold'>DNI:</span> {paymentData.dni || paymentData.estudiante?.dni}</div>}
            {(paymentData.amount !== undefined || paymentData.monto !== undefined) && <div><span className='font-bold'>Monto:</span> {paymentData.amount !== undefined ? paymentData.amount : paymentData.monto}</div>}
            {(paymentData.fecha || paymentData.fecha_emision || paymentData.fecha_pago) && <div><span className='font-bold'>Fecha:</span> {paymentData.fecha || paymentData.fecha_emision || paymentData.fecha_pago}</div>}
            {(paymentData.status || paymentData.estado) && <div><span className='font-bold'>Estado:</span> {paymentData.status || paymentData.estado}</div>}
            {(paymentData.concept || paymentData.concepto) && <div><span className='font-bold'>Concepto:</span> {paymentData.concept || paymentData.concepto}</div>}
          </div>
        </div>)}
      </div>

      {showFinanceModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50'>
          <div className='bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl'>
            <div className='flex items-center justify-between p-6 border-b border-slate-200'>
              <h3 className='text-xl font-bold text-slate-800'>Boletas disponibles en Finanzas y Pagos</h3>
              <button onClick={() => setShowFinanceModal(false)} className='p-2 hover:bg-slate-100 rounded-lg'>
                <X size={20} />
              </button>
            </div>
            <div className='p-6 border-b border-slate-200'>
              <form onSubmit={handleFinanceSearch} className='flex gap-3'>
                <div className='flex-1 relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400' size={18} />
                  <input
                    type='text'
                    value={financeSearch}
                    onChange={(e) => setFinanceSearch(e.target.value)}
                    placeholder='Buscar por DNI, código, estudiante o número de boleta'
                    className='w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
                <button type='submit' className='px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700'>
                  Buscar
                </button>
              </form>
            </div>
            <div className='flex-1 overflow-auto p-6'>
              {financeLoading && <div className='text-center py-8 text-slate-600'>Cargando boletas...</div>}
              {financeError && <div className='text-center py-8 text-amber-700 bg-amber-50 rounded-xl p-4'>{financeError}</div>}
              {!financeLoading && !financeError && financeBoletas.length === 0 && (
                <div className='text-center py-8 text-slate-600'>No hay boletas disponibles</div>
              )}
              {!financeLoading && !financeError && financeBoletas.length > 0 && (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-slate-200'>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>N° Boleta</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Estudiante</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>DNI</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Programa</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Monto</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Concepto</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Estado</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Fecha</th>
                        <th className='text-left py-3 px-4 font-bold text-slate-700 text-sm'>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeBoletas.map((boleta, idx) => (
                        <tr key={idx} className='border-b border-slate-100 hover:bg-slate-50'>
                          <td className='py-3 px-4 text-sm font-mono text-slate-800'>
                            {getBoletaField(boleta, ['numero_boleta', 'receipt_number', 'boleta_codigo', 'payment_id', 'codigo'])}
                          </td>
                          <td className='py-3 px-4 text-sm text-slate-800'>{getEstudianteNombre(boleta)}</td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['dni', 'estudiante.dni'], '-')}</td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['programa', 'carrera', 'programa_nombre'], '-')}</td>
                          <td className='py-3 px-4 text-sm font-medium text-slate-800'>{getBoletaField(boleta, ['monto', 'amount'], '-')}</td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['concepto', 'concept'], '-')}</td>
                          <td className='py-3 px-4 text-sm'>
                            <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
                              {getBoletaField(boleta, ['estado', 'status'], '-')}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['fecha', 'fecha_emision', 'fecha_pago'], '-')}</td>
                          <td className='py-3 px-4'>
                            <button
                              onClick={() => selectFinanceBoleta(boleta)}
                              className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700'
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoletaQRPanel;
