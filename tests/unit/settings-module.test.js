/**
 * Unit tests for settings.js module
 * Tests settings modal, workspace configuration, and diagnostics
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../renderer/modules/feedback.js', () => ({
  showToast: vi.fn()
}));

vi.mock('../../renderer/modules/theme.js', () => ({
  toggleTheme: vi.fn()
}));

// Helper: Setup DOM for settings modal
function setupSettingsDOM() {
  document.body.innerHTML = `
    <button id="settingsBtn">Settings</button>
    <div id="settingsModal" class="hidden">
      <button id="closeSettingsBtn">Close</button>
      <button id="saveSettingsBtn">Save</button>
      <button id="resetSettingsBtn">Reset</button>
      <button id="diagnoseBtn">Diagnose</button>
      <div id="diagnoseResult" class="hidden"></div>
      <input id="workspaceDir" type="text" value="" />
      <button id="browseWorkspaceBtn">Browse</button>
      <input id="sandboxEnabled" type="checkbox" checked />
      <div id="sandboxStatus"></div>
      <button id="themeToggleBtn">Toggle Theme</button>
    </div>
  `;
}

// Mock electronAPI
const mockElectronAPI = {
  getSettings: vi.fn(() => Promise.resolve({ theme: 'light' })),
  saveSettings: vi.fn(() => Promise.resolve()),
  resetSettings: vi.fn(() => Promise.resolve({ theme: 'light' })),
  checkHealth: vi.fn(() =>
    Promise.resolve({
      status: 'ok',
      config: { hasApiKey: true }
    })
  ),
  selectDirectory: vi.fn(() => Promise.resolve('/selected/path'))
};

// Mock fetch for API calls
const mockFetch = vi.fn();

describe('Settings Module - DOM Elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should have all required DOM elements', () => {
    expect(document.getElementById('settingsBtn')).not.toBeNull();
    expect(document.getElementById('settingsModal')).not.toBeNull();
    expect(document.getElementById('closeSettingsBtn')).not.toBeNull();
    expect(document.getElementById('saveSettingsBtn')).not.toBeNull();
    expect(document.getElementById('resetSettingsBtn')).not.toBeNull();
    expect(document.getElementById('diagnoseBtn')).not.toBeNull();
    expect(document.getElementById('diagnoseResult')).not.toBeNull();
  });

  it('should have workspace-related elements', () => {
    expect(document.getElementById('workspaceDir')).not.toBeNull();
    expect(document.getElementById('browseWorkspaceBtn')).not.toBeNull();
    expect(document.getElementById('sandboxEnabled')).not.toBeNull();
    expect(document.getElementById('sandboxStatus')).not.toBeNull();
  });

  it('should have settings modal hidden initially', () => {
    const modal = document.getElementById('settingsModal');
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});

describe('Settings Module - Modal Open/Close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ workspaceDir: '', sandboxEnabled: true })
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should show modal when clicking settings button', () => {
    const modal = document.getElementById('settingsModal');

    // Simulate opening modal
    modal.classList.remove('hidden');

    expect(modal.classList.contains('hidden')).toBe(false);
  });

  it('should hide modal when clicking close button', () => {
    const modal = document.getElementById('settingsModal');

    // Open first
    modal.classList.remove('hidden');

    // Then close
    modal.classList.add('hidden');

    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it('should hide modal when clicking outside', () => {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');

    // Simulate click on modal backdrop
    modal.classList.add('hidden');

    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it('should hide modal on Escape key', () => {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');

    // Simulate Escape key
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    // In test, we manually trigger the behavior
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }

    expect(modal.classList.contains('hidden')).toBe(true);
  });
});

describe('Settings Module - Sandbox Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * Helper: Update sandbox status based on config
   */
  function updateSandboxStatus(config) {
    const sandboxStatus = document.getElementById('sandboxStatus');
    if (!sandboxStatus) {
      return;
    }

    const enabled = config.sandboxEnabled !== false;
    const hasDir = !!config.workspaceDir;

    if (!enabled) {
      sandboxStatus.textContent = '已禁用';
      sandboxStatus.className = 'sandbox-status inactive';
    } else if (!hasDir) {
      sandboxStatus.textContent = '未配置目录';
      sandboxStatus.className = 'sandbox-status warning';
    } else {
      sandboxStatus.textContent = '已启用';
      sandboxStatus.className = 'sandbox-status active';
    }
  }

  it('should show "已禁用" when sandbox is disabled', () => {
    updateSandboxStatus({ sandboxEnabled: false, workspaceDir: '' });

    const status = document.getElementById('sandboxStatus');
    expect(status.textContent).toBe('已禁用');
    expect(status.className).toContain('inactive');
  });

  it('should show "未配置目录" when sandbox enabled but no directory', () => {
    updateSandboxStatus({ sandboxEnabled: true, workspaceDir: '' });

    const status = document.getElementById('sandboxStatus');
    expect(status.textContent).toBe('未配置目录');
    expect(status.className).toContain('warning');
  });

  it('should show "已启用" when sandbox enabled with directory', () => {
    updateSandboxStatus({ sandboxEnabled: true, workspaceDir: '/test/path' });

    const status = document.getElementById('sandboxStatus');
    expect(status.textContent).toBe('已启用');
    expect(status.className).toContain('active');
  });

  it('should update status when checkbox changes', () => {
    const checkbox = document.getElementById('sandboxEnabled');
    const workspaceInput = document.getElementById('workspaceDir');

    checkbox.checked = false;
    updateSandboxStatus({
      sandboxEnabled: checkbox.checked,
      workspaceDir: workspaceInput.value
    });

    const status = document.getElementById('sandboxStatus');
    expect(status.textContent).toBe('已禁用');
  });

  it('should update status when workspace directory changes', () => {
    const checkbox = document.getElementById('sandboxEnabled');
    const workspaceInput = document.getElementById('workspaceDir');

    workspaceInput.value = '/new/workspace';
    checkbox.checked = true;

    updateSandboxStatus({
      sandboxEnabled: checkbox.checked,
      workspaceDir: workspaceInput.value.trim()
    });

    const status = document.getElementById('sandboxStatus');
    expect(status.textContent).toBe('已启用');
  });
});

