import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Skip Vite's auto-injection — we register the SW ourselves in
      // src/pwa.ts so we can disable registration inside the Telegram
      // WebView (where service workers are unreliable and add no value).
      injectRegister: false,
      registerType: 'autoUpdate',
      // tonconnect-manifest.json is intentionally NOT precached: vercel.json
      // sends it with no-cache/no-store so wallets always pick up the latest
      // copy. Including it in the SW precache would defeat that and serve
      // stale manifests until the next SW update activates.
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Focus — Brain Training',
        short_name: 'Focus',
        description: 'Daily brain training mini-app: focus, memory, logic, speed, flexibility.',
        theme_color: '#0f0f13',
        background_color: '#0f0f13',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App-shell precache — built JS/CSS/HTML/images/svg/manifests/fonts.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff,woff2}'],
        // The /api/* surface is dynamic; never let the SW intercept or cache
        // backend traffic. Same for the TonConnect bridge endpoints.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'supabase-storage', expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*$/,
            handler: 'CacheFirst',
            options: { cacheName: 'avatars', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
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
