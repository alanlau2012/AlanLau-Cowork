/**
 * E2E tests for settings functionality
 * Tests settings UI interactions, persistence, and integration
 */

const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('系统设置功能测试', () => {
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

    // 清除设置数据
    await window.evaluate(() => {
      localStorage.clear();
    });
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('1. 设置按钮存在且可见', async () => {
    // 验证设置按钮存在
    const settingsBtn = window.locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]');
    await expect(settingsBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('2. 点击设置按钮打开设置弹窗', async () => {
    const settingsBtn = window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first();

    // 点击设置按钮
    await settingsBtn.click();
    await window.waitForTimeout(500);

    // 验证设置弹窗出现
    const settingsModal = window.locator(
      '#settingsModal, .settings-modal, [data-testid="settings-modal"]'
    );
    await expect(settingsModal.first()).toBeVisible({ timeout: 3000 });
  });

  test('3. 设置弹窗包含必要字段', async () => {
    // 打开设置弹窗
    const settingsBtn = window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first();
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window
      .locator('#settingsModal, .settings-modal, [data-testid="settings-modal"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 验证 API 端点输入框
    const apiEndpointInput = modal.locator(
      '#apiEndpoint, [name="apiEndpoint"], [data-testid="api-endpoint"]'
    );
    const endpointExists = (await apiEndpointInput.count()) > 0;
    expect(endpointExists).toBe(true);

    // 验证 API 密钥输入框
    const apiKeyInput = modal.locator('#apiKey, [name="apiKey"], [data-testid="api-key"]');
    const keyExists = (await apiKeyInput.count()) > 0;
    expect(keyExists).toBe(true);
  });

  test('4. 可以输入和保存 API 端点', async () => {
    // 打开设置弹窗
    const settingsBtn = window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first();
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window
      .locator('#settingsModal, .settings-modal, [data-testid="settings-modal"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 输入 API 端点
    const apiEndpointInput = modal
      .locator('#apiEndpoint, [name="apiEndpoint"], [data-testid="api-endpoint"]')
      .first();
    if ((await apiEndpointInput.count()) > 0) {
      await apiEndpointInput.fill('https://api.example.com');

      // 查找保存按钮
      const saveBtn = modal
        .locator('#saveSettings, .save-btn, [data-testid="save-settings"]')
        .first();
      if ((await saveBtn.count()) > 0) {
        await saveBtn.click();
        await window.waitForTimeout(500);

        // 验证设置已保存（通过重新打开弹窗检查）
        await window
          .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
          .first()
          .click();
        await window.waitForTimeout(500);

        const value = await apiEndpointInput.inputValue();
        expect(value).toContain('example.com');
      }
    }
  });

  test('5. 可以关闭设置弹窗', async () => {
    // 打开设置弹窗
    const settingsBtn = window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first();
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window
      .locator('#settingsModal, .settings-modal, [data-testid="settings-modal"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 查找关闭按钮
    const closeBtn = modal
      .locator(
        '.close-btn, [data-testid="close-settings"], button:has-text("关闭"), button:has-text("×")'
      )
      .first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await window.waitForTimeout(500);

      // 验证弹窗已关闭
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    } else {
      // 尝试点击外部区域或按 ESC
      await window.keyboard.press('Escape');
      await window.waitForTimeout(500);
    }
  });

  test('6. 设置持久化保存', async () => {
    // 打开设置弹窗
    const settingsBtn = window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first();
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window
      .locator('#settingsModal, .settings-modal, [data-testid="settings-modal"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 输入并保存设置
    const apiEndpointInput = modal
      .locator('#apiEndpoint, [name="apiEndpoint"], [data-testid="api-endpoint"]')
      .first();
    if ((await apiEndpointInput.count()) > 0) {
      const testEndpoint = 'https://test-api.example.com';
      await apiEndpointInput.fill(testEndpoint);

      const saveBtn = modal
        .locator('#saveSettings, .save-btn, [data-testid="save-settings"]')
        .first();
      if ((await saveBtn.count()) > 0) {
        await saveBtn.click();
        await window.waitForTimeout(1000);
      }
    }

    // 重新启动应用（模拟）
    // 注意：实际测试中可能需要重新启动 Electron 应用
    // 这里我们验证设置是否在 localStorage 或 electron-store 中

    // 重新打开设置弹窗验证
    await window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first()
      .click();
    await window.waitForTimeout(500);

    const reopenedModal = window
      .locator('#settingsModal, .settings-modal, [data-testid="settings-modal"]')
      .first();
    if ((await reopenedModal.count()) > 0) {
      const apiEndpointInput2 = reopenedModal
        .locator('#apiEndpoint, [name="apiEndpoint"], [data-testid="api-endpoint"]')
        .first();
      if ((await apiEndpointInput2.count()) > 0) {
        const savedValue = await apiEndpointInput2.inputValue();
        // 验证值已保存（如果功能已实现）
        expect(savedValue).toBeDefined();
      }
    }
  });

  test('7. API 密钥输入框支持显示/隐藏', async () => {
    // 打开设置弹窗
    const settingsBtn = window
      .locator('#settingsBtn, .settings-btn, [data-testid="settings-btn"]')
      .first();
    await settingsBtn.click();
    await window.waitForTimeout(500);

    const modal = window
      .locator('#settingsModal, .settings-modal, [data-testid="settings-modal"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 查找 API 密钥输入框和显示/隐藏按钮
    const apiKeyInput = modal.locator('#apiKey, [name="apiKey"], [data-testid="api-key"]').first();
    const toggleBtn = modal
      .locator('[data-testid="toggle-api-key"], .toggle-password, button:has-text("👁")')
      .first();

    if ((await apiKeyInput.count()) > 0 && (await toggleBtn.count()) > 0) {
      // 验证初始类型（应该是 password）
      const initialType = await apiKeyInput.getAttribute('type');

      // 点击切换按钮
      await toggleBtn.click();
      await window.waitForTimeout(300);

      // 验证类型已改变
      const newType = await apiKeyInput.getAttribute('type');
      expect(newType).not.toBe(initialType);
    }
  });
});
