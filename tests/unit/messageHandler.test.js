/**
 * Unit tests for messageHandler module
 * Tests message creation, updating, and extraction logic
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../renderer/uiHelpers.js', () => ({
  buildLoadingIndicatorHTML: vi.fn(
    () => '<div class="loading-dots"><span></span><span></span><span></span></div>'
  ),
  buildMessageActionsHTML: vi.fn(() => '<button class="action-btn copy-btn">Copy</button>')
}));

import {
  addUserMessage,
  createAssistantMessage,
  removeLoadingIndicator,
  showMessageActions,
  updateGenerationStatus,
  removeGenerationStatus,
  scrollToBottom,
  copyMessage,
  getConversationHistory,
  extractMessagesData,
  restoreMessages
} from '../../renderer/modules/messageHandler.js';

describe('addUserMessage', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '200px';
    container.style.overflow = 'auto';
  });

  it('should create user message element', () => {
    const result = addUserMessage(container, 'Hello');

    expect(result.className).toBe('message user');
    expect(container.children.length).toBe(1);
  });

  it('should set message text content', () => {
    const result = addUserMessage(container, 'Test message');

    const contentDiv = result.querySelector('.message-content');
    expect(contentDiv.textContent).toBe('Test message');
  });

  it('should append to container', () => {
    addUserMessage(container, 'First');
    addUserMessage(container, 'Second');

    expect(container.children.length).toBe(2);
  });

  it('should handle empty text', () => {
    const result = addUserMessage(container, '');

    const contentDiv = result.querySelector('.message-content');
    expect(contentDiv.textContent).toBe('');
  });

  it('should handle special characters', () => {
    const result = addUserMessage(container, '<script>alert("xss")</script>');

    const contentDiv = result.querySelector('.message-content');
    // textContent should preserve the text as-is (not execute)
    expect(contentDiv.textContent).toContain('<script>');
  });
});

describe('createAssistantMessage', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should create assistant message element', () => {
    const result = createAssistantMessage(container);

    expect(result.className).toBe('message assistant');
    expect(container.children.length).toBe(1);
  });

  it('should include loading indicator', () => {
    const result = createAssistantMessage(container);

    const loadingIndicator = result.querySelector('.loading-indicator');
    expect(loadingIndicator).not.toBeNull();
  });

  it('should include hidden message actions', () => {
    const result = createAssistantMessage(container);

    const actionsDiv = result.querySelector('.message-actions');
    expect(actionsDiv).not.toBeNull();
    expect(actionsDiv.classList.contains('hidden')).toBe(true);
  });

  it('should have message-content div', () => {
    const result = createAssistantMessage(container);

    const contentDiv = result.querySelector('.message-content');
    expect(contentDiv).not.toBeNull();
  });
});

describe('removeLoadingIndicator', () => {
  it('should remove loading indicator from content div', () => {
    const contentDiv = document.createElement('div');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    contentDiv.appendChild(loadingDiv);

    removeLoadingIndicator(contentDiv);

    expect(contentDiv.querySelector('.loading-indicator')).toBeNull();
  });

  it('should do nothing if no loading indicator', () => {
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = '<p>Some content</p>';

    expect(() => {
      removeLoadingIndicator(contentDiv);
    }).not.toThrow();

    expect(contentDiv.innerHTML).toBe('<p>Some content</p>');
  });
});

describe('showMessageActions', () => {
  it('should remove hidden class from actions', () => {
    const messageDiv = document.createElement('div');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions hidden';
    messageDiv.appendChild(actionsDiv);

    showMessageActions(messageDiv);

    expect(actionsDiv.classList.contains('hidden')).toBe(false);
  });

  it('should handle missing actions div', () => {
    const messageDiv = document.createElement('div');

    expect(() => {
      showMessageActions(messageDiv);
    }).not.toThrow();
  });
});

describe('updateGenerationStatus', () => {
  let assistantMessage;

  beforeEach(() => {
    assistantMessage = document.createElement('div');
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    assistantMessage.appendChild(contentDiv);
  });

  it('should create status element if not exists', () => {
    updateGenerationStatus(assistantMessage, 'Generating...');

    const statusDiv = assistantMessage.querySelector('.generation-status');
    expect(statusDiv).not.toBeNull();
  });

  it('should update status text', () => {
    updateGenerationStatus(assistantMessage, 'Processing...');

    const statusText = assistantMessage.querySelector('.status-text');
    expect(statusText.textContent).toBe('Processing...');
  });

  it('should reuse existing status element', () => {
    updateGenerationStatus(assistantMessage, 'First');
    updateGenerationStatus(assistantMessage, 'Second');

    const statusDivs = assistantMessage.querySelectorAll('.generation-status');
    expect(statusDivs.length).toBe(1);

    const statusText = assistantMessage.querySelector('.status-text');
    expect(statusText.textContent).toBe('Second');
  });

  it('should include status dot', () => {
    updateGenerationStatus(assistantMessage, 'Loading...');

    const statusDot = assistantMessage.querySelector('.status-dot');
    expect(statusDot).not.toBeNull();
  });
});

describe('removeGenerationStatus', () => {
  it('should remove status element', () => {
    const assistantMessage = document.createElement('div');
    const statusDiv = document.createElement('div');
    statusDiv.className = 'generation-status';
    assistantMessage.appendChild(statusDiv);

    removeGenerationStatus(assistantMessage);

    expect(assistantMessage.querySelector('.generation-status')).toBeNull();
  });

  it('should handle missing status element', () => {
    const assistantMessage = document.createElement('div');

    expect(() => {
      removeGenerationStatus(assistantMessage);
    }).not.toThrow();
  });
});

describe('scrollToBottom', () => {
  it('should scroll container to bottom', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollHeight', { value: 500 });

    scrollToBottom(container);

    expect(container.scrollTop).toBe(500);
  });

  it('should handle null container', () => {
    expect(() => {
      scrollToBottom(null);
    }).not.toThrow();
  });
});

describe('copyMessage', () => {
  let button;
  let messageDiv;

  beforeEach(() => {
    messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = 'Test content';

    button = document.createElement('button');

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(button);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('should copy text content to clipboard', async () => {
    const result = await copyMessage(button);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test content');
    expect(result).toBe(true);
  });

  it('should prefer rawContent data attribute', async () => {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.dataset.rawContent = 'Raw markdown content';

    await copyMessage(button);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Raw markdown content');
  });

  it('should change button color on success', async () => {
    vi.useFakeTimers();

    await copyMessage(button);

    expect(button.style.color).toBe('rgb(39, 174, 96)');

    vi.advanceTimersByTime(1000);
    expect(button.style.color).toBe('');

    vi.useRealTimers();
  });

  it('should return false on clipboard error', async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

    const result = await copyMessage(button);

    expect(result).toBe(false);
  });
});

describe('getConversationHistory', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should extract user and assistant messages', () => {
    // Add user message
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    const userContent = document.createElement('div');
    userContent.className = 'message-content';
    userContent.textContent = 'Hello';
    userDiv.appendChild(userContent);
    container.appendChild(userDiv);

    // Add assistant message
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';
    const assistantContent = document.createElement('div');
    assistantContent.className = 'message-content';
    assistantContent.textContent = 'Hi there!';
    assistantDiv.appendChild(assistantContent);
    container.appendChild(assistantDiv);

    // Add loading message (should be skipped - it's the last one)
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    container.appendChild(loadingDiv);

    const history = getConversationHistory(container);

    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(history[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
  });

  it('should prefer rawContent data attribute', () => {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    const userContent = document.createElement('div');
    userContent.className = 'message-content';
    userContent.textContent = 'Rendered text';
    userContent.dataset.rawContent = 'Raw **markdown**';
    userDiv.appendChild(userContent);
    container.appendChild(userDiv);

    // Add dummy last message
    container.appendChild(document.createElement('div'));

    const history = getConversationHistory(container);

    expect(history[0].content).toBe('Raw **markdown**');
  });

  it('should skip messages without content', () => {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'message user';
    const emptyContent = document.createElement('div');
    emptyContent.className = 'message-content';
    emptyContent.textContent = '';
    emptyDiv.appendChild(emptyContent);
    container.appendChild(emptyDiv);

    // Add dummy last message
    container.appendChild(document.createElement('div'));

    const history = getConversationHistory(container);

    expect(history).toHaveLength(0);
  });

  it('should skip last message', () => {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    const userContent = document.createElement('div');
    userContent.className = 'message-content';
    userContent.textContent = 'Only message';
    userDiv.appendChild(userContent);
    container.appendChild(userDiv);

    const history = getConversationHistory(container);

    // Last message is skipped
    expect(history).toHaveLength(0);
  });

  it('should handle empty container', () => {
    const history = getConversationHistory(container);

    expect(history).toEqual([]);
  });
});

describe('extractMessagesData', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should extract message class and content', () => {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    const userContent = document.createElement('div');
    userContent.className = 'message-content';
    userContent.textContent = 'User message';
    userDiv.appendChild(userContent);
    container.appendChild(userDiv);

    const data = extractMessagesData(container);

    expect(data).toHaveLength(1);
    expect(data[0].class).toBe('message user');
    expect(data[0].content).toBe('User message');
  });

  it('should prefer rawContent data attribute', () => {
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = 'Rendered';
    content.dataset.rawContent = 'Original markdown';
    assistantDiv.appendChild(content);
    container.appendChild(assistantDiv);

    const data = extractMessagesData(container);

    expect(data[0].content).toBe('Original markdown');
  });

  it('should handle messages without content div', () => {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'message unknown';
    container.appendChild(emptyDiv);

    const data = extractMessagesData(container);

    expect(data[0].content).toBe('');
  });

  it('should extract all messages', () => {
    for (let i = 0; i < 5; i++) {
      const div = document.createElement('div');
      div.className = `message ${i % 2 === 0 ? 'user' : 'assistant'}`;
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = `Message ${i}`;
      div.appendChild(content);
      container.appendChild(div);
    }

    const data = extractMessagesData(container);

    expect(data).toHaveLength(5);
  });
});

describe('restoreMessages', () => {
  let container;
  let renderMarkdown;

  beforeEach(() => {
    container = document.createElement('div');
    renderMarkdown = vi.fn();
  });

  it('should restore user messages', () => {
    const messages = [{ class: 'message user', content: 'Hello' }];

    restoreMessages(container, messages, renderMarkdown);

    expect(container.children.length).toBe(1);
    const messageDiv = container.children[0];
    expect(messageDiv.className).toBe('message user');
    expect(messageDiv.querySelector('.message-content').textContent).toBe('Hello');
  });

  it('should restore assistant messages with markdown', () => {
    const messages = [{ class: 'message assistant', content: '**Bold text**' }];

    restoreMessages(container, messages, renderMarkdown);

    expect(renderMarkdown).toHaveBeenCalled();
  });

  it('should set rawContent data attribute', () => {
    const messages = [{ class: 'message user', content: 'Original content' }];

    restoreMessages(container, messages, renderMarkdown);

    const contentDiv = container.querySelector('.message-content');
    expect(contentDiv.dataset.rawContent).toBe('Original content');
  });

  it('should add actions to assistant messages', () => {
    const messages = [{ class: 'message assistant', content: 'Response' }];

    restoreMessages(container, messages, renderMarkdown);

    const actionsDiv = container.querySelector('.message-actions');
    expect(actionsDiv).not.toBeNull();
  });

  it('should not add actions to user messages', () => {
    const messages = [{ class: 'message user', content: 'Question' }];

    restoreMessages(container, messages, renderMarkdown);

    const actionsDiv = container.querySelector('.message-actions');
    expect(actionsDiv).toBeNull();
  });

  it('should clear container before restoring', () => {
    container.innerHTML = '<div>Old content</div>';

    const messages = [{ class: 'message user', content: 'New' }];

    restoreMessages(container, messages, renderMarkdown);

    expect(container.children.length).toBe(1);
    expect(container.textContent).not.toContain('Old content');
  });

  it('should return last assistant content div', () => {
    const messages = [
      { class: 'message user', content: 'Q1' },
      { class: 'message assistant', content: 'A1' },
      { class: 'message user', content: 'Q2' },
      { class: 'message assistant', content: 'A2' }
    ];

    const result = restoreMessages(container, messages, renderMarkdown);

    expect(result).not.toBeNull();
    expect(result.dataset.rawContent).toBe('A2');
  });

  it('should handle null messages array', () => {
    const result = restoreMessages(container, null, renderMarkdown);

    expect(container.children.length).toBe(0);
    expect(result).toBeNull();
  });

  it('should handle empty messages array', () => {
    const result = restoreMessages(container, [], renderMarkdown);

    expect(container.children.length).toBe(0);
    expect(result).toBeNull();
  });
});
