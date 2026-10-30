import { useMemo } from 'react';
import { qrToSvg } from './lib/qrcode';

// Código QR real (escaneable) generado a partir de un texto
export function QrCodeView({ value, className = '', title }) {
  const svg = useMemo(() => {
    try {
      return qrToSvg(value, { border: 1 });
    } catch (e) {
      console.error('No se pudo generar el código QR:', e);
      return '';
    }
  }, [value]);

  return (
    <div
      className={`[&>svg]:w-full [&>svg]:h-full ${className}`}
      title={title}
      role="img"
      aria-label={title || 'Código QR'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
