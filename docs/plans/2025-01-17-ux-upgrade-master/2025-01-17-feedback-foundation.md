# 反馈基础能力 (Toast 通知系统) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable Toast notification system to replace browser native alerts.

**Architecture:** Create a Toast manager in renderer.js that appends notification elements to a fixed container in index.html, with CSS animations for smooth enter/exit.

**Tech Stack:** Vanilla JavaScript, CSS animations, marked.js for existing markdown rendering

---

## Task 1: Create Toast Container in HTML

**Files:**

- Modify: [renderer/index.html](renderer/index.html)

**Step 1: Read current index.html structure**

```bash
# Find where to insert the toast container
cat renderer/index.html
```

Expected: Locate the main app container, typically before closing `</body>`.

**Step 2: Add Toast container element**

Find the end of `<body>` section and add before closing `</body>`:

```html
<!-- Toast Container -->
<div id="toast-container" class="toast-container"></div>
```

**Step 3: Save and verify**

```bash
# Verify the change was applied
grep "toast-container" renderer/index.html
```

Expected: Output shows the toast-container div

**Step 4: Commit**

```bash
git add renderer/index.html
git commit -m "feat: add toast container element"
```

---

## Task 2: Implement Toast CSS Styles

**Files:**

- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Read current style.css structure**

```bash
# Find the end of the file to append new styles
cat renderer/style.css
```

**Step 2: Add Toast styles at end of file**

Append to [renderer/style.css](renderer/style.css):

```css
/* Toast Notification System */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  min-width: 280px;
  max-width: 400px;
  padding: 12px 16px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0;
  transform: translateX(100%);
  animation: toast-in 0.3s ease-out forwards;
}

.toast.toast-out {
  animation: toast-out 0.3s ease-in forwards;
}

.toast.success {
  border-left: 4px solid #10b981;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast.info {
  border-left: 4px solid #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-message {
  flex: 1;
  word-break: break-word;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
```

**Step 3: Save and verify**

```bash
# Verify styles were added
grep -c "toast-" renderer/style.css
```

Expected: Count > 20 (multiple toast-related CSS rules)

**Step 4: Commit**

```bash
git add renderer/style.css
git commit -m "feat: add toast notification styles"
```

---

## Task 3: Implement Toast JavaScript Function

**Files:**

- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Read current renderer.js to understand structure**

```bash
# Find a good location to add the toast function
# Look for existing utility functions
grep -n "function " renderer/renderer.js | head -20
```

Expected: Identify where utility functions are defined (typically at top or bottom of file).

**Step 2: Add showToast function**

Add to [renderer/renderer.js](renderer/renderer.js) (preferably near the top after imports or at end before event listeners):

```javascript
/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.error('Toast container not found');
    return null;
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Create icon based on type
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  switch (type) {
    case 'success':
      icon.innerHTML = '✓';
      icon.style.color = '#10b981';
      break;
    case 'error':
      icon.innerHTML = '✕';
      icon.style.color = '#ef4444';
      break;
    case 'info':
    default:
      icon.innerHTML = 'ℹ';
      icon.style.color = '#3b82f6';
      break;
  }

  // Create message
  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;

  // Assemble toast
  toast.appendChild(icon);
  toast.appendChild(messageEl);

  // Add to container
  container.appendChild(toast);

  // Auto-remove after duration
  const timeout = setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);

  // Return function to manually dismiss
  return () => {
    clearTimeout(timeout);
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  };
}
```

**Step 3: Export showToast for global access (if using modules)**

If renderer.js uses modules (check for `export` keywords):

```javascript
// Add to exports
window.showToast = showToast;
```

Otherwise, the function is already global.

**Step 4: Save and verify**

```bash
# Verify the function was added
grep -A 5 "function showToast" renderer/renderer.js
```

Expected: Shows the showToast function definition

**Step 5: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: implement showToast function"
```

---

## Task 4: Test Toast Notification System

**Files:**

- Modify: [renderer/renderer.js](renderer/renderer.js) (temporary test code)

**Step 1: Add temporary test button to HTML**

For testing, add to [renderer/index.html](renderer/index.html) in the main container:

```html
<!-- Temporary test buttons (remove after verification) -->
<div class="toast-test-buttons" style="padding: 20px; display: flex; gap: 10px;">
  <button onclick="showToast('Success message!', 'success')">Test Success</button>
  <button onclick="showToast('Error message!', 'error')">Test Error</button>
  <button onclick="showToast('Info message!', 'info')">Test Info</button>
</div>
```

**Step 2: Start application and test**

```bash
# Terminal 1: Start backend
cd server && npm start

# Terminal 2: Start Electron
npm start
```

**Step 3: Manual testing checklist**

- Click "Test Success" → Green toast with checkmark appears, fades out after 3s
- Click "Test Error" → Red toast with X appears, fades out after 3s
- Click "Test Info" → Blue toast with info icon appears, fades out after 3s
- Rapid-click all buttons → Toasts stack vertically
- Wait for animations → Smooth slide-in from right, fade-out on exit

**Step 4: Remove test code**

After verification, remove the test buttons from [renderer/index.html](renderer/index.html):

```bash
# Remove the test button div
git checkout renderer/index.html
# Or manually delete the test-buttons div
```

**Step 5: Commit cleanup**

```bash
git add renderer/index.html
git commit -m "test: remove temporary toast test buttons"
```

---

## Task 5: Verify Integration with Existing Code

**Step 1: Search for existing alert() calls**

```bash
# Find any native alerts that should be replaced
grep -rn "alert(" renderer/
```

Expected: List any `alert()` calls in renderer code

**Step 2: Document alerts to be replaced (if any found)**

Create a note for future reference:

```javascript
// TODO: Replace these alert() calls with showToast():
// - renderer/renderer.js:123 - error handling
// - renderer/renderer.js:456 - validation feedback
```

**Step 3: Commit verification**

```bash
git add renderer/renderer.js
git commit -m "docs: note alert() calls to replace with showToast"
```

---

## Final Verification

**Step 1: Run full application test**

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Electron
npm start
```

**Step 2: Test in browser DevTools**

Open Electron app, press `Ctrl+Shift+I` for DevTools:

```javascript
// Test each toast type in console
showToast('Test success', 'success');
showToast('Test error', 'error');
showToast('Test info', 'info');

// Test custom duration
showToast('Long duration', 'info', 5000);

// Test manual dismiss
const dismiss = showToast('Manual dismiss test', 'info');
setTimeout(dismiss, 1000);
```

**Step 3: Verify all behaviors**

- [ ] Toasts appear at top-right of window
- [ ] Stacking works for multiple toasts
- [ ] Animations are smooth (no jank)
- [ ] Auto-dismiss works after duration
- [ ] Manual dismiss works via returned function
- [ ] Icon colors match type (green/red/blue)
- [ ] Border-left color matches type

---

## Summary

This plan implements a complete Toast notification system that will be used by all subsequent sub-plans for user feedback.

**Deliverables:**

- [x] Toast container in HTML
- [x] CSS animations and styles
- [x] showToast() function in renderer.js
- [x] Testing and verification

**Estimated Time:** 2 hours

**Next:** Proceed to [2025-01-17-input-experience.md](2025-01-17-input-experience.md) which uses Toast for error feedback.
