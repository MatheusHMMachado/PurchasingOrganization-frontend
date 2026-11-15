import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Gera os ícones do PWA a partir de public/logo.svg: npm run generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#212529' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#212529' } },
  },
  images: ['public/logo.svg'],
});
