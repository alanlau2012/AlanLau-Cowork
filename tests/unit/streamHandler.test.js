/**
 * Unit tests for streamHandler module
 * Tests SSE stream processing logic
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../renderer/modules/logger.js', () => ({
  logSSEData: vi.fn(),
  logToolUse: vi.fn(),
  logToolResult: vi.fn(),
  logToolMatch: vi.fn(),
  logDone: vi.fn()
}));

vi.mock('../../renderer/modules/toolCalls.js', () => ({
  createToolCallData: vi.fn((name, input, status) => ({
    id: `tool_${Date.now()}`,
    name,
    input,
    status,
    createdAt: Date.now()
  })),
  createSidebarToolCallElement: vi.fn(() => document.createElement('div')),
  updateSidebarToolCallStatus: vi.fn(),
  updateSidebarToolCallResult: vi.fn(),
  createInlineToolCallElement: vi.fn(() => document.createElement('div')),
  updateInlineToolCallResult: vi.fn()
}));

vi.mock('../../renderer/modules/markdownRenderer.js', () => ({
  appendToContent: vi.fn(),
  incrementChunkCounter: vi.fn()
}));

vi.mock('../../renderer/modules/messageHandler.js', () => ({
  removeLoadingIndicator: vi.fn(),
  showMessageActions: vi.fn(),
  updateGenerationStatus: vi.fn(),
  removeGenerationStatus: vi.fn(),
  scrollToBottom: vi.fn()
}));

import { processSSEStream } from '../../renderer/modules/streamHandler.js';
import {
  createToolCallData,
  createSidebarToolCallElement,
  updateSidebarToolCallStatus,
  updateSidebarToolCallResult,
  createInlineToolCallElement,
  updateInlineToolCallResult
} from '../../renderer/modules/toolCalls.js';
import { appendToContent, incrementChunkCounter } from '../../renderer/modules/markdownRenderer.js';
import {
  removeLoadingIndicator,
  showMessageActions,
  updateGenerationStatus,
  removeGenerationStatus
} from '../../renderer/modules/messageHandler.js';

/**
 * Helper: Create a mock ReadableStreamDefaultReader
 */
function createMockReader(chunks) {
  let index = 0;
  return {
    read: vi.fn(async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const value = chunks[index];
      index++;
      return { done: false, value };
    })
  };
}

/**
 * Helper: Create SSE data line
 */
function sseData(obj) {
  return `data: ${JSON.stringify(obj)}\n`;
}

/**
 * Helper: Create mock DOM elements
 */
function createMockElements() {
  // Mock document.getElementById
  const timelineList = document.createElement('div');
  timelineList.id = 'timelineList';
  const emptyTimeline = document.createElement('div');
  emptyTimeline.id = 'emptyTimeline';

  document.body.appendChild(timelineList);
  document.body.appendChild(emptyTimeline);

  return {
    contentDiv: document.createElement('div'),
    assistantMessage: document.createElement('div'),
    messagesContainer: document.createElement('div')
  };
}

/**
 * Helper: Create mock callbacks
 */
function createMockCallbacks() {
  return {
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onTodoUpdate: vi.fn(),
    onFileChange: vi.fn(),
    onSaveState: vi.fn()
  };
}

