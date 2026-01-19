// Module imports
import {
  generateId,
  escapeHtmlPure,
  hasUnclosedCodeBlock,
  getTimeGroupLabel,
  formatToolPreview,
  debounce
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

import { getToolCallStats, formatStepsCount } from './sessionManager.js';

import {
  calculateTextareaHeight,
  createToastConfig,
  buildInlineToolCallHTML,
  buildSidebarToolCallHTML,
  buildChatItemHTML,
  buildStepItemHTML,
  buildMessageActionsHTML,
  buildLoadingIndicatorHTML,
  buildErrorRetryHTML,
  getTemplateContent,
  matchesSearch
} from './uiHelpers.js';

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
const stepsList = document.getElementById('stepsList');
const stepsCount = document.getElementById('stepsCount');
const toolCallsList = document.getElementById('toolCallsList');
const emptySteps = document.getElementById('emptySteps');
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
  homeInput.focus();
}

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

  // Get toast config from uiHelpers
  const config = createToastConfig(type);

  // Create icon based on type
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.innerHTML = config.icon;
  icon.style.color = config.color;

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
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) {
    return;
  }

  // Store for retry
  lastFailedMessage = message;
  lastFailedChatId = chatId;

  // Create error element using uiHelpers
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message-error';
  errorDiv.innerHTML = buildErrorRetryHTML(errorMessage);

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

// Save current chat state
function saveState() {
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

  const chatData = createChatData(currentChatId, chatTitle.textContent, messages, todos, toolCalls);

  // Update chat list using chatStore
  allChats = updateChatInList(allChats, chatData);

  // Save to localStorage using chatStore
  saveChatToStorage(localStorage, allChats, currentChatId);

  renderChatHistory();
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

  // Restore sidebar tool calls display
  renderSidebarToolCalls();

  // Restore progress display
  renderProgress();

  scrollToBottom();
  renderChatHistory();
  localStorage.setItem('currentChatId', currentChatId);
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

// Render sidebar tool calls from restored toolCalls array
function renderSidebarToolCalls() {
  toolCallsList.innerHTML = '';

  if (toolCalls.length === 0) {
    emptyTools.style.display = 'block';
    return;
  }

  emptyTools.style.display = 'none';

  // Use buildSidebarToolCallHTML from uiHelpers
  toolCalls.forEach(tc => {
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-call-item';
    toolDiv.dataset.toolId = tc.id;
    toolDiv.innerHTML = buildSidebarToolCallHTML(tc);
    toolCallsList.appendChild(toolDiv);
  });
}

// Render chat history sidebar
function renderChatHistory() {
  chatHistoryList.innerHTML = '';

  if (allChats.length === 0) {
    chatHistoryList.innerHTML = '<div class="chat-history-empty">No chats yet</div>';
    return;
  }

  // Sort by updated time using chatStore
  const sortedChats = sortChatsByTime(allChats);

  let lastGroup = null;

  sortedChats.forEach(chat => {
    // Add time group label if changed
    const groupLabel = getTimeGroupLabel(chat.updatedAt || chat.createdAt || Date.now());
    if (groupLabel !== lastGroup) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'time-group-label';
      groupDiv.textContent = groupLabel;
      chatHistoryList.appendChild(groupDiv);
      lastGroup = groupLabel;
    }

    const isActive = chat.id === currentChatId;
    const item = document.createElement('div');
    item.className = 'chat-item chat-history-item' + (isActive ? ' active' : '');
    item.dataset.chatId = chat.id;
    // Use buildChatItemHTML from uiHelpers
    item.innerHTML = buildChatItemHTML(chat, isActive);
    item.onclick = e => {
      if (!e.target.closest('.delete-chat-btn')) {
        switchToChat(chat.id);
      }
    };
    chatHistoryList.appendChild(item);
  });
}

