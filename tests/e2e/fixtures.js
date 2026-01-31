/**
 * E2E Test Fixtures - Shared Electron startup and cleanup utilities
 * Provides consistent test setup across all E2E test files
 */

const { _electron: electron } = require('playwright');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  timeout: 30000,
  waitForLoadTimeout: 10000
};

/**
 * 启动 Electron 应用
 * @param {Object} options - 可选配置
 * @returns {Promise<{electronApp: ElectronApplication, window: Page}>}
 */
async function launchElectron(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const clearStorage = options.clearStorage !== false; // 默认清除 localStorage

  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    },
    timeout: config.timeout
  });

  // 获取第一个窗口
  const window = await electronApp.firstWindow();

  // 等待应用加载
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(300);

  // 默认清除 localStorage 确保测试隔离
  if (clearStorage) {
    await window.evaluate(() => {
      localStorage.clear();
    });
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(300);
  }

  return { electronApp, window };
}

/**
 * 清理 Electron 应用
 * @param {ElectronApplication} electronApp - Electron 应用实例
 */
async function closeElectron(electronApp) {
  if (electronApp) {
    try {
      await electronApp.close();
    } catch (error) {
      console.warn('Error closing Electron app:', error.message);
    }
  }
}

/**
 * 清除 localStorage 并重新加载页面
 * @param {Page} window - Playwright Page 对象
 */
async function clearStorageAndReload(window) {
  await window.evaluate(() => {
    localStorage.clear();
  });
  await window.reload();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(300);
}

/**
 * 等待元素可见
 * @param {Page} window - Playwright Page 对象
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒）
 */
async function waitForVisible(window, selector, timeout = 5000) {
  await window.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * 等待元素隐藏
 * @param {Page} window - Playwright Page 对象
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒）
 */
async function waitForHidden(window, selector, timeout = 5000) {
  await window.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * 进入聊天视图（发送测试消息）
 * @param {Page} window - Playwright Page 对象
 * @param {string} message - 测试消息内容
 */
async function enterChatView(window, message = 'Test message') {
  const homeInput = window.locator('#homeInput');
  const sendBtn = window.locator('#homeSendBtn');

  await homeInput.fill(message);
  await sendBtn.click();

  // 等待切换到聊天视图
  await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
}

/**
 * 截图保存（用于调试）
 * @param {Page} window - Playwright Page 对象
 * @param {string} name - 截图文件名
 */
async function takeScreenshot(window, name) {
  await window.screenshot({ path: `test-results/${name}.png` });
}

// 应用预期常量
const APP_CONSTANTS = {
  TITLE: 'GTS Cowork',
  TEMPLATE_COUNT: 6,
  TAB_COUNT: 2
};

// 选择器常量
const SELECTORS = {
  // 视图
  homeView: '#homeView',
  chatView: '#chatView',

  // 首页元素
  homeInput: '#homeInput',
  homeSendBtn: '#homeSendBtn',
  homeStopBtn: '#homeStopBtn',
  homeModelSelect: '#homeModelSelect',
  homeAttachBtn: '#homeAttachBtn',
  homeThinkingBtn: '#homeThinkingBtn',
  quickStartTemplates: '#quickStartTemplates',
  templateCard: '.template-card',

  // 聊天视图元素
  chatMessages: '#chatMessages',
  messageInput: '#messageInput',
  chatSendBtn: '#chatSendBtn',
  chatTitle: '#chatTitle',
  chatHistoryList: '#chatHistoryList',
  chatItem: '.task-item', // Chat items use task-item class
  chatItemTitle: '.task-title',
  deleteChatBtn: '.delete-chat-btn',
  userMessage: '.message.user',
  userMessageContent: '.message.user .message-content',
  assistantMessage: '.message.assistant',
  assistantMessageContent: '.message.assistant .message-content',

  // 侧边栏
  leftSidebar: '.left-sidebar',
  newChatBtn: '.new-chat-sidebar-btn',
  chatSearch: '#chatSearch',
  settingsBtn: '#settingsBtn',
  themeToggleBtn: '#themeToggleBtn',

  // 右侧面板
  sidebar: '#sidebar',
  sidebarToggle: '#sidebarToggle',
  panelTabs: '.panel-tabs',
  panelTab: '.panel-tab',
  timelineTab: '.panel-tab[data-tab="timeline"]',
  filesTab: '.panel-tab[data-tab="files"]',
  tabTimeline: '#tab-timeline',
  tabFiles: '#tab-files',
  timelineList: '#timelineList',
  fileChangesList: '#fileChangesList',
  emptyTimeline: '#emptyTimeline',
  emptyFiles: '#emptyFiles',

  // 设置弹窗
  settingsModal: '#settingsModal',
  closeSettingsBtn: '#closeSettingsBtn',
  saveSettingsBtn: '#saveSettingsBtn',
  resetSettingsBtn: '#resetSettingsBtn',
  workspaceDir: '#workspaceDir',
  browseWorkspaceBtn: '#browseWorkspaceBtn',
  sandboxEnabled: '#sandboxEnabled',
  sandboxStatus: '#sandboxStatus',
  diagnoseBtn: '#diagnoseBtn',
  diagnoseResult: '#diagnoseResult',
  settingsTabGeneral: '.settings-tab[data-tab="general"]',
  settingsTabSkills: '.settings-tab[data-tab="skills"]',
  skillsList: '#skillsList',
  skillsSearch: '#skillsSearch'
};

module.exports = {
  launchElectron,
  closeElectron,
  clearStorageAndReload,
  waitForVisible,
  waitForHidden,
  enterChatView,
  takeScreenshot,
  APP_CONSTANTS,
  SELECTORS
};
