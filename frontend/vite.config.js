import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // Ensure correct routing in deployment
  resolve: {
    alias: {
      '@contexts': '/src/contexts',
    },
  },
  build: {
    outDir: 'dist', 
  },
  server: {
    port: 3000, 
  },
  preview: {
    port: 4173, 
  },
});
