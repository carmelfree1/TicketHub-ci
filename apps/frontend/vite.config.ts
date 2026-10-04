import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { legalGuardPlugin } from './build/legal-guard';
import { materialIconsPlugin } from './build/material-icons';
import { seoPlugin } from './build/seo';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
  },
};

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, projectRoot, ''), ...process.env };
  return {
    plugins: [
      react(),
      materialIconsPlugin(path.resolve(projectRoot, 'src')),
      legalGuardPlugin(env),
      seoPlugin(env),
      tailwindcss(),
      VitePWA({
        // A new version waits for the person's consent (see AppStatusBanners) so it cannot interrupt a payment.
        registerType: 'prompt',
        // public/manifest.webmanifest is the single source of truth and is linked from index.html.
        manifest: false,
        injectRegister: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          // Vietnamese glyphs are never needed for French; do not make every phone download them.
          globIgnores: ['**/*vietnamese*'],
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
    build: {
      // No data: URIs: the production CSP does not allow them, and small files cache better as separate assets.
      assetsInlineLimit: 0,
    },
    server: {
      host: '0.0.0.0',
      proxy: apiProxy,
    },
    preview: {
      host: '0.0.0.0',
      proxy: apiProxy,
    },
  };
});
