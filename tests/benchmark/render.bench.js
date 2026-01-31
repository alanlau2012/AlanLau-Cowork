/**
 * 性能基准测试
 * 用于监控关键渲染和处理操作的性能
 *
 * 运行方式: npm run test:bench
 */

import { bench, describe } from 'vitest';

// Mock DOM 环境用于渲染测试
const mockDocument = {
  createElement: tag => ({
    tagName: tag,
    className: '',
    innerHTML: '',
    appendChild: () => {},
    setAttribute: () => {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    style: {}
  }),
  createDocumentFragment: () => ({
    appendChild: () => {}
  })
};

// 模拟消息数据
const createMockMessage = (role, contentLength = 100) => ({
  role,
  content: 'x'.repeat(contentLength),
  timestamp: Date.now()
});

// 模拟工具调用数据
const createMockToolCall = (name, inputSize = 50, outputSize = 100) => ({
  id: `tool_${Date.now()}`,
  name,
  input: { data: 'x'.repeat(inputSize) },
  output: 'x'.repeat(outputSize)
});

describe('Message Rendering Performance', () => {
  bench(
    'render short message',
    () => {
      const msg = createMockMessage('assistant', 100);
      const el = mockDocument.createElement('div');
      el.className = `message ${msg.role}`;
      el.innerHTML = msg.content;
    },
    { iterations: 1000 }
  );

  bench(
    'render long message (5KB)',
    () => {
      const msg = createMockMessage('assistant', 5000);
      const el = mockDocument.createElement('div');
      el.className = `message ${msg.role}`;
      el.innerHTML = msg.content;
    },
    { iterations: 500 }
  );

  bench(
    'render very long message (50KB)',
    () => {
      const msg = createMockMessage('assistant', 50000);
      const el = mockDocument.createElement('div');
      el.className = `message ${msg.role}`;
      el.innerHTML = msg.content;
    },
    { iterations: 100 }
  );
});

describe('Tool Call Processing Performance', () => {
  bench(
    'process single tool call',
    () => {
      const toolCall = createMockToolCall('Read', 100, 500);
      JSON.stringify(toolCall);
      JSON.parse(JSON.stringify(toolCall));
    },
    { iterations: 1000 }
  );

  bench(
    'process batch tool calls (10)',
    () => {
      const toolCalls = Array.from({ length: 10 }, (_, i) =>
        createMockToolCall(`Tool_${i}`, 100, 500)
      );
      JSON.stringify(toolCalls);
      JSON.parse(JSON.stringify(toolCalls));
    },
    { iterations: 500 }
  );

  bench(
    'process large tool output (100KB)',
    () => {
      const toolCall = createMockToolCall('Read', 100, 100000);
      JSON.stringify(toolCall);
    },
    { iterations: 100 }
  );
});

describe('Chat State Operations', () => {
  bench(
    'create chat object',
    () => {
      const chat = {
        id: `chat_${Date.now()}`,
        title: 'Test Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      return chat;
    },
    { iterations: 10000 }
  );

  bench(
    'serialize chat with 50 messages',
    () => {
      const chat = {
        id: 'chat_123',
        title: 'Test Chat',
        messages: Array.from({ length: 50 }, (_, i) =>
          createMockMessage(i % 2 ? 'user' : 'assistant', 200)
        ),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      JSON.stringify(chat);
    },
    { iterations: 500 }
  );

  bench(
    'deep clone chat object',
    () => {
      const chat = {
        id: 'chat_123',
        title: 'Test Chat',
        messages: Array.from({ length: 20 }, (_, i) =>
          createMockMessage(i % 2 ? 'user' : 'assistant', 200)
        ),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      JSON.parse(JSON.stringify(chat));
    },
    { iterations: 500 }
  );
});

describe('String Operations', () => {
  bench(
    'truncate long text (10KB to 100 chars)',
    () => {
      const longText = 'x'.repeat(10000);
      const truncated = longText.length > 100 ? longText.substring(0, 100) + '...' : longText;
      return truncated;
    },
    { iterations: 5000 }
  );

  bench(
    'escape HTML special chars',
    () => {
      const text = '<script>alert("xss")</script> & "quotes" \'single\'';
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      return escaped;
    },
    { iterations: 5000 }
  );

  bench(
    'generate unique ID',
    () => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return id;
    },
    { iterations: 10000 }
  );
});

describe('Array Operations', () => {
  bench(
    'filter messages by role',
    () => {
      const messages = Array.from({ length: 100 }, (_, i) =>
        createMockMessage(i % 2 ? 'user' : 'assistant', 100)
      );
      const userMessages = messages.filter(m => m.role === 'user');
      return userMessages;
    },
    { iterations: 1000 }
  );

  bench(
    'sort chats by timestamp',
    () => {
      const chats = Array.from({ length: 50 }, (_, i) => ({
        id: `chat_${i}`,
        updatedAt: Date.now() - Math.random() * 1000000
      }));
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      return chats;
    },
    { iterations: 1000 }
  );
});
