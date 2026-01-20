# 个性化与可访问性 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement theme switching (light/dark mode), keyboard shortcuts, accessibility improvements (ARIA), and a settings modal.

**Architecture:** Use CSS variables for theme switching. Global keyboard event listener for shortcuts. Add ARIA attributes throughout. Settings stored in localStorage.

**Tech Stack:** CSS custom properties, localStorage, ARIA attributes, Modal pattern

**Dependencies:** None (independent)

---

## Task 1: Implement Theme Switching System

**Files:**

- Modify: [renderer/style.css](renderer/style.css)
- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Define CSS variables for themes**

Add to [renderer/style.css](renderer/style.css) at the very top (before other styles):

```css
/* CSS Variables for Theming */
:root {
  /* Light Theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;
  --accent-color: #3b82f6;
  --accent-hover: #2563eb;
  --success-color: #10b981;
  --error-color: #ef4444;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* Dark Theme */
[data-theme='dark'] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border-color: #374151;
  --accent-color: #60a5fa;
  --accent-hover: #3b82f6;
  --success-color: #34d399;
  --error-color: #f87171;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}

/* Apply variables to existing styles (example conversions) */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  transition:
    background 0.3s,
    color 0.3s;
}

.sidebar {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.message-input-container {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

/* Update all color references to use variables */
/* This is a simplified example - convert existing styles */
```

**Step 2: Add theme toggle button to HTML**

Add to [renderer/index.html](renderer/index.html) in the header/sidebar:

```html
<!-- Theme Toggle Button -->
<button id="themeToggle" class="theme-toggle" aria-label="Toggle theme" title="切换主题">
  <span class="theme-icon">🌙</span>
</button>
```

**Step 3: Add theme toggle styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Theme Toggle Button */
.theme-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle:hover {
  background: var(--border-color);
}

.theme-icon {
  font-size: 20px;
  transition: transform 0.3s;
}

[data-theme='dark'] .theme-icon {
  transform: rotate(180deg);
}
```

**Step 4: Implement theme switching logic**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Theme Management
 */
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

const THEME_STORAGE_KEY = 'app-theme';

/**
 * Get current theme
 */
function getCurrentTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.LIGHT;
}

/**
 * Set theme
 * @param {string} theme - 'light' or 'dark'
 */
function setTheme(theme) {
  const root = document.documentElement;

  if (theme === THEMES.DARK) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);

  // Update icon
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === THEMES.DARK ? '☀️' : '🌙';
  }
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  setTheme(newTheme);
  showToast(`已切换到${newTheme === THEMES.DARK ? '深色' : '浅色'}模式`, 'success', 1500);
}

/**
 * Initialize theme on load
 */
function initializeTheme() {
  const savedTheme = getCurrentTheme();
  setTheme(savedTheme);

  // Add theme toggle handler
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
}

// Initialize theme on DOM load
window.addEventListener('DOMContentLoaded', initializeTheme);
```

**Step 5: Save and verify**

```bash
# Verify theme switching was added
grep -A 5 "setTheme\|toggleTheme" renderer/renderer.js
```

Expected: Shows the theme management functions

**Step 6: Commit**

```bash
git add renderer/index.html renderer/renderer.js renderer/style.css
git commit -m "feat: implement theme switching (light/dark mode)"
```

---

## Task 2: Add Keyboard Shortcuts

**Files:**

- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Define keyboard shortcuts configuration**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Keyboard Shortcuts Configuration
 */
const SHORTCUTS = {
  // Cmd/Ctrl + N: New chat
  NEW_CHAT: {
    key: 'n',
    cmd: true,
    ctrl: true,
    action: () => createNewChat(),
    description: '新建对话'
  },

  // Cmd/Ctrl + K: Focus search
  FOCUS_SEARCH: {
    key: 'k',
    cmd: true,
    ctrl: true,
    action: () => {
      const searchInput = document.getElementById('chatSearch');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    description: '聚焦搜索'
  },

  // Escape: Stop generation or close modals
  ESCAPE: {
    key: 'Escape',
    action: () => {
      // Stop generation if active
      if (isGenerating && currentRequestId) {
        window.electronAPI.abortRequest(currentRequestId);
        setGeneratingState(false);
        showToast('已停止生成', 'info');
        return;
      }

      // Close any open modals
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        closeSettingsModal();
        return;
      }

      // Clear search input
      const searchInput = document.getElementById('chatSearch');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.value = '';
        searchChats('');
        searchInput.blur();
        return;
      }
    },
    description: '停止生成/关闭弹窗'
  },

  // Cmd/Ctrl + /: Show keyboard shortcuts
  SHOW_SHORTCUTS: {
    key: '/',
    cmd: true,
    ctrl: true,
    action: () => showShortcutsModal(),
    description: '显示快捷键'
  }
};
```

**Step 2: Implement keyboard event handler**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboardShortcuts(e) {
  // Ignore if typing in input/textarea
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    // Allow Escape key to work even in inputs
    if (e.key !== 'Escape') return;
  }

  // Check each shortcut
  for (const shortcut of Object.values(SHORTCUTS)) {
    if (e.key === shortcut.key) {
      // Check modifier keys
      const cmdMatch = shortcut.cmd ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey;
      const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

      if (cmdMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', initializeKeyboardShortcuts);
```

