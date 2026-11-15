import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#212529';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The app asks before activating a new version (see UpdatePrompt.tsx)
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'Organizador De Compras',
        short_name: 'Compras',
        description: 'Organize remessas de compra e compare promoções encontradas na internet.',
        lang: 'pt-BR',
        start_url: '/batches',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: THEME,
        background_color: THEME,
        categories: ['shopping', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Remessas', url: '/batches', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Dashboard', url: '/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
        // Android: "Compartilhar" a product link from any app straight into /share
        share_target: {
          action: '/share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Reads from the API: fresh when online, last known data when offline.
            // Writes (POST/PUT/DELETE) are never cached; the offline queue handles them.
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-reads',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  // A proxy/gateway answering for a backend that is down (5xx without the API's
                  // JSON body) counts as a network failure, so the cached copy is served instead
                  fetchDidSucceed: async ({ response }) => {
                    const isJson = (response.headers.get('content-type') || '').includes('json');
                    if (response.status >= 500 && !isJson) throw new Error(`Gateway ${response.status}`);
                    return response;
                  },
                  // Tag cache fallbacks so the app can tell the user it is showing saved data
                  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
                    if (!cachedResponse) return cachedResponse;
                    const headers = new Headers(cachedResponse.headers);
                    headers.set('X-From-SW-Cache', '1');
                    return new Response(await cachedResponse.blob(), {
                      status: cachedResponse.status,
                      statusText: cachedResponse.statusText,
                      headers,
                    });
                  },
                },
              ],
            },
          },
        ],
      },
      devOptions: {
        // Keep the service worker out of `npm run dev`; test with build + preview
        enabled: false,
      },
    }),
  ],
  // `/api` is proxied to the backend so the app can use VITE_API_URL=/api (same origin)
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' },
  },
  preview: {
    port: 4173,
    proxy: { '/api': 'http://localhost:8080' },
  },
});