describe('processSSEStream', () => {
  let elements;
  let callbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    elements = createMockElements();
    callbacks = createMockCallbacks();
  });

  describe('Stream Completion', () => {
    it('should handle empty stream gracefully', async () => {
      const reader = createMockReader([]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(showMessageActions).toHaveBeenCalledWith(elements.assistantMessage);
    });

    it('should call showMessageActions when reader stream ends', async () => {
      // Test when reader.read() returns done: true (not when data.type === 'done')
      // The 'done' SSE event causes immediate return, showMessageActions is called
      // when the reader itself ends (empty stream or after processing)
      const reader = createMockReader([]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(showMessageActions).toHaveBeenCalledWith(elements.assistantMessage);
    });
  });

  describe('Text Events', () => {
    it('should process text event and append content', async () => {
      const reader = createMockReader([
        sseData({ type: 'text', content: 'Hello world' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledWith(elements.contentDiv, 'Hello world');
    });

    it('should remove loading indicator on first text content', async () => {
      const reader = createMockReader([
        sseData({ type: 'text', content: 'First message' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(removeLoadingIndicator).toHaveBeenCalledWith(elements.contentDiv);
    });

    it('should update generation status during text streaming', async () => {
      const reader = createMockReader([
        sseData({ type: 'text', content: 'Streaming...' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(updateGenerationStatus).toHaveBeenCalledWith(
        elements.assistantMessage,
        '正在生成回复...'
      );
    });

    it('should call onSaveState callback for text events', async () => {
      const reader = createMockReader([
        sseData({ type: 'text', content: 'Test' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onSaveState).toHaveBeenCalled();
    });

    it('should handle multiple text chunks', async () => {
      const reader = createMockReader([
        sseData({ type: 'text', content: 'Hello ' }),
        sseData({ type: 'text', content: 'World' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledTimes(2);
      expect(appendToContent).toHaveBeenNthCalledWith(1, elements.contentDiv, 'Hello ');
      expect(appendToContent).toHaveBeenNthCalledWith(2, elements.contentDiv, 'World');
    });
  });

  describe('Tool Use Events', () => {
    it('should create tool call on tool_use event', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_api_123',
          name: 'Read',
          input: { path: '/test/file.js' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(createToolCallData).toHaveBeenCalledWith('Read', { path: '/test/file.js' }, 'running');
    });

    it('should call onToolCall callback', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_api_123',
          name: 'Write',
          input: { path: '/test.js', content: 'code' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onToolCall).toHaveBeenCalled();
    });

    it('should create sidebar and inline tool elements', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'Grep',
          input: { pattern: 'test' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(createSidebarToolCallElement).toHaveBeenCalled();
      expect(createInlineToolCallElement).toHaveBeenCalledWith(
        'Grep',
        { pattern: 'test' },
        expect.any(String)
      );
    });

    it('should update generation status with tool name', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'Shell',
          input: { command: 'ls' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(updateGenerationStatus).toHaveBeenCalledWith(
        elements.assistantMessage,
        '正在调用工具: Shell...'
      );
    });
  });

  describe('TodoWrite Tool', () => {
    it('should call onTodoUpdate for TodoWrite tool', async () => {
      const todos = [
        { id: 'todo_1', content: 'Task 1', status: 'pending' },
        { id: 'todo_2', content: 'Task 2', status: 'completed' }
      ];

      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'TodoWrite',
          input: { todos }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onTodoUpdate).toHaveBeenCalledWith(todos);
    });
  });

  describe('File Change Tracking', () => {
    it('should track Write as added file', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'Write',
          input: { path: '/src/new-file.js' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onFileChange).toHaveBeenCalledWith(
        'new-file.js',
        '/src/new-file.js',
        'added'
      );
    });

    it('should track Delete as deleted file', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'Delete',
          input: { path: '/src/old-file.js' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onFileChange).toHaveBeenCalledWith(
        'old-file.js',
        '/src/old-file.js',
        'deleted'
      );
    });

    it('should track Edit as modified file', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'Edit',
          input: { path: '/src/existing.js' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onFileChange).toHaveBeenCalledWith(
        'existing.js',
        '/src/existing.js',
        'modified'
      );
    });

    it('should track StrReplace as modified file', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'StrReplace',
          input: { path: '/src/file.js', old_string: 'foo', new_string: 'bar' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onFileChange).toHaveBeenCalledWith('file.js', '/src/file.js', 'modified');
    });

    it('should handle Windows-style paths', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_123',
          name: 'Write',
          input: { path: 'C:\\Users\\test\\file.js' }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onFileChange).toHaveBeenCalledWith(
        'file.js',
        'C:\\Users\\test\\file.js',
        'added'
      );
    });
  });

  describe('Tool Result Events', () => {
    it('should update tool call status on tool_result', async () => {
      // First send tool_use, then tool_result
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_api_123',
          name: 'Read',
          input: { path: '/test.js' }
        }),
        sseData({
          type: 'tool_result',
          tool_use_id: 'tool_api_123',
          result: 'file content here'
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(updateSidebarToolCallStatus).toHaveBeenCalled();
      expect(updateSidebarToolCallResult).toHaveBeenCalled();
      expect(updateInlineToolCallResult).toHaveBeenCalled();
    });

    it('should call onToolResult callback', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_api_456',
          name: 'Grep',
          input: { pattern: 'test' }
        }),
        sseData({
          type: 'tool_result',
          tool_use_id: 'tool_api_456',
          result: 'match found'
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onToolResult).toHaveBeenCalled();
    });
  });

  describe('Done Events', () => {
    it('should remove generation status on done', async () => {
      const reader = createMockReader([
        sseData({ type: 'text', content: 'Test' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(removeGenerationStatus).toHaveBeenCalledWith(elements.assistantMessage);
    });

    it('should mark all pending tools as success on done', async () => {
      const reader = createMockReader([
        sseData({
          type: 'tool_use',
          id: 'tool_1',
          name: 'Read',
          input: {}
        }),
        sseData({
          type: 'tool_use',
          id: 'tool_2',
          name: 'Write',
          input: {}
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      // Both tools should have their status updated to success
      expect(updateSidebarToolCallStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('Assistant Events', () => {
    it('should handle assistant event with tool_use blocks', async () => {
      const reader = createMockReader([
        sseData({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'block_tool_1',
                name: 'Shell',
                input: { command: 'pwd' }
              }
            ]
          }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(createToolCallData).toHaveBeenCalledWith('Shell', { command: 'pwd' }, 'running');
    });

    it('should handle assistant event with text blocks', async () => {
      const reader = createMockReader([
        sseData({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'text',
                text: 'Here is the result'
              }
            ]
          }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledWith(elements.contentDiv, 'Here is the result');
    });

    it('should process TodoWrite in assistant event content', async () => {
      const todos = [{ id: 'task_1', content: 'Do something', status: 'pending' }];

      const reader = createMockReader([
        sseData({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'todo_tool',
                name: 'TodoWrite',
                input: { todos }
              }
            ]
          }
        }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(callbacks.onTodoUpdate).toHaveBeenCalledWith(todos);
    });
  });

  describe('Buffer Handling', () => {
    it('should handle partial data lines across chunks', async () => {
      // Split SSE data across multiple chunks
      const fullLine = sseData({ type: 'text', content: 'Complete message' });
      const reader = createMockReader([
        fullLine.slice(0, 10), // Partial first chunk
        fullLine.slice(10) + sseData({ type: 'done' }) // Rest + done
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledWith(elements.contentDiv, 'Complete message');
    });

    it('should handle multiple events in single chunk', async () => {
      const chunk =
        sseData({ type: 'text', content: 'First' }) +
        sseData({ type: 'text', content: 'Second' }) +
        sseData({ type: 'done' });

      const reader = createMockReader([chunk]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should silently handle malformed JSON', async () => {
      const reader = createMockReader(['data: {invalid json}\n', sseData({ type: 'done' })]);

      // Should not throw
      await expect(
        processSSEStream(
          reader,
          elements.contentDiv,
          elements.assistantMessage,
          elements.messagesContainer,
          callbacks
        )
      ).resolves.not.toThrow();
    });

    it('should continue processing after malformed line', async () => {
      const reader = createMockReader([
        'data: not valid json\n',
        sseData({ type: 'text', content: 'Valid content' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledWith(elements.contentDiv, 'Valid content');
    });

    it('should ignore non-data lines', async () => {
      const reader = createMockReader([
        ': comment line\n',
        'event: message\n',
        sseData({ type: 'text', content: 'Real content' }),
        sseData({ type: 'done' })
      ]);

      await processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      );

      expect(appendToContent).toHaveBeenCalledWith(elements.contentDiv, 'Real content');
    });
  });
});

describe('Edge Cases', () => {
  let elements;
  let callbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    const timelineList = document.createElement('div');
    timelineList.id = 'timelineList';
    const emptyTimeline = document.createElement('div');
    emptyTimeline.id = 'emptyTimeline';
    document.body.appendChild(timelineList);
    document.body.appendChild(emptyTimeline);

    elements = {
      contentDiv: document.createElement('div'),
      assistantMessage: document.createElement('div'),
      messagesContainer: document.createElement('div')
    };
    callbacks = {
      onToolCall: vi.fn(),
      onToolResult: vi.fn(),
      onTodoUpdate: vi.fn(),
      onFileChange: vi.fn(),
      onSaveState: vi.fn()
    };
  });

  it('should handle tool with missing name gracefully', async () => {
    const reader = createMockReader([
      sseData({
        type: 'tool_use',
        id: 'tool_123',
        input: { some: 'data' }
        // name is missing
      }),
      sseData({ type: 'done' })
    ]);

    await processSSEStream(
      reader,
      elements.contentDiv,
      elements.assistantMessage,
      elements.messagesContainer,
      callbacks
    );

    // Should use default 'Tool' name
    expect(createToolCallData).toHaveBeenCalledWith('Tool', { some: 'data' }, 'running');
  });

  it('should handle text event without content', async () => {
    const reader = createMockReader([
      sseData({ type: 'text' }), // No content
      sseData({ type: 'done' })
    ]);

    await expect(
      processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        callbacks
      )
    ).resolves.not.toThrow();

    // appendToContent should not be called for empty content
    expect(appendToContent).not.toHaveBeenCalled();
  });

  it('should handle result event type alias', async () => {
    const reader = createMockReader([
      sseData({
        type: 'tool_use',
        id: 'tool_999',
        name: 'Read',
        input: {}
      }),
      sseData({
        type: 'result', // Alternative type
        tool_use_id: 'tool_999',
        result: 'some result'
      }),
      sseData({ type: 'done' })
    ]);

    await processSSEStream(
      reader,
      elements.contentDiv,
      elements.assistantMessage,
      elements.messagesContainer,
      callbacks
    );

    expect(updateGenerationStatus).toHaveBeenCalledWith(
      elements.assistantMessage,
      '收到工具执行结果，正在处理...'
    );
  });

  it('should handle empty callbacks object', async () => {
    const reader = createMockReader([
      sseData({ type: 'text', content: 'Test' }),
      sseData({ type: 'done' })
    ]);

    await expect(
      processSSEStream(
        reader,
        elements.contentDiv,
        elements.assistantMessage,
        elements.messagesContainer,
        {} // Empty callbacks
      )
    ).resolves.not.toThrow();
  });
});
