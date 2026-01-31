/**
 * E2E tests for Electron app launch and basic UI
 * Run with: npm run test:e2e
 */

const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('应用启动测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // 启动 Electron 应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // 获取第一个窗口
    window = await electronApp.firstWindow();

    // 等待应用加载
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(500);
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('1. 应用窗口正常启动 @smoke', async () => {
    // 验证窗口存在
    expect(window).toBeTruthy();

    // 验证窗口标题
    const title = await window.title();
    expect(title).toBe('Claude');
  });

  test('2. 主页视图正确显示 @smoke', async () => {
    // 验证主页视图可见
    const homeView = window.locator('#homeView');
    await expect(homeView).toBeVisible();

    // 验证聊天视图隐藏
    const chatView = window.locator('#chatView');
    await expect(chatView).toHaveClass(/hidden/);
  });

  test('3. 左侧边栏元素存在', async () => {
    // 验证左侧边栏
    const leftSidebar = window.locator('.left-sidebar');
    await expect(leftSidebar).toBeVisible();

    // 验证 New Chat 按钮
    const newChatBtn = window.locator('.new-chat-sidebar-btn');
    await expect(newChatBtn).toBeVisible();

    // 验证搜索框
    const searchInput = window.locator('#chatSearch');
    await expect(searchInput).toBeVisible();
  });

  test('4. 输入框存在且可聚焦 @smoke', async () => {
    // 验证主页输入框
    const homeInput = window.locator('#homeInput');
    await expect(homeInput).toBeVisible();

    // 验证输入框可聚焦
    await homeInput.focus();
    const isFocused = await homeInput.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('5. 发送按钮初始状态为禁用', async () => {
    // 验证发送按钮初始禁用
    const sendBtn = window.locator('#homeSendBtn');
    await expect(sendBtn).toBeDisabled();

    // 输入文本后应启用
    const homeInput = window.locator('#homeInput');
    await homeInput.fill('test message');
    await expect(sendBtn).toBeEnabled();
  });

  test('6. 模型选择器存在', async () => {
    // 验证模型选择器
    const modelSelect = window.locator('#homeModelSelect');
    await expect(modelSelect).toBeVisible();

    // 验证有选项
    const options = await modelSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('7. 快速开始模板显示', async () => {
    // 验证快速开始模板区域
    const templates = window.locator('#quickStartTemplates');
    await expect(templates).toBeVisible();

    // 验证模板卡片存在
    const templateCards = window.locator('.template-card');
    const count = await templateCards.count();
    expect(count).toBe(3);
  });

  test('8. 控制按钮存在', async () => {
    // 验证附件按钮
    const attachBtn = window.locator('#homeAttachBtn');
    await expect(attachBtn).toBeVisible();

    // 验证思考模式按钮
    const thinkingBtn = window.locator('#homeThinkingBtn');
    await expect(thinkingBtn).toBeVisible();
  });

  test('9. 页面无 JavaScript 错误', async () => {
    const errors = [];

    // 监听控制台错误
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 等待一段时间收集错误
    await window.waitForTimeout(1000);

    // 过滤掉一些已知的非关键错误
    const criticalErrors = errors.filter(
      err =>
        !err.includes('favicon') &&
        !err.includes('net::ERR') &&
        !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('10. 应用响应式布局', async () => {
    // 获取初始窗口尺寸
    const initialSize = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    expect(initialSize.width).toBeGreaterThan(800);
    expect(initialSize.height).toBeGreaterThan(600);

    // 验证主要容器存在
    const appContainer = window.locator('.app-container');
    await expect(appContainer).toBeVisible();
  });
});

test.describe('窗口行为测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('应用只有一个窗口', async () => {
    const windows = electronApp.windows();
    expect(windows.length).toBe(1);
  });

  test('窗口可以正常关闭', async () => {
    // 关闭应用
    await electronApp.close();

    // 验证已关闭（通过检查进程）
    const isClosed = electronApp.process().killed || electronApp.process().exitCode !== null;
    expect(isClosed).toBe(true);
  });
});
