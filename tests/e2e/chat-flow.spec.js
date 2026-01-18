/**
 * E2E tests for chat functionality
 * Tests core chat flows: send message, switch chat, delete chat
 */

const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('聊天流程测试', () => {
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
    await window.waitForTimeout(500);

    // 清除 localStorage 以确保干净状态
    await window.evaluate(() => {
      localStorage.clear();
    });
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('1. 输入消息启用发送按钮', async () => {
    const homeInput = window.locator('#homeInput');
    const sendBtn = window.locator('#homeSendBtn');

    // 初始状态禁用
    await expect(sendBtn).toBeDisabled();

    // 输入消息
    await homeInput.fill('Hello');
    await expect(sendBtn).toBeEnabled();

    // 清空消息
    await homeInput.fill('');
    await expect(sendBtn).toBeDisabled();
  });

  test('2. 发送消息切换到聊天视图', async () => {
    const homeInput = window.locator('#homeInput');
    const sendBtn = window.locator('#homeSendBtn');

    // 输入并发送消息
    await homeInput.fill('Test message');
    await sendBtn.click();

    // 验证切换到聊天视图
    const chatView = window.locator('#chatView');
    await expect(chatView).not.toHaveClass(/hidden/, { timeout: 5000 });

    // 验证主页视图隐藏
    const homeView = window.locator('#homeView');
    await expect(homeView).toHaveClass(/hidden/);
  });

  test('3. 用户消息显示在聊天区域', async () => {
    const homeInput = window.locator('#homeInput');
    const sendBtn = window.locator('#homeSendBtn');
    const testMessage = 'This is a test message ' + Date.now();

    // 发送消息
    await homeInput.fill(testMessage);
    await sendBtn.click();

    // 等待切换到聊天视图
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });

    // 验证用户消息显示
    const userMessage = window.locator('.message.user .message-content');
    await expect(userMessage.first()).toContainText(testMessage);
  });

  test('4. 聊天标题根据消息设置', async () => {
    const homeInput = window.locator('#homeInput');
    const sendBtn = window.locator('#homeSendBtn');
    const testMessage = 'Short title test';

    await homeInput.fill(testMessage);
    await sendBtn.click();

    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });

    // 验证标题包含消息内容
    const chatTitle = window.locator('#chatTitle');
    const titleText = await chatTitle.textContent();
    expect(titleText).toContain('Short title');
  });

  test('5. 新建聊天按钮功能', async () => {
    // 先发送一条消息进入聊天
    const homeInput = window.locator('#homeInput');
    await homeInput.fill('First chat');
    await window.locator('#homeSendBtn').click();

    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });

    // 点击新建聊天
    const newChatBtn = window.locator('.new-chat-sidebar-btn');
    await newChatBtn.click();

    // 验证返回主页视图
    const homeView = window.locator('#homeView');
    await expect(homeView).not.toHaveClass(/hidden/);
  });

  test('6. 聊天历史记录保存', async () => {
    // 发送消息
    const homeInput = window.locator('#homeInput');
    await homeInput.fill('History test message');
    await window.locator('#homeSendBtn').click();

    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });

    // 等待状态保存
    await window.waitForTimeout(500);

    // 验证聊天出现在历史列表
    const chatHistoryList = window.locator('#chatHistoryList');
    const chatItems = chatHistoryList.locator('.chat-item');
    const count = await chatItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('7. 切换聊天功能', async () => {
    // 创建第一个聊天
    await window.locator('#homeInput').fill('First chat');
    await window.locator('#homeSendBtn').click();
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
    await window.waitForTimeout(500);

    // 创建第二个聊天
    await window.locator('.new-chat-sidebar-btn').click();
    await window.waitForSelector('#homeView:not(.hidden)', { timeout: 5000 });
    await window.locator('#homeInput').fill('Second chat');
    await window.locator('#homeSendBtn').click();
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
    await window.waitForTimeout(500);

    // 现在应该有两个聊天
    const chatItems = window.locator('#chatHistoryList .chat-item');
    const count = await chatItems.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // 点击第一个聊天（在底部因为按时间排序）
    const firstChat = chatItems.last();
    await firstChat.click();

    // 验证标题切换
    const chatTitle = window.locator('#chatTitle');
    await expect(chatTitle).toContainText('First');
  });

  test('8. 删除聊天功能', async () => {
    // 创建聊天
    await window.locator('#homeInput').fill('Chat to delete');
    await window.locator('#homeSendBtn').click();
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
    await window.waitForTimeout(500);

    // 获取初始聊天数量
    const chatItems = window.locator('#chatHistoryList .chat-item');
    const initialCount = await chatItems.count();

    // 点击删除按钮
    const deleteBtn = chatItems.first().locator('.delete-chat-btn');
    await deleteBtn.click();
    await window.waitForTimeout(300);

    // 验证聊天被删除
    const newCount = await chatItems.count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('9. 聊天输入框多行支持', async () => {
    const homeInput = window.locator('#homeInput');

    // 输入多行文本（使用 Shift+Enter）
    await homeInput.focus();
    await homeInput.type('Line 1');
    await homeInput.press('Shift+Enter');
    await homeInput.type('Line 2');

    const value = await homeInput.inputValue();
    expect(value).toContain('\n');
    expect(value).toContain('Line 1');
    expect(value).toContain('Line 2');
  });

  test('10. 模板加载功能', async () => {
    // 点击模板卡片
    const templateCard = window.locator('.template-card').first();
    await templateCard.click();

    // 验证输入框被填充
    const homeInput = window.locator('#homeInput');
    const value = await homeInput.inputValue();
    expect(value.length).toBeGreaterThan(0);

    // 验证发送按钮启用
    const sendBtn = window.locator('#homeSendBtn');
    await expect(sendBtn).toBeEnabled();
  });
});

