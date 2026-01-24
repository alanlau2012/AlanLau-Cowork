/**
 * Unit tests for chatManager module
 * Tests chat loading, saving, switching and deletion logic
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../renderer/chatStore.js', () => ({
  createChatData: vi.fn((id, title, messages, todos, toolCalls, fileChanges) => ({
    id,
    title: title || 'New chat',
    messages: messages || [],
    todos: todos || [],
    toolCalls: toolCalls || [],
    fileChanges: fileChanges || [],
    updatedAt: Date.now()
  })),
  findChatById: vi.fn((chats, id) => chats?.find(c => c.id === id)),
  updateChatInList: vi.fn((chats, chat, preserveUpdatedAt) => {
    if (!chats || !chat?.id) {
      return [];
    }
    const existing = chats.find(c => c.id === chat.id);
    if (existing) {
      return chats.map(c => (c.id === chat.id ? { ...c, ...chat } : c));
    }
    return [chat, ...chats];
  }),
  removeChatById: vi.fn((chats, id) => chats?.filter(c => c.id !== id) || []),
  sortChatsByTime: vi.fn(chats =>
    [...(chats || [])].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  ),
  saveChatToStorage: vi.fn(),
  loadChatsFromStorage: vi.fn(() => ({ allChats: [], currentChatId: null }))
}));

vi.mock('../../renderer/modules/messageHandler.js', () => ({
  extractMessagesData: vi.fn(() => []),
  restoreMessages: vi.fn(() => null)
}));

vi.mock('../../renderer/modules/markdownRenderer.js', () => ({
  renderMarkdown: vi.fn()
}));

vi.mock('../../renderer/modules/toolCalls.js', () => ({
  restoreInlineToolCall: vi.fn(),
  renderTimeline: vi.fn()
}));

vi.mock('../../renderer/modules/chatHistory.js', () => ({
  updateChatHistoryActiveState: vi.fn(),
  renderChatHistoryList: vi.fn()
}));

import {
  saveCurrentChat,
  loadAllChats,
  loadChat,
  switchToChat,
  deleteChat,
  startNewChat,
  renderChatHistory
} from '../../renderer/modules/chatManager.js';

import {
  createChatData,
  findChatById,
  updateChatInList,
  removeChatById,
  sortChatsByTime,
  saveChatToStorage,
  loadChatsFromStorage
} from '../../renderer/chatStore.js';

import { extractMessagesData, restoreMessages } from '../../renderer/modules/messageHandler.js';
import { restoreInlineToolCall, renderTimeline } from '../../renderer/modules/toolCalls.js';
import {
  updateChatHistoryActiveState,
  renderChatHistoryList
} from '../../renderer/modules/chatHistory.js';

/**
 * Helper: Create mock state object
 */
function createMockState(overrides = {}) {
  return {
    currentChatId: null,
    allChats: [],
    isFirstMessage: true,
    todos: [],
    toolCalls: [],
    fileChanges: [],
    attachedFiles: [],
    isWaitingForResponse: false,
    ...overrides
  };
}

/**
 * Helper: Create mock elements object
 */
function createMockElements() {
  const chatMessages = document.createElement('div');
  const chatTitle = document.createElement('h1');
  chatTitle.textContent = 'New chat';
  const messageInput = document.createElement('textarea');
  const homeInput = document.createElement('textarea');
  const homeSendBtn = document.createElement('button');
  const chatSendBtn = document.createElement('button');
  const chatHistoryList = document.createElement('div');

  // Create input containers for resize reset
  const homeContainer = document.createElement('div');
  homeContainer.className = 'input-container';
  homeContainer.appendChild(homeInput);

  const chatContainer = document.createElement('div');
  chatContainer.className = 'input-container';
  chatContainer.appendChild(messageInput);

  document.body.appendChild(homeContainer);
  document.body.appendChild(chatContainer);

  return {
    chatMessages,
    chatTitle,
    messageInput,
    homeInput,
    homeSendBtn,
    chatSendBtn,
    chatHistoryList
  };
}

/**
 * Helper: Create mock callbacks
 */
