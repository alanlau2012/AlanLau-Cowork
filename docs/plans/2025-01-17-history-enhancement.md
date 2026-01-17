# 历史管理增强 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add time-based grouping labels to chat history, implement regenerate button for AI responses, and show rich loading states during generation.

**Architecture:** Parse chat timestamps to insert group labels (Today/Yesterday/Last 7 Days). Add regenerate button to assistant messages. Track SDK events to update loading state indicator.

**Tech Stack:** Vanilla JavaScript, Date API for time grouping

**Dependencies:** None (independent)

---

## Task 1: Add Time Grouping Labels to Chat List

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add time grouping styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Time Group Labels */
.time-group-label {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.time-group-label:first-child {
  border-top: none;
}
```

**Step 2: Add time grouping functions**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Get time group label for a timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Time group label
 */
function getTimeGroupLabel(timestamp) {
  const now = new Date();
  const chatDate = new Date(timestamp);

  // Reset time to midnight for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

  // Calculate difference in days
  const diffTime = today - chatDay;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays <= 7) {
    return '近 7 天';
  } else if (diffDays <= 30) {
    return '近 30 天';
  } else {
    // Format as month/year
    const month = chatDate.getMonth() + 1;
    const year = chatDate.getFullYear();
    return `${year}年${month}月`;
  }
}

/**
 * Render chat list with time grouping
 * @param {Array} chats - Array of chat objects
 */
function renderChatListWithGroups(chats) {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;

  // Clear existing list
  chatList.innerHTML = '';

  let lastGroup = null;

  chats.forEach((chat) => {
    const groupLabel = getTimeGroupLabel(chat.timestamp || chat.createdAt);

    // Add group label if changed
    if (groupLabel !== lastGroup) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'time-group-label';
      groupDiv.textContent = groupLabel;
      chatList.appendChild(groupDiv);
      lastGroup = groupLabel;
    }

    // Create and append chat item
    const chatItem = createChatItem(chat);
    chatList.appendChild(chatItem);
  });
}
```

**Step 3: Modify chat list rendering to use grouping**

Find your existing chat list rendering code and replace with the grouped version:

```javascript
// EXISTING CODE (find this pattern):
function renderChatList() {
  allChats.forEach(chat => {
    // ... render each chat ...
  });
}

// MODIFY TO:
function renderChatList() {
  // Sort chats by timestamp (newest first)
  const sortedChats = [...allChats].sort((a, b) => {
    const timeA = a.timestamp || a.createdAt || 0;
    const timeB = b.timestamp || b.createdAt || 0;
    return timeB - timeA;
  });

  // Render with time groups
  renderChatListWithGroups(sortedChats);
}
```

**Step 4: Save and verify**

```bash
# Verify time grouping was added
grep -A 15 "getTimeGroupLabel\|renderChatListWithGroups" renderer/renderer.js
```

Expected: Shows the time grouping functions

**Step 5: Commit**

```bash
git add renderer/renderer.js renderer/style.css
git commit -m "feat: add time-based grouping labels to chat history"
```

---

## Task 2: Add Regenerate Button to Messages

**Files:**
- Modify: [renderer/style.css](renderer/style.css)
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add regenerate button styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Regenerate Button */
.message-assistant .message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-assistant:hover .message-actions {
  opacity: 1;
}

.regenerate-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.regenerate-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.regenerate-btn:active {
  background: #d1d5db;
}

.regenerate-btn svg {
  width: 14px;
  height: 14px;
}

.regenerate-btn.generating {
  pointer-events: none;
  opacity: 0.6;
}

.regenerate-btn .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Step 2: Add regenerate function**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Store last user message for regeneration
 */
let lastUserMessage = null;
let lastUserMessageChatId = null;

/**
 * Add regenerate button to assistant message
 * @param {HTMLElement} messageDiv - Message element
 * @param {string} originalUserMessage - The original user prompt
 * @param {string} chatId - Current chat ID
 */
function addRegenerateButton(messageDiv, originalUserMessage, chatId) {
  // Skip if button already exists
  if (messageDiv.querySelector('.regenerate-btn')) return;

  // Create actions container
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions';

  // Create regenerate button
  const regenerateBtn = document.createElement('button');
  regenerateBtn.className = 'regenerate-btn';
  regenerateBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 4v6h-6M1 20v-6h6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
    <span>重新生成</span>
  `;

  // Add click handler
  regenerateBtn.addEventListener('click', () => {
    regenerateResponse(messageDiv, originalUserMessage, chatId);
  });

  actionsDiv.appendChild(regenerateBtn);
  messageDiv.appendChild(actionsDiv);
}

/**
 * Regenerate AI response
 * @param {HTMLElement} messageDiv - Assistant message to replace
 * @param {string} userMessage - Original user prompt
 * @param {string} chatId - Chat ID
 */
async function regenerateResponse(messageDiv, userMessage, chatId) {
  const regenerateBtn = messageDiv.querySelector('.regenerate-btn');

  // Update button state
  regenerateBtn.classList.add('generating');
  regenerateBtn.innerHTML = `
    <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
    </svg>
    <span>生成中...</span>
  `;

  showToast('正在重新生成回复...', 'info');

  try {
    // Generate new request ID
    const requestId = generateRequestId();
    currentRequestId = requestId;
    setGeneratingState(true);

    // Send the original user message again
    const response = await window.electronAPI.sendMessage({
      id: requestId,
      message: userMessage,
      chatId: chatId
    });

    // Remove the old message
    messageDiv.remove();

    // Check if aborted
    if (response.aborted) {
      showToast('Generation stopped', 'info');
      return;
    }

    // Stream the new response (your existing streaming logic)
    await handleStreamResponse(response, chatId);

  } catch (error) {
    console.error('Regenerate failed:', error);
    showToast('重新生成失败', 'error');

    // Reset button
    regenerateBtn.classList.remove('generating');
    regenerateBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6M1 20v-6h6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span>重新生成</span>
    `;
  } finally {
    currentRequestId = null;
    setGeneratingState(false);
  }
}
```

**Step 3: Modify message appending to include regenerate button**

Find your `appendMessage` function and modify for assistant messages:

```javascript
function appendMessage(content, role) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;

  if (role === 'assistant') {
    // Render markdown
    const html = marked.parse(content);
    messageDiv.innerHTML = html;

    // Enhance code blocks
    enhanceCodeBlocks(messageDiv);

    // Add regenerate button if we have a user message stored
    if (lastUserMessage) {
      addRegenerateButton(messageDiv, lastUserMessage, currentChatId);
    }
  } else {
    // User message
    messageDiv.textContent = content;

    // Store for potential regeneration
    lastUserMessage = content;
    lastUserMessageChatId = currentChatId;
  }

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}
```

**Step 4: Save and verify**

```bash
# Verify regenerate logic was added
grep -A 10 "regenerateResponse\|addRegenerateButton" renderer/renderer.js
```

Expected: Shows the regenerate-related functions

**Step 5: Commit**

```bash
git add renderer/renderer.js renderer/style.css
git commit -m "feat: add regenerate button for AI responses"
```

---

## Task 3: Implement Rich Loading States

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)
- Modify: [renderer/style.css](renderer/style.css)
- Modify: [renderer/index.html](renderer/index.html)

**Step 1: Add loading indicator to HTML**

Add to [renderer/index.html](renderer/index.html) near the input area:

```html
<!-- Loading State Indicator -->
<div id="loadingIndicator" class="loading-indicator" style="display: none;">
  <div class="loading-icon">
    <div class="loading-spinner"></div>
  </div>
  <div class="loading-text">正在思考...</div>
