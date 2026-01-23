/**
 * Settings Module
 * Handles settings modal, workspace configuration, and diagnostics
 */

import { showToast } from './feedback.js';
import { toggleTheme } from './theme.js';

// Settings module state
let settings = {};

// Settings UI elements (initialized on first use)
let settingsBtn = null;
let settingsModal = null;
let closeSettingsBtn = null;
let saveSettingsBtn = null;
let resetSettingsBtn = null;
let diagnoseBtn = null;
let diagnoseResult = null;

// Workspace Sandbox UI elements
let workspaceDirInput = null;
let browseWorkspaceBtn = null;
let sandboxEnabledCheckbox = null;
let sandboxStatus = null;

/**
 * Initialize DOM element references
 */
function initDomElements() {
  settingsBtn = document.getElementById('settingsBtn');
  settingsModal = document.getElementById('settingsModal');
  closeSettingsBtn = document.getElementById('closeSettingsBtn');
  saveSettingsBtn = document.getElementById('saveSettingsBtn');
  resetSettingsBtn = document.getElementById('resetSettingsBtn');
  diagnoseBtn = document.getElementById('diagnoseBtn');
  diagnoseResult = document.getElementById('diagnoseResult');
  workspaceDirInput = document.getElementById('workspaceDir');
  browseWorkspaceBtn = document.getElementById('browseWorkspaceBtn');
  sandboxEnabledCheckbox = document.getElementById('sandboxEnabled');
  sandboxStatus = document.getElementById('sandboxStatus');
}

/**
 * Initialize settings module
 */
