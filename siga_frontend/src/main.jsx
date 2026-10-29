import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Verificación pública de comprobantes de Tesorería (al escanear el QR); no requiere iniciar sesión
const params = new URLSearchParams(window.location.search)
const isPublicBoleta = params.has('boleta')
const isPublicVerification = params.has('recibo') || params.has('estado-cuenta')
const PublicBoleta = lazy(() => import('./modules/finances/PublicBoleta.jsx'))
const PublicVerification = lazy(() => import('./modules/finances/PublicVerification.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPublicBoleta ? (
      <Suspense fallback={null}>
        <PublicBoleta />
      </Suspense>
    ) : isPublicVerification ? (
      <Suspense fallback={null}>
        <PublicVerification />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
