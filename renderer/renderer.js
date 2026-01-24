// Module imports
import {
  generateId,
  escapeHtml,
  escapeHtmlPure,
  hasUnclosedCodeBlock,
  getTimeGroupLabel,
  formatRelativeTime,
  formatToolPreview,
  getToolDescription,
  debounce,
  calculateDiffStats
} from './utils.js';

import {
  createChatData,
  findChatById,
  updateChatInList,
  removeChatById,
  sortChatsByTime,
  saveChatToStorage,
  loadChatsFromStorage
} from './chatStore.js';

// Note: sessionManager.js available for future use

import {
  calculateTextareaHeight,
  buildInlineToolCallHTML,
  buildSidebarToolCallHTML,
  buildChatItemHTML,
  buildTaskSectionTitleHTML,
  buildMessageActionsHTML,
  buildLoadingIndicatorHTML,
  buildDiffStatsHTML,
  getTemplateContent,
  matchesSearch
} from './uiHelpers.js';

import { initTheme, toggleTheme } from './modules/theme.js';
import {
  showToast,
  showErrorWithRetry,
  retryMessage,
  initFeedbackCallbacks
} from './modules/feedback.js';
import { initSettings, setupSettingsListeners } from './modules/settings.js';
import { setupSkillsListeners } from './modules/skillsManager.js';

// DOM Elements - Views
const homeView = document.getElementById('homeView');
const chatView = document.getElementById('chatView');

// DOM Elements - Home
const homeForm = document.getElementById('homeForm');
const homeInput = document.getElementById('homeInput');
const homeSendBtn = document.getElementById('homeSendBtn');
const homeStopBtn = document.getElementById('homeStopBtn');

// DOM Elements - Chat
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatStopBtn = document.getElementById('chatStopBtn');
const chatMessages = document.getElementById('chatMessages');
const chatTitle = document.getElementById('chatTitle');

// DOM Elements - Right Sidebar
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const toolCallsList = document.getElementById('toolCallsList');
const emptyTools = document.getElementById('emptyTools');

// DOM Elements - Left Sidebar (Chat History)
const chatHistoryList = document.getElementById('chatHistoryList');

// State
let isFirstMessage = true;
let todos = [];
let toolCalls = [];
let attachedFiles = [];
let selectedModel = 'minimax-2-1';
let thinkingMode = 'normal'; // 'normal' or 'extended'
let isWaitingForResponse = false;
let currentRequestId = null; // Track current request for abort

// Multi-chat state
let allChats = [];
let currentChatId = null;

// Initialize
function init() {
  updateGreeting();
  setupEventListeners();
  loadAllChats();
  renderChatHistory();
  initializeSearch();
  setupResizers();
  initializeSidebarState();
  homeInput.focus();
}

// Initialize sidebar state (check if collapsed and show/hide expand button)
function initializeSidebarState() {
  const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
  if (sidebar && sidebarExpandBtn) {
    // Check if sidebar is collapsed: has collapsed class OR width is 0 or very small (<= 1px)
    const hasCollapsedClass = sidebar.classList.contains('collapsed');
    const sidebarWidth = sidebar.offsetWidth;
    const computedWidth = parseFloat(window.getComputedStyle(sidebar).width);
    const isCollapsed = hasCollapsedClass || sidebarWidth <= 1 || computedWidth <= 1;
    sidebarExpandBtn.style.display = isCollapsed ? 'flex' : 'none';
  }
}

/**
 * Auto-resize textarea based on content
 * @param {HTMLTextAreaElement} textarea - The textarea to resize
 */
function autoResizeTextarea(textarea) {
  // Reset height to get accurate scrollHeight
  textarea.style.height = 'auto';

  // Calculate new height using uiHelpers
  const { height, hasScroll } = calculateTextareaHeight(textarea.scrollHeight, 200);

  // Apply new height
  textarea.style.height = height + 'px';

  // 检测内容是否溢出，控制滚动条显示
  if (hasScroll) {
    textarea.classList.add('has-scroll');
  } else {
    textarea.classList.remove('has-scroll');
  }
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

// Save current chat state
function saveState(preserveUpdatedAt = false, skipRenderHistory = false) {
  if (!currentChatId) {
    return;
  }

  // Create chat data using chatStore
  const messages = Array.from(chatMessages.children).map(msg => ({
    class: msg.className,
    content:
      msg.querySelector('.message-content')?.dataset.rawContent ||
      msg.querySelector('.message-content')?.textContent ||
      ''
  }));

  const chatData = createChatData(
    currentChatId,
    chatTitle.textContent,
    messages,
    todos,
    toolCalls,
    fileChanges
  );

  // Update chat list using chatStore
  allChats = updateChatInList(allChats, chatData, preserveUpdatedAt);

  // Save to localStorage using chatStore
  saveChatToStorage(localStorage, allChats, currentChatId);

  if (!skipRenderHistory) {
    renderChatHistory();
  } else {
    // 只更新 active 状态，避免完全重新渲染
    updateChatHistoryActiveState();
  }
}

// Load all chats from localStorage
function loadAllChats() {
  // Load chats using chatStore
  const loaded = loadChatsFromStorage(localStorage);
  allChats = loaded.allChats;
  currentChatId = loaded.currentChatId;

  // If there's a current chat, load it using chatStore
  if (currentChatId) {
    const chat = findChatById(allChats, currentChatId);
    if (chat) {
      loadChat(chat);
    }
  }
}

// Load a specific chat
function loadChat(chat) {
  currentChatId = chat.id;
  chatTitle.textContent = chat.title;
  isFirstMessage = false;
  todos = chat.todos || [];
  toolCalls = chat.toolCalls || [];
  fileChanges = chat.fileChanges || [];

  // Switch to chat view
  switchToChatView();

  // Restore messages
  chatMessages.innerHTML = '';
  let lastAssistantContentDiv = null;

  (chat.messages || []).forEach(msgData => {
    const messageDiv = document.createElement('div');
    messageDiv.className = msgData.class;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.dataset.rawContent = msgData.content;

    if (msgData.class.includes('user')) {
      contentDiv.textContent = msgData.content;
    } else if (msgData.class.includes('assistant')) {
      renderMarkdown(contentDiv);
      lastAssistantContentDiv = contentDiv;
    }

    messageDiv.appendChild(contentDiv);

    if (msgData.class.includes('assistant')) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      actionsDiv.innerHTML = `
        <button class="action-btn" title="Copy" onclick="copyMessage(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      `;
      messageDiv.appendChild(actionsDiv);
    }

    chatMessages.appendChild(messageDiv);
  });

  // Restore inline tool calls into the last assistant message
  if (lastAssistantContentDiv && toolCalls.length > 0) {
    toolCalls.forEach(tc => {
      restoreInlineToolCall(lastAssistantContentDiv, tc);
    });
  }

  // Restore timeline display
  renderTimeline();

  // Restore file changes display
  renderFileChanges();

  scrollToBottom();
  // 只更新 active 状态，避免完全重新渲染导致视觉跳动
  updateChatHistoryActiveState();
  localStorage.setItem('currentChatId', currentChatId);
}

