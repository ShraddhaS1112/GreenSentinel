import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api/* requests to the Express backend on port 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // No rewrite needed — backend routes already start with /api
      },
    },
  },
})