function createMockCallbacks() {
  return {
    switchToChatView: vi.fn(),
    switchToHomeView: vi.fn(),
    renderFileChanges: vi.fn(),
    scrollToBottom: vi.fn(),
    renderChatHistory: vi.fn(),
    autoResizeTextarea: vi.fn(),
    updateSendButton: vi.fn(),
    showTemplates: vi.fn()
  };
}

describe('saveCurrentChat', () => {
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getItem: vi.fn()
    };
    global.localStorage = mockStorage;
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('should return existing chats if no currentChatId', () => {
    const state = createMockState({ allChats: [{ id: 'chat_1' }] });
    const elements = createMockElements();

    const result = saveCurrentChat(state, elements);

    expect(result).toEqual([{ id: 'chat_1' }]);
    expect(createChatData).not.toHaveBeenCalled();
  });

  it('should create chat data and save to storage', () => {
    const state = createMockState({
      currentChatId: 'chat_123',
      allChats: [],
      todos: [{ id: 'todo_1' }],
      toolCalls: [{ id: 'tool_1' }],
      fileChanges: [{ name: 'file.js' }]
    });
    const elements = createMockElements();
    elements.chatTitle.textContent = 'My Chat';

    saveCurrentChat(state, elements);

    expect(createChatData).toHaveBeenCalledWith(
      'chat_123',
      'My Chat',
      expect.any(Array),
      [{ id: 'todo_1' }],
      [{ id: 'tool_1' }],
      [{ name: 'file.js' }]
    );
    expect(saveChatToStorage).toHaveBeenCalled();
  });

  it('should extract messages from DOM', () => {
    const state = createMockState({ currentChatId: 'chat_1', allChats: [] });
    const elements = createMockElements();

    saveCurrentChat(state, elements);

    expect(extractMessagesData).toHaveBeenCalledWith(elements.chatMessages);
  });

  it('should update chat list with new chat data', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1', title: 'Old' }]
    });
    const elements = createMockElements();

    saveCurrentChat(state, elements);

    expect(updateChatInList).toHaveBeenCalled();
  });

  it('should respect preserveUpdatedAt option', () => {
    const state = createMockState({ currentChatId: 'chat_1', allChats: [] });
    const elements = createMockElements();

    saveCurrentChat(state, elements, { preserveUpdatedAt: true });

    expect(updateChatInList).toHaveBeenCalledWith(expect.any(Array), expect.any(Object), true);
  });
});

describe('loadAllChats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call loadChatsFromStorage with localStorage', () => {
    const mockStorage = { getItem: vi.fn() };
    global.localStorage = mockStorage;

    loadAllChats();

    expect(loadChatsFromStorage).toHaveBeenCalledWith(mockStorage);

    delete global.localStorage;
  });

  it('should return result from loadChatsFromStorage', () => {
    const mockResult = {
      allChats: [{ id: 'chat_1' }],
      currentChatId: 'chat_1'
    };
    loadChatsFromStorage.mockReturnValueOnce(mockResult);

    global.localStorage = { getItem: vi.fn() };
    const result = loadAllChats();

    expect(result).toEqual(mockResult);

    delete global.localStorage;
  });
});

