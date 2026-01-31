/**
 * Mock State - 状态模拟工具
 * 用于单元测试中创建模拟状态和回调
 */

import { vi } from 'vitest';

/**
 * 创建模拟的应用状态对象
 * @param {object} overrides - 覆盖默认值的属性
 * @returns {object} 模拟状态对象
 */
export function createMockState(overrides = {}) {
  return {
    currentChatId: null,
    allChats: [],
    isGenerating: false,
    currentAbortController: null,
    chatSessions: new Map(),
    toolCalls: [],
    pendingToolCalls: new Map(),
    ...overrides
  };
}

/**
 * 创建模拟的回调函数集合
 * @param {object} overrides - 覆盖默认回调
 * @returns {object} 模拟回调对象
 */
export function createMockCallbacks(overrides = {}) {
  return {
    scrollToBottom: vi.fn(),
    showToast: vi.fn(),
    updateUI: vi.fn(),
    saveState: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
    ...overrides
  };
}

/**
 * 创建模拟的聊天对象
 * @param {object} overrides - 覆盖默认值
 * @returns {object} 聊天对象
 */
export function createMockChat(overrides = {}) {
  const id = overrides.id || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    title: overrides.title || 'Test Chat',
    messages: overrides.messages || [],
    createdAt: overrides.createdAt || Date.now(),
    updatedAt: overrides.updatedAt || Date.now(),
    ...overrides
  };
}

/**
 * 创建模拟的消息对象
 * @param {string} role - 消息角色 ('user' | 'assistant')
 * @param {string} content - 消息内容
 * @param {object} overrides - 覆盖默认值
 * @returns {object} 消息对象
 */
export function createMockMessage(role, content, overrides = {}) {
  return {
    role,
    content,
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * 创建模拟的工具调用对象
 * @param {object} overrides - 覆盖默认值
 * @returns {object} 工具调用对象
 */
export function createMockToolCall(overrides = {}) {
  return {
    id: overrides.id || `tool_${Date.now()}`,
    name: overrides.name || 'Read',
    input: overrides.input || { path: '/test/file.js' },
    status: overrides.status || 'running',
    result: overrides.result || null,
    createdAt: Date.now(),
    ...overrides
  };
}
