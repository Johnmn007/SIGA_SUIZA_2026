import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Genera /config.js en el build para que las páginas estáticas (boleta.html)
// también apunten al backend remoto configurado en Vercel.
function runtimeConfigPlugin(env) {
  return {
    name: 'siga-runtime-config',
    apply: 'build',
    closeBundle() {
      const config = {
        apiBase: (env.VITE_API_URL || '').replace(/\/+$/, ''),
        wsBase: (env.VITE_WS_URL || '').replace(/\/+$/, ''),
      }
      writeFileSync(
        resolve(process.cwd(), 'dist', 'config.js'),
        `window.__SIGA_CONFIG__ = ${JSON.stringify(config)};\n`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), runtimeConfigPlugin(env)],
    optimizeDeps: {
      include: ['html5-qrcode']
    },
    server: {
      watch: {
        usePolling: true,
      },
      host: true, // needed for docker
      proxy: {
        '/api': {
          target: 'http://siga-core:8000',
          changeOrigin: true
        },
        '/auth': {
          target: 'http://siga-core:8000',
          changeOrigin: true
        },
        '/core': {
          target: 'http://siga-core:8000',
          changeOrigin: true
        },
        '/ws': {
          target: 'http://siga-core:8000',
          changeOrigin: true,
          ws: true
        }
      }
    }
  }
})
