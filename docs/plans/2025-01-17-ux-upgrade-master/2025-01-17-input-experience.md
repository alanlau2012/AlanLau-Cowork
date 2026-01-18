# 核心输入体验 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement multi-line textarea input with auto-resize, smart code block detection, and network error retry functionality.

**Architecture:** Replace `<input>` with `<textarea>`, add auto-height logic on input, detect unclosed code blocks to prevent accidental sends, and add retry UI for failed requests.

**Tech Stack:** Vanilla JavaScript, CSS transitions, fetch API with error handling

**Dependencies:** Requires [2025-01-17-feedback-foundation.md](2025-01-17-feedback-foundation.md) (Toast system)

---

## Task 1: Replace Input with Textarea

**Files:**
- Modify: [renderer/index.html](renderer/index.html)

**Step 1: Find the current input element**

```bash
# Locate the input element
grep -n "input" renderer/index.html | grep -i "message\|chat\|send"
```

Expected: Find something like `<input id="messageInput" ...>`

**Step 2: Replace input with textarea**

Find the input element (typically with `id="messageInput"` or similar) and replace:

```html
<!-- BEFORE: -->
<input id="messageInput" type="text" placeholder="Type a message..." />

<!-- AFTER: -->
<textarea
  id="messageInput"
  class="message-textarea"
  placeholder="Type a message... (Shift+Enter for new line)"
  rows="1"
></textarea>
```

**Step 3: Save and verify**

```bash
# Verify the change
grep "message-textarea" renderer/index.html
```

Expected: Shows the textarea element

**Step 4: Commit**

```bash
git add renderer/index.html
git commit -m "feat: replace input with textarea for multi-line support"
```

---

## Task 2: Add Textarea Auto-Resize Styles

**Files:**
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add textarea auto-resize styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Auto-resize Textarea */
.message-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  resize: none;
  overflow-y: auto;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.message-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.message-textarea::placeholder {
  color: #9ca3af;
}
```

**Step 2: Save and verify**

```bash
# Verify styles added
grep -c "message-textarea" renderer/style.css
```

Expected: Shows multiple message-textarea CSS rules

**Step 3: Commit**

```bash
git add renderer/style.css
git commit -m "feat: add textarea auto-resize styles"
```

---

## Task 3: Implement Auto-Height Functionality

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add auto-height function**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Auto-resize textarea based on content
 */
function autoResizeTextarea(textarea) {
  // Reset height to get accurate scrollHeight
  textarea.style.height = 'auto';

  // Calculate new height (constrained by max-height in CSS)
  const newHeight = Math.min(textarea.scrollHeight, 200);

  // Apply new height
  textarea.style.height = newHeight + 'px';
}
```

**Step 2: Attach to textarea input event**

Find where the message input element is referenced (search for `getElementById('messageInput')` or similar):

```javascript
// Get the textarea
const messageInput = document.getElementById('messageInput');

// Add auto-resize on input
messageInput.addEventListener('input', () => {
  autoResizeTextarea(messageInput);
});

// Also auto-resize on paste (for large content)
messageInput.addEventListener('paste', () => {
  // Use setTimeout to wait for paste to complete
  setTimeout(() => {
    autoResizeTextarea(messageInput);
  }, 0);
});
```

**Step 3: Initial resize on page load**

Add to initialization code:

```javascript
// Initial resize after page load
window.addEventListener('load', () => {
  const messageInput = document.getElementById('messageInput');
  autoResizeTextarea(messageInput);
});
```

**Step 4: Save and verify**

```bash
# Verify function was added
grep -A 10 "autoResizeTextarea" renderer/renderer.js
```

Expected: Shows the autoResizeTextarea function

**Step 5: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: implement textarea auto-height adjustment"
```

---

## Task 4: Implement Smart Code Block Detection

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add code block detection function**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Check if text has unclosed code block
 * @param {string} text - Text to check
 * @returns {boolean} - True if code block is unclosed
 */
function hasUnclosedCodeBlock(text) {
  // Count occurrences of triple backticks
  const backtickMatches = text.match(/```/g);
  const count = backtickMatches ? backtickMatches.length : 0;

  // Odd count means unclosed code block
  return count % 2 !== 0;
}

/**
 * Insert newline at cursor position
 * @param {HTMLTextAreaElement} textarea - Target textarea
 */
function insertNewlineAtCursor(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  textarea.value = value.substring(0, start) + '\n' + value.substring(end);

  // Move cursor after newline
  textarea.selectionStart = textarea.selectionEnd = start + 1;

  // Trigger input event for auto-resize
  textarea.dispatchEvent(new Event('input'));
}
```

**Step 2: Modify Enter key handler to prevent accidental sends**

Find the existing Enter key handler (search for `'Enter'` or `keydown` event):

```javascript
// BEFORE (existing code might look like):
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// AFTER (with smart detection):
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    // Check for unclosed code block
    if (hasUnclosedCodeBlock(messageInput.value)) {
      // Prevent send, insert newline instead
      e.preventDefault();
      insertNewlineAtCursor(messageInput);

      // Optional: Show hint to user
      showToast('Code block not closed - Enter adds newline', 'info', 2000);
      return;
    }

    // Normal send behavior
    e.preventDefault();
    sendMessage();
  }
});
```

**Step 3: Save and verify**

```bash
# Verify functions were added
grep -A 5 "hasUnclosedCodeBlock" renderer/renderer.js
```

Expected: Shows the code block detection function

**Step 4: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: add smart code block detection to prevent accidental sends"
```