describe('loadChat', () => {
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = { setItem: vi.fn(), getItem: vi.fn() };
    global.localStorage = mockStorage;
    document.body.innerHTML = '';

    // Setup required DOM elements
    const timelineList = document.createElement('div');
    timelineList.id = 'timelineList';
    const emptyTimeline = document.createElement('div');
    emptyTimeline.id = 'emptyTimeline';
    document.body.appendChild(timelineList);
    document.body.appendChild(emptyTimeline);
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('should update state with chat data', () => {
    const chat = {
      id: 'chat_123',
      title: 'Test Chat',
      messages: [{ role: 'user', content: 'Hi' }],
      todos: [{ id: 'todo_1' }],
      toolCalls: [{ id: 'tool_1' }],
      fileChanges: [{ name: 'file.js' }]
    };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(state.currentChatId).toBe('chat_123');
    expect(state.isFirstMessage).toBe(false);
    expect(state.todos).toEqual([{ id: 'todo_1' }]);
    expect(state.toolCalls).toEqual([{ id: 'tool_1' }]);
    expect(state.fileChanges).toEqual([{ name: 'file.js' }]);
  });

  it('should update title element', () => {
    const chat = { id: 'chat_1', title: 'My Conversation' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(elements.chatTitle.textContent).toBe('My Conversation');
  });

  it('should call switchToChatView callback', () => {
    const chat = { id: 'chat_1', title: 'Test' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(callbacks.switchToChatView).toHaveBeenCalled();
  });

  it('should restore messages', () => {
    const chat = {
      id: 'chat_1',
      title: 'Test',
      messages: [{ role: 'user', content: 'Hello' }]
    };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(restoreMessages).toHaveBeenCalledWith(
      elements.chatMessages,
      chat.messages,
      expect.any(Function)
    );
  });

  it('should restore inline tool calls if present', () => {
    const chat = {
      id: 'chat_1',
      title: 'Test',
      messages: [],
      toolCalls: [{ id: 'tool_1', name: 'Read' }]
    };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    // Mock restoreMessages to return a content div
    const mockContentDiv = document.createElement('div');
    restoreMessages.mockReturnValueOnce(mockContentDiv);

    loadChat(chat, state, elements, callbacks);

    expect(restoreInlineToolCall).toHaveBeenCalledWith(mockContentDiv, {
      id: 'tool_1',
      name: 'Read'
    });
  });

  it('should render timeline', () => {
    const chat = {
      id: 'chat_1',
      title: 'Test',
      toolCalls: [{ id: 'tool_1' }]
    };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(renderTimeline).toHaveBeenCalled();
  });

  it('should call renderFileChanges callback', () => {
    const chat = { id: 'chat_1', title: 'Test' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(callbacks.renderFileChanges).toHaveBeenCalled();
  });

  it('should call scrollToBottom callback', () => {
    const chat = { id: 'chat_1', title: 'Test' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(callbacks.scrollToBottom).toHaveBeenCalled();
  });

  it('should update chat history active state', () => {
    const chat = { id: 'chat_1', title: 'Test' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(updateChatHistoryActiveState).toHaveBeenCalledWith(elements.chatHistoryList, 'chat_1');
  });

  it('should save currentChatId to localStorage', () => {
    const chat = { id: 'chat_456', title: 'Test' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(mockStorage.setItem).toHaveBeenCalledWith('currentChatId', 'chat_456');
  });

  it('should handle missing optional fields', () => {
    const chat = { id: 'chat_1', title: 'Minimal' };
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    loadChat(chat, state, elements, callbacks);

    expect(state.todos).toEqual([]);
    expect(state.toolCalls).toEqual([]);
    expect(state.fileChanges).toEqual([]);
  });
});

describe('switchToChat', () => {
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    global.localStorage = mockStorage;
    document.body.innerHTML = '';

    const timelineList = document.createElement('div');
    timelineList.id = 'timelineList';
    const emptyTimeline = document.createElement('div');
    emptyTimeline.id = 'emptyTimeline';
    document.body.appendChild(timelineList);
    document.body.appendChild(emptyTimeline);
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('should save current chat before switching', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [
        { id: 'chat_1', title: 'Chat 1' },
        { id: 'chat_2', title: 'Chat 2' }
      ]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    switchToChat('chat_2', state, elements, callbacks);

    expect(saveChatToStorage).toHaveBeenCalled();
  });

  it('should find and load target chat', () => {
    const chat2 = { id: 'chat_2', title: 'Target Chat' };
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1', title: 'Chat 1' }, chat2]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    switchToChat('chat_2', state, elements, callbacks);

    expect(findChatById).toHaveBeenCalledWith(expect.any(Array), 'chat_2');
  });

  it('should not load if chat not found', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    // findChatById returns undefined for non-existent chat
    findChatById.mockReturnValueOnce(undefined);

    switchToChat('non_existent', state, elements, callbacks);

    expect(callbacks.switchToChatView).not.toHaveBeenCalled();
  });

  it('should preserve updatedAt when saving current chat', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }, { id: 'chat_2' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    switchToChat('chat_2', state, elements, callbacks);

    expect(updateChatInList).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      true // preserveUpdatedAt
    );
  });
});

describe('deleteChat', () => {
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    global.localStorage = mockStorage;
    document.body.innerHTML = '';

    const timelineList = document.createElement('div');
    timelineList.id = 'timelineList';
    const emptyTimeline = document.createElement('div');
    emptyTimeline.id = 'emptyTimeline';
    document.body.appendChild(timelineList);
    document.body.appendChild(emptyTimeline);
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('should remove chat from list', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }, { id: 'chat_2' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    deleteChat('chat_2', state, elements, callbacks);

    expect(removeChatById).toHaveBeenCalledWith([{ id: 'chat_1' }, { id: 'chat_2' }], 'chat_2');
  });

  it('should update storage after deletion', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    deleteChat('chat_2', state, elements, callbacks);

    expect(saveChatToStorage).toHaveBeenCalled();
  });

  it('should load first chat if current chat is deleted', () => {
    const remainingChat = { id: 'chat_2', title: 'Remaining' };
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }, remainingChat]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    // Mock removeChatById to return the remaining chat
    removeChatById.mockReturnValueOnce([remainingChat]);

    deleteChat('chat_1', state, elements, callbacks);

    // Should switch to first remaining chat
    expect(restoreMessages).toHaveBeenCalled();
  });

  it('should switch to home view if no chats remain', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    // Mock removeChatById to return empty array
    removeChatById.mockReturnValueOnce([]);

    deleteChat('chat_1', state, elements, callbacks);

    expect(callbacks.switchToHomeView).toHaveBeenCalled();
    expect(state.currentChatId).toBeNull();
    expect(state.isFirstMessage).toBe(true);
  });

  it('should re-render chat history', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    deleteChat('chat_2', state, elements, callbacks);

    expect(callbacks.renderChatHistory).toHaveBeenCalled();
  });

  it('should not switch views when deleting non-current chat', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }, { id: 'chat_2' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    deleteChat('chat_2', state, elements, callbacks);

    expect(callbacks.switchToHomeView).not.toHaveBeenCalled();
    expect(state.currentChatId).toBe('chat_1');
  });
});

