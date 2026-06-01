import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
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