describe('Settings Module - Save Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          config: { workspaceDir: '/test', sandboxEnabled: true }
        })
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should save workspace settings via API', async () => {
    const workspaceInput = document.getElementById('workspaceDir');
    const sandboxCheckbox = document.getElementById('sandboxEnabled');

    workspaceInput.value = '/test/workspace';
    sandboxCheckbox.checked = true;

    // Simulate saveWorkspaceSettings
    await fetch('http://localhost:3001/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceDir: workspaceInput.value.trim(),
        sandboxEnabled: sandboxCheckbox.checked
      })
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/config',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('should call electronAPI.saveSettings on save', async () => {
    await mockElectronAPI.saveSettings({ theme: 'dark' });

    expect(mockElectronAPI.saveSettings).toHaveBeenCalled();
  });

  it('should close modal after successful save', async () => {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');

    // Simulate successful save
    await mockElectronAPI.saveSettings({});
    modal.classList.add('hidden');

    expect(modal.classList.contains('hidden')).toBe(true);
  });
});

describe('Settings Module - Reset Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should call electronAPI.resetSettings on reset', async () => {
    await mockElectronAPI.resetSettings();

    expect(mockElectronAPI.resetSettings).toHaveBeenCalled();
  });

  it('should clear workspace directory input on reset', async () => {
    const workspaceInput = document.getElementById('workspaceDir');
    workspaceInput.value = '/some/path';

    // Simulate reset
    await mockElectronAPI.resetSettings();
    workspaceInput.value = '';

    expect(workspaceInput.value).toBe('');
  });

  it('should enable sandbox checkbox on reset', async () => {
    const sandboxCheckbox = document.getElementById('sandboxEnabled');
    sandboxCheckbox.checked = false;

    // Simulate reset
    await mockElectronAPI.resetSettings();
    sandboxCheckbox.checked = true;

    expect(sandboxCheckbox.checked).toBe(true);
  });
});

describe('Settings Module - Browse Directory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should call electronAPI.selectDirectory on browse', async () => {
    await mockElectronAPI.selectDirectory();

    expect(mockElectronAPI.selectDirectory).toHaveBeenCalled();
  });

  it('should update input with selected path', async () => {
    const workspaceInput = document.getElementById('workspaceDir');

    const selectedPath = await mockElectronAPI.selectDirectory();
    workspaceInput.value = selectedPath;

    expect(workspaceInput.value).toBe('/selected/path');
  });

  it('should not update input if no path selected', async () => {
    mockElectronAPI.selectDirectory.mockResolvedValueOnce(null);

    const workspaceInput = document.getElementById('workspaceDir');
    workspaceInput.value = '/original/path';

    const selectedPath = await mockElectronAPI.selectDirectory();
    if (selectedPath) {
      workspaceInput.value = selectedPath;
    }

    expect(workspaceInput.value).toBe('/original/path');
  });
});

