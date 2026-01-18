# 开发者体验套件 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance developer experience with code block optimizations (language tags, copy button, syntax highlighting) and real-time chat history search.

**Architecture:** Post-process rendered markdown to enhance code blocks with wrapper elements. Implement debounced search that filters the chat list array.

**Tech Stack:** Vanilla JavaScript, CSS, optional highlight.js/prism.js for syntax highlighting

**Dependencies:** None (in standalone)

---

## Task 1: Add Code Block Enhancement CSS

**Files:**
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add code block wrapper styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Enhanced Code Blocks */
.code-wrapper {
  position: relative;
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1e293b;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.lang-tag {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.copy-btn {
  padding: 4px 10px;
  background: #334155;
  color: #e2e8f0;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #475569;
}

.copy-btn:active {
  background: #64748b;
}

.copy-btn.copied {
  background: #10b981;
  color: white;
}

.code-wrapper pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background: transparent;
}

.code-wrapper code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #e2e8f0;
}
```

**Step 2: Commit styles**

```bash
git add renderer/style.css
git commit -m "feat: add enhanced code block styles"
```

---

## Task 2: Implement Code Block Enhancement Function

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add code block enhancement function**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Enhance code blocks with language tags and copy buttons
 * @param {HTMLElement} container - Container to process
 */
function enhanceCodeBlocks(container) {
  // Find all code blocks
  const codeBlocks = container.querySelectorAll('pre code');

  codeBlocks.forEach((block) => {
    // Skip if already enhanced
    if (block.closest('.code-wrapper')) return;

    // Extract language from class name (e.g., "language-javascript")
    const className = block.className;
    const langMatch = className.match(/language-(\w+)/);
    const language = langMatch ? langMatch[1] : 'text';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';

    // Create header
    const header = document.createElement('div');
    header.className = 'code-header';

    // Add language tag
    const langTag = document.createElement('span');
    langTag.className = 'lang-tag';
    langTag.textContent = language;

    // Add copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.setAttribute('aria-label', `Copy ${language} code`);

    // Copy handler
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.textContent);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');

        // Show toast feedback
        showToast('Code copied to clipboard', 'success', 1500);

        // Reset button after 2 seconds
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy code', 'error');
      }
    });

    // Assemble header
    header.appendChild(langTag);
    header.appendChild(copyBtn);

    // Wrap the pre block
    const preBlock = block.parentNode;
    preBlock.parentNode.replaceChild(wrapper, preBlock);
    wrapper.appendChild(header);
    wrapper.appendChild(preBlock);
  });
}
```

**Step 2: Integrate with message rendering**

Find where you append rendered markdown to the DOM and add the enhancement:

```javascript
// EXISTING CODE (find this pattern):
function appendMessage(content, role) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  // Render markdown
  const html = marked.parse(content);
  messageDiv.innerHTML = html;

  messagesContainer.appendChild(messageDiv);
}

// MODIFY TO:
function appendMessage(content, role) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  // Render markdown
  const html = marked.parse(content);
  messageDiv.innerHTML = html;

  // Enhance code blocks
  enhanceCodeBlocks(messageDiv);

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}
```

**Step 3: Also enhance existing messages on page load**

Add to initialization:

```javascript
// Enhance code blocks in existing messages
window.addEventListener('DOMContentLoaded', () => {
  const messagesContainer = document.getElementById('messages');
  enhanceCodeBlocks(messagesContainer);
});
```

**Step 4: Save and verify**

```bash
# Verify function was added
grep -A 30 "enhanceCodeBlocks" renderer/renderer.js
```

Expected: Shows the enhanceCodeBlocks function

