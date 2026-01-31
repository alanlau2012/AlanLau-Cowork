const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  testIgnore: ['**/unit/**', '**/api/**'],
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry'
  },
  // 项目配置：支持 smoke 测试和完整测试
  projects: [
    {
      name: 'smoke',
      testMatch: /.*\.spec\.js$/,
      grep: /@smoke/,
      timeout: 30000,
      use: {
        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'off'
      }
    },
    {
      name: 'full',
      testMatch: /.*\.spec\.js$/,
      timeout: 60000,
      use: {
        screenshot: 'on',
        video: 'on',
        trace: 'on-first-retry'
      }
    }
  ],
  // 视觉回归测试配置
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2
    }
  },
  // 截图输出目录
  snapshotDir: './tests/screenshots'
});