</div>
```

**Step 2: Add loading state styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Loading State Indicator */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 8px;
  margin: 8px 0;
  font-size: 13px;
  color: #6b7280;
}

.loading-icon {
  position: relative;
  width: 16px;
  height: 16px;
}

.loading-spinner {
  width: 100%;
  height: 100%;
  border: 2px solid #d1d5db;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  flex: 1;
}

/* State-specific styles */
.loading-indicator.state-thinking {
  background: #eff6ff;
  color: #1e40af;
}

.loading-indicator.state-thinking .loading-spinner {
  border-color: #bfdbfe;
  border-top-color: #3b82f6;
}

.loading-indicator.state-tool {
  background: #fef3c7;
  color: #92400e;
}

.loading-indicator.state-tool .loading-spinner {
  border-color: #fde68a;
  border-top-color: #f59e0b;
}

.loading-indicator.state-writing {
  background: #f0fdf4;
  color: #166534;
}

.loading-indicator.state-writing .loading-spinner {
  border-color: #bbf7d0;
  border-top-color: #22c55e;
}
```

**Step 3: Implement loading state management**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Update loading state indicator
 * @param {string} state - 'thinking' | 'tool' | 'writing' | null
 * @param {string} message - Optional custom message
 */
function updateLoadingState(state, message = null) {
  const indicator = document.getElementById('loadingIndicator');
  if (!indicator) return;

  // Remove all state classes
  indicator.classList.remove('state-thinking', 'state-tool', 'state-writing');

  if (!state) {
    indicator.style.display = 'none';
    return;
  }

  indicator.style.display = 'flex';
  indicator.classList.add(`state-${state}`);

  const textEl = indicator.querySelector('.loading-text');

  // Set message based on state
  const defaultMessages = {
    thinking: '正在思考...',
    tool: '正在使用工具...',
    writing: '正在生成回复...'
  };

  textEl.textContent = message || defaultMessages[state] || '加载中...';
}

