import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/setupTests.js'],
    globals: true,
    css: true,
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    }
  },
  esbuild: {
    jsx: 'automatic',
    jsxDev: true
  }
});
