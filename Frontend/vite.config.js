import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      //  First priority: /api/auth → Node backend (port 5000)
       '/api/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
         '/api/candidate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      //  All other /api → Python backend (port 8000)
     '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    
    },
  },
})