// Switch to a different chat
function switchToChat(chatId) {
  if (currentChatId) {
    saveState();
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

  // Get all chat items
  const chatItems = chatList.querySelectorAll('.chat-item');

  // Clear existing no-results message
  const existingNoResults = chatList.querySelector('.no-search-results');
  if (existingNoResults) {
    existingNoResults.remove();
  }

  // Filter chats using matchesSearch from uiHelpers
  let visibleCount = 0;

  chatItems.forEach(item => {
    const title = item.querySelector('.chat-item-title')?.textContent || '';

    if (matchesSearch(title, query)) {
      item.classList.remove('hidden-by-search');
      visibleCount++;
    } else {
      item.classList.add('hidden-by-search');
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

  // Show/hide expand button when sidebar is collapsed
  const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
  if (sidebarExpandBtn) {
    sidebarExpandBtn.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
  }
};

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

            if (data.type === 'done') {
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
              appendToContent(contentDiv, data.content);
            } else if (data.type === 'tool_use') {
              const toolName = data.name || data.tool || 'Tool';
              const toolInput = data.input || {};
              const apiId = data.id; // API's tool ID
              const toolCall = addToolCall(toolName, toolInput, 'running');
              addInlineToolCall(contentDiv, toolName, toolInput, toolCall.id);
              if (apiId) {
                pendingToolCalls.set(apiId, toolCall.id);
              }
              // Handle TodoWrite tool (legacy support)
              if (toolName === 'TodoWrite' && toolInput.todos) {
                updateTodos(toolInput.todos);
              }
              hasContent = true;
            } else if (data.type === 'tool_result' || data.type === 'result') {
              const result = data.result || data.content || data;
              const apiId = data.tool_use_id;

              // Find the matching tool call by API ID
              const localId = apiId ? pendingToolCalls.get(apiId) : null;
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
                    const toolCall = addToolCall(toolName, toolInput, 'running');
                    addInlineToolCall(contentDiv, toolName, toolInput, toolCall.id);
                    if (apiId) {
                      pendingToolCalls.set(apiId, toolCall.id);
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

  // Reset sidebar
  stepsList.innerHTML = '';
  emptySteps.style.display = 'block';
  stepsCount.textContent = '0 steps';
  toolCallsList.innerHTML = '';
  emptyTools.style.display = 'block';

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
function addInlineToolCall(contentDiv, toolName, toolInput, toolId) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call expanded'; // Show expanded by default
  toolDiv.dataset.toolId = toolId;

  const inputPreview = formatToolPreview(toolInput);
  const inputStr = JSON.stringify(toolInput, null, 2);

  toolDiv.innerHTML = `
    <div class="inline-tool-header" onclick="toggleInlineToolCall(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
      <span class="tool-name">${toolName}</span>
      <span class="tool-preview">${inputPreview}</span>
      <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <div class="inline-tool-result">
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

  // Increment chunk counter so next text creates a new markdown container
  const currentChunk = parseInt(contentDiv.dataset.currentChunk || '0');
  contentDiv.dataset.currentChunk = currentChunk + 1;
}

// Update inline tool result
function updateInlineToolResult(toolId, result) {
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  if (toolDiv) {
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
}

// Toggle inline tool call expansion
window.toggleInlineToolCall = function (header) {
  const toolDiv = header.closest('.inline-tool-call');
  toolDiv.classList.toggle('expanded');
};

// Add tool call to sidebar
function addToolCall(name, input, status = 'running') {
  const id = 'tool_' + Date.now();
  const toolCall = { id, name, input, status, result: null };
  toolCalls.push(toolCall);

  emptyTools.style.display = 'none';

  // Update Progress section
  renderProgress();

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

  toolCallsList.appendChild(toolDiv);
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

  // Update Progress section
  renderProgress();
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

// Render progress in sidebar (shows tool calls as steps)
function renderProgress() {
  stepsList.innerHTML = '';

  if (toolCalls.length === 0) {
    emptySteps.style.display = 'block';
    stepsCount.textContent = '0 steps';
    return;
  }

  emptySteps.style.display = 'none';

  // Get statistics using sessionManager
  const stats = getToolCallStats(toolCalls);

  // Update header with statistics using sessionManager
  stepsCount.textContent = formatStepsCount(stats);

  // Render each tool call as a step using uiHelpers
  toolCalls.forEach(tc => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-item';
    stepDiv.dataset.toolId = tc.id;
    stepDiv.innerHTML = buildStepItemHTML(tc);
    stepsList.appendChild(stepDiv);
  });
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

window.copyMessage = copyMessage;

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

// ==================== SETTINGS MODULE ====================

// Settings module state
let settings = {
  apiEndpoint: 'https://api.anthropic.com',
  apiKey: '',
  models: [
    { id: 'minimax-2-1', name: 'Minimax 2.1', default: true },
    { id: 'glm-4-7', name: 'GLM 4.7' }
  ]
};

// Settings UI elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const apiEndpointInput = document.getElementById('apiEndpoint');
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const modelsList = document.getElementById('modelsList');
const addModelBtn = document.getElementById('addModelBtn');
const diagnoseBtn = document.getElementById('diagnoseBtn');
const diagnoseResult = document.getElementById('diagnoseResult');

// Initialize settings module
async function initSettings() {
  try {
    if (window.electronAPI && window.electronAPI.getSettings) {
      settings = await window.electronAPI.getSettings();
      console.log('[SETTINGS] Loaded settings:', settings);
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to load settings:', error);
  }
}

// Open settings modal
function openSettingsModal() {
  if (!settingsModal) {
    return;
  }

  // Populate form with current settings
  if (apiEndpointInput) {
    apiEndpointInput.value = settings.apiEndpoint || '';
  }
  if (apiKeyInput) {
    apiKeyInput.value = settings.apiKey || '';
  }

  renderModelsList();
  settingsModal.classList.remove('hidden');
}

// Close settings modal
function closeSettingsModal() {
  if (!settingsModal) {
    return;
  }
  settingsModal.classList.add('hidden');
}

// Render models list in settings
function renderModelsList() {
  if (!modelsList) {
    return;
  }

  modelsList.innerHTML = '';

  (settings.models || []).forEach((model, index) => {
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    modelItem.dataset.index = index;

    modelItem.innerHTML = `
      <div class="model-info">
        <input type="radio" name="defaultModel" ${model.default ? 'checked' : ''} />
        <input type="text" class="model-name" value="${escapeHtmlPure(model.name)}" data-index="${index}" />
        <span class="model-id">${escapeHtmlPure(model.id)}</span>
      </div>
      <button type="button" class="remove-model-btn" data-index="${index}" title="删除模型">×</button>
    `;

    modelsList.appendChild(modelItem);
  });
}

// Add new model
function addModel() {
  const newModel = {
    id: `model-${Date.now()}`,
    name: '新模型',
    default: false
  };

  // If no default model, make this one default
  const hasDefault = (settings.models || []).some(m => m.default);
  if (!hasDefault) {
    newModel.default = true;
  }

  settings.models = settings.models || [];
  settings.models.push(newModel);
  renderModelsList();
}

// Remove model
function removeModel(index) {
  settings.models = settings.models || [];
  if (settings.models.length <= 1) {
    showToast('至少保留一个模型', 'error');
    return;
  }

  const wasDefault = settings.models[index]?.default;
  settings.models.splice(index, 1);

  // If removed default, set first model as default
  if (wasDefault && settings.models.length > 0) {
    settings.models[0].default = true;
  }

  renderModelsList();
}

// Save settings
async function saveSettings() {
  // Update settings from form
  settings.apiEndpoint = apiEndpointInput?.value?.trim() || 'https://api.anthropic.com';
  settings.apiKey = apiKeyInput?.value?.trim() || '';

  // Update models from UI
  const modelItems = modelsList?.querySelectorAll('.model-item') || [];
  settings.models = Array.from(modelItems).map((item, index) => {
    const nameInput = item.querySelector('.model-name');
    const radioInput = item.querySelector('input[type="radio"]');
    const idSpan = item.querySelector('.model-id');

    return {
      id: idSpan?.textContent || `model-${index}`,
      name: nameInput?.value || '未命名模型',
      default: radioInput?.checked || false
    };
  });

  // Ensure only one default model
  const defaultIndex = settings.models.findIndex(m => m.default);
  if (defaultIndex !== -1) {
    settings.models = settings.models.map((m, i) => ({
      ...m,
      default: i === defaultIndex
    }));
  }

  try {
    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings(settings);
      showToast('设置已保存', 'success');

      // Update model selectors if they exist
      updateModelSelectors();
    }
    closeSettingsModal();
  } catch (error) {
    console.error('[SETTINGS] Failed to save settings:', error);
    showToast('保存设置失败', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  try {
    if (window.electronAPI && window.electronAPI.resetSettings) {
      settings = await window.electronAPI.resetSettings();
      showToast('已恢复默认设置', 'success');

      // Update form
      if (apiEndpointInput) {
        apiEndpointInput.value = settings.apiEndpoint || '';
      }
      if (apiKeyInput) {
        apiKeyInput.value = settings.apiKey || '';
      }
      renderModelsList();

      // Update model selectors
      updateModelSelectors();
    }
  } catch (error) {
    console.error('[SETTINGS] Failed to reset settings:', error);
    showToast('恢复默认设置失败', 'error');
  }
}

// Run connection diagnosis
async function runDiagnosis() {
  if (!diagnoseResult) {
    return;
  }

  // Show loading state
  diagnoseResult.classList.remove('hidden', 'success', 'error');
  diagnoseResult.classList.add('loading');
  diagnoseResult.innerHTML = '<span class="diagnose-spinner"></span> 检测中...';

  try {
    if (!window.electronAPI || !window.electronAPI.checkHealth) {
      throw new Error('诊断功能不可用');
    }

    const result = await window.electronAPI.checkHealth();

    diagnoseResult.classList.remove('loading');

    if (result.status === 'ok') {
      diagnoseResult.classList.add('success');
      diagnoseResult.innerHTML = `
        <div class="diagnose-item success">✓ 后端服务器: 正常</div>
        <div class="diagnose-item ${result.config?.hasApiKey ? 'success' : 'warning'}">
          ${result.config?.hasApiKey ? '✓' : '⚠'} API Key: ${result.config?.hasApiKey ? '已配置' : '未配置'}
        </div>
        <div class="diagnose-item success">✓ API 端点: ${result.config?.apiEndpoint || '默认'}</div>
      `;
    } else {
      diagnoseResult.classList.add('error');
      diagnoseResult.innerHTML = `
        <div class="diagnose-item error">✗ 后端服务器: 连接失败</div>
        <div class="diagnose-item error-detail">${result.message || '未知错误'}</div>
      `;
    }
  } catch (error) {
    diagnoseResult.classList.remove('loading');
    diagnoseResult.classList.add('error');
    diagnoseResult.innerHTML = `
      <div class="diagnose-item error">✗ 诊断失败: ${error.message}</div>
    `;
  }
}

// Update model selectors in the UI
function updateModelSelectors() {
  const modelSelects = document.querySelectorAll('.model-select');

  modelSelects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '';

    (settings.models || []).forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      if (model.default) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Try to preserve selection
    if (currentValue && settings.models.some(m => m.id === currentValue)) {
      select.value = currentValue;
    }
  });
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  if (!apiKeyInput) {
    return;
  }

  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
}

// Setup settings event listeners
function setupSettingsListeners() {
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

  // API key toggle
  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  }

  // Add model button
  if (addModelBtn) {
    addModelBtn.addEventListener('click', addModel);
  }

  // Diagnosis button
  if (diagnoseBtn) {
    diagnoseBtn.addEventListener('click', runDiagnosis);
  }

  // Models list delegation
  if (modelsList) {
    modelsList.addEventListener('click', e => {
      const removeBtn = e.target.closest('.remove-model-btn');
      if (removeBtn) {
        const index = parseInt(removeBtn.dataset.index, 10);
        removeModel(index);
      }
    });

    modelsList.addEventListener('change', e => {
      if (e.target.name === 'defaultModel') {
        // Update default model
        const radioInputs = modelsList.querySelectorAll('input[name="defaultModel"]');
        radioInputs.forEach((radio, idx) => {
          if (radio.checked && settings.models[idx]) {
            settings.models = settings.models.map((m, i) => ({
              ...m,
              default: i === idx
            }));
          }
        });
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
      closeSettingsModal();
    }
  });
}

// Initialize on load
window.addEventListener('load', async () => {
  init();
  // Initialize settings module
  await initSettings();
  setupSettingsListeners();
  // Initial resize for textareas
  autoResizeTextarea(homeInput);
  autoResizeTextarea(messageInput);
});
