import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In dev, the Express backend is run separately on :3001 (`node server/index.js`).
    // We proxy /api/* through Vite so the frontend code only ever speaks to its
    // own origin — same as production on Vercel where the API lives at /api/*.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'clsx', 'tailwind-merge'],
          'vendor-utils': ['i18next', 'react-i18next', 'zustand'],
          'vendor-charts': ['recharts'],
          'vendor-tonconnect': ['@tonconnect/ui-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-twa': ['@twa-dev/sdk'],
        }
      }
    },
    chunkSizeWarningLimit: 700,
  }
})
