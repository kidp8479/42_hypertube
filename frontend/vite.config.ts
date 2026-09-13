import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Host dev (`make dev-frontend`) reaches the backend on localhost; inside the
// compose network it is the `backend` service. docker-compose sets the env var.
const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: forward every /api/* call to the NestJS backend and strip
    // the prefix, so the browser talks to a single origin (no CORS) and
    // the code path matches a same-origin production deploy.
    proxy: {
      '/api': {
        target: apiProxyTarget,
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
    // e2e/ holds Playwright specs, run separately via `npm run test:e2e` -
    // vitest's default include would otherwise try (and fail) to run them.
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
