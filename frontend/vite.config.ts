import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: forward every /api/* call to the NestJS backend and strip
    // the prefix, so the browser talks to a single origin (no CORS) and
    // the code path matches a same-origin production deploy.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Resolve *.module.css imports in tests instead of throwing on them.
    css: true,
    // Reset mock state between tests, matching the backend jest config.
    clearMocks: true,
  },
});
