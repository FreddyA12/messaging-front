import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'http://localhost:8080'

  return {
    plugins: [react(), basicSsl()],
    define: {
      global: 'globalThis',
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https://cdn.jsdelivr.net http://localhost:8080",
          "connect-src 'self' ws://localhost:8080 wss://localhost:8080 http://localhost:8080 https://localhost:8080",
          "media-src 'self' blob:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "object-src 'none'",
          "worker-src 'self' blob:",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }
})
