/**
 * Mock Storage - localStorage 模拟工具
 * 用于单元测试中模拟 localStorage
 */

import { vi } from 'vitest';

/**
 * 创建模拟的 localStorage 对象
 * @returns {object} 模拟的 localStorage
 */
export function createMockStorage() {
  const store = new Map();
  return {
    getItem: vi.fn(key => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn(key => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn(index => Array.from(store.keys())[index] ?? null),
    // 内部方法用于测试
    _store: store
  };
}

/**
 * 设置全局 localStorage mock
 * @returns {object} 模拟的 localStorage（可用于断言）
 */
export function setupMockStorage() {
  const mockStorage = createMockStorage();
  global.localStorage = mockStorage;
  return mockStorage;
}

/**
 * 清除全局 localStorage mock
 */
export function teardownMockStorage() {
  if (global.localStorage) {
    delete global.localStorage;
  }
}

/**
 * 带预设数据创建 localStorage mock
 * @param {object} initialData - 初始数据对象
 * @returns {object} 模拟的 localStorage
 */
export function setupMockStorageWithData(initialData = {}) {
  const mockStorage = createMockStorage();
  Object.entries(initialData).forEach(([key, value]) => {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    mockStorage._store.set(key, stringValue);
  });
  global.localStorage = mockStorage;
  return mockStorage;
}