describe('startNewChat', () => {
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    global.localStorage = mockStorage;
    document.body.innerHTML = '';

    // Setup required DOM elements
    const timelineList = document.createElement('div');
    timelineList.id = 'timelineList';
    const emptyTimeline = document.createElement('div');
    emptyTimeline.id = 'emptyTimeline';
    const fileChangesList = document.createElement('div');
    fileChangesList.id = 'fileChangesList';
    const emptyFiles = document.createElement('div');
    emptyFiles.id = 'emptyFiles';

    document.body.appendChild(timelineList);
    document.body.appendChild(emptyTimeline);
    document.body.appendChild(fileChangesList);
    document.body.appendChild(emptyFiles);
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('should save current chat if it has messages', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: []
    });
    const elements = createMockElements();
    elements.chatMessages.appendChild(document.createElement('div')); // Add a message
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(saveChatToStorage).toHaveBeenCalled();
  });

  it('should reset state', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      isFirstMessage: false,
      todos: [{ id: 'todo_1' }],
      toolCalls: [{ id: 'tool_1' }],
      fileChanges: [{ name: 'file.js' }],
      attachedFiles: [{ name: 'attach.txt' }]
    });
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(state.currentChatId).toBeNull();
    expect(state.isFirstMessage).toBe(true);
    expect(state.todos).toEqual([]);
    expect(state.toolCalls).toEqual([]);
    expect(state.fileChanges).toEqual([]);
    expect(state.attachedFiles).toEqual([]);
  });

  it('should clear UI elements', () => {
    const state = createMockState({ currentChatId: 'chat_1' });
    const elements = createMockElements();
    elements.chatMessages.innerHTML = '<div>Old message</div>';
    elements.messageInput.value = 'Draft text';
    elements.homeInput.value = 'Home draft';
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(elements.chatMessages.innerHTML).toBe('');
    expect(elements.messageInput.value).toBe('');
    expect(elements.homeInput.value).toBe('');
    expect(elements.chatTitle.textContent).toBe('New chat');
  });

  it('should reset timeline', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    const timelineList = document.getElementById('timelineList');
    const emptyTimeline = document.getElementById('emptyTimeline');
    timelineList.innerHTML = '<div>Tool call</div>';
    emptyTimeline.style.display = 'none';

    startNewChat(state, elements, callbacks);

    expect(timelineList.innerHTML).toBe('');
    expect(emptyTimeline.style.display).toBe('block');
  });

  it('should reset file changes list', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    const fileChangesList = document.getElementById('fileChangesList');
    const emptyFiles = document.getElementById('emptyFiles');
    fileChangesList.innerHTML = '<div>File change</div>';
    emptyFiles.style.display = 'none';

    startNewChat(state, elements, callbacks);

    expect(fileChangesList.innerHTML).toBe('');
    expect(emptyFiles.style.display).toBe('block');
  });

  it('should switch to home view', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(callbacks.switchToHomeView).toHaveBeenCalled();
  });

  it('should call autoResizeTextarea for both inputs', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(callbacks.autoResizeTextarea).toHaveBeenCalledWith(elements.homeInput);
    expect(callbacks.autoResizeTextarea).toHaveBeenCalledWith(elements.messageInput);
  });

  it('should call updateSendButton for both buttons', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(callbacks.updateSendButton).toHaveBeenCalledWith(
      elements.homeInput,
      elements.homeSendBtn
    );
    expect(callbacks.updateSendButton).toHaveBeenCalledWith(
      elements.messageInput,
      elements.chatSendBtn
    );
  });

  it('should focus home input', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    // Spy on focus
    const focusSpy = vi.spyOn(elements.homeInput, 'focus');

    startNewChat(state, elements, callbacks);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should show templates', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(callbacks.showTemplates).toHaveBeenCalled();
  });

  it('should remove currentChatId from localStorage', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(mockStorage.removeItem).toHaveBeenCalledWith('currentChatId');
  });

  it('should re-render chat history', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    startNewChat(state, elements, callbacks);

    expect(callbacks.renderChatHistory).toHaveBeenCalled();
  });
});

