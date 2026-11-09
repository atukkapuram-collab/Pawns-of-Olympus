import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// base './' keeps every asset path relative, so one dist/ folder works on
// GitHub Pages (project sub-path), itch.io, or any static folder.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        gallery: resolve(import.meta.dirname, 'gallery.html'),
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['src/core/**'], reporter: ['text-summary'] },
  },
});