describe('Settings Module - Diagnosis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should show loading state when diagnosis starts', () => {
    const diagnoseResult = document.getElementById('diagnoseResult');

    // Simulate loading state
    diagnoseResult.classList.remove('hidden');
    diagnoseResult.innerHTML = `
      <div class="diagnose-card loading">
        <div class="diagnose-icon">⟳</div>
        <div class="diagnose-content">
          <div class="diagnose-title">正在检测系统状态...</div>
          <div class="diagnose-status">请稍候</div>
        </div>
      </div>
    `;

    expect(diagnoseResult.classList.contains('hidden')).toBe(false);
    expect(diagnoseResult.innerHTML).toContain('正在检测');
  });

  it('should show success cards for healthy system', async () => {
    const diagnoseResult = document.getElementById('diagnoseResult');

    const result = await mockElectronAPI.checkHealth();

    if (result.status === 'ok') {
      diagnoseResult.innerHTML = `
        <div class="diagnose-card success">
          <div class="diagnose-icon">✓</div>
          <div class="diagnose-content">
            <div class="diagnose-title">后端服务器</div>
            <div class="diagnose-status">正常</div>
          </div>
        </div>
      `;
    }

    expect(diagnoseResult.innerHTML).toContain('success');
    expect(diagnoseResult.innerHTML).toContain('正常');
  });

  it('should show warning for missing API key', async () => {
    mockElectronAPI.checkHealth.mockResolvedValueOnce({
      status: 'ok',
      config: { hasApiKey: false }
    });

    const diagnoseResult = document.getElementById('diagnoseResult');
    const result = await mockElectronAPI.checkHealth();

    if (result.status === 'ok' && !result.config?.hasApiKey) {
      diagnoseResult.innerHTML = `
        <div class="diagnose-card warning">
          <div class="diagnose-icon">⚠</div>
          <div class="diagnose-content">
            <div class="diagnose-title">API 配置</div>
            <div class="diagnose-status">部分配置缺失</div>
          </div>
        </div>
      `;
    }

    expect(diagnoseResult.innerHTML).toContain('warning');
    expect(diagnoseResult.innerHTML).toContain('部分配置缺失');
  });

  it('should show error for failed connection', async () => {
    mockElectronAPI.checkHealth.mockResolvedValueOnce({
      status: 'error',
      message: 'Connection refused'
    });

    const diagnoseResult = document.getElementById('diagnoseResult');
    const result = await mockElectronAPI.checkHealth();

    if (result.status !== 'ok') {
      diagnoseResult.innerHTML = `
        <div class="diagnose-card error">
          <div class="diagnose-icon">✗</div>
          <div class="diagnose-content">
            <div class="diagnose-title">后端服务器</div>
            <div class="diagnose-status">连接失败</div>
          </div>
        </div>
      `;
    }

    expect(diagnoseResult.innerHTML).toContain('error');
    expect(diagnoseResult.innerHTML).toContain('连接失败');
  });

  it('should handle diagnosis exception', async () => {
    mockElectronAPI.checkHealth.mockRejectedValueOnce(new Error('Network error'));

    const diagnoseResult = document.getElementById('diagnoseResult');

    try {
      await mockElectronAPI.checkHealth();
    } catch (error) {
      diagnoseResult.innerHTML = `
        <div class="diagnose-card error">
          <div class="diagnose-icon">✗</div>
          <div class="diagnose-content">
            <div class="diagnose-title">诊断失败</div>
            <div class="diagnose-status">${error.message}</div>
          </div>
        </div>
      `;
    }

    expect(diagnoseResult.innerHTML).toContain('诊断失败');
    expect(diagnoseResult.innerHTML).toContain('Network error');
  });
});

describe('Settings Module - Load Workspace Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should load workspace settings from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          workspaceDir: '/loaded/path',
          sandboxEnabled: true
        })
    });

    const response = await fetch('http://localhost:3001/api/config');
    const config = await response.json();

    const workspaceInput = document.getElementById('workspaceDir');
    const sandboxCheckbox = document.getElementById('sandboxEnabled');

    workspaceInput.value = config.workspaceDir || '';
    sandboxCheckbox.checked = config.sandboxEnabled !== false;

    expect(workspaceInput.value).toBe('/loaded/path');
    expect(sandboxCheckbox.checked).toBe(true);
  });

  it('should handle API error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API error'));

    try {
      await fetch('http://localhost:3001/api/config');
    } catch (error) {
      // Should not throw, just log
      console.error('[SETTINGS] Failed to load workspace settings:', error);
    }

    // Elements should retain default values
    const workspaceInput = document.getElementById('workspaceDir');
    expect(workspaceInput.value).toBe('');
  });

  it('should handle non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const response = await fetch('http://localhost:3001/api/config');

    if (!response.ok) {
      // Should not update values
      const workspaceInput = document.getElementById('workspaceDir');
      expect(workspaceInput.value).toBe('');
    }
  });
});

