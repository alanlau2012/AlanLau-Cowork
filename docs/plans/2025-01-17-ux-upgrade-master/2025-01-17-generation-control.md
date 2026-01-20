# 生成控制与启动 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement stop generation button using IPC Map pattern, and add quick start template cards for new users.

**Architecture:** Main process maintains `Map<requestId, AbortController>` for request cancellation. Renderer creates a stop button that sends abort signal via IPC. Quick start templates are static HTML cards that populate the input when clicked.

**Tech Stack:** Electron IPC (ipcMain/ipcRenderer), AbortController API, vanilla JavaScript

**Dependencies:** Requires [2025-01-17-feedback-foundation.md](2025-01-17-feedback-foundation.md) (Toast system for status feedback)

---

## Task 1: Implement AbortController Map in Main Process

**Files:**

- Modify: [main.js](main.js)

**Step 1: Read current main.js structure**

```bash
# Find existing IPC handlers
grep -n "ipcMain\." main.js
```

Expected: Find existing message handling patterns

**Step 2: Add abort controller map and handlers**

Add to [main.js](main.js) (after existing imports/variables):

```javascript
// Track active requests for abort capability
const activeRequests = new Map();
```

**Step 3: Modify existing send-message handler**

Find the existing message handler (likely named `send-message` or similar) and wrap it with abort controller:

```javascript
// EXISTING CODE (find this pattern):
ipcMain.handle('send-message', async (event, { id, message, chatId }) => {
  // ... existing message handling ...
});

// MODIFY TO:
ipcMain.handle('send-message', async (event, { id, message, chatId }) => {
  // Create abort controller for this request
  const controller = new AbortController();
  activeRequests.set(id, controller);

  try {
    // Pass signal to your SDK call
    // Note: Adjust this based on your actual SDK implementation
    const result = await sendMessageToBackend(message, {
      signal: controller.signal,
      chatId: chatId
    });

    return { success: true, data: result };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`Request ${id} was aborted`);
      return { success: false, aborted: true };
    }
    throw error;
  } finally {
    // Clean up controller
    activeRequests.delete(id);
  }
});
```

**Step 4: Add abort handler**

Add after the send-message handler:

```javascript
// Handle abort request from renderer
ipcMain.on('abort-request', (event, id) => {
  const controller = activeRequests.get(id);
  if (controller) {
    console.log(`Aborting request ${id}`);
    controller.abort();
    activeRequests.delete(id);
  } else {
    console.warn(`No active request found for id: ${id}`);
  }
});
```

**Step 5: Save and verify**

```bash
# Verify handlers were added
grep -A 5 "abort-request\|activeRequests" main.js
```

Expected: Shows the abort controller logic

**Step 6: Commit**

```bash
git add main.js
git commit -m "feat: add abort controller map for request cancellation"
```

---

## Task 2: Expose Abort Function in Preload

**Files:**

- Modify: [preload.js](preload.js)

**Step 1: Find existing contextBridge API**

```bash
# Find the contextBridge.exposeInMainWorld call
grep -A 20 "contextBridge" preload.js
```

Expected: Find existing API object structure

**Step 2: Add abortRequest function**

Add to the API object in [preload.js](preload.js):

```javascript
// EXISTING CODE:
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: data => ipcRenderer.invoke('send-message', data)
  // ... other methods ...
});

// MODIFY TO:
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: data => ipcRenderer.invoke('send-message', data),
  abortRequest: id => ipcRenderer.send('abort-request', id)
  // ... other methods ...
});
```

**Step 3: Save and verify**

```bash
# Verify abortRequest was added
grep "abortRequest" preload.js
```

Expected: Shows the abortRequest function

**Step 4: Commit**

```bash
git add preload.js
git commit -m "feat: expose abortRequest function via contextBridge"
```

---

## Task 3: Add Stop Button UI

**Files:**

- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add stop button to HTML**

Find the send button area in [renderer/index.html](renderer/index.html) and add stop button:

```html
<!-- Find the send button and add stop button before/after it -->
<div class="input-actions">
  <!-- Existing send button -->
  <button id="sendButton" class="send-button">Send</button>

  <!-- NEW: Add stop button (hidden by default) -->
  <button id="stopButton" class="stop-button" style="display: none;">
    <span class="stop-icon">■</span>
    <span class="stop-text">Stop</span>
  </button>
</div>
```

**Step 2: Add stop button styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Stop Generation Button */
.stop-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.stop-button:hover {
  background: #dc2626;
}

.stop-button:active {
  background: #b91c1c;
  transform: scale(0.98);
}

.stop-icon {
  font-size: 12px;
  font-weight: bold;
}

.stop-text {
  font-size: 14px;
}