**Step 3: Create shortcuts modal**

Add to [renderer/index.html](renderer/index.html):

```html
<!-- Keyboard Shortcuts Modal -->
<div
  id="shortcutsModal"
  class="modal hidden"
  aria-hidden="true"
  role="dialog"
  aria-labelledby="shortcutsTitle"
>
  <div class="modal-overlay" onclick="closeShortcutsModal()"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="shortcutsTitle">键盘快捷键</h2>
      <button class="modal-close" onclick="closeShortcutsModal()" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <div class="shortcuts-list">
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd</kbd> + <kbd>N</kbd>
          <span>新建对话</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd>
          <span>聚焦搜索</span>
        </div>
        <div class="shortcut-item">
          <kbd>Escape</kbd>
          <span>停止生成/关闭弹窗</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd</kbd> + <kbd>/</kbd>
          <span>显示快捷键</span>
        </div>
        <div class="shortcut-item">
          <kbd>Shift</kbd> + <kbd>Enter</kbd>
          <span>换行（不发送）</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Step 4: Add modal styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Modal */
.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal.hidden {
  display: none;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 90%;
  max-width: 500px;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-tertiary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

/* Shortcuts List */
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shortcut-item kbd {
  display: inline-block;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.shortcut-item span {
  color: var(--text-primary);
}
```

**Step 5: Add modal functions**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Show keyboard shortcuts modal
 */
function showShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Close keyboard shortcuts modal
 */
function closeShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
}

// Make functions globally available for onclick handlers
window.closeShortcutsModal = closeShortcutsModal;
```

**Step 6: Save and verify**

```bash
# Verify shortcuts were added
grep -A 5 "handleKeyboardShortcuts\|SHORTCUTS" renderer/renderer.js
```

Expected: Shows the keyboard shortcut handling

**Step 7: Commit**

```bash
git add renderer/index.html renderer/renderer.js renderer/style.css
git commit -m "feat: implement keyboard shortcuts system"
```

---

## Task 3: Add Accessibility Improvements (ARIA)

**Files:**

- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add ARIA labels to interactive elements**

Update [renderer/index.html](renderer/index.html) with ARIA attributes:

```html
<!-- Chat List -->
<div id="chatList" role="list" aria-label="聊天历史列表">
  <!-- Chat items will have role="listitem" -->
</div>

<!-- Messages Container -->
<div id="messages" role="log" aria-live="polite" aria-label="对话消息">
  <!-- Messages will have role="article" -->
</div>

<!-- Message Input -->
<textarea
  id="messageInput"
  class="message-textarea"
  placeholder="Type a message..."
  rows="1"
  aria-label="输入消息"
  aria-describedby="input-hint"
></textarea>
<div id="input-hint" class="sr-only">按 Enter 发送，Shift+Enter 换行</div>

<!-- Send Button -->
<button id="sendButton" class="send-button" aria-label="发送消息">Send</button>

<!-- Stop Button -->
<button id="stopButton" class="stop-button" aria-label="停止生成" style="display: none;">
  <span class="stop-icon" aria-hidden="true">■</span>
  <span class="stop-text">Stop</span>
</button>

<!-- Theme Toggle -->
<button id="themeToggle" class="theme-toggle" aria-label="切换主题" aria-pressed="false">
  <span class="theme-icon" aria-hidden="true">🌙</span>
</button>

<!-- Search Input -->
<input
  type="text"
  id="chatSearch"
  class="chat-search-input"
  placeholder="搜索聊天历史..."
  aria-label="搜索聊天历史"
  role="searchbox"
/>

<!-- Chat Items (example template) -->
<div class="chat-item" role="listitem" tabindex="0" aria-label="聊天标题">
  <div class="chat-title">Chat Title</div>
  <div class="chat-preview">Preview text...</div>
</div>
```

**Step 2: Add screen reader only class**

Append to [renderer/style.css](renderer/style.css):

```css
/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus Visible */
:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* Skip to main content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

**Step 3: Add skip link and update focus management**

Add to [renderer/index.html](renderer/index.html) after `<body>`:

```html
<!-- Skip to main content -->
<a href="#mainContent" class="skip-link">跳转到主内容</a>

<!-- Main content wrapper -->
<div id="mainContent" tabindex="-1">
  <!-- Your existing content -->
</div>
```