export async function initSettings() {
  initDomElements();
  try {
    if (window.electronAPI && window.electronAPI.getSettings) {
      settings = await window.electronAPI.getSettings();
      console.log('[SETTINGS] Loaded settings:', settings);
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to load settings:', error);
  }
}

/**
 * Open settings modal
 */
async function openSettingsModal() {
  if (!settingsModal) {
    return;
  }

  // Load workspace settings from backend
  await loadWorkspaceSettings();

  settingsModal.classList.remove('hidden');
}

/**
 * Load workspace settings from backend API
 */
async function loadWorkspaceSettings() {
  try {
    const response = await fetch('http://localhost:3001/api/config');
    if (response.ok) {
      const config = await response.json();

      if (workspaceDirInput) {
        workspaceDirInput.value = config.workspaceDir || '';
      }
      if (sandboxEnabledCheckbox) {
        sandboxEnabledCheckbox.checked = config.sandboxEnabled !== false;
      }

      updateSandboxStatus(config);
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to load workspace settings:', error);
  }
}

/**
 * Update sandbox status indicator
 * @param {Object} config - Configuration object
 */
function updateSandboxStatus(config) {
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

/**
 * Close settings modal
 */
function closeSettingsModal() {
  if (!settingsModal) {
    return;
  }
  settingsModal.classList.add('hidden');
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    // Save workspace settings to backend
    await saveWorkspaceSettings();

    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings(settings);
      showToast('设置已保存', 'success');
    }
    closeSettingsModal();
  } catch (error) {
    console.error('[SETTINGS] Failed to save settings:', error);
    showToast('保存设置失败', 'error');
  }
}

/**
 * Save workspace settings to backend API
 */
async function saveWorkspaceSettings() {
  const workspaceDir = workspaceDirInput?.value?.trim() || '';
  const sandboxEnabled = sandboxEnabledCheckbox?.checked !== false;

  try {
    const response = await fetch('http://localhost:3001/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceDir, sandboxEnabled })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[SETTINGS] Workspace settings saved:', result.config);
      updateSandboxStatus(result.config);
    } else {
      throw new Error('Failed to save workspace settings');
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to save workspace settings:', error);
    throw error;
  }
}

/**
 * Browse for workspace directory (Electron only)
 */
async function browseWorkspaceDirectory() {
  try {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const selectedPath = await window.electronAPI.selectDirectory();
      if (selectedPath && workspaceDirInput) {
        workspaceDirInput.value = selectedPath;
      }
    } else {
      // Fallback: show hint for manual input
      showToast('请手动输入目录路径', 'info');
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to browse directory:', error);
    showToast('选择目录失败', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  try {
    if (window.electronAPI && window.electronAPI.resetSettings) {
      settings = await window.electronAPI.resetSettings();
      showToast('已恢复默认设置', 'success');

      // Reset workspace settings
      if (workspaceDirInput) {
        workspaceDirInput.value = '';
      }
      if (sandboxEnabledCheckbox) {
        sandboxEnabledCheckbox.checked = true;
      }
      updateSandboxStatus({ workspaceDir: '', sandboxEnabled: true });
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to reset settings:', error);
    showToast('恢复默认设置失败', 'error');
  }
}

/**
 * Run connection diagnosis
 */
async function runDiagnosis() {
  if (!diagnoseResult) {
    return;
  }

  // Show loading state
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

  try {
    if (!window.electronAPI || !window.electronAPI.checkHealth) {
      throw new Error('诊断功能不可用');
    }

    const result = await window.electronAPI.checkHealth();

    if (result.status === 'ok') {
      const cards = [];

      // Backend server check
      cards.push(`
        <div class="diagnose-card success">
          <div class="diagnose-icon">✓</div>
          <div class="diagnose-content">
            <div class="diagnose-title">后端服务器</div>
            <div class="diagnose-status">正常</div>
          </div>
        </div>
      `);

      // API Key check
      if (result.config?.hasApiKey) {
        cards.push(`
          <div class="diagnose-card success">
            <div class="diagnose-icon">✓</div>
            <div class="diagnose-content">
              <div class="diagnose-title">API 连接</div>
              <div class="diagnose-status">已连接</div>
            </div>
          </div>
        `);
      } else {
        cards.push(`
          <div class="diagnose-card warning">
            <div class="diagnose-icon">⚠</div>
            <div class="diagnose-content">
              <div class="diagnose-title">API 配置</div>
              <div class="diagnose-status">部分配置缺失</div>
            </div>
          </div>
        `);
      }

      // Workspace directory check
      const workspaceDir = workspaceDirInput?.value?.trim() || '';
      if (workspaceDir) {
        cards.push(`
          <div class="diagnose-card success">
            <div class="diagnose-icon">✓</div>
            <div class="diagnose-content">
              <div class="diagnose-title">工作目录</div>
              <div class="diagnose-status">已配置</div>
            </div>
          </div>
        `);
      }

      // Sandbox protection check
      const sandboxEnabled = sandboxEnabledCheckbox?.checked !== false;
      if (sandboxEnabled) {
        cards.push(`
          <div class="diagnose-card success">
            <div class="diagnose-icon">✓</div>
            <div class="diagnose-content">
              <div class="diagnose-title">沙箱保护</div>
              <div class="diagnose-status">已启用</div>
            </div>
          </div>
        `);
      }

      diagnoseResult.innerHTML = cards.join('');
    } else {
      diagnoseResult.innerHTML = `
        <div class="diagnose-card error">
          <div class="diagnose-icon">✗</div>
          <div class="diagnose-content">
            <div class="diagnose-title">后端服务器</div>
            <div class="diagnose-status">连接失败</div>
          </div>
        </div>
        <div class="diagnose-card error">
          <div class="diagnose-icon">✗</div>
          <div class="diagnose-content">
            <div class="diagnose-title">错误详情</div>
            <div class="diagnose-status">${result.message || '未知错误'}</div>
          </div>
        </div>
      `;
    }
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
}

/**
 * Setup settings event listeners
 */
export function setupSettingsListeners() {
  // Open/close settings
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }

  // Save/reset buttons
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', resetSettings);
  }

  // Diagnosis button
  if (diagnoseBtn) {
    diagnoseBtn.addEventListener('click', runDiagnosis);
  }

  // Workspace directory browse button
  if (browseWorkspaceBtn) {
    browseWorkspaceBtn.addEventListener('click', browseWorkspaceDirectory);
  }

  // Sandbox toggle - update status immediately
  if (sandboxEnabledCheckbox) {
    sandboxEnabledCheckbox.addEventListener('change', () => {
      updateSandboxStatus({
        sandboxEnabled: sandboxEnabledCheckbox.checked,
        workspaceDir: workspaceDirInput?.value?.trim() || ''
      });
    });
  }

  // Update sandbox status when workspace directory changes
  if (workspaceDirInput) {
    workspaceDirInput.addEventListener('input', () => {
      updateSandboxStatus({
        sandboxEnabled: sandboxEnabledCheckbox?.checked !== false,
        workspaceDir: workspaceDirInput.value.trim()
      });
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
      closeSettingsModal();
    }
  });

  // Theme toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
}