// 只更新历史记录中的 active 状态，避免完全重新渲染
function updateChatHistoryActiveState() {
  const items = chatHistoryList.querySelectorAll('.task-item');
  items.forEach(item => {
    const isActive = item.dataset.chatId === currentChatId;
    if (isActive) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Restore a single inline tool call (for loading saved chats)
function restoreInlineToolCall(contentDiv, toolCall) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call'; // Collapsed by default when restored
  toolDiv.dataset.toolId = toolCall.id;

  // Use buildInlineToolCallHTML from uiHelpers
  toolDiv.innerHTML = buildInlineToolCallHTML(
    toolCall.name,
    toolCall.input,
    toolCall.id,
    toolCall.status,
    toolCall.result
  );

  contentDiv.appendChild(toolDiv);
}

// Restore sidebar tool calls display
function renderTimeline() {
  const timelineList = document.getElementById('timelineList');
  const emptyTimeline = document.getElementById('emptyTimeline');

  if (!timelineList) {
    return;
  }

  timelineList.innerHTML = '';

  if (toolCalls.length === 0) {
    if (emptyTimeline) {
      emptyTimeline.style.display = 'block';
    }
    return;
  }

  if (emptyTimeline) {
    emptyTimeline.style.display = 'none';
  }

  // Use buildSidebarToolCallHTML from uiHelpers (already includes details)
  toolCalls.forEach(tc => {
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-call-item';
    toolDiv.dataset.toolId = tc.id;
    toolDiv.innerHTML = buildSidebarToolCallHTML(tc);
    timelineList.appendChild(toolDiv);
  });
}

// Render chat history sidebar
function renderChatHistory() {
  // 保存当前滚动位置
  const scrollTop = chatHistoryList.scrollTop;

  chatHistoryList.innerHTML = '';

  if (allChats.length === 0) {
    chatHistoryList.innerHTML = '<div class="chat-history-empty">No chats yet</div>';
    return;
  }

  // Sort by updated time using chatStore
  const sortedChats = sortChatsByTime(allChats);

  // 分组聊天
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const runningChats = [];
  const todayChats = [];
  const yesterdayChats = [];
  const olderChats = [];

  sortedChats.forEach(chat => {
    const isActive = chat.id === currentChatId;
    const timestamp = chat.updatedAt || chat.createdAt || now;
    const chatDate = new Date(timestamp);
    chatDate.setHours(0, 0, 0, 0);

    // 判断是否为进行中的聊天（当前活动且正在生成响应）
    if (isActive && isWaitingForResponse) {
      runningChats.push(chat);
    } else if (chatDate.getTime() === today.getTime()) {
      todayChats.push(chat);
    } else if (chatDate.getTime() === yesterday.getTime()) {
      yesterdayChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  });

  // 渲染"进行中"分组
  if (runningChats.length > 0) {
    const section = document.createElement('div');
    section.className = 'task-section';
    section.innerHTML = buildTaskSectionTitleHTML('进行中');

    const taskList = document.createElement('div');
    taskList.className = 'task-list';

    runningChats.forEach(chat => {
      const isActive = chat.id === currentChatId;
      const timestamp = chat.updatedAt || chat.createdAt || now;
      const relativeTime = formatRelativeTime(timestamp);
      const status = isWaitingForResponse ? 'running' : 'completed';

      const item = document.createElement('div');
      item.className = 'task-item' + (isActive ? ' active' : '');
      item.dataset.chatId = chat.id;
      item.innerHTML = buildChatItemHTML(chat, isActive, status, relativeTime);
      item.onclick = e => {
        if (!e.target.closest('.delete-chat-btn')) {
          switchToChat(chat.id);
        }
      };
      taskList.appendChild(item);
    });

    section.appendChild(taskList);
    chatHistoryList.appendChild(section);
  }

  // 渲染"今天"分组
  if (todayChats.length > 0) {
    const section = document.createElement('div');
    section.className = 'task-section';
    section.innerHTML = buildTaskSectionTitleHTML('今天');

    const taskList = document.createElement('div');
    taskList.className = 'task-list';

    todayChats.forEach(chat => {
      const isActive = chat.id === currentChatId;
      const timestamp = chat.updatedAt || chat.createdAt || now;
      const relativeTime = formatRelativeTime(timestamp);
      const status = isActive && isWaitingForResponse ? 'running' : 'completed';

      const item = document.createElement('div');
      item.className = 'task-item' + (isActive ? ' active' : '');
      item.dataset.chatId = chat.id;
      item.innerHTML = buildChatItemHTML(chat, isActive, status, relativeTime);
      item.onclick = e => {
        if (!e.target.closest('.delete-chat-btn')) {
          switchToChat(chat.id);
        }
      };
      taskList.appendChild(item);
    });

    section.appendChild(taskList);
    chatHistoryList.appendChild(section);
  }

  // 渲染"昨天"分组
  if (yesterdayChats.length > 0) {
    const section = document.createElement('div');
    section.className = 'task-section';
    section.innerHTML = buildTaskSectionTitleHTML('昨天');

    const taskList = document.createElement('div');
    taskList.className = 'task-list';

    yesterdayChats.forEach(chat => {
      const isActive = chat.id === currentChatId;
      const timestamp = chat.updatedAt || chat.createdAt || now;
      const relativeTime = formatRelativeTime(timestamp);
      const status = 'completed';

      const item = document.createElement('div');
      item.className = 'task-item' + (isActive ? ' active' : '');
      item.dataset.chatId = chat.id;
      item.innerHTML = buildChatItemHTML(chat, isActive, status, relativeTime);
      item.onclick = e => {
        if (!e.target.closest('.delete-chat-btn')) {
          switchToChat(chat.id);
        }
      };
      taskList.appendChild(item);
    });

    section.appendChild(taskList);
    chatHistoryList.appendChild(section);
  }

  // 渲染"更早"分组
  if (olderChats.length > 0) {
    const section = document.createElement('div');
    section.className = 'task-section';
    section.innerHTML = buildTaskSectionTitleHTML('更早');

    const taskList = document.createElement('div');
    taskList.className = 'task-list';

    olderChats.forEach(chat => {
      const isActive = chat.id === currentChatId;
      const timestamp = chat.updatedAt || chat.createdAt || now;
      const relativeTime = formatRelativeTime(timestamp);
      const status = 'completed';

      const item = document.createElement('div');
      item.className = 'task-item' + (isActive ? ' active' : '');
      item.dataset.chatId = chat.id;
      item.innerHTML = buildChatItemHTML(chat, isActive, status, relativeTime);
      item.onclick = e => {
        if (!e.target.closest('.delete-chat-btn')) {
          switchToChat(chat.id);
        }
      };
      taskList.appendChild(item);
    });

    section.appendChild(taskList);
    chatHistoryList.appendChild(section);
  }

  // 恢复滚动位置（如果列表内容没有变化）
  if (scrollTop > 0 && chatHistoryList.scrollHeight >= scrollTop) {
    chatHistoryList.scrollTop = scrollTop;
  }
}

// Switch to a different chat
function switchToChat(chatId) {
  if (currentChatId) {
    // 切换聊天时，保存状态但不更新 updatedAt，也不重新渲染历史记录，避免顺序乱跳和视觉跳动
    saveState(true, true);
  }

  // Find chat using chatStore
  const chat = findChatById(allChats, chatId);
  if (chat) {
    loadChat(chat);
  }
}

// Delete a chat
window.deleteChat = function (chatId, event) {
  event.stopPropagation();

  // Remove chat using chatStore
  allChats = removeChatById(allChats, chatId);
  saveChatToStorage(localStorage, allChats, currentChatId === chatId ? null : currentChatId);

  if (currentChatId === chatId) {
    // If deleting current chat, go to home or load another chat
    if (allChats.length > 0) {
      loadChat(allChats[0]);
    } else {
      currentChatId = null;
      homeView.classList.remove('hidden');
      chatView.classList.add('hidden');
      isFirstMessage = true;
    }
  }

  renderChatHistory();
};

// Update greeting based on time of day
function updateGreeting() {
  // Greeting is now static, no need to update
}

// Setup all event listeners
function setupEventListeners() {
  // Home form
  homeForm.addEventListener('submit', handleSendMessage);
  homeInput.addEventListener('input', () => {
    updateSendButton(homeInput, homeSendBtn);
    autoResizeTextarea(homeInput);
  });
  homeInput.addEventListener('paste', () => {
    setTimeout(() => autoResizeTextarea(homeInput), 0);
  });
  homeInput.addEventListener('keydown', e => handleKeyPress(e, homeForm));

  // Chat form
  chatForm.addEventListener('submit', handleSendMessage);
  messageInput.addEventListener('input', () => {
    updateSendButton(messageInput, chatSendBtn);
    autoResizeTextarea(messageInput);
  });
  messageInput.addEventListener('paste', () => {
    setTimeout(() => autoResizeTextarea(messageInput), 0);
  });
  messageInput.addEventListener('keydown', e => handleKeyPress(e, chatForm));

  // Sidebar toggle
  sidebarToggle.addEventListener('click', window.toggleSidebar);

  // File attachment buttons
  const homeAttachBtn = document.getElementById('homeAttachBtn');
  const chatAttachBtn = document.getElementById('chatAttachBtn');
  const homeFileInput = document.getElementById('homeFileInput');
  const chatFileInput = document.getElementById('chatFileInput');

  homeAttachBtn.addEventListener('click', () => homeFileInput.click());
  chatAttachBtn.addEventListener('click', () => chatFileInput.click());
  homeFileInput.addEventListener('change', e => handleFileSelect(e, 'home'));
  chatFileInput.addEventListener('change', e => handleFileSelect(e, 'chat'));

  // Setup dropdowns (native select)
  setupDropdowns();

  // Stop button handlers
  if (homeStopBtn) {
    homeStopBtn.addEventListener('click', handleStopGeneration);
  }
  if (chatStopBtn) {
    chatStopBtn.addEventListener('click', handleStopGeneration);
  }

  // Quick start template handlers
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const templateType = card.dataset.template;
      loadTemplate(templateType);
    });
  });
}

