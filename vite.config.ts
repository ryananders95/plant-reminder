import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      pwaAssets: {
        config: true,
      },
      manifest: {
        name: 'PlantPapi',
        short_name: 'PlantPapi',
        description: 'Reminders to water, fertilize, and mist your houseplants',
        theme_color: '#2d6a4f',
        background_color: '#f6f8f6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