describe('renderChatHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sort chats by time', () => {
    const state = createMockState({
      allChats: [
        { id: 'chat_1', updatedAt: 1000 },
        { id: 'chat_2', updatedAt: 3000 },
        { id: 'chat_3', updatedAt: 2000 }
      ]
    });
    const container = document.createElement('div');
    const onSwitch = vi.fn();

    renderChatHistory(state, container, onSwitch);

    expect(sortChatsByTime).toHaveBeenCalledWith(state.allChats);
  });

  it('should call renderChatHistoryList with correct params', () => {
    const state = createMockState({
      currentChatId: 'chat_1',
      allChats: [{ id: 'chat_1' }, { id: 'chat_2' }],
      isWaitingForResponse: true
    });
    const container = document.createElement('div');
    const onSwitch = vi.fn();

    renderChatHistory(state, container, onSwitch);

    expect(renderChatHistoryList).toHaveBeenCalledWith(container, expect.any(Array), {
      currentChatId: 'chat_1',
      isWaitingForResponse: true,
      onSwitch
    });
  });

  it('should pass sorted chats to renderChatHistoryList', () => {
    const sortedChats = [
      { id: 'chat_2', updatedAt: 2000 },
      { id: 'chat_1', updatedAt: 1000 }
    ];
    sortChatsByTime.mockReturnValueOnce(sortedChats);

    const state = createMockState({
      allChats: [{ id: 'chat_1' }, { id: 'chat_2' }]
    });
    const container = document.createElement('div');
    const onSwitch = vi.fn();

    renderChatHistory(state, container, onSwitch);

    expect(renderChatHistoryList).toHaveBeenCalledWith(container, sortedChats, expect.any(Object));
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should handle missing callbacks gracefully', () => {
    const chat = { id: 'chat_1', title: 'Test' };
    const state = createMockState();
    const elements = createMockElements();

    const timelineList = document.createElement('div');
    timelineList.id = 'timelineList';
    const emptyTimeline = document.createElement('div');
    emptyTimeline.id = 'emptyTimeline';
    document.body.appendChild(timelineList);
    document.body.appendChild(emptyTimeline);

    global.localStorage = { setItem: vi.fn(), getItem: vi.fn() };

    // Empty callbacks object
    expect(() => {
      loadChat(chat, state, elements, {});
    }).not.toThrow();

    delete global.localStorage;
  });

  it('should handle missing DOM elements gracefully', () => {
    const state = createMockState();
    const elements = createMockElements();
    const callbacks = createMockCallbacks();

    global.localStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };

    // No timeline or file changes elements in DOM
    expect(() => {
      startNewChat(state, elements, callbacks);
    }).not.toThrow();

    delete global.localStorage;
  });
});