/* Ensure send and stop buttons don't show simultaneously */
.input-actions:has(.stop-button:not([style*='display: none'])) .send-button {
  display: none;
}
```

**Step 3: Save and verify**

```bash
# Verify stop button was added
grep "stopButton\|stop-button" renderer/index.html renderer/style.css
```

Expected: Shows stop button in both files

**Step 4: Commit**

```bash
git add renderer/index.html renderer/style.css
git commit -m "feat: add stop generation button UI"
```

---

## Task 4: Implement Stop Button Logic in Renderer

**Files:**

- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add state tracking for current request**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Track current request ID for stop functionality
 */
let currentRequestId = null;
let isGenerating = false;

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

**Step 2: Add stop button handler**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
// Get stop button element
const stopButton = document.getElementById('stopButton');

// Handle stop button click
stopButton.addEventListener('click', () => {
  if (currentRequestId) {
    // Send abort request to main process
    window.electronAPI.abortRequest(currentRequestId);

    // Show feedback
    showToast('Stopping generation...', 'info');

    // Update UI state
    setGeneratingState(false);
  }
});

/**
 * Set generating state (show/hide stop button)
 * @param {boolean} generating - Whether AI is generating
 */
function setGeneratingState(generating) {
  isGenerating = generating;

  if (generating) {
    // Show stop button, hide send button
    stopButton.style.display = 'flex';
    sendButton.style.display = 'none';

    // Disable input while generating
    messageInput.disabled = true;
  } else {
    // Show send button, hide stop button
    stopButton.style.display = 'none';
    sendButton.style.display = 'flex';

    // Re-enable input
    messageInput.disabled = false;
    messageInput.focus();
  }
}
```

**Step 3: Modify send flow to use request ID**

Find your `handleSendMessage` or `sendMessage` function and modify:

```javascript
// EXISTING CODE (find this pattern):
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  // ... send logic ...
}

// MODIFY TO:
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  // Generate request ID and set generating state
  currentRequestId = generateRequestId();
  setGeneratingState(true);

  try {
    // Pass request ID to backend
    const response = await window.electronAPI.sendMessage({
      id: currentRequestId,
      message: message,
      chatId: currentChatId
    });

    // Check if request was aborted
    if (response.aborted) {
      showToast('Generation stopped', 'info');
      return;
    }

    // ... rest of your message handling logic ...
  } catch (error) {
    console.error('Send failed:', error);
    showToast('Failed to send message', 'error');
  } finally {
    // Always reset generating state
    currentRequestId = null;
    setGeneratingState(false);
  }
}
```

**Step 4: Handle stream completion**

Find where you handle stream completion (the `done` event) and ensure state is reset:

```javascript
// In your SSE stream handler, when you receive 'done' event:
if (data.type === 'done') {
  currentRequestId = null;
  setGeneratingState(false);
  showToast('Response complete', 'success', 1500);
}
```

**Step 5: Save and verify**

```bash
# Verify stop logic was added
grep -A 5 "setGeneratingState\|abortRequest" renderer/renderer.js
```

Expected: Shows the stop button handling logic

**Step 6: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: implement stop generation button logic"
```

---

## Task 5: Add Quick Start Template Cards

**Files:**

- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/style.css](renderer/style.css)
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add template container to HTML**

Add to [renderer/index.html](renderer/index.html) in the main messages area (before the messages container):

```html
<!-- Quick Start Templates (show when no messages) -->
<div id="quickStartTemplates" class="quick-start-templates">
  <div class="templates-header">
    <h2>快速开始</h2>
    <p>选择一个模板开始对话</p>
  </div>
  <div class="templates-grid">
    <button class="template-card" data-template="code-review">
      <div class="template-icon">🔍</div>
      <div class="template-title">代码审查</div>
      <div class="template-desc">审查代码质量并提供改进建议</div>
    </button>
    <button class="template-card" data-template="explain">
      <div class="template-icon">💡</div>
      <div class="template-title">概念解释</div>
      <div class="template-desc">用简单语言解释技术概念</div>
    </button>
    <button class="template-card" data-template="debug">
      <div class="template-icon">🐛</div>
      <div class="template-title">调试助手</div>
      <div class="template-desc">帮助分析和修复代码问题</div>
    </button>
  </div>
</div>
```

**Step 2: Add template styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Quick Start Templates */
.quick-start-templates {
  padding: 40px 20px;
  text-align: center;
}

.templates-header {
  margin-bottom: 32px;
}

.templates-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.templates-header p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.template-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.template-card:active {
  transform: translateY(0);
}

.template-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.template-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.template-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

/* Hide templates when there are messages */
.quick-start-templates.hidden {
  display: none;
}
```

**Step 3: Add template logic to renderer**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Template prompts
 */
