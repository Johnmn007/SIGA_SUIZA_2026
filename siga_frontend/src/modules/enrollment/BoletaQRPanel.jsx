import { useState, useEffect, useRef } from 'react';
import { QrCode, ScanLine, Camera, StopCircle, Search, FileText, X, Upload } from 'lucide-react';
import { SectionInfoBlock } from './SectionInfoBlock';
import { getPaymentByQr, getAvailablePayments } from '../../services/paymentService';
import jsQR from 'jsqr';

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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const lastScanRef = useRef(0);
  const fileInputRef = useRef(null);

  const stopScanner = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const consultarFinanzas = async (code) => {
    setConsultando(true);
    setConsultaMsg('');
    try {
      const data = await getPaymentByQr(code);
      setPaymentData(data);
      const codigoRecibo = data?.codigoRecibo || data?.codigo_recibo || data?.payment_id;
      if (codigoRecibo) setScannedCode(codigoRecibo);
      setConsultaMsg('Datos recibidos del módulo Finanzas y Pagos.');
      setStatus('BOLETA VÁLIDA');
    } catch(e) {
      const mensaje = e?.message;
      setConsultaMsg(mensaje === 'PAGO_NO_ENCONTRADO'
        ? 'No se encontró una boleta de pago con ese código en Tesorería.'
        : mensaje === 'FINANZAS_NO_DISPONIBLE'
          ? 'No se pudo conectar con el módulo de Finanzas y Pagos. Intente nuevamente.'
          : (mensaje || 'No se pudo consultar la boleta. Intente nuevamente.'));
      setStatus('BOLETA NO VÁLIDA');
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

  const scanFrame = (timestamp = 0) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (timestamp - lastScanRef.current < 150) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    lastScanRef.current = timestamp;

    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
        if (result?.data) {
          onScanSuccess(result.data);
          return;
        }
      }
    }
    animationRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    setCameraError('');
    setStatus('QR NO LEÍDO / BOLETA NO SELECCIONADA');
    setScannedCode('');
    setPaymentData(null);
    setConsultaMsg('');
    stopScanner();
    setScanning(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no disponible');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Video no disponible');
      }
      video.srcObject = stream;
      await video.play();
      animationRef.current = requestAnimationFrame(scanFrame);
    } catch(e) {
      console.error(e);
      stopScanner();
      setCameraError(e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Habilite el acceso en el navegador.'
        : 'No se pudo acceder a la cámara. Verifique permisos.');
    }
  };

  const handleQrImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCameraError('');
    setStatus('QR NO LEÍDO / BOLETA NO SELECCIONADA');
    setScannedCode('');
    setPaymentData(null);
    setConsultaMsg('');
    stopScanner();

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas no disponible');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
        if (result?.data) {
          onScanSuccess(result.data);
        } else {
          setCameraError('No se pudo detectar un código QR en la imagen.');
        }
      } catch (error) {
        console.error(error);
        setCameraError('No se pudo leer la imagen seleccionada.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setCameraError('No se pudo abrir la imagen seleccionada.');
    };
    image.src = objectUrl;
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
      setFinanceError(e?.message === 'FINANZAS_NO_DISPONIBLE'
        ? 'No se pudo conectar con Finanzas y Pagos. Verifique que el servicio esté disponible.'
        : 'No se pudieron consultar las boletas. Intente nuevamente.');
    } finally {
      setFinanceLoading(false);
    }
  };

  const handleFinanceSearch = async (e) => {
    e.preventDefault();
    await fetchFinanceBoletas(financeSearch);
  };

  const selectFinanceBoleta = (boleta) => {
    const identifier = boleta.codigoRecibo || boleta.qr_code || boleta.payment_id || boleta.codigo ||
      boleta.boleta_codigo || boleta.receipt_number || boleta.numero_boleta || '';
    setShowFinanceModal(false);
    setScannedCode(identifier);
    setStatus('BOLETA VÁLIDA');
    setPaymentData(boleta);
    setCameraError('');
    setConsultaMsg('Datos recibidos del módulo Finanzas y Pagos.');
    setConsultando(false);
  };

  const getBoletaField = (b, keys, fallback = '-') => {
    for (const key of keys) {
      const value = key.split('.').reduce((current, part) => current?.[part], b);
      if (value !== undefined && value !== null && value !== '') return value;
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
    return getBoletaField(b, ['estudianteNombre', 'estudiante_nombre', 'alumno'], '-');
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
          <button onClick={() => fileInputRef.current?.click()} className='px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-2'>
            <Upload size={18}/> Subir imagen QR
          </button>
          <button onClick={openFinanceModal} className='px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-2'>
            <FileText size={18}/> Consultar boleta en Finanzas
          </button>
        </div>
        <div className='mb-4'>
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className={`w-full max-w-md rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`}
          />
          <canvas ref={canvasRef} className='hidden' />
          <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleQrImage} />
        </div>
        {cameraError && (<div className='mt-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium'>{cameraError}</div>)}
        <div className='mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50'>
          <div className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-1'>Estado</div>
          <div className='font-bold text-slate-800'>{status}</div>
          {scannedCode && (<div className='mt-2'><div className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-1'>Identificador</div><div className='font-mono font-bold text-slate-800 break-all'>{scannedCode}</div></div>)}
          {consultando && (<div className='mt-2 text-sm text-slate-600'>Consultando Finanzas y Pagos...</div>)}
          {consultaMsg && (<div className='mt-2 text-sm text-slate-700'>{consultaMsg}</div>)}
        </div>
        {paymentData && (<div className='mt-4 p-4 rounded-xl border border-green-200 bg-green-50'>
          <div className='font-extrabold text-green-700 mb-2'>BOLETA LISTA PARA MATRÍCULA / BOLETA ENCONTRADA</div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700'>
            {getBoletaField(paymentData, ['codigoRecibo', 'payment_id', 'receipt_number', 'boleta_codigo', 'numero_boleta'], '') && (
              <div><span className='font-bold'>Boleta:</span> {getBoletaField(paymentData, ['codigoRecibo', 'payment_id', 'receipt_number', 'boleta_codigo', 'numero_boleta'])}</div>
            )}
            <div><span className='font-bold'>Estudiante:</span> {getEstudianteNombre(paymentData)}</div>
            {getBoletaField(paymentData, ['dni', 'estudiante.dni'], '') && (
              <div><span className='font-bold'>DNI:</span> {getBoletaField(paymentData, ['dni', 'estudiante.dni'])}</div>
            )}
            {getBoletaField(paymentData, ['monto', 'amount'], '') !== '' && (
              <div><span className='font-bold'>Monto:</span> {getBoletaField(paymentData, ['monto', 'amount'])}</div>
            )}
            {getBoletaField(paymentData, ['fechaHora', 'fecha', 'fecha_emision', 'fecha_pago'], '') && (
              <div><span className='font-bold'>Fecha:</span> {getBoletaField(paymentData, ['fechaHora', 'fecha', 'fecha_emision', 'fecha_pago'])}</div>
            )}
            {getBoletaField(paymentData, ['estado', 'status'], '') && (
              <div><span className='font-bold'>Estado:</span> {getBoletaField(paymentData, ['estado', 'status'])}</div>
            )}
            {getBoletaField(paymentData, ['conceptoNombre', 'concepto', 'concept'], '') && (
              <div><span className='font-bold'>Concepto:</span> {getBoletaField(paymentData, ['conceptoNombre', 'concepto', 'concept'])}</div>
            )}
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
                            {getBoletaField(boleta, ['codigoRecibo', 'numero_boleta', 'receipt_number', 'boleta_codigo', 'payment_id', 'codigo'])}
                          </td>
                          <td className='py-3 px-4 text-sm text-slate-800'>{getEstudianteNombre(boleta)}</td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['dni', 'estudiante.dni'], '-')}</td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['carreraNombre', 'carrera_nombre', 'programa', 'carrera', 'programa_nombre'], '-')}</td>
                          <td className='py-3 px-4 text-sm font-medium text-slate-800'>{getBoletaField(boleta, ['monto', 'amount'], '-')}</td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['conceptoNombre', 'concepto_nombre', 'concepto', 'concept'], '-')}</td>
                          <td className='py-3 px-4 text-sm'>
                            <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
                              {getBoletaField(boleta, ['estado', 'status'], '-')}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-sm text-slate-600'>{getBoletaField(boleta, ['fechaHora', 'fecha', 'fecha_emision', 'fecha_pago'], '-')}</td>
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
