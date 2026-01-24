import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      '**/tests/unit/**/*.test.js',
      '**/tests/api/**/*.test.js',
      '**/tests/integration/**/*.test.js'
    ],
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
        // Current baseline: 40% (up from 35%)
        // Next target: 50% after adding remaining module tests
        // Final target: 70% with full integration tests
        statements: 40,
        branches: 40,
        functions: 40,
        lines: 40
      }
    },
    testTimeout: 10000
  }
});
