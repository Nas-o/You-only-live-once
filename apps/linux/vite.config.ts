import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@yolo/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@yolo/desktop-ui': path.resolve(__dirname, '../../packages/desktop-ui/src/index.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5273,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome128',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
