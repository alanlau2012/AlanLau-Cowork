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
        // Current baseline: 40% (matches actual coverage)
        // Target: 50% -> 70% with incremental test additions
        statements: 40,
        branches: 40,
        functions: 40,
        lines: 40
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
