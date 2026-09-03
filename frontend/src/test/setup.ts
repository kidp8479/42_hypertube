import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// jsdom keeps localStorage across tests in a file; the auth layer stores a
// token there, so wipe it between tests to stop one test leaking into the next.
afterEach(() => {
  localStorage.clear();
});
