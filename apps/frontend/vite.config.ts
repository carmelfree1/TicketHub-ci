import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const previewHostAllowlist = ['.e2b.app', 'localhost'];
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
  },
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // A new version waits for the person's consent (see AppStatusBanners) so it cannot interrupt a payment.
        registerType: 'prompt',
        // public/manifest.webmanifest is the single source of truth and is linked from index.html.
        manifest: false,
        injectRegister: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: '/index.html',
          // API calls, the payment webhook and robots must never be answered by the app shell.
          navigateFallbackDenylist: [/^\/api\//, /^\/robots\.txt$/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            // Only static font assets are cached at runtime. No /api response is ever stored by the service worker.
            { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-styles' } },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-files', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: previewHostAllowlist,
      proxy: apiProxy,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: previewHostAllowlist,
      proxy: apiProxy,
    },
  };
});
