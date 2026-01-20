import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/unit/**/*.test.js', '**/tests/api/**/*.test.js'],
    exclude: ['**/tests/e2e/**', '**/tests/*.spec.js', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/', 'tests/', '**/*.config.js', 'main.js', 'preload.js'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60
      }
    },
    testTimeout: 10000
  }
});
