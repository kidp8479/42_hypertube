// Real-browser auth flow coverage (auth flows get a Playwright test).
// Runs against an already-up stack (docker-compose or `make dev`) - it does
// not start the backend/DB itself, since the app needs a real Postgres.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'https://localhost:8443';

// The edge proxy (HYP-71) serves https://localhost with a self-signed
// certificate. Only that local origin is trusted, never an arbitrary host.
const trustLocalCertificate = baseURL.startsWith('https://localhost');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    ignoreHTTPSErrors: trustLocalCertificate,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