**Step 5: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: implement code block enhancement (language tag + copy button)"
```

---

## Task 3: Add Syntax Highlighting (Optional)

**Files:**
- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add highlight.js CDN to HTML**

Add to [renderer/index.html](renderer/index.html) in `<head>`:

```html
<!-- Highlight.js for syntax highlighting -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
```

**Step 2: Integrate highlighting with code blocks**

Modify the `enhanceCodeBlocks` function in [renderer/renderer.js](renderer/renderer.js):

```javascript
// In enhanceCodeBlocks function, after wrapping:
// Add syntax highlighting
if (typeof hljs !== 'undefined') {
  hljs.highlightElement(block);
}
```

**Step 3: Add highlighting fallback**

Add before the `enhanceCodeBlocks` function:

```javascript
/**
 * Check if highlight.js is loaded
 */
function isHighlightJSAvailable() {
  return typeof hljs !== 'undefined' && hljs.highlightElement;
}
```

Then modify the enhancement:

```javascript
// Add syntax highlighting
if (isHighlightJSAvailable()) {
  try {
    hljs.highlightElement(block);
  } catch (err) {
    console.warn('Syntax highlighting failed:', err);
  }
}
```

**Step 4: Save and verify**

```bash
# Verify highlight.js integration
grep "hljs\|highlight" renderer/renderer.js renderer/index.html
```

Expected: Shows highlight.js references

**Step 5: Commit**

```bash
git add renderer/index.html renderer/renderer.js
git commit -m "feat: integrate highlight.js for syntax highlighting"
```

---

## Task 4: Add Search UI to Sidebar

**Files:**
- Modify: [renderer/index.html](renderer/index.html)
- Modify: [renderer/style.css](renderer/style.css)

**Step 1: Add search input to sidebar**

Find the sidebar/chat list section in [renderer/index.html](renderer/index.html) and add search:

```html
<!-- Chat Sidebar -->
<div class="sidebar">
  <!-- NEW: Add search box at top -->
  <div class="search-container">
    <input
      type="text"
      id="chatSearch"
      class="chat-search-input"
      placeholder="搜索聊天历史..."
      aria-label="Search chat history"
    />
    <span class="search-icon">🔍</span>
  </div>

  <!-- Existing chat list -->
  <div id="chatList" class="chat-list">
    <!-- ... existing chat items ... -->
  </div>
</div>
```

**Step 2: Add search styles**

Append to [renderer/style.css](renderer/style.css):

```css
/* Chat Search */
.search-container {
  position: relative;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-search-input {
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
  transition: all 0.2s;
}

.chat-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.chat-search-input::placeholder {
  color: #9ca3af;
}

.search-icon {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

/* Hide chat items that don't match search */
.chat-item.hidden-by-search {
  display: none;
}

/* Show "no results" message */
.no-search-results {
  padding: 20px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  display: none;
}

.no-search-results.visible {
  display: block;
}
```

**Step 3: Commit styles**

```bash
git add renderer/index.html renderer/style.css
git commit -m "feat: add chat search UI to sidebar"
```

---

## Task 5: Implement Search Functionality

**Files:**
- Modify: [renderer/renderer.js](renderer/renderer.js)

**Step 1: Add debounced search function**

Add to [renderer/renderer.js](renderer/renderer.js):

```javascript
/**
 * Debounce function to limit search frequency
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Search chat history
 * @param {string} query - Search query
 */
function searchChats(query) {
  const chatList = document.getElementById('chatList');
  const noResults = document.querySelector('.no-search-results');

  // Clear existing no-results message
  const existingNoResults = chatList.querySelector('.no-search-results');
  if (existingNoResults) {
    existingNoResults.remove();
  }

  // Get all chat items
  const chatItems = chatList.querySelectorAll('.chat-item');

  // Filter chats
  const lowerQuery = query.toLowerCase().trim();
  let visibleCount = 0;

  chatItems.forEach(item => {
    if (!lowerQuery) {
      // Show all if query is empty
      item.classList.remove('hidden-by-search');
      visibleCount++;
    } else {
      // Search in chat title and preview
      const title = item.querySelector('.chat-title')?.textContent || '';
      const preview = item.querySelector('.chat-preview')?.textContent || '';
      const searchText = `${title} ${preview}`.toLowerCase();

      if (searchText.includes(lowerQuery)) {
        item.classList.remove('hidden-by-search');
        visibleCount++;
      } else {
        item.classList.add('hidden-by-search');
      }
    }
  });

  // Show no results message
  if (lowerQuery && visibleCount === 0) {
    const noResultsEl = document.createElement('div');
    noResultsEl.className = 'no-search-results visible';
    noResultsEl.textContent = 'No matching chats found';
    chatList.appendChild(noResultsEl);
  }
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
  const searchInput = document.getElementById('chatSearch');
  if (!searchInput) return;

  // Debounced search handler
  const debouncedSearch = debounce((e) => {
    searchChats(e.target.value);
  }, 200);

  // Attach event listener
  searchInput.addEventListener('input', debouncedSearch);

  // Clear search on Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchChats('');
      searchInput.blur();
    }
  });
}

