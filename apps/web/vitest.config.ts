import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Keep a single worker to avoid tinypool failures in sandboxed runs.
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Limit to app tests to avoid running node_modules suites.
    include: ['lib/__tests__/**/*.test.ts'],
    exclude: ['e2e/**'],
  },
});
