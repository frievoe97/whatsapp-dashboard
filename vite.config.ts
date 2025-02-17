import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true, // Aktiviert Sourcemaps im Produktions-Build
  },
  test: {
    globals: true, // Erlaubt die Nutzung von globalen Testfunktionen (describe, it, expect, …)
    environment: 'jsdom', // Simuliert den Browser-DOM
    setupFiles: './vitest.setup.ts',
    coverage: {
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true, // Falls Tests fehlschlagen, trotzdem Coverage erzeugen
    },
  },
});