**Step 4: Implement ARIA live region for dynamic content**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
  // Create or get live region
  let liveRegion = document.getElementById('a11y-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }

  // Update message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
}

/**
 * Update ARIA states
 */
function updateAriaStates() {
  // Update theme toggle pressed state
  const themeToggle = document.getElementById('themeToggle');
  const currentTheme = getCurrentTheme();
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', currentTheme === THEMES.DARK ? 'true' : 'false');
  }

  // Update stop button visibility
  const stopButton = document.getElementById('stopButton');
  if (stopButton) {
    const isHidden = stopButton.style.display === 'none';
    stopButton.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
  }
}

// Update ARIA states on theme change
const originalSetTheme = setTheme;
setTheme = function (theme) {
  originalSetTheme(theme);
  updateAriaStates();
};

// Update ARIA states when generating state changes
const originalSetGeneratingState = setGeneratingState;
setGeneratingState = function (generating) {
  originalSetGeneratingState(generating);

  if (generating) {
    announceToScreenReader('正在生成回复');
  } else {
    announceToScreenReader('生成完成');
  }

  updateAriaStates();
};
```

**Step 5: Add keyboard navigation for chat list**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Initialize keyboard navigation for chat list
 */
function initializeKeyboardNavigation() {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;

  // Add keyboard navigation
  chatList.addEventListener('keydown', e => {
    const focusedItem = document.activeElement;
    const items = Array.from(chatList.querySelectorAll('.chat-item'));
    const currentIndex = items.indexOf(focusedItem);

    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        }
        break;

      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        }
        break;

      case 'Enter':
      case ' ':
        if (focusedItem.classList.contains('chat-item')) {
          e.preventDefault();
          const chatId = focusedItem.dataset.chatId;
          if (chatId) {
            switchToChat(chatId);
          }
        }
        break;
    }
  });
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', initializeKeyboardNavigation);
```

**Step 6: Save and verify**

```bash
# Verify ARIA improvements
grep -c "aria-\|role=" renderer/index.html
```

Expected: Count > 10 (multiple ARIA attributes)

**Step 7: Commit**

```bash
git add renderer/index.html renderer/renderer.js renderer/style.css
git commit -m "feat: add accessibility improvements (ARIA, keyboard navigation, screen reader)"
```

---

## Task 4: Create Settings Modal

**Files:**

- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/renderer.js](renderer/renderer.js)
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add settings modal HTML**

Add to [renderer/index.html](renderer/index.html):

```html
<!-- Settings Modal -->
<div
  id="settingsModal"
  class="modal hidden"
  aria-hidden="true"
  role="dialog"
  aria-labelledby="settingsTitle"
>
  <div class="modal-overlay" onclick="closeSettingsModal()"></div>
  <div class="modal-content settings-modal">
    <div class="modal-header">
      <h2 id="settingsTitle">设置</h2>
      <button class="modal-close" onclick="closeSettingsModal()" aria-label="关闭">×</button>
    </div>
    <div class="modal-body">
      <!-- Theme Setting -->
      <div class="setting-group">
        <h3>外观</h3>
        <div class="setting-item">
          <label for="themeSelect">主题</label>
          <select id="themeSelect" aria-label="选择主题">
            <option value="light">浅色模式</option>
            <option value="dark">深色模式</option>
          </select>
        </div>
      </div>

      <!-- Shortcuts Reference -->
      <div class="setting-group">
        <h3>快捷键</h3>
        <button id="showShortcutsBtn" class="secondary-button">查看所有快捷键</button>
      </div>

      <!-- About -->
      <div class="setting-group">
        <h3>关于</h3>
        <div class="setting-info">
          <p><strong>Open Claude Cowork</strong></p>
          <p>Version 1.0.0</p>
          <p>基于 Claude Agent SDK 的桌面聊天助手</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Settings Button (add to header/sidebar) -->
<button id="settingsButton" class="icon-button" aria-label="打开设置">
  <span aria-hidden="true">⚙️</span>
</button>
```

**Step 2: Add settings-specific styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Icon Button */
.icon-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  transition: background 0.2s;
}

.icon-button:hover {
  background: var(--bg-tertiary);
}

/* Settings Modal */
.settings-modal {
  max-width: 600px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-size: 14px;
  color: var(--text-primary);
}