/**
 * Handle stop generation button click
 */
function handleStopGeneration() {
  if (currentRequestId) {
    console.log('Stopping generation:', currentRequestId);
    window.electronAPI.abortRequest(currentRequestId);
    showToast('Stopping generation...', 'info');
    setGeneratingState(false);
  }
}

/**
 * Set generating state (show/hide stop button)
 * @param {boolean} generating - Whether AI is generating
 */
function setGeneratingState(generating) {
  if (generating) {
    // Show stop buttons, hide send buttons
    if (homeStopBtn) {
      homeStopBtn.style.display = 'flex';
    }
    if (chatStopBtn) {
      chatStopBtn.style.display = 'flex';
    }
    if (homeSendBtn) {
      homeSendBtn.style.display = 'none';
    }
    if (chatSendBtn) {
      chatSendBtn.style.display = 'none';
    }

    // Disable inputs while generating
    homeInput.disabled = true;
    messageInput.disabled = true;
  } else {
    // Show send buttons, hide stop buttons
    if (homeStopBtn) {
      homeStopBtn.style.display = 'none';
    }
    if (chatStopBtn) {
      chatStopBtn.style.display = 'none';
    }
    if (homeSendBtn) {
      homeSendBtn.style.display = 'flex';
    }
    if (chatSendBtn) {
      chatSendBtn.style.display = 'flex';
    }

    // Re-enable inputs
    homeInput.disabled = false;
    messageInput.disabled = false;

    // Focus appropriate input
    if (!homeView.classList.contains('hidden')) {
      homeInput.focus();
    } else {
      messageInput.focus();
    }
  }
}

/**
 * Load a template into the input
 * @param {string} templateType - The template type to load
 */
function loadTemplate(templateType) {
  // Get template content from uiHelpers
  const prompt = getTemplateContent(templateType);
  if (!prompt) {
    return;
  }

  // Populate input
  const input = homeView.classList.contains('hidden') ? messageInput : homeInput;
  input.value = prompt;
  autoResizeTextarea(input);
  input.focus();

  // Hide templates
  hideTemplates();

  showToast('Template loaded - customize and send!', 'info', 2000);
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
 * Show quick start templates (for new chat)
 */
function showTemplates() {
  const templates = document.getElementById('quickStartTemplates');
  if (templates) {
    templates.classList.remove('hidden');
  }
}

/**
 * Enhance code blocks with language tags and copy buttons
 * @param {HTMLElement} container - Container to process
 */
function enhanceCodeBlocks(container) {
  // Find all code blocks
  const codeBlocks = container.querySelectorAll('pre code');

  codeBlocks.forEach(block => {
    // Skip if already enhanced
    if (block.closest('.code-wrapper')) {
      return;
    }

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

/**
 * Search chat history
 * @param {string} query - Search query
 */
function searchChats(query) {
  const chatList = document.getElementById('chatHistoryList');

  // Get all chat items (both old and new class names for compatibility)
  const chatItems = chatList.querySelectorAll('.task-item, .chat-item');

  // Clear existing no-results message
  const existingNoResults = chatList.querySelector('.no-search-results');
  if (existingNoResults) {
    existingNoResults.remove();
  }

  // Filter chats using matchesSearch from uiHelpers
  let visibleCount = 0;

  chatItems.forEach(item => {
    // Try both old and new title selectors
    const titleEl = item.querySelector('.task-title') || item.querySelector('.chat-item-title');
    const title = titleEl?.textContent || '';

    if (matchesSearch(title, query)) {
      item.classList.remove('hidden-by-search');
      // Also hide/show parent task-section if needed
      const section = item.closest('.task-section');
      if (section) {
        section.classList.remove('hidden-by-search');
      }
      visibleCount++;
    } else {
      item.classList.add('hidden-by-search');
      // Hide parent task-section if all items are hidden
      const section = item.closest('.task-section');
      if (section) {
        const visibleItems = section.querySelectorAll('.task-item:not(.hidden-by-search)');
        if (visibleItems.length === 0) {
          section.classList.add('hidden-by-search');
        }
      }
    }
  });

  // Show no results message
  if (query && query.trim() && visibleCount === 0) {
    const noResultsEl = document.createElement('div');
    noResultsEl.className = 'no-search-results visible';
    noResultsEl.textContent = '没有匹配的聊天';
    chatList.appendChild(noResultsEl);
  }
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
  const searchInput = document.getElementById('chatSearch');
  if (!searchInput) {
    return;
  }

  // Debounced search handler
  const debouncedSearch = debounce(e => {
    searchChats(e.target.value);
  }, 200);

  // Attach event listener
  searchInput.addEventListener('input', debouncedSearch);

  // Clear search on Escape
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchChats('');
      searchInput.blur();
    }
  });
}

// Setup dropdown functionality
function setupDropdowns() {
  // Thinking mode toggle buttons
  ['homeThinkingBtn', 'chatThinkingBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) {
      return;
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      thinkingMode = thinkingMode === 'normal' ? 'extended' : 'normal';

      // Update all thinking buttons
      document.querySelectorAll('.thinking-btn').forEach(b => {
        b.classList.toggle('active', thinkingMode === 'extended');
      });
    });
  });

  // Model selector - native select elements
  ['homeModelSelect', 'chatModelSelect'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) {
      return;
    }

    select.addEventListener('change', e => {
      selectedModel = e.target.value;
      // Sync both selects
      document.querySelectorAll('.model-select').forEach(s => {
        s.value = selectedModel;
      });
    });
  });
}

// Handle file selection
function handleFileSelect(event, context) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    if (attachedFiles.length >= 5) {
      showToast('Maximum 5 files allowed', 'error');
      return;
    }

    // Read file as base64 for images or text
    const reader = new FileReader();
    reader.onload = e => {
      attachedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      });
      renderAttachedFiles(context);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });

  // Reset input
  event.target.value = '';
}