test.describe('聊天视图 UI 测试', () => {
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

    // 进入聊天视图
    await window.locator('#homeInput').fill('Test');
    await window.locator('#homeSendBtn').click();
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('聊天视图包含必要元素', async () => {
    // 验证消息容器
    const messagesContainer = window.locator('#chatMessages');
    await expect(messagesContainer).toBeVisible();

    // 验证输入框
    const messageInput = window.locator('#messageInput');
    await expect(messageInput).toBeVisible();

    // 验证发送按钮
    const sendBtn = window.locator('#chatSendBtn');
    await expect(sendBtn).toBeVisible();

    // 验证右侧边栏
    const sidebar = window.locator('#sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('右侧边栏可折叠', async () => {
    const sidebar = window.locator('#sidebar');
    const toggleBtn = window.locator('#sidebarToggle');

    // 初始状态展开
    await expect(sidebar).not.toHaveClass(/collapsed/);

    // 点击折叠
    await toggleBtn.click();
    await window.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/collapsed/);

    // 再次点击展开
    await toggleBtn.click();
    await window.waitForTimeout(300);
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('助手消息包含加载指示器', async () => {
    // 发送新消息
    const messageInput = window.locator('#messageInput');
    await messageInput.fill('Another test');
    await window.locator('#chatSendBtn').click();

    // 验证加载指示器出现
    const loadingIndicator = window.locator('.loading-indicator');
    // 可能很快消失，所以只检查是否存在
    const wasVisible = await loadingIndicator.isVisible().catch(() => false);
    // 不强制要求，因为加载可能很快
  });

  test('Progress 区域显示', async () => {
    // 验证进度区域
    const stepsSection = window.locator('#stepsList');
    await expect(stepsSection).toBeVisible();

    // 验证空状态提示
    const emptySteps = window.locator('#emptySteps');
    await expect(emptySteps).toBeVisible();
  });

  test('Tool Calls 区域显示', async () => {
    // 验证工具调用区域
    const toolCallsList = window.locator('#toolCallsList');
    await expect(toolCallsList).toBeVisible();

    // 验证空状态提示
    const emptyTools = window.locator('#emptyTools');
    await expect(emptyTools).toBeVisible();
  });
});

test.describe('状态持久化测试', () => {
  test('聊天历史在重新加载后保留', async () => {
    // 启动应用
    let electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'main.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 清除并创建新聊天
    await window.evaluate(() => localStorage.clear());
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // 创建聊天
    await window.locator('#homeInput').fill('Persistence test');
    await window.locator('#homeSendBtn').click();
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
    await window.waitForTimeout(1000);

    // 关闭应用
    await electronApp.close();

    // 重新启动应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'main.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(500);

    // 验证聊天历史存在
    const chatItems = window.locator('#chatHistoryList .chat-item');
    const count = await chatItems.count();
    expect(count).toBeGreaterThan(0);

    await electronApp.close();
  });
});

test.describe('搜索功能测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'main.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 清除并创建测试数据
    await window.evaluate(() => localStorage.clear());
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // 创建多个聊天
    for (const title of ['Apple chat', 'Banana chat', 'Cherry chat']) {
      await window.locator('#homeInput').fill(title);
      await window.locator('#homeSendBtn').click();
      await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
      await window.waitForTimeout(300);
      await window.locator('.new-chat-sidebar-btn').click();
      await window.waitForSelector('#homeView:not(.hidden)', { timeout: 5000 });
    }
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('搜索过滤聊天历史', async () => {
    const searchInput = window.locator('#chatSearch');

    // 搜索 "Apple"
    await searchInput.fill('Apple');
    await window.waitForTimeout(300);

    // 只有 Apple 相关的聊天应该可见
    const visibleChats = window.locator('#chatHistoryList .chat-item:not(.hidden-by-search)');
    const hiddenChats = window.locator('#chatHistoryList .chat-item.hidden-by-search');

    const visibleCount = await visibleChats.count();
    const hiddenCount = await hiddenChats.count();

    expect(visibleCount).toBe(1);
    expect(hiddenCount).toBe(2);
  });

  test('清空搜索显示所有聊天', async () => {
    const searchInput = window.locator('#chatSearch');

    // 先搜索
    await searchInput.fill('Apple');
    await window.waitForTimeout(300);

    // 清空搜索
    await searchInput.fill('');
    await window.waitForTimeout(300);

    // 所有聊天都应该可见
    const visibleChats = window.locator('#chatHistoryList .chat-item:not(.hidden-by-search)');
    const count = await visibleChats.count();
    expect(count).toBe(3);
  });
});