.setting-item select {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.setting-info p {
  margin: 4px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.secondary-button {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background: var(--border-color);
}
```

**Step 3: Implement settings modal functions**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Settings Management
 */

/**
 * Open settings modal
 */
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Set current theme in select
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.value = getCurrentTheme();
    }
  }
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Initialize settings
 */
function initializeSettings() {
  // Settings button
  const settingsButton = document.getElementById('settingsButton');
  if (settingsButton) {
    settingsButton.addEventListener('click', openSettingsModal);
  }

  // Theme select
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', e => {
      setTheme(e.target.value);
    });
  }

  // Show shortcuts button
  const showShortcutsBtn = document.getElementById('showShortcutsBtn');
  if (showShortcutsBtn) {
    showShortcutsBtn.addEventListener('click', () => {
      closeSettingsModal();
      showShortcutsModal();
    });
  }
}

// Make functions globally available
window.closeSettingsModal = closeSettingsModal;

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', initializeSettings);
```

**Step 4: Add keyboard shortcut to open settings**

Update the `SHORTCUTS` object in [renderer/renderer.js](renderer/renderer.js):

```javascript
// Add to SHORTCUTS:
OPEN_SETTINGS: {
  key: ',',
  cmd: true,
  ctrl: true,
  action: () => openSettingsModal(),
  description: '打开设置'
}
```

**Step 5: Save and verify**

```bash
# Verify settings modal was added
grep -A 5 "openSettingsModal\|initializeSettings" renderer/renderer.js
```

Expected: Shows the settings-related functions

**Step 6: Commit**

```bash
git add renderer/index.html renderer/renderer.js renderer/style.css
git commit -m "feat: add settings modal with theme and shortcuts configuration"
```

---

## Task 5: Test Personalization Features

**Files:**

- Test: Manual testing in running app

**Step 1: Start application**

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Electron
npm start
```

**Step 2: Test theme switching**

- Click theme toggle button
- Verify theme changes
- Reload app
- Verify theme preference persists
- Test all UI elements in both themes

**Step 3: Test keyboard shortcuts**

- Press Ctrl/Cmd + N → New chat created
- Press Ctrl/Cmd + K → Search focused
- Type in search, press Escape → Search cleared
- During generation, press Escape → Generation stops
- Press Ctrl/Cmd + / → Shortcuts modal appears
- Press Ctrl/Cmd + , → Settings modal opens

**Step 4: Test accessibility**

- Navigate with Tab key
- Verify focus indicators are visible
- Verify ARIA labels are announced by screen reader
- Use arrow keys in chat list
- Press Enter on chat item to select
- Test with screen reader (if available)

**Step 5: Test settings modal**

- Open settings via button and shortcut
- Change theme from settings
- Click "查看所有快捷键" → Opens shortcuts modal
- Close modal with Escape
- Verify all settings persist

**Step 6: Verify all behaviors**

- [ ] Theme toggles between light/dark
- [ ] Theme preference saves to localStorage
- [ ] All keyboard shortcuts work
- [ ] Modals close with Escape
- [ ] Focus management works correctly
- [ ] ARIA labels present on interactive elements
- [ ] Screen reader announces dynamic content
- [ ] Settings modal accessible via keyboard
- [ ] Skip link appears on Tab

---

## Final Verification

**Step 1: Code review**

```bash
# Check all changes
git diff HEAD~5..HEAD --stat
```

Expected: Shows changes to all renderer files

**Step 2: Accessibility audit**

Run through WCAG 2.1 Level AA checklist:

- [ ] Keyboard accessibility
- [ ] Focus indicators
- [ ] ARIA labels
- [ ] Color contrast (use browser extension)
- [ ] Screen reader compatible

**Step 3: Cross-theme testing**

Verify all features work in both themes:

- Code blocks
- Toast notifications
- Loading states
- Modals
- All buttons and inputs

---

## Summary

This plan implements comprehensive personalization and accessibility features.

**Deliverables:**

- [x] Theme switching (light/dark with CSS variables)
- [x] Keyboard shortcuts (New/Search/Escape/Shortcuts/Settings)
- [x] ARIA attributes and labels
- [x] Keyboard navigation
- [x] Screen reader support
- [x] Settings modal

**Estimated Time:** 12 hours

**Dependencies:** None (independent)

---

## 🎉 All Sub-Plans Complete!

Congratulations! All 6 sub-development plans have been created:

1. ✅ [2025-01-17-feedback-foundation.md](2025-01-17-feedback-foundation.md) - Toast notification system
2. ✅ [2025-01-17-input-experience.md](2025-01-17-input-experience.md) - Multi-line input + error retry
3. ✅ [2025-01-17-generation-control.md](2025-01-17-generation-control.md) - Stop button + quick start templates
4. ✅ [2025-01-17-dev-experience.md](2025-01-17-dev-experience.md) - Code blocks + search
5. ✅ [2025-01-17-history-enhancement.md](2025-01-17-history-enhancement.md) - Time grouping + regenerate + loading states
6. ✅ [2025-01-17-personalization.md](2025-01-17-personalization.md) - Theme + shortcuts + accessibility + settings

**Total Estimated Effort:** ~36 hours across 6 incremental releases

Ready to begin implementation! Start with [2025-01-17-feedback-foundation.md](2025-01-17-feedback-foundation.md).