---

## Task 5: Implement Network Error Retry UI

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add error message container styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Error Message with Retry */
.message-error {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 8px 0;
}

.message-error-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.message-error-icon {
  color: #ef4444;
  font-size: 18px;
  flex-shrink: 0;
}

.message-error-text {
  flex: 1;
  color: #991b1b;
  font-size: 14px;
}

.message-error-retry {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.message-error-retry:hover {
  background: #dc2626;
}

.message-error-retry:active {
  background: #b91c1c;
}
```

**Step 2: Commit styles**

```bash
git add renderer/style.css
git commit -m "feat: add error message retry styles"
```

**Step 3: Add error handling and retry function**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Store last failed message for retry
 */
let lastFailedMessage = null;
let lastFailedChatId = null;

/**
 * Show error message with retry button
 * @param {string} errorMessage - Error message to display
 * @param {string} message - Original message that failed
 * @param {string} chatId - Chat ID context
 */
function showErrorWithRetry(errorMessage, message, chatId) {
  const messagesContainer = document.getElementById('messages');
  if (!messagesContainer) return;

  // Store for retry
  lastFailedMessage = message;
  lastFailedChatId = chatId;

  // Create error element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message-error';
  errorDiv.innerHTML = `
    <div class="message-error-content">
      <span class="message-error-icon">⚠</span>
      <span class="message-error-text">${errorMessage}</span>
      <button class="message-error-retry">重新发送</button>
    </div>
  `;

  // Add retry handler
  const retryBtn = errorDiv.querySelector('.message-error-retry');
  retryBtn.addEventListener('click', () => {
    errorDiv.remove();
    retryMessage();
  });

  messagesContainer.appendChild(errorDiv);
  scrollToBottom();
}

/**
 * Retry the last failed message
 */
function retryMessage() {
  if (!lastFailedMessage) {
    showToast('No message to retry', 'error');
    return;
  }

  showToast('Retrying message...', 'info');

  // Trigger send with stored message and chat context
  handleSendMessage(lastFailedMessage, lastFailedChatId);
}
```

**Step 4: Modify error handling in send flow**

Find the error handling in your `handleSendMessage` or similar function:

```javascript
// Find where errors are caught and modify:
async function handleSendMessage(message, chatId = null) {
  try {
    // ... existing send logic ...
  } catch (error) {
    console.error('Send failed:', error);

    // Show error with retry button instead of just logging
    showErrorWithRetry(
      error.message || 'Network error - please retry',
      message,
      chatId
    );

    // Also show toast for visibility
    showToast('Message failed - click retry to resend', 'error');
  }
}
```

**Step 5: Save and verify**

```bash
# Verify retry functions were added
grep -A 10 "showErrorWithRetry\|retryMessage" renderer/renderer.js
```

Expected: Shows the retry-related functions

**Step 6: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: add network error retry with UI button"
```

---

## Task 6: Test Multi-Line Input and Error Retry

**Files:**
- Test: Manual testing in running app

**Step 1: Start application**

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Electron
npm start
```

**Step 2: Test auto-resize**

- Type multiple lines → Textarea grows
- Paste large text → Textarea expands to max-height (200px)
- Delete lines → Textarea shrinks
- Reach max-height → Scrollbar appears

**Step 3: Test code block detection**

- Type: ```javascript (without closing)
- Press Enter → Should add newline, NOT send
- Type closing ``` and press Enter → Should send
- Test with Shift+Enter → Should always add newline

**Step 4: Test error retry**

- Disconnect network (stop backend server)
- Send message → Error appears with retry button
- Click "重新发送" → Shows retry toast
- Reconnect network (start backend)
- Click retry → Message sends successfully

**Step 5: Verify all behaviors**

- [ ] Textarea auto-grows with content
- [ ] Max-height constraint works
- [ ] Shift+Enter always adds newline
- [ ] Enter sends normally
- [ ] Enter adds newline when code block unclosed
- [ ] Toast hint shows for unclosed code block
- [ ] Error retry button appears on network failure
- [ ] Retry resends stored message successfully

---

## Final Verification

**Step 1: Code review**

```bash
# Check all changes
git diff HEAD~6..HEAD --stat
```

Expected: Shows changes to index.html, style.css, renderer.js

**Step 2: Integration test with Toast system**

```javascript
// In DevTools console, verify Toast integration
showToast('Testing integration', 'success');

// Then trigger an error to see toast + retry UI
// (Stop backend and send a message)
```

**Step 3: Edge case testing**

- Paste code with multiple ``` pairs
- Type very long single line
- Rapid Enter presses
- Copy-paste markdown with code blocks

---

## Summary

This plan implements multi-line input with smart code block detection and network error recovery.

**Deliverables:**
- [x] Textarea replacement for input
- [x] Auto-height adjustment (44px - 200px)
- [x] Smart code block detection (Enter behavior)
- [x] Network error retry UI
- [x] Toast integration for feedback

**Estimated Time:** 5.5 hours

**Dependencies:**
- [2025-01-17-feedback-foundation.md](2025-01-17-feedback-foundation.md) (Toast system)

**Next:** Proceed to [2025-01-17-generation-control.md](2025-01-17-generation-control.md) for stop generation button and quick start templates.
