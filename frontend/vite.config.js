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
    rollupOptions: {
      output: {
        manualChunks: {
          // Grouping React libraries into a separate chunk
          react: ['react', 'react-dom'],
          // Example: Grouping Material UI libraries
          'material-ui': ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 4173,
  },
});