// Render attached files preview
function renderAttachedFiles(context) {
  const inputWrapper =
    context === 'home'
      ? document.querySelector('#homeForm .input-wrapper')
      : document.querySelector('#chatForm .input-wrapper');

  let filesContainer = inputWrapper.querySelector('.attached-files');
  if (!filesContainer) {
    filesContainer = document.createElement('div');
    filesContainer.className = 'attached-files';
    inputWrapper.insertBefore(filesContainer, inputWrapper.firstChild);
  }

  filesContainer.innerHTML = attachedFiles
    .map(
      (file, index) => `
    <div class="attached-file">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>${file.name}</span>
      <svg class="remove-file" onclick="removeAttachedFile(${index}, '${context}')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `
    )
    .join('');

  if (attachedFiles.length === 0) {
    filesContainer.remove();
  }
}

// Remove attached file
window.removeAttachedFile = function (index, context) {
  attachedFiles.splice(index, 1);
  renderAttachedFiles(context);
};

// Toggle sidebar
window.toggleSidebar = function () {
  sidebar.classList.toggle('collapsed');

  // When expanding, clear inline style width to let CSS control the width
  // Also clear localStorage saved width to prevent restoring collapsed state
  const isNowCollapsed = sidebar.classList.contains('collapsed');
  if (!isNowCollapsed) {
    // Expanding - reset inline style to let CSS take over
    sidebar.style.width = '';
    localStorage.removeItem('rightSidebarWidth');
  }

  // Show/hide expand button when sidebar is collapsed
  const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
  if (sidebarExpandBtn) {
    // Check both class and width to determine if collapsed
    const hasCollapsedClass = sidebar.classList.contains('collapsed');
    const sidebarWidth = sidebar.offsetWidth;
    const shouldShow = hasCollapsedClass || sidebarWidth <= 1;
    sidebarExpandBtn.style.display = shouldShow ? 'flex' : 'none';
  }
};

// Switch panel tab
window.switchPanelTab = function (tabId) {
  // Update tab buttons
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    }
  });

  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  const targetPane = document.getElementById('tab-' + tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }
};

// File changes state
let fileChanges = [];

// Add file change
function addFileChange(name, path, type, stats = {}) {
  const id = 'file_' + Date.now();
  const change = { id, name, path, type, stats };
  fileChanges.push(change);
  renderFileChanges();
  return change;
}

// Render file changes
function renderFileChanges() {
  const fileChangesList = document.getElementById('fileChangesList');

  if (!fileChangesList) {
    return;
  }

  // Clear dynamic content but preserve structure
  fileChangesList.innerHTML = '';

  // Create empty state element
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-state';
  emptyDiv.id = 'emptyFiles';
  emptyDiv.textContent = '暂无文件变更';

  if (fileChanges.length === 0) {
    emptyDiv.style.display = 'block';
    fileChangesList.appendChild(emptyDiv);
    return;
  }

  // Hide empty state
  emptyDiv.style.display = 'none';
  fileChangesList.appendChild(emptyDiv);

  // Render file changes
  fileChanges.forEach(change => {
    const item = document.createElement('div');
    item.className = 'file-change-item';
    item.innerHTML = `
      <div class="file-change-header">
        <div class="file-change-icon ${change.type}">${getFileChangeIcon(change.type)}</div>
        <div class="file-change-info">
          <div class="file-change-name">${escapeHtml(change.name)}</div>
          <div class="file-change-path">${escapeHtml(change.path)}</div>
        </div>
        ${renderFileStats(change.stats)}
      </div>
    `;
    fileChangesList.appendChild(item);
  });
}

// Get file change icon
function getFileChangeIcon(type) {
  switch (type) {
    case 'added':
      return '+';
    case 'modified':
      return 'M';
    case 'deleted':
      return '-';
    default:
      return '?';
  }
}

// Render file stats
function renderFileStats(stats) {
  if (!stats || (!stats.added && !stats.removed)) {
    return '';
  }
  let html = '<div class="file-change-stats">';
  if (stats.added) {
    html += `<span class="stat-added">+${stats.added}</span>`;
  }
  if (stats.removed) {
    html += `<span class="stat-removed">-${stats.removed}</span>`;
  }
  html += '</div>';
  return html;
}