const templatePrompts = {
  'code-review':
    '请帮我审查以下代码，分析其质量、可读性和潜在问题，并提供改进建议：\n\n[粘贴你的代码]',
  explain: '请用简单易懂的语言解释以下技术概念：\n\n[输入你想了解的概念]',
  debug: '我遇到了一个代码问题，请帮我分析和解决：\n\n[描述问题或粘贴错误信息]'
};

/**
 * Initialize template cards
 */
function initializeTemplates() {
  const templates = document.querySelectorAll('.template-card');

  templates.forEach(card => {
    card.addEventListener('click', () => {
      const templateType = card.dataset.template;
      const prompt = templatePrompts[templateType];

      if (prompt) {
        // Populate input with template
        messageInput.value = prompt;
        messageInput.focus();

        // Trigger auto-resize
        autoResizeTextarea(messageInput);

        // Hide templates
        hideTemplates();

        // Show feedback
        showToast('Template loaded - customize and send!', 'info', 2000);
      }
    });
  });
}

/**
 * Hide quick start templates
 */
function hideTemplates() {
  const templates = document.getElementById('quickStartTemplates');
  if (templates) {
    templates.classList.add('hidden');
  }
}

/**
 * Show quick start templates (call when creating new chat)
 */
function showTemplates() {
  const templates = document.getElementById('quickStartTemplates');
  const messagesContainer = document.getElementById('messages');

  // Only show if no messages in current chat
  if (templates && messagesContainer.children.length === 0) {
    templates.classList.remove('hidden');
  }
}

// Initialize templates on load
window.addEventListener('DOMContentLoaded', initializeTemplates);
```

**Step 4: Modify new chat flow to show templates**

Find your `createNewChat` or similar function and add:

```javascript
function createNewChat() {
  // ... existing new chat logic ...

  // Show templates for fresh start
  showTemplates();
}
```

**Step 5: Hide templates when sending first message**

In your `sendMessage` function, add:

```javascript
async function sendMessage() {
  // ... existing validation ...

  // Hide templates when sending first message
  hideTemplates();

  // ... rest of send logic ...
}
```

**Step 6: Save and verify**

```bash
# Verify template logic was added
grep -A 5 "templatePrompts\|initializeTemplates" renderer/renderer.js
```

Expected: Shows the template-related functions

**Step 7: Commit**

```bash
git add renderer/index.html renderer/style.css renderer/renderer.js
git commit -m "feat: add quick start template cards"
```

---

## Task 6: Test Stop Generation and Templates

**Files:**

- Test: Manual testing in running app

**Step 1: Start application**

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Electron
npm start
```

**Step 2: Test stop generation**

- Send a long prompt (e.g., "write a 1000-word essay")
- Stop button should appear immediately
- Click stop button
- Generation should halt
- Toast shows "Stopping generation..."
- Send button reappears
- Input re-enables

**Step 3: Test quick start templates**

- Create new chat
- Templates should be visible
- Click "代码审查" template
- Input populates with review prompt
- Templates hide
- Customize prompt and send
- Verify message sends

**Step 4: Test template scenarios**

- All 3 templates work
- Templates hide after first message
- Templates show again in new chat
- Templates stay hidden in chats with messages

**Step 5: Verify all behaviors**

- [ ] Stop button appears during generation
- [ ] Stop button hides when generation completes
- [ ] Stop button successfully halts generation
- [ ] Toast feedback on stop action
- [ ] Templates show on fresh chat
- [ ] Templates populate input correctly
- [ ] Templates hide after first message
- [ ] All 3 template types work

---

## Final Verification

**Step 1: Code review**

```bash
# Check all changes
git diff HEAD~6..HEAD --stat
```

Expected: Shows changes to main.js, preload.js, renderer files

**Step 2: Integration test**

Test the full flow:

1. New chat → Templates visible
2. Click template → Input populated
3. Send message → Generation starts, stop button shows
4. Click stop → Generation halts
5. Send another message → Normal flow

**Step 3: Edge case testing**

- Stop and immediately send new message
- Stop during tool execution
- Rapid template clicks
- Template with existing input content

---

## Summary

This plan implements stop generation capability and quick start templates for better user control and onboarding.

**Deliverables:**

- [x] AbortController Map in main process
- [x] IPC abort handler in preload
- [x] Stop button UI and logic
- [x] Quick start template cards (3 templates)
- [x] Toast integration for feedback

**Estimated Time:** 5.5 hours

**Dependencies:**

- [2025-01-17-feedback-foundation.md](2025-01-17-feedback-foundation.md) (Toast system)

**Next:** Proceed to [2025-01-17-dev-experience.md](2025-01-17-dev-experience.md) for code block optimization and search features.