// Initialize search on load
window.addEventListener('DOMContentLoaded', initializeSearch);
```

**Step 2: Ensure chat items have proper structure for search**

Verify your chat items have title/preview classes. If not, update chat rendering:

```javascript
// When rendering chat list items, ensure:
function createChatItem(chat) {
  const item = document.createElement('div');
  item.className = 'chat-item';
  item.dataset.chatId = chat.id;

  item.innerHTML = `
    <div class="chat-title">${escapeHtml(chat.title)}</div>
    <div class="chat-preview">${escapeHtml(chat.preview)}</div>
  `;

  return item;
}
```

**Step 3: Save and verify**

```bash
# Verify search was added
grep -A 10 "searchChats\|debounce" renderer/renderer.js
```

Expected: Shows the search-related functions

**Step 4: Commit**

```bash
git add renderer/renderer.js
git commit -m "feat: implement debounced chat search with keyboard support"
```

---

## Task 6: Test Code Blocks and Search

**Files:**
- Test: Manual testing in running app

**Step 1: Start application**

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Electron
npm start
```

**Step 2: Test code block enhancements**

- Send message asking for code: "Write a Python function to sort a list"
- Verify code block appears with dark background
- Check language tag shows "PYTHON" in header
- Click "Copy" button
- Verify button changes to "Copied!"
- Verify toast shows "Code copied to clipboard"
- Paste to verify copy worked

**Step 3: Test syntax highlighting**

- Request code in multiple languages: JavaScript, Python, CSS, SQL
- Verify syntax highlighting is applied
- Check different language tags appear

**Step 4: Test search functionality**

- Create multiple chats with different titles/messages
- Type in search box
- Verify real-time filtering (debounced)
- Test partial matches
- Test with no results → "No matching chats found"
- Press Escape → Clears search
- Verify search works on titles and message content

**Step 5: Verify all behaviors**

- [ ] Code blocks have dark theme
- [ ] Language tags display correctly
- [ ] Copy button works with visual feedback
- [ ] Toast confirms copy action
- [ ] Syntax highlighting applies (if highlight.js loaded)
- [ ] Search filters in real-time
- [ ] Search works on titles and content
- [ ] No results message shows when appropriate
- [ ] Escape clears search

---

## Final Verification

**Step 1: Code review**

```bash
# Check all changes
git diff HEAD~5..HEAD --stat
```

Expected: Shows changes to style.css, renderer.js, index.html

**Step 2: Performance check**

- Search is debounced (no lag on typing)
- Code block enhancement doesn't slow rendering
- Copy to clipboard works reliably

**Step 3: Edge case testing**

- Empty code blocks
- Code blocks without language specification
- Search with special characters
- Very long search queries
- Rapid copy button clicks

---

## Summary

This plan enhances developer experience with better code blocks and search functionality.

**Deliverables:**
- [x] Code block language tags
- [x] Copy button with visual feedback
- [x] Optional syntax highlighting (highlight.js)
- [x] Real-time chat search with debounce
- [x] Search UI in sidebar

**Estimated Time:** 7 hours

**Dependencies:** None (standalone)

**Next:** Proceed to [2025-01-17-history-enhancement.md](2025-01-17-history-enhancement.md) for time grouping, regenerate, and loading states.
