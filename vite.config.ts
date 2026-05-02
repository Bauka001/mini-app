import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'clsx'],
          'vendor-utils': ['i18next', 'react-i18next', 'zustand'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ton': ['@tonconnect/ui-react'],
          'vendor-charts': ['recharts'],
          'vendor-twa': ['@twa-dev/sdk']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
