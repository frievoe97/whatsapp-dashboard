import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true, // Sourcemaps aktivieren
    // minify: 'terser', // Terser statt esbuild verwenden
  },
  optimizeDeps: {
    exclude: ['@mui/material', '@mui/x-date-pickers'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true,
    },
  },
});