/**
 * Update tool-specific loading message
 * @param {string} toolName - Name of the tool being used
 */
function updateToolLoadingState(toolName) {
  // Format tool name for display
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

  updateLoadingState('tool', `正在使用 ${displayName}...`);
}
```

**Step 4: Integrate with SSE stream handling**

Find your SSE stream handler and add state updates:

```javascript
// In your stream processing loop:
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);

      // Update loading state based on event type
      switch (data.type) {
        case 'session_init':
          updateLoadingState('thinking');
          break;

        case 'tool_use':
          updateToolLoadingState(data.name || 'unknown tool');
          break;

        case 'tool_result':
          // Tool finished, back to thinking
          updateLoadingState('thinking');
          break;

        case 'text':
          // Started generating response
          updateLoadingState('writing');
          break;

        case 'done':
          // Finished
          updateLoadingState(null);
          break;
      }

      // ... rest of your stream handling ...

    } catch (e) {
      console.error('Parse error:', e);
    }
  }
}
```

**Step 5: Show/hide loading indicator with send button**

Modify your `setGeneratingState` function (from previous sub-plan):

```javascript
function setGeneratingState(generating) {
  isGenerating = generating;

  const loadingIndicator = document.getElementById('loadingIndicator');

  if (generating) {
    // Show loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
      updateLoadingState('thinking');
    }

    // Show stop button, hide send button
    stopButton.style.display = 'flex';
    sendButton.style.display = 'none';

    // Disable input
    messageInput.disabled = true;
  } else {
    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }

    // Show send button, hide stop button
    stopButton.style.display = 'none';
    sendButton.style.display = 'flex';

    // Enable input
    messageInput.disabled = false;
    messageInput.focus();
  }
}
```

**Step 6: Save and verify**

```bash
# Verify loading state logic was added
grep -A 10 "updateLoadingState\|updateToolLoadingState" renderer/renderer.js
```

Expected: Shows the loading state management functions

**Step 7: Commit**

```bash
git add renderer/index.html renderer/renderer.js renderer/style.css
git commit -m "feat: implement rich loading states (thinking/tool/writing)"
```

---

## Task 4: Test History Enhancements

**Files:**
- Test: Manual testing in running app

**Step 1: Start application**

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Electron
npm start
```

**Step 2: Test time grouping**

- Create chats over multiple days (modify timestamps if needed for testing)
- Verify group labels appear: "今天", "昨天", "近 7 天"
- Verify chats are sorted within groups
- Verify group labels only appear when group changes

**Step 3: Test regenerate button**

- Send a message
- Let AI respond
- Hover over AI response
- Click "重新生成" button
- Verify button shows "生成中..." with spinner
- Verify new response replaces old one
- Test stop during regeneration

**Step 4: Test loading states**

- Send a message that triggers tool use
- Watch loading indicator cycle:
  - "正在思考..." (blue)
  - "正在使用 [Tool Name]..." (yellow)
  - "正在生成回复..." (green)
- Verify states change in real-time
- Verify indicator hides when complete

**Step 5: Verify all behaviors**

- [ ] Time groups show correct labels
- [ ] Chats sorted by timestamp within groups
- [ ] Regenerate button appears on hover
- [ ] Regenerate replaces old response
- [ ] Loading states cycle correctly
- [ ] Tool names display in loading state
- [ ] Loading indicator hides on completion

---

## Final Verification

**Step 1: Code review**

```bash
# Check all changes
git diff HEAD~4..HEAD --stat
```

Expected: Shows changes to renderer.js, style.css, index.html

**Step 2: Integration test**

Full workflow:
1. View chat history with time groups
2. Click an old chat → Regenerate button appears
3. Regenerate response → Loading states cycle
4. Verify new response replaces old

**Step 3: Edge case testing**

- Empty chat list
- Very old chats (>30 days)
- Regenerate with no network
- Tool names with special characters
- Rapid state changes

---

## Summary

This plan enhances chat history management and provides transparent feedback during generation.

**Deliverables:**
- [x] Time-based grouping labels (今天/昨天/近7天/近30天/月份)
- [x] Regenerate button for AI responses
- [x] Rich loading states (思考/工具/生成)
- [x] Tool name display in loading state

**Estimated Time:** 6 hours

**Dependencies:** None (independent)

**Next:** Proceed to [2025-01-17-personalization.md](2025-01-17-personalization.md) for theme switching, keyboard shortcuts, and accessibility.
