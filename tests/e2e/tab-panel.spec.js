/**
 * E2E tests for Tab Panel system
 * Tests the right sidebar tab functionality (Timeline | Files)
 */

const { test, expect } = require('@playwright/test');
const { launchElectron, closeElectron, enterChatView, SELECTORS } = require('./fixtures');

test.describe('Tab面板系统功能测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // 启动 Electron 应用
    const result = await launchElectron();
    electronApp = result.electronApp;
    window = result.window;

    // 进入聊天视图以查看右侧面板
    await enterChatView(window, 'Test for tab panel');
    await window.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await closeElectron(electronApp);
  });

  test('1. 验证Tab导航存在', async () => {
    // 验证右侧面板存在
    const sidebar = window.locator(SELECTORS.sidebar);
    await expect(sidebar).toBeVisible();

    // 验证 Tab 导航容器存在
    const panelTabs = window.locator(SELECTORS.panelTabs);
    await expect(panelTabs).toBeVisible();
  });

  test('2. 验证两个Tab按钮存在', async () => {
    // 验证时间线Tab
    const timelineTab = window.locator(SELECTORS.timelineTab);
    await expect(timelineTab).toBeVisible();
    await expect(timelineTab).toHaveText('时间线');

    // 验证文件变更Tab
    const filesTab = window.locator(SELECTORS.filesTab);
    await expect(filesTab).toBeVisible();
    await expect(filesTab).toHaveText('文件变更');
  });

  test('3. 验证默认选中时间线Tab', async () => {
    const timelineTab = window.locator(SELECTORS.timelineTab);
    const filesTab = window.locator(SELECTORS.filesTab);

    // 验证时间线Tab有active类
    await expect(timelineTab).toHaveClass(/active/);

    // 验证文件变更Tab没有active类
    await expect(filesTab).not.toHaveClass(/active/);
  });

  test('4. 验证Tab内容区切换 - 时间线', async () => {
    // 验证时间线面板可见
    const tabTimeline = window.locator(SELECTORS.tabTimeline);
    await expect(tabTimeline).toBeVisible();
    await expect(tabTimeline).toHaveClass(/active/);

    // 验证文件面板隐藏
    const tabFiles = window.locator(SELECTORS.tabFiles);
    await expect(tabFiles).not.toHaveClass(/active/);
  });

  test('5. 验证Tab内容区切换 - 文件变更', async () => {
    const filesTab = window.locator(SELECTORS.filesTab);
    const tabTimeline = window.locator(SELECTORS.tabTimeline);
    const tabFiles = window.locator(SELECTORS.tabFiles);

    // 点击文件变更Tab
    await filesTab.click();
    await window.waitForTimeout(300);

    // 验证文件面板可见
    await expect(tabFiles).toHaveClass(/active/);

    // 验证时间线面板隐藏
    await expect(tabTimeline).not.toHaveClass(/active/);
  });

  test('6. 验证Tab切换后激活状态正确', async () => {
    const timelineTab = window.locator(SELECTORS.timelineTab);
    const filesTab = window.locator(SELECTORS.filesTab);

    // 切换到文件变更Tab
    await filesTab.click();
    await window.waitForTimeout(300);

    // 验证文件变更Tab激活
    await expect(filesTab).toHaveClass(/active/);
    await expect(timelineTab).not.toHaveClass(/active/);

    // 切换回时间线Tab
    await timelineTab.click();
    await window.waitForTimeout(300);

    // 验证时间线Tab激活
    await expect(timelineTab).toHaveClass(/active/);
    await expect(filesTab).not.toHaveClass(/active/);
  });

  test('7. 验证时间线空状态显示', async () => {
    // 验证时间线面板的空状态
    const emptyTimeline = window.locator(SELECTORS.emptyTimeline);
    await expect(emptyTimeline).toBeVisible();
    await expect(emptyTimeline).toHaveText('暂无执行记录');
  });

  test('8. 验证文件变更空状态显示', async () => {
    const filesTab = window.locator(SELECTORS.filesTab);

    // 切换到文件变更Tab
    await filesTab.click();
    await window.waitForTimeout(300);

    // 验证文件变更面板的空状态
    const emptyFiles = window.locator(SELECTORS.emptyFiles);
    await expect(emptyFiles).toBeVisible();
    await expect(emptyFiles).toHaveText('暂无文件变更');
  });

  test('9. 验证列表容器存在', async () => {
    // 验证时间线列表容器
    const timelineList = window.locator(SELECTORS.timelineList);
    await expect(timelineList).toBeVisible();

    // 切换到文件变更Tab
    const filesTab = window.locator(SELECTORS.filesTab);
    await filesTab.click();
    await window.waitForTimeout(300);

    // 验证文件变更列表容器
    const fileChangesList = window.locator(SELECTORS.fileChangesList);
    await expect(fileChangesList).toBeVisible();
  });
});

test.describe('右侧边栏折叠功能测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const result = await launchElectron();
    electronApp = result.electronApp;
    window = result.window;

    // 进入聊天视图
    await enterChatView(window);
    await window.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await closeElectron(electronApp);
  });

  test('1. 侧边栏折叠按钮存在', async () => {
    const sidebarToggle = window.locator(SELECTORS.sidebarToggle);
    await expect(sidebarToggle).toBeVisible();
  });

  test('2. 点击折叠按钮可以折叠侧边栏', async () => {
    const sidebar = window.locator(SELECTORS.sidebar);
    const sidebarToggle = window.locator(SELECTORS.sidebarToggle);

    // 初始状态未折叠
    await expect(sidebar).not.toHaveClass(/collapsed/);

    // 点击折叠
    await sidebarToggle.click();
    await window.waitForTimeout(300);

    // 验证已折叠
    await expect(sidebar).toHaveClass(/collapsed/);
  });

  test('3. 再次点击展开侧边栏', async () => {
    const sidebar = window.locator(SELECTORS.sidebar);
    const sidebarToggle = window.locator(SELECTORS.sidebarToggle);

    // 折叠
    await sidebarToggle.click();
    await window.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/collapsed/);

    // 展开
    await sidebarToggle.click();
    await window.waitForTimeout(300);
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });
});
