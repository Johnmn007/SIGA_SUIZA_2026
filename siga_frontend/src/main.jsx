import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Verificación pública de comprobantes de Tesorería (al escanear el QR); no requiere iniciar sesión
// (El QR de las boletas abre public/boleta.html, una página liviana fuera de esta app)
const params = new URLSearchParams(window.location.search)
const isPublicVerification = params.has('recibo') || params.has('estado-cuenta')
const PublicVerification = lazy(() => import('./modules/finances/PublicVerification.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPublicVerification ? (
      <Suspense fallback={null}>
        <PublicVerification />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
