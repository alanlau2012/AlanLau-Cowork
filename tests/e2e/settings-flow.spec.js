/**
 * E2E tests for settings functionality
 * Tests settings UI interactions, persistence, and integration
 */

const { test, expect } = require('@playwright/test');
const { launchElectron, closeElectron, SELECTORS } = require('./fixtures');

test.describe('系统设置功能测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // launchElectron 默认会清除 localStorage
    const result = await launchElectron();
    electronApp = result.electronApp;
    window = result.window;
  });

  test.afterEach(async () => {
    await closeElectron(electronApp);
  });

  test('1. 设置按钮存在且可见', async () => {
    // 验证设置按钮存在
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
  });

  test('2. 点击设置按钮打开设置弹窗', async () => {
    const settingsBtn = window.locator(SELECTORS.settingsBtn);

    // 点击设置按钮
    await settingsBtn.click();
    await window.waitForTimeout(500);

    // 验证设置弹窗出现
    const settingsModal = window.locator(SELECTORS.settingsModal);
    await expect(settingsModal).not.toHaveClass(/hidden/, { timeout: 3000 });
  });

  test('3. 设置弹窗包含工作目录字段', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window.locator(SELECTORS.settingsModal);
    await expect(modal).not.toHaveClass(/hidden/, { timeout: 3000 });

    // 验证工作目录输入框
    const workspaceDir = window.locator(SELECTORS.workspaceDir);
    await expect(workspaceDir).toBeVisible();

    // 验证浏览按钮
    const browseBtn = window.locator(SELECTORS.browseWorkspaceBtn);
    await expect(browseBtn).toBeVisible();
  });

  test('4. 设置弹窗包含沙箱开关', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    // 验证沙箱开关
    const sandboxEnabled = window.locator(SELECTORS.sandboxEnabled);
    await expect(sandboxEnabled).toBeVisible();

    // 验证沙箱状态显示
    const sandboxStatus = window.locator(SELECTORS.sandboxStatus);
    await expect(sandboxStatus).toBeVisible();
  });

  test('5. 沙箱开关可以切换', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const sandboxEnabled = window.locator(SELECTORS.sandboxEnabled);
    const sandboxStatus = window.locator(SELECTORS.sandboxStatus);

    // 获取初始状态
    const initialChecked = await sandboxEnabled.isChecked();

    // 点击切换
    await sandboxEnabled.click();
    await window.waitForTimeout(300);

    // 验证状态改变
    const newChecked = await sandboxEnabled.isChecked();
    expect(newChecked).toBe(!initialChecked);
  });

  test('6. 系统诊断按钮存在', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    // 验证诊断按钮
    const diagnoseBtn = window.locator(SELECTORS.diagnoseBtn);
    await expect(diagnoseBtn).toBeVisible();
    await expect(diagnoseBtn).toHaveText('运行诊断');
  });

  test('7. 可以关闭设置弹窗', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window.locator(SELECTORS.settingsModal);
    await expect(modal).not.toHaveClass(/hidden/);

    // 点击关闭按钮
    const closeBtn = window.locator(SELECTORS.closeSettingsBtn);
    await closeBtn.click();
    await window.waitForTimeout(500);

    // 验证弹窗已关闭
    await expect(modal).toHaveClass(/hidden/, { timeout: 2000 });
  });

  test('8. 保存和恢复默认按钮存在', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    // 验证保存按钮
    const saveBtn = window.locator(SELECTORS.saveSettingsBtn);
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveText('保存设置');

    // 验证恢复默认按钮
    const resetBtn = window.locator(SELECTORS.resetSettingsBtn);
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveText('恢复默认');
  });

  test('9. 可以输入工作目录', async () => {
    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);

    // 输入工作目录
    const workspaceDir = window.locator(SELECTORS.workspaceDir);
    const testPath = 'D:\\TestWorkspace';
    await workspaceDir.fill(testPath);

    // 验证输入值
    const value = await workspaceDir.inputValue();
    expect(value).toBe(testPath);
  });
});

test.describe('设置Tab切换测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const result = await launchElectron();
    electronApp = result.electronApp;
    window = result.window;

    // 打开设置弹窗
    const settingsBtn = window.locator(SELECTORS.settingsBtn);
    await settingsBtn.click();
    await window.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await closeElectron(electronApp);
  });

  test('1. 验证两个设置Tab存在', async () => {
    // 验证常规设置Tab
    const generalTab = window.locator(SELECTORS.settingsTabGeneral);
    await expect(generalTab).toBeVisible();

    // 验证技能管理Tab
    const skillsTab = window.locator(SELECTORS.settingsTabSkills);
    await expect(skillsTab).toBeVisible();
  });

  test('2. 默认显示常规设置Tab', async () => {
    const generalTab = window.locator(SELECTORS.settingsTabGeneral);

    // 验证常规设置Tab激活
    await expect(generalTab).toHaveClass(/active/);

    // 验证常规设置内容可见
    const generalContent = window.locator('#settingsTab-general');
    await expect(generalContent).toHaveClass(/active/);
  });

  test('3. 切换到技能管理Tab', async () => {
    const skillsTab = window.locator(SELECTORS.settingsTabSkills);

    // 点击技能管理Tab
    await skillsTab.click();
    await window.waitForTimeout(300);

    // 验证技能管理Tab激活
    await expect(skillsTab).toHaveClass(/active/);

    // 验证技能管理内容可见
    const skillsContent = window.locator('#settingsTab-skills');
    await expect(skillsContent).toHaveClass(/active/);
  });

  test('4. 技能管理Tab包含技能列表', async () => {
    const skillsTab = window.locator(SELECTORS.settingsTabSkills);

    // 切换到技能管理Tab
    await skillsTab.click();
    await window.waitForTimeout(300);

    // 验证技能列表存在
    const skillsList = window.locator(SELECTORS.skillsList);
    await expect(skillsList).toBeVisible();

    // 验证技能搜索框存在
    const skillsSearch = window.locator(SELECTORS.skillsSearch);
    await expect(skillsSearch).toBeVisible();
  });
});

test.describe('主题切换测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const result = await launchElectron();
    electronApp = result.electronApp;
    window = result.window;
  });

  test.afterEach(async () => {
    await closeElectron(electronApp);
  });

  test('1. 主题切换按钮存在', async () => {
    const themeToggleBtn = window.locator(SELECTORS.themeToggleBtn);
    await expect(themeToggleBtn).toBeVisible();
  });

  test('2. 点击主题按钮可以切换主题', async () => {
    const themeToggleBtn = window.locator(SELECTORS.themeToggleBtn);
    const body = window.locator('body');

    // 获取初始主题状态
    const initialTheme = await body.evaluate(el => el.getAttribute('data-theme'));

    // 点击切换主题
    await themeToggleBtn.click();
    await window.waitForTimeout(300);

    // 验证主题改变
    const newTheme = await body.evaluate(el => el.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);
  });
});
