import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/unit/**/*.test.js', '**/tests/api/**/*.test.js'],
    exclude: ['**/tests/e2e/**', '**/tests/*.spec.js', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['renderer/**/*.js', 'server/**/*.js'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        'main.js',
        'preload.js',
        'renderer/modules/logger.js',
        'renderer/modules/theme.js'
      ],
      thresholds: {
        statements: 35,
        branches: 35,
        functions: 35,
        lines: 35
      }
    },
    testTimeout: 10000
  }
});