// Get progress icon
function getProgressIcon(status) {
  switch (status) {
    case 'success':
      return '✓';
    case 'running':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px;">
        <path d="M12 2v4"/><path d="M12 18v4"/>
      </svg>`;
    case 'error':
      return '✕';
    default:
      return '○';
  }
}

// Update send button state
function updateSendButton(input, button) {
  button.disabled = !input.value.trim() || isWaitingForResponse;
}

// Handle key press
function handleKeyPress(e, form) {
  if (e.key === 'Enter' && !e.shiftKey) {
    // Get current input based on which view is active
    const input = isFirstMessage ? homeInput : messageInput;

    // Check for unclosed code block
    if (hasUnclosedCodeBlock(input.value)) {
      // Prevent send, insert newline instead
      e.preventDefault();
      insertNewlineAtCursor(input);

      // Show hint to user
      showToast('Code block not closed - Enter adds newline', 'info', 2000);
      return;
    }

    // Normal send behavior
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
}

// Switch to chat view
function switchToChatView() {
  homeView.classList.add('hidden');
  chatView.classList.remove('hidden');
  // Initialize sidebar state when switching to chat view
  initializeSidebarState();
  messageInput.focus();
}

// Handle form submission
async function handleSendMessage(e) {
  e.preventDefault();

  const input = isFirstMessage ? homeInput : messageInput;
  const message = input.value.trim();

  if (!message || isWaitingForResponse) {
    return;
  }

  if (isFirstMessage) {
    currentChatId = generateId();
    switchToChatView();
    isFirstMessage = false;
    chatTitle.textContent = message.length > 30 ? message.substring(0, 30) + '...' : message;
  }

  // Add user message
  addUserMessage(message);

  // Clear input
  input.value = '';
  updateSendButton(input, homeSendBtn);
  updateSendButton(messageInput, chatSendBtn);

  // Hide templates when sending first message
  hideTemplates();

  // Set loading state
  isWaitingForResponse = true;

  // Set generating state (show stop button)
  setGeneratingState(true);

  // Create assistant message with loading state
  const assistantMessage = createAssistantMessage();
  const contentDiv = assistantMessage.querySelector('.message-content');

  try {
    // Pass chatId for session management
    const response = await window.electronAPI.sendMessage(message, currentChatId);

    // Store request ID for abort
    currentRequestId = response.requestId;

    const reader = await response.getReader();
    let buffer = '';
    let hasContent = false;
    let receivedStreamingText = false;
    const pendingToolCalls = new Map();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        const loadingIndicator = contentDiv.querySelector('.loading-indicator');
        if (loadingIndicator && hasContent) {
          loadingIndicator.remove();
        }
        const actionsDiv = assistantMessage.querySelector('.message-actions');
        if (actionsDiv) {
          actionsDiv.classList.remove('hidden');
        }
        for (const [, localId] of pendingToolCalls) {
          updateToolCallStatus(localId, 'success');
        }
        break;
      }

      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];

        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'renderer.js:1323',
                message: 'SSE data received',
                data: {
                  type: data.type,
                  id: data.id,
                  tool_use_id: data.tool_use_id,
                  name: data.name
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                hypothesisId: 'A-B'
              })
            }).catch(() => {});
            // #endregion

            if (data.type === 'done') {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'renderer.js:1333',
                  message: 'Done received - pending tools remaining',
                  data: {
                    pendingCount: pendingToolCalls.size,
                    pendingIds: Array.from(pendingToolCalls.keys())
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  hypothesisId: 'A'
                })
              }).catch(() => {});
              // #endregion

              // FIX: SDK doesn't provide individual tool_use_id in tool_result events
              // Mark all pending tools as completed when stream ends
              for (const [apiId, localId] of pendingToolCalls) {
                updateToolCallStatus(localId, 'success');
                updateInlineToolResult(localId, null); // Pass null to skip Output section update
              }
              pendingToolCalls.clear();

              removeGenerationStatus(assistantMessage);
              break;
            } else if (data.type === 'text' && data.content) {
              if (!hasContent) {
                const loadingIndicator = contentDiv.querySelector('.loading-indicator');
                if (loadingIndicator) {
                  loadingIndicator.remove();
                }
              }
              hasContent = true;
              receivedStreamingText = true;
              updateGenerationStatus(assistantMessage, '正在生成回复...');
              appendToContent(contentDiv, data.content);
            } else if (data.type === 'tool_use') {
              const toolName = data.name || data.tool || 'Tool';
              const toolInput = data.input || {};
              const apiId = data.id; // API's tool ID
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'renderer.js:1350',
                  message: 'tool_use event',
                  data: { toolName, apiId, inputKeys: Object.keys(toolInput) },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  hypothesisId: 'B'
                })
              }).catch(() => {});
              // #endregion
              updateGenerationStatus(assistantMessage, `正在调用工具: ${toolName}...`);
              const toolCall = addToolCall(toolName, toolInput, 'running');
              addInlineToolCall(contentDiv, toolName, toolInput, toolCall.id);
              if (apiId) {
                pendingToolCalls.set(apiId, toolCall.id);
              }
              // Handle TodoWrite tool (legacy support)
              if (toolName === 'TodoWrite' && toolInput.todos) {
                updateTodos(toolInput.todos);
              }
              // Track file changes from file operation tools
              if (['Write', 'Edit', 'StrReplace', 'Delete'].includes(toolName)) {
                const filePath = toolInput.path || toolInput.file_path || '';
                const pathSeparator = filePath.includes('\\') ? '\\' : '/';
                const fileName = filePath.split(pathSeparator).pop() || 'unknown';
                let changeType = 'modified';
                if (toolName === 'Delete') {
                  changeType = 'deleted';
                } else if (toolName === 'Write') {
                  changeType = 'added';
                }
                addFileChange(fileName, filePath, changeType);
              }
              hasContent = true;
            } else if (data.type === 'tool_result' || data.type === 'result') {
              const result = data.result || data.content || data;
              const apiId = data.tool_use_id;
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'renderer.js:1384',
                  message: 'tool_result received',
                  data: {
                    apiId,
                    hasPending: pendingToolCalls.has(apiId),
                    pendingKeys: Array.from(pendingToolCalls.keys())
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  hypothesisId: 'A-B'
                })
              }).catch(() => {});
              // #endregion
              updateGenerationStatus(assistantMessage, '收到工具执行结果，正在处理...');

              // Find the matching tool call by API ID
              const localId = apiId ? pendingToolCalls.get(apiId) : null;
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'renderer.js:1391',
                  message: 'tool_result matching',
                  data: { apiId, localId, foundMatch: !!localId },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  hypothesisId: 'B-C'
                })
              }).catch(() => {});
              // #endregion
              if (localId) {
                updateToolCallResult(localId, result);
                updateToolCallStatus(localId, 'success');
                updateInlineToolResult(localId, result);
                pendingToolCalls.delete(apiId);
              }

              if (!hasContent) {
                const loadingIndicator = contentDiv.querySelector('.loading-indicator');
                if (loadingIndicator) {
                  loadingIndicator.remove();
                }
              }
              hasContent = true;
            } else if (data.type === 'assistant' && data.message) {
              if (data.message.content && Array.isArray(data.message.content)) {
                for (const block of data.message.content) {
                  if (block.type === 'tool_use') {
                    const toolName = block.name || 'Tool';
                    const toolInput = block.input || {};
                    const apiId = block.id; // API's tool ID
                    updateGenerationStatus(assistantMessage, `准备使用工具: ${toolName}...`);
                    const toolCall = addToolCall(toolName, toolInput, 'running');
                    addInlineToolCall(contentDiv, toolName, toolInput, toolCall.id);
                    if (apiId) {
                      pendingToolCalls.set(apiId, toolCall.id);
                    }
                    // Track file changes from file operation tools
                    if (['Write', 'Edit', 'StrReplace', 'Delete'].includes(toolName)) {
                      const filePath = toolInput.path || toolInput.file_path || '';
                      const pathSeparator = filePath.includes('\\') ? '\\' : '/';
                      const fileName = filePath.split(pathSeparator).pop() || 'unknown';
                      let changeType = 'modified';
                      if (toolName === 'Delete') {
                        changeType = 'deleted';
                      } else if (toolName === 'Write') {
                        changeType = 'added';
                      }
                      addFileChange(fileName, filePath, changeType);
                    }
                    hasContent = true;
                  } else if (block.type === 'text' && block.text) {
                    if (!receivedStreamingText) {
                      if (!hasContent) {
                        const loadingIndicator = contentDiv.querySelector('.loading-indicator');
                        if (loadingIndicator) {
                          loadingIndicator.remove();
                        }
                      }
                      hasContent = true;
                      updateGenerationStatus(assistantMessage, '正在组织语言...');
                      appendToContent(contentDiv, block.text);
                    }
                  }
                }
              }

              if (data.message.content && Array.isArray(data.message.content)) {
                for (const block of data.message.content) {
                  if (block.type === 'tool_use' && block.name === 'TodoWrite') {
                    updateTodos(block.input.todos);
                  }
                }
              }
            }

            scrollToBottom();
          } catch (parseError) {
            // Silent fail on parse errors
          }
        }
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);

    // Check if it was aborted
    if (error.message === 'Request aborted') {
      showToast('Generation stopped', 'info');
      // Remove the empty assistant message
      assistantMessage.remove();
    } else {
      const loadingIndicator = contentDiv.querySelector('.loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      // Show error with retry button instead of just logging
      showErrorWithRetry(error.message || 'Network error - please retry', message, currentChatId);

      // Also show toast for visibility
      showToast('Message failed - click retry to resend', 'error');
    }
  } finally {
    isWaitingForResponse = false;
    currentRequestId = null;
    setGeneratingState(false);
    saveState();
    updateSendButton(messageInput, chatSendBtn);
    messageInput.focus();
  }
}

// Add user message to chat
function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  saveState();
}

// Create assistant message with loading state
function createAssistantMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  // Use buildLoadingIndicatorHTML from uiHelpers
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-indicator';
  loadingDiv.innerHTML = buildLoadingIndicatorHTML();

  contentDiv.appendChild(loadingDiv);

  // Use buildMessageActionsHTML from uiHelpers
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions hidden';
  actionsDiv.innerHTML = buildMessageActionsHTML();

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(actionsDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  saveState();

  return messageDiv;
}

/**
 * 更新生成状态文本
 * @param {HTMLElement} assistantMessage - 助手消息容器
 * @param {string} text - 状态文本
 */
function updateGenerationStatus(assistantMessage, text) {
  let statusDiv = assistantMessage.querySelector('.generation-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.className = 'generation-status';
    statusDiv.innerHTML = '<div class="status-dot"></div><span class="status-text"></span>';
    // 插入在 message-content 之后
    const contentDiv = assistantMessage.querySelector('.message-content');
    contentDiv.after(statusDiv);
  }

  const statusTextEl = statusDiv.querySelector('.status-text');
  if (statusTextEl) {
    statusTextEl.textContent = text;
  }
}

/**
 * 移除生成状态
 * @param {HTMLElement} assistantMessage - 助手消息容器
 */
function removeGenerationStatus(assistantMessage) {
  const statusDiv = assistantMessage.querySelector('.generation-status');
  if (statusDiv) {
    statusDiv.remove();
  }
}

function appendToContent(contentDiv, content) {
  if (!contentDiv.dataset.rawContent) {
    contentDiv.dataset.rawContent = '';
  }
  contentDiv.dataset.rawContent += content;

  // Get current chunk container and append to it
  const container = getCurrentMarkdownContainer(contentDiv);
  container.dataset.rawContent += content;
  renderMarkdownContainer(container);
  saveState();
}

// Start a new chat
window.startNewChat = function () {
  if (currentChatId && chatMessages.children.length > 0) {
    saveState();
  }

  currentChatId = null;

  // Clear all state
  chatMessages.innerHTML = '';
  messageInput.value = '';
  homeInput.value = '';
  chatTitle.textContent = 'New chat';
  isFirstMessage = true;
  todos = [];
  toolCalls = [];
  attachedFiles = [];
  fileChanges = [];

  // Reset sidebar/right panel
  const timelineList = document.getElementById('timelineList');
  const emptyTimeline = document.getElementById('emptyTimeline');
  if (timelineList) {
    timelineList.innerHTML = '';
  }
  if (emptyTimeline) {
    emptyTimeline.style.display = 'block';
  }

  // Reset file changes
  const fileChangesList = document.getElementById('fileChangesList');
  const emptyFiles = document.getElementById('emptyFiles');
  if (fileChangesList) {
    fileChangesList.innerHTML = '';
  }
  if (emptyFiles) {
    emptyFiles.style.display = 'block';
  }

  // Switch back to home view
  homeView.classList.remove('hidden');
  chatView.classList.add('hidden');

  // Force reset input container widths to prevent layout issues
  const homeInputContainer = homeInput.closest('.input-container');
  const chatInputContainer = messageInput.closest('.input-container');
  if (homeInputContainer) {
    homeInputContainer.style.width = '';
    homeInputContainer.style.maxWidth = '';
  }
  if (chatInputContainer) {
    chatInputContainer.style.width = '';
    chatInputContainer.style.maxWidth = '';
  }

  // Reset input heights to ensure proper sizing
  autoResizeTextarea(homeInput);
  autoResizeTextarea(messageInput);

  // Reset send button states
  updateSendButton(homeInput, homeSendBtn);
  updateSendButton(messageInput, chatSendBtn);

  homeInput.focus();

  // Show quick start templates
  showTemplates();

  // Clear currentChatId from localStorage
  localStorage.removeItem('currentChatId');

  // Update chat history display
  renderChatHistory();
};

// Get or create the current markdown container for streaming
function getCurrentMarkdownContainer(contentDiv) {
  const chunkIndex = parseInt(contentDiv.dataset.currentChunk || '0');
  let container = contentDiv.querySelector(`.markdown-content[data-chunk="${chunkIndex}"]`);

  if (!container) {
    container = document.createElement('div');
    container.className = 'markdown-content';
    container.dataset.chunk = chunkIndex;
    container.dataset.rawContent = '';
    contentDiv.appendChild(container);
  }

  return container;
}

// Render markdown content for a specific container
function renderMarkdownContainer(container) {
  const rawContent = container.dataset.rawContent || '';

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  container.innerHTML = marked.parse(rawContent);

  // Enhance code blocks with copy buttons and language tags
  enhanceCodeBlocks(container);
}

// Legacy function for restoring saved messages
function renderMarkdown(contentDiv) {
  const rawContent = contentDiv.dataset.rawContent || '';

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  let markdownContainer = contentDiv.querySelector('.markdown-content');
  if (!markdownContainer) {
    markdownContainer = document.createElement('div');
    markdownContainer.className = 'markdown-content';
    contentDiv.appendChild(markdownContainer);
  }

  markdownContainer.innerHTML = marked.parse(rawContent);

  // Enhance code blocks with copy buttons and language tags
  enhanceCodeBlocks(markdownContainer);
}

// Add inline tool call to message (maintains correct order in stream)
// Uses Cursor-style spinner, streaming preview, and diff statistics
function addInlineToolCall(contentDiv, toolName, toolInput, toolId) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call expanded running'; // Show expanded by default, running state
  toolDiv.dataset.toolId = toolId;
  toolDiv.dataset.toolName = toolName; // Store for later use in updateInlineToolResult

  const inputPreview = formatToolPreview(toolInput);
  const inputStr = JSON.stringify(toolInput, null, 2);

  // Store diff stats for later display
  const diffStats = calculateDiffStats(toolName, toolInput);
  if (diffStats) {
    toolDiv.dataset.diffStats = JSON.stringify(diffStats);
  }

  // Check if this tool has streamable content
  const streamableContent = getStreamableContent(toolName, toolInput);
  const hasStreamableContent = streamableContent && streamableContent.length > 0;

  // Spinner SVG for running state
  const spinnerIcon = `
    <svg class="tool-status-icon running tool-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
    </svg>`;

  // Streaming preview section - dynamic label based on tool type
  const isWriteOperation = ['Write', 'StrReplace', 'Edit'].includes(toolName);
  const isBashEcho = (toolName === 'Shell' || toolName === 'Bash') && hasStreamableContent;
  const streamingLabel = isWriteOperation ? '正在写入' : isBashEcho ? '正在输出' : '执行中';

  const streamingPreviewHtml = hasStreamableContent
    ? `
    <div class="streaming-preview-section">
      <div class="streaming-preview-label">
        ${streamingLabel}
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
      <pre class="streaming-preview typing"></pre>
    </div>
  `
    : '';

  toolDiv.innerHTML = `
    <div class="inline-tool-header" onclick="toggleInlineToolCall(this)">
      ${spinnerIcon}
      <span class="tool-name">${escapeHtml(toolName)}</span>
      <span class="tool-preview">${escapeHtml(inputPreview)}</span>
      <div class="diff-stats-container"></div>
      <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <div class="inline-tool-result">
      ${streamingPreviewHtml}
      <div class="tool-section">
        <div class="tool-section-label">Input</div>
        <pre>${escapeHtmlPure(inputStr)}</pre>
      </div>
      <div class="tool-section tool-output-section" style="display: none;">
        <div class="tool-section-label">Output</div>
        <pre class="tool-output-content"></pre>
      </div>
    </div>
  `;

  // Append tool call at end (in stream order)
  contentDiv.appendChild(toolDiv);

  // Start typewriter animation if there's streamable content
  if (hasStreamableContent) {
    const previewElement = toolDiv.querySelector('.streaming-preview');
    if (previewElement) {
      const timer = startTypewriterAnimation(previewElement, streamableContent, {
        speed: 8,
        maxLength: 600
      });
      activeTypewriters.set(toolId, timer);
    }
  }

  // Increment chunk counter so next text creates a new markdown container
  const currentChunk = parseInt(contentDiv.dataset.currentChunk || '0');
  contentDiv.dataset.currentChunk = currentChunk + 1;
}

// Update inline tool result with Cursor-style effects
function updateInlineToolResult(toolId, result) {
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'renderer.js:1798',
      message: 'updateInlineToolResult called',
      data: { toolId, foundToolDiv: !!toolDiv, toolName: toolDiv?.dataset?.toolName },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId: 'C'
    })
  }).catch(() => {});
  // #endregion
  if (toolDiv) {
    // Stop typewriter animation
    stopTypewriterAnimation(toolId);

    // Update streaming preview section
    const streamingSection = toolDiv.querySelector('.streaming-preview-section');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'renderer.js:1810',
        message: 'updating streaming section',
        data: { toolId, hasStreamingSection: !!streamingSection },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'C'
      })
    }).catch(() => {});
    // #endregion
    if (streamingSection) {
      // Update label to show completion based on tool type
      const label = streamingSection.querySelector('.streaming-preview-label');
      if (label) {
        const storedToolName = toolDiv.dataset.toolName;
        const isWriteOp = ['Write', 'StrReplace', 'Edit'].includes(storedToolName);
        const completionLabel = isWriteOp ? '写入完成' : '执行完成';
        label.innerHTML = `${completionLabel} <span style="color: #22c55e;">✓</span>`;
      }
      // Mark preview as completed
      const preview = streamingSection.querySelector('.streaming-preview');
      if (preview) {
        preview.classList.remove('typing');
        preview.classList.add('completed');
      }
    }

    // Update output content (only if result is not null/undefined)
    if (result !== null && result !== undefined) {
      const outputSection = toolDiv.querySelector('.tool-output-section');
      const outputContent = toolDiv.querySelector('.tool-output-content');
      if (outputSection && outputContent) {
        const resultStr =
          typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        outputContent.textContent =
          resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
        outputSection.style.display = 'block';
      }
    }

    // Update status: running -> success
    toolDiv.classList.remove('running');
    toolDiv.classList.add('success');

    // Replace spinner with success checkmark
    const statusIcon = toolDiv.querySelector('.tool-status-icon');
    if (statusIcon) {
      statusIcon.classList.remove('running', 'tool-spinner');
      statusIcon.classList.add('success');
      statusIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    }

    // Display diff stats
    const diffStatsContainer = toolDiv.querySelector('.diff-stats-container');
    const diffStatsData = toolDiv.dataset.diffStats;
    if (diffStatsContainer && diffStatsData) {
      try {
        const stats = JSON.parse(diffStatsData);
        diffStatsContainer.innerHTML = buildDiffStatsHTML(stats);
      } catch (e) {
        // Silent fail on parse error
      }
    }
  }
}

// Toggle inline tool call expansion
window.toggleInlineToolCall = function (header) {
  const toolDiv = header.closest('.inline-tool-call');
  toolDiv.classList.toggle('expanded');
};

// Store active typewriter animations for cleanup
const activeTypewriters = new Map();

/**
 * Start typewriter animation for streaming preview
 * @param {HTMLElement} element - Target element to display text
 * @param {string} content - Content to display
 * @param {object} options - Animation options
 * @returns {number} Timer ID for cleanup
 */
function startTypewriterAnimation(element, content, options = {}) {
  const {
    speed = 5, // ms per character (faster = more realistic)
    maxLength = 500, // Max characters to show
    onComplete = null
  } = options;

  // Truncate content if too long
  const displayContent =
    content.length > maxLength ? content.substring(0, maxLength) + '\n...(truncated)' : content;

  let index = 0;
  element.textContent = '';
  element.classList.add('typing');
  element.classList.remove('completed');

  const timer = setInterval(() => {
    if (index < displayContent.length) {
      // Add multiple characters per tick for faster effect
      const charsPerTick = Math.min(3, displayContent.length - index);
      element.textContent += displayContent.substring(index, index + charsPerTick);
      index += charsPerTick;

      // Auto-scroll to bottom
      element.scrollTop = element.scrollHeight;
    } else {
      clearInterval(timer);
      element.classList.remove('typing');
      element.classList.add('completed');
      if (onComplete) {
        onComplete();
      }
    }
  }, speed);

  return timer;
}

/**
 * Stop typewriter animation
 * @param {string} toolId - Tool ID to stop animation for
 */
function stopTypewriterAnimation(toolId) {
  const timer = activeTypewriters.get(toolId);
  if (timer) {
    clearInterval(timer);
    activeTypewriters.delete(toolId);
  }

  // Mark preview as completed
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const preview = toolDiv.querySelector('.streaming-preview');
    if (preview) {
      preview.classList.remove('typing');
      preview.classList.add('completed');
    }
  }
}

/**
 * Extract streamable content from tool input
 * @param {string} toolName - Name of the tool
 * @param {object} toolInput - Tool input parameters
 * @returns {string|null} Content to stream or null
 */
function getStreamableContent(toolName, toolInput) {
  if (!toolInput) {
    return null;
  }

  // Write tool - show file content
  if (toolName === 'Write') {
    return toolInput.contents || toolInput.content || null;
  }

  // StrReplace/Edit - show new content
  if (toolName === 'StrReplace' || toolName === 'Edit') {
    return toolInput.new_string || null;
  }

  // Shell/Bash - extract echo content for better UX
  if (toolName === 'Shell' || toolName === 'Bash') {
    const command = toolInput.command || '';

    // Pattern 1: printf format - echo "$(printf 'content\n'%.0s {1..N})" >> file
    const printfMatch = command.match(/printf\s+['"]([^'"\\]+)(?:\\n)?['"]/);
    const printfCountMatch = command.match(/\{1\.\.(\d+)\}/);
    if (printfMatch && printfCountMatch) {
      const content = printfMatch[1];
      const repeatCount = parseInt(printfCountMatch[1], 10);
      const lines = [];
      for (let i = 1; i <= Math.min(repeatCount, 30); i++) {
        lines.push(`[${i}/${repeatCount}] ${content}`);
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'renderer.js:1975',
          message: 'Extracted printf loop content',
          data: { content, repeatCount },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'D-E'
        })
      }).catch(() => {});
      // #endregion
      return lines.join('\n');
    }

    // Pattern 2: for loop - for i in {1..N}; do echo "content" >> file; done
    const forLoopMatch = command.match(
      /for\s+\w+\s+in\s+\{1\.\.(\d+)\}[^"']*echo\s+["']([^"']+)["']/
    );
    if (forLoopMatch) {
      const repeatCount = parseInt(forLoopMatch[1], 10);
      const content = forLoopMatch[2];
      const lines = [];
      for (let i = 1; i <= Math.min(repeatCount, 30); i++) {
        lines.push(`[${i}/${repeatCount}] ${content}`);
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'renderer.js:1990',
          message: 'Extracted for-loop echo content',
          data: { content, repeatCount },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'D-E'
        })
      }).catch(() => {});
      // #endregion
      return lines.join('\n');
    }

    // Pattern 3: simple echo - echo "content" >> file
    const echoMatch = command.match(/echo\s+["']([^"']+)["']\s*>>/);
    if (echoMatch) {
      const content = echoMatch[1];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'renderer.js:2000',
          message: 'Extracted simple echo content',
          data: { content },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'D-E'
        })
      }).catch(() => {});
      // #endregion
      return content;
    }

    // Fallback: no streaming for non-echo commands
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'renderer.js:2007',
        message: 'getStreamableContent for Shell/Bash (no echo)',
        data: { toolName, command: command.substring(0, 200) },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'D-E'
      })
    }).catch(() => {});
    // #endregion
    return null;
  }

  return null;
}

// Add tool call to sidebar
function addToolCall(name, input, status = 'running') {
  const id = 'tool_' + Date.now();
  const toolCall = { id, name, input, status, result: null };
  toolCalls.push(toolCall);

  const timelineList = document.getElementById('timelineList');
  const emptyTimeline = document.getElementById('emptyTimeline');

  if (emptyTimeline) {
    emptyTimeline.style.display = 'none';
  }

  const toolDiv = document.createElement('div');
  toolDiv.className = 'tool-call-item expanded'; // Show expanded by default
  toolDiv.dataset.toolId = id;

  toolDiv.innerHTML = `
    <div class="tool-call-header" onclick="toggleToolCall(this)">
      <div class="tool-call-icon ${status}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      </div>
      <div class="tool-call-info">
        <div class="tool-call-name">${name}</div>
        <div class="tool-call-status">${status === 'running' ? 'Running...' : 'Completed'}</div>
      </div>
      <div class="tool-call-expand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="tool-call-details">
      <div class="tool-detail-section">
        <div class="tool-detail-label">Input</div>
        <pre>${escapeHtmlPure(JSON.stringify(input, null, 2))}</pre>
      </div>
      <div class="tool-detail-section tool-output-section" style="display: none;">
        <div class="tool-detail-label">Output</div>
        <pre class="sidebar-tool-output"></pre>
      </div>
    </div>
  `;

  if (timelineList) {
    timelineList.appendChild(toolDiv);
  }
  return toolCall;
}

// Update tool call status
function updateToolCallStatus(toolId, status) {
  const toolDiv = document.querySelector(`.tool-call-item[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const icon = toolDiv.querySelector('.tool-call-icon');
    const statusText = toolDiv.querySelector('.tool-call-status');

    icon.className = `tool-call-icon ${status}`;
    statusText.textContent =
      status === 'success' ? 'Completed' : status === 'error' ? 'Failed' : 'Running...';
  }

  // Update in state
  const toolCall = toolCalls.find(t => t.id === toolId);
  if (toolCall) {
    toolCall.status = status;
  }
}

// Update tool call result
function updateToolCallResult(toolId, result) {
  const toolCall = toolCalls.find(t => t.id === toolId);
  if (toolCall) {
    toolCall.result = result;
  }

  // Update sidebar tool output
  const toolDiv = document.querySelector(`.tool-call-item[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const outputSection = toolDiv.querySelector('.tool-output-section');
    const outputContent = toolDiv.querySelector('.sidebar-tool-output');
    if (outputSection && outputContent) {
      const resultStr =
        typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      outputContent.textContent =
        resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
      outputSection.style.display = 'block';
    }
  }
}

// Toggle tool call expansion in sidebar
window.toggleToolCall = function (header) {
  const toolDiv = header.closest('.tool-call-item');
  toolDiv.classList.toggle('expanded');
};

// Update todos from TodoWrite (legacy, kept for compatibility)
function updateTodos(newTodos) {
  todos = newTodos;
}

// Copy message to clipboard
function copyMessage(button) {
  const messageDiv = button.closest('.message');
  const contentDiv = messageDiv.querySelector('.message-content');
  const text = contentDiv.dataset.rawContent || contentDiv.textContent;

  navigator.clipboard.writeText(text).then(() => {
    button.style.color = '#27ae60';
    setTimeout(() => {
      button.style.color = '';
    }, 1000);
  });
}

/**
 * 重新生成消息
 * @param {HTMLButtonElement} button - 触发按钮
 */
async function regenerateMessage(button) {
  if (isWaitingForResponse) {
    showToast('请等待当前响应完成', 'info');
    return;
  }

  const messageDiv = button.closest('.message');
  if (!messageDiv || !messageDiv.classList.contains('assistant')) {
    return;
  }

  const messages = Array.from(chatMessages.children);
  const index = messages.indexOf(messageDiv);
  if (index <= 0) {
    return;
  }

  // 找到上一条用户消息
  let userMessageIndex = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].classList.contains('user')) {
      userMessageIndex = i;
      break;
    }
  }

  if (userMessageIndex === -1) {
    showToast('找不到可以重新生成的消息', 'error');
    return;
  }

  const userMessageDiv = messages[userMessageIndex];
  const userContent = userMessageDiv.querySelector('.message-content').textContent;

  // 移除从该用户消息开始的所有后续消息
  while (chatMessages.children.length > userMessageIndex) {
    chatMessages.lastElementChild.remove();
  }

  // 填充输入框并触发发送
  const input = isFirstMessage ? homeInput : messageInput;
  input.value = userContent;
  autoResizeTextarea(input);

  // 触发发送
  handleSendMessage(new Event('submit'));
}

window.copyMessage = copyMessage;
window.regenerateMessage = regenerateMessage;

// Get conversation history for context
// eslint-disable-next-line no-unused-vars
function getConversationHistory() {
  const messages = Array.from(chatMessages.children);
  const history = [];

  // Skip the last message (current assistant loading state)
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const contentDiv = msg.querySelector('.message-content');
    if (!contentDiv) {
      continue;
    }

    const content = contentDiv.dataset.rawContent || contentDiv.textContent || '';
    if (!content.trim()) {
      continue;
    }

    if (msg.classList.contains('user')) {
      history.push({ role: 'user', content });
    } else if (msg.classList.contains('assistant')) {
      history.push({ role: 'assistant', content });
    }
  }

  return history;
}

// Scroll to bottom of messages
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== RESIZERS MODULE ====================

/**
 * Setup resizable panels
 */
function setupResizers() {
  const leftSidebar = document.getElementById('leftSidebar');
  const rightSidebar = document.getElementById('sidebar');
  const leftResizer = document.getElementById('leftResizer');
  const rightResizer = document.getElementById('rightResizer');

  if (!leftResizer || !rightResizer) {
    return;
  }

  // Load saved widths
  const savedLeftWidth = localStorage.getItem('leftSidebarWidth');
  const savedRightWidth = localStorage.getItem('rightSidebarWidth');

  if (savedLeftWidth) {
    leftSidebar.style.width = savedLeftWidth + 'px';
    leftSidebar.style.minWidth = savedLeftWidth + 'px';
  }
  // Only restore right sidebar width if it's a reasonable value (not collapsed)
  if (savedRightWidth && parseInt(savedRightWidth) >= 200) {
    rightSidebar.style.width = savedRightWidth + 'px';
  } else if (savedRightWidth) {
    // Remove invalid saved width
    localStorage.removeItem('rightSidebarWidth');
  }

  // Left Sidebar Resizer
  leftResizer.addEventListener('mousedown', e => {
    e.preventDefault();
    leftResizer.classList.add('active');
    document.addEventListener('mousemove', handleLeftMouseMove);
    document.addEventListener('mouseup', () => {
      leftResizer.classList.remove('active');
      document.removeEventListener('mousemove', handleLeftMouseMove);
      localStorage.setItem('leftSidebarWidth', leftSidebar.offsetWidth);
    });
  });

  function handleLeftMouseMove(e) {
    const newWidth = e.clientX;
    if (newWidth > 150 && newWidth < 500) {
      leftSidebar.style.width = newWidth + 'px';
      leftSidebar.style.minWidth = newWidth + 'px';
    }
  }

  // Right Sidebar Resizer
  rightResizer.addEventListener('mousedown', e => {
    e.preventDefault();
    rightResizer.classList.add('active');
    document.addEventListener('mousemove', handleRightMouseMove);
    document.addEventListener('mouseup', () => {
      rightResizer.classList.remove('active');
      document.removeEventListener('mousemove', handleRightMouseMove);
      localStorage.setItem('rightSidebarWidth', rightSidebar.offsetWidth);
    });
  });

  function handleRightMouseMove(e) {
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 200 && newWidth < 600) {
      rightSidebar.style.width = newWidth + 'px';
    }
  }
}

// Initialize on load
window.addEventListener('load', async () => {
  init();
  initTheme();
  // Initialize settings module
  await initSettings();
  setupSettingsListeners();
  setupSkillsListeners();
  // Initial resize for textareas
  autoResizeTextarea(homeInput);
  autoResizeTextarea(messageInput);
});
