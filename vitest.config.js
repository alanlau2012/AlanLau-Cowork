import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // 启用并行执行以加速测试 (Vitest 4 配置)
    pool: 'threads',
    minThreads: 1,
    maxThreads: 4,
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
        // Updated target: 50% (up from 40%)
        // Final target: 70% with full integration tests
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50
      }
    },
    testTimeout: 10000
  },
  // Benchmark 配置
  bench: {
    include: ['**/tests/benchmark/**/*.bench.js'],
    reporters: ['default'],
    outputFile: './benchmark-results.json'
  }
});