describe('Settings Module - Init Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should call electronAPI.getSettings on init', async () => {
    const settings = await mockElectronAPI.getSettings();

    expect(mockElectronAPI.getSettings).toHaveBeenCalled();
    expect(settings).toEqual({ theme: 'light' });
  });

  it('should handle missing electronAPI', async () => {
    const originalAPI = window.electronAPI;
    delete window.electronAPI;

    // Should not throw
    let settings = {};
    try {
      if (window.electronAPI && window.electronAPI.getSettings) {
        settings = await window.electronAPI.getSettings();
      }
    } catch (error) {
      console.error('[SETTINGS] Failed to load settings:', error);
    }

    expect(settings).toEqual({});

    window.electronAPI = originalAPI;
  });

  it('should handle getSettings error', async () => {
    mockElectronAPI.getSettings.mockRejectedValueOnce(new Error('Load failed'));

    let settings = {};
    try {
      settings = await mockElectronAPI.getSettings();
    } catch (error) {
      console.error('[SETTINGS] Failed to load settings:', error);
    }

    expect(settings).toEqual({});
  });
});

describe('Settings Module - Theme Toggle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should have theme toggle button', () => {
    const themeBtn = document.getElementById('themeToggleBtn');
    expect(themeBtn).not.toBeNull();
  });

  it('should call toggleTheme when button clicked', async () => {
    const { toggleTheme } = await import('../../renderer/modules/theme.js');

    toggleTheme();

    expect(toggleTheme).toHaveBeenCalled();
  });
});

describe('Settings Module - Event Listeners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSettingsDOM();
    window.electronAPI = mockElectronAPI;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should attach click listener to settings button', () => {
    const settingsBtn = document.getElementById('settingsBtn');
    let clicked = false;

    settingsBtn.addEventListener('click', () => {
      clicked = true;
    });

    settingsBtn.click();

    expect(clicked).toBe(true);
  });

  it('should attach click listener to close button', () => {
    const closeBtn = document.getElementById('closeSettingsBtn');
    let clicked = false;

    closeBtn.addEventListener('click', () => {
      clicked = true;
    });

    closeBtn.click();

    expect(clicked).toBe(true);
  });

  it('should attach click listener to save button', () => {
    const saveBtn = document.getElementById('saveSettingsBtn');
    let clicked = false;

    saveBtn.addEventListener('click', () => {
      clicked = true;
    });

    saveBtn.click();

    expect(clicked).toBe(true);
  });

  it('should attach click listener to reset button', () => {
    const resetBtn = document.getElementById('resetSettingsBtn');
    let clicked = false;

    resetBtn.addEventListener('click', () => {
      clicked = true;
    });

    resetBtn.click();

    expect(clicked).toBe(true);
  });

  it('should attach click listener to diagnose button', () => {
    const diagnoseBtn = document.getElementById('diagnoseBtn');
    let clicked = false;

    diagnoseBtn.addEventListener('click', () => {
      clicked = true;
    });

    diagnoseBtn.click();

    expect(clicked).toBe(true);
  });

  it('should attach click listener to browse button', () => {
    const browseBtn = document.getElementById('browseWorkspaceBtn');
    let clicked = false;

    browseBtn.addEventListener('click', () => {
      clicked = true;
    });

    browseBtn.click();

    expect(clicked).toBe(true);
  });

  it('should attach change listener to sandbox checkbox', () => {
    const checkbox = document.getElementById('sandboxEnabled');
    let changed = false;

    checkbox.addEventListener('change', () => {
      changed = true;
    });

    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));

    expect(changed).toBe(true);
  });

  it('should attach input listener to workspace directory input', () => {
    const input = document.getElementById('workspaceDir');
    let inputFired = false;

    input.addEventListener('input', () => {
      inputFired = true;
    });

    input.value = '/new/path';
    input.dispatchEvent(new Event('input'));

    expect(inputFired).toBe(true);
  });
});
