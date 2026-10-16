import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Dans Docker, "localhost" désigne le conteneur frontend lui-même.
// docker-compose définit VITE_PROXY_TARGET=http://backend:3000
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:3001'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target, changeOrigin: true }
    },
  allowedHosts: [
        'splashing-lip-drone.ngrok-free.dev', // exact host from the error
        // or, more convenient for ngrok free domains that change:
        // '.ngrok-free.dev',
      ],  
    }
})
