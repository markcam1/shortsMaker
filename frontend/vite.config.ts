import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: env.FRONTEND_PORT ? parseInt(env.FRONTEND_PORT) : 5173,
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
  }
})
