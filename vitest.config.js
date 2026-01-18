import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/unit/**/*.test.js', '**/tests/api/**/*.test.js'],
    exclude: ['**/tests/e2e/**', '**/tests/*.spec.js', '**/node_modules/**'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/']
    },
    testTimeout: 10000
  }
});
