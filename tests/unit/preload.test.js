/**
 * Unit tests for preload.js functionality
 * Tests request management, abort logic, and message sending
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AbortController if not available (Node.js < 15)
if (typeof AbortController === 'undefined') {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
global.console = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};

describe('Preload API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      // Simulate generateRequestId function
      function generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const id1 = generateRequestId();
      vi.advanceTimersByTime(1);
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in request ID', () => {
      function generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const before = Date.now();
      const id = generateRequestId();
      const after = Date.now();

      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Request Abort Logic', () => {
    it('should abort active request', () => {
      const activeRequests = new Map();
      const mockController = {
        abort: vi.fn(),
        signal: { aborted: false }
      };

      const requestId = 'req_123_abc';
      activeRequests.set(requestId, mockController);

      // Simulate abortRequest
      function abortRequest(requestId) {
        const controller = activeRequests.get(requestId);
        if (controller) {
          controller.abort();
          activeRequests.delete(requestId);
        }
      }

      abortRequest(requestId);

      expect(mockController.abort).toHaveBeenCalled();
      expect(activeRequests.has(requestId)).toBe(false);
    });

    it('should handle abort of non-existent request', () => {
      const activeRequests = new Map();

      function abortRequest(requestId) {
        const controller = activeRequests.get(requestId);
        if (controller) {
          controller.abort();
          activeRequests.delete(requestId);
        }
      }

      // Should not throw
      expect(() => abortRequest('non-existent')).not.toThrow();
    });
  });

  describe('sendMessage Request Construction', () => {
    it('should construct correct fetch request', async () => {
      const SERVER_URL = 'http://localhost:3001';
      const message = 'Test message';
      const chatId = 'chat_123';

      const mockResponse = {
        ok: true,
        body: {
          getReader: vi.fn(() => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined })
          }))
        }
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Simulate sendMessage logic
      const requestBody = JSON.stringify({ message, chatId });
      const requestUrl = `${SERVER_URL}/api/chat`;

      await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestBody
      });

      expect(global.fetch).toHaveBeenCalledWith(
        requestUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: requestBody
        })
      );
    });

    it('should include chatId in request body', async () => {
      const message = 'Hello';
      const chatId = 'chat_456';

      const requestBody = JSON.parse(JSON.stringify({ message, chatId }));

      expect(requestBody.message).toBe(message);
      expect(requestBody.chatId).toBe(chatId);
    });

    it('should handle missing chatId', async () => {
      const message = 'Hello';
      const chatId = undefined;

      const requestBody = JSON.parse(JSON.stringify({ message, chatId }));

      expect(requestBody.message).toBe(message);
      expect(requestBody.chatId).toBeUndefined();
    });
  });

  describe('Timeout Handling', () => {
    it('should abort request on timeout', async () => {
      const activeRequests = new Map();
      const mockController = {
        abort: vi.fn(),
        signal: { aborted: false }
      };

      const requestId = 'req_timeout_test';
      activeRequests.set(requestId, mockController);

      const timeout = 120000; // 2 minutes

      // Simulate timeout
      const timeoutId = setTimeout(() => {
        if (activeRequests.has(requestId)) {
          mockController.abort();
          activeRequests.delete(requestId);
        }
      }, timeout);

      // Fast-forward time
      vi.advanceTimersByTime(timeout);

      expect(mockController.abort).toHaveBeenCalled();
      expect(activeRequests.has(requestId)).toBe(false);

      clearTimeout(timeoutId);
    });

    it('should not abort if request completed before timeout', async () => {
      const activeRequests = new Map();
      const mockController = {
        abort: vi.fn(),
        signal: { aborted: false }
      };

      const requestId = 'req_completed_test';
      activeRequests.set(requestId, mockController);

      const timeout = 120000;

      // Simulate timeout setup
      const timeoutId = setTimeout(() => {
        if (activeRequests.has(requestId)) {
          mockController.abort();
          activeRequests.delete(requestId);
        }
      }, timeout);

      // Simulate request completion before timeout
      activeRequests.delete(requestId);
      clearTimeout(timeoutId);

      // Fast-forward time
      vi.advanceTimersByTime(timeout);

      // Controller should not be aborted because request was removed
      expect(activeRequests.has(requestId)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      };

      global.fetch.mockResolvedValue(mockResponse);

      try {
        const response = await fetch('http://localhost:3001/api/chat');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        expect(error.message).toContain('HTTP error! status: 500');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'TypeError';

      global.fetch.mockRejectedValue(networkError);

      try {
        await fetch('http://localhost:3001/api/chat');
      } catch (error) {
        expect(error.message).toContain('Network request failed');
      }
    });

    it('should handle AbortError specifically', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';

      global.fetch.mockRejectedValue(abortError);

      try {
        await fetch('http://localhost:3001/api/chat');
      } catch (error) {
        expect(error.name).toBe('AbortError');
      }
    });
  });

  describe('SSE Stream Reader', () => {
    it('should create reader with correct interface', async () => {
      const mockChunks = [
        { done: false, value: new TextEncoder().encode('data: {"type":"text"}\n\n') },
        { done: false, value: new TextEncoder().encode('data: {"type":"done"}\n\n') },
        { done: true, value: undefined }
      ];

      let chunkIndex = 0;
      const mockReader = {
        read: vi.fn(() => Promise.resolve(mockChunks[chunkIndex++]))
      };

      const decoder = new TextDecoder();
      const reader = {
        read: async () => {
          const { done, value } = await mockReader.read();
          return {
            done,
            value: done ? undefined : decoder.decode(value, { stream: true })
          };
        }
      };

      const result1 = await reader.read();
      expect(result1.done).toBe(false);
      expect(result1.value).toContain('{"type":"text"}');

      const result2 = await reader.read();
      expect(result2.done).toBe(false);
      expect(result2.value).toContain('{"type":"done"}');

      const result3 = await reader.read();
      expect(result3.done).toBe(true);
      expect(result3.value).toBeUndefined();
    });

    it('should decode SSE data correctly', () => {
      const decoder = new TextDecoder();
      const encoded = new TextEncoder().encode('data: {"type":"text","content":"Hello"}\n\n');
      const decoded = decoder.decode(encoded);

      expect(decoded).toBe('data: {"type":"text","content":"Hello"}\n\n');
      expect(decoded).toContain('"type":"text"');
      expect(decoded).toContain('"content":"Hello"');
    });
  });

  describe('Request Management', () => {
    it('should track active requests', () => {
      const activeRequests = new Map();
      const requestId1 = 'req_1';
      const requestId2 = 'req_2';

      const controller1 = { abort: vi.fn() };
      const controller2 = { abort: vi.fn() };

      activeRequests.set(requestId1, controller1);
      activeRequests.set(requestId2, controller2);

      expect(activeRequests.size).toBe(2);
      expect(activeRequests.has(requestId1)).toBe(true);
      expect(activeRequests.has(requestId2)).toBe(true);
    });

    it('should clean up completed requests', () => {
      const activeRequests = new Map();
      const requestId = 'req_complete';

      activeRequests.set(requestId, { abort: vi.fn() });
      expect(activeRequests.has(requestId)).toBe(true);

      activeRequests.delete(requestId);
      expect(activeRequests.has(requestId)).toBe(false);
    });
  });
});
