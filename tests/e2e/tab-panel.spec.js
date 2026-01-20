const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Tab面板系统功能测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // 启动Electron应用
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
    await window.waitForTimeout(1000); // 等待初始化完成
  });

  test.afterEach(async () => {
    // 关闭应用
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('P3.1: 验证Tab按钮存在且排列正确', async () => {
    console.log('📋 测试P3.1: 验证Tab按钮...');

    // 等待右侧边栏加载
    await window.waitForSelector('.right-panel, .sidebar', { timeout: 5000 });

    // 验证Tab导航存在
    const tabList = window.locator('.panel-tabs[role="tablist"]');
    await expect(tabList).toBeVisible();
    console.log('✅ Tab导航存在');

    // 验证三个Tab按钮存在
    const progressTab = window.locator('#tab-progress');
    const toolsTab = window.locator('#tab-tools');
    const filesTab = window.locator('#tab-files');

    await expect(progressTab).toBeVisible();
    await expect(toolsTab).toBeVisible();
    await expect(filesTab).toBeVisible();
    console.log('✅ 三个Tab按钮都存在');

    // 验证默认选中进度Tab
    await expect(progressTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ 默认选中进度Tab');

    // 截图
    await window.screenshot({ path: 'test-results/tab-panel-tabs-exist.png' });
  });

  test('P3.2: 验证Tab激活状态和下划线', async () => {
    console.log('🎨 测试P3.2: 验证Tab激活状态...');

    await window.waitForSelector('.panel-tabs', { timeout: 5000 });

    const progressTab = window.locator('#tab-progress');
    const toolsTab = window.locator('#tab-tools');

    // 验证进度Tab有激活状态
    await expect(progressTab).toHaveAttribute('aria-selected', 'true');

    // 验证激活Tab有下划线（通过CSS ::after伪元素）
    const hasUnderline = await progressTab.evaluate(el => {
      const style = window.getComputedStyle(el, '::after');
      return style.content !== 'none' && style.height !== '0px';
    });
    expect(hasUnderline).toBeTruthy();
    console.log('✅ 激活Tab有下划线');

    // 切换到工具Tab
    await toolsTab.click();
    await window.waitForTimeout(300);

    // 验证工具Tab激活
    await expect(toolsTab).toHaveAttribute('aria-selected', 'true');
    await expect(progressTab).toHaveAttribute('aria-selected', 'false');
    console.log('✅ Tab切换状态正确');

    // 截图
    await window.screenshot({ path: 'test-results/tab-panel-active-state.png' });
  });

  test('P3.3: 验证Tab内容区切换', async () => {
    console.log('🔄 测试P3.3: 验证Tab内容区切换...');

    await window.waitForSelector('.panel-tabs', { timeout: 5000 });

    const progressTab = window.locator('#tab-progress');
    const toolsTab = window.locator('#tab-tools');
    const filesTab = window.locator('#tab-files');

    const progressPane = window.locator('#pane-progress');
    const toolsPane = window.locator('#pane-tools');
    const filesPane = window.locator('#pane-files');

    // 验证初始状态：进度Pane可见，其他隐藏
    await expect(progressPane).not.toHaveAttribute('hidden', '');
    await expect(toolsPane).toHaveAttribute('hidden', '');
    await expect(filesPane).toHaveAttribute('hidden', '');
    console.log('✅ 初始状态正确');

    // 切换到工具Tab
    await toolsTab.click();
    await window.waitForTimeout(300);

    await expect(toolsPane).not.toHaveAttribute('hidden', '');
    await expect(progressPane).toHaveAttribute('hidden', '');
    await expect(filesPane).toHaveAttribute('hidden', '');
    console.log('✅ 切换到工具Tab后内容区正确');

    // 切换到文件Tab
    await filesTab.click();
    await window.waitForTimeout(300);

    await expect(filesPane).not.toHaveAttribute('hidden', '');
    await expect(toolsPane).toHaveAttribute('hidden', '');
    await expect(progressPane).toHaveAttribute('hidden', '');
    console.log('✅ 切换到文件Tab后内容区正确');

    // 截图
    await window.screenshot({ path: 'test-results/tab-panel-pane-switch.png' });
  });

  test('P11.1: 验证Tab切换功能', async () => {
    console.log('🔄 测试P11.1: 验证Tab切换功能...');

    await window.waitForSelector('.panel-tabs', { timeout: 5000 });

    const progressTab = window.locator('#tab-progress');
    const toolsTab = window.locator('#tab-tools');
    const filesTab = window.locator('#tab-files');

    // 依次切换所有Tab
    await toolsTab.click();
    await window.waitForTimeout(300);
    await expect(toolsTab).toHaveAttribute('aria-selected', 'true');

    await filesTab.click();
    await window.waitForTimeout(300);
    await expect(filesTab).toHaveAttribute('aria-selected', 'true');

    await progressTab.click();
    await window.waitForTimeout(300);
    await expect(progressTab).toHaveAttribute('aria-selected', 'true');

    console.log('✅ Tab切换功能正常');
  });

  test('P11.2: 验证Tab键盘导航', async () => {
    console.log('⌨️ 测试P11.2: 验证Tab键盘导航...');

    await window.waitForSelector('.panel-tabs', { timeout: 5000 });

    const progressTab = window.locator('#tab-progress');
    const toolsTab = window.locator('#tab-tools');
    const filesTab = window.locator('#tab-files');

    // 聚焦到进度Tab
    await progressTab.focus();
    await expect(progressTab).toBeFocused();

    // 按右箭头键切换到工具Tab
    await progressTab.press('ArrowRight');
    await window.waitForTimeout(300);
    await expect(toolsTab).toBeFocused();
    await expect(toolsTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ ArrowRight导航正常');

    // 按右箭头键切换到文件Tab
    await toolsTab.press('ArrowRight');
    await window.waitForTimeout(300);
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ ArrowRight继续导航正常');

    // 按左箭头键切换回工具Tab
    await filesTab.press('ArrowLeft');
    await window.waitForTimeout(300);
    await expect(toolsTab).toBeFocused();
    await expect(toolsTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ ArrowLeft导航正常');

    // 按Home键切换到第一个Tab
    await toolsTab.press('Home');
    await window.waitForTimeout(300);
    await expect(progressTab).toBeFocused();
    await expect(progressTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ Home键导航正常');

    // 按End键切换到最后一个Tab
    await progressTab.press('End');
    await window.waitForTimeout(300);
    await expect(filesTab).toBeFocused();
    await expect(filesTab).toHaveAttribute('aria-selected', 'true');
    console.log('✅ End键导航正常');
  });

  test('P11.4: 验证Tab Badge计数', async () => {
    console.log('🔢 测试P11.4: 验证Tab Badge计数...');

    await window.waitForSelector('.panel-tabs', { timeout: 5000 });

    const progressBadge = window.locator('#badge-progress');
    const toolsBadge = window.locator('#badge-tools');
    const filesBadge = window.locator('#badge-files');

    // 验证Badge初始为空（不显示）
    const progressBadgeText = await progressBadge.textContent();
    expect(progressBadgeText || '').toBe('');
    console.log('✅ Badge初始为空');

    // TODO: 测试Badge更新功能（需要实现addFileChange和updateTabBadge后）
    // 这里先验证Badge元素存在
    await expect(progressBadge).toBeVisible();
    await expect(toolsBadge).toBeVisible();
    await expect(filesBadge).toBeVisible();
    console.log('✅ Badge元素存在');
  });

  test('P9.2: 验证文件变更空状态', async () => {
    console.log('📁 测试P9.2: 验证文件变更空状态...');

    await window.waitForSelector('.panel-tabs', { timeout: 5000 });

    // 切换到文件Tab
    const filesTab = window.locator('#tab-files');
    await filesTab.click();
    await window.waitForTimeout(300);

    // 验证空状态存在
    const emptyState = window.locator('#filesEmpty');
    await expect(emptyState).toBeVisible();

    const emptyText = await emptyState.textContent();
    expect(emptyText).toContain('暂无文件变更');
    console.log('✅ 文件变更空状态显示正确');
  });
});
