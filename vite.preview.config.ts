import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'preview'),
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 43173,
    strictPort: true,
  },
});
