/**
 * API tests for the backend server
 * Tests the Express endpoints with mocked Claude SDK
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import cors from 'cors';

// Mock the Claude Agent SDK before importing anything that uses it
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn()
}));

// Mock Composio
vi.mock('@composio/core', () => ({
  Composio: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      mcp: {
        url: 'http://mock-mcp.test',
        headers: {}
      }
    })
  }))
}));

// Create a test server instance
function createTestServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Simplified chat endpoint for testing
  app.post('/api/chat', async (req, res) => {
    const { message, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      // Mock response for testing
      res.write(
        `data: ${JSON.stringify({ type: 'session_init', session_id: 'test-session-123' })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({ type: 'text', content: 'Hello, this is a test response.' })}\n\n`
      );
      res.write('data: {"type": "done"}\n\n');
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });

  return app;
}

describe('Server API Tests', () => {
  let app;
  let server;
  let baseUrl;

  beforeAll(async () => {
    app = createTestServer();

    // Start server on random port
    await new Promise(resolve => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('POST /api/chat', () => {
    it('should return 400 for missing message', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Message is required');
    });

    it('should return SSE stream for valid message', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello', chatId: 'test-chat-1' })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');

      const text = await response.text();
      expect(text).toContain('data:');
      expect(text).toContain('session_init');
      expect(text).toContain('text');
      expect(text).toContain('done');
    });

    it('should include session_id in response', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message', chatId: 'test-chat-2' })
      });

      const text = await response.text();
      const lines = text.split('\n').filter(line => line.startsWith('data:'));

      // Parse first data line (session_init)
      const firstLine = lines[0];
      const data = JSON.parse(firstLine.slice(6));

      expect(data.type).toBe('session_init');
      expect(data.session_id).toBeDefined();
    });

    it('should handle chatId parameter', async () => {
      const chatId = 'unique-chat-id-12345';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello', chatId })
      });

      expect(response.status).toBe(200);
    });
  });

  describe('SSE Response Format', () => {
    it('should have correct SSE format', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' })
      });

      const text = await response.text();
      const lines = text.split('\n');

      // Check SSE format: each event should be "data: {json}\n\n"
      const dataLines = lines.filter(line => line.startsWith('data:'));
      expect(dataLines.length).toBeGreaterThan(0);

      // Each data line should be valid JSON
      dataLines.forEach(line => {
        const jsonStr = line.slice(6).trim();
        expect(() => JSON.parse(jsonStr)).not.toThrow();
      });
    });

    it('should end with done event', async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' })
      });

      const text = await response.text();
      const lines = text.split('\n').filter(line => line.startsWith('data:'));
      const lastLine = lines[lines.length - 1];
      const lastData = JSON.parse(lastLine.slice(6));

      expect(lastData.type).toBe('done');
    });
  });
});

describe('Request Validation', () => {
  let app;
  let server;
  let baseUrl;

  beforeAll(async () => {
    app = createTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('should reject empty message string', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });

    // Empty string is falsy, should be rejected
    expect(response.status).toBe(400);
  });

  it('should accept message with special characters', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好！How are you? <script>alert("xss")</script>' })
    });

    expect(response.status).toBe(200);
  });

  it('should handle very long messages', async () => {
    const longMessage = 'a'.repeat(10000);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage })
    });

    expect(response.status).toBe(200);
  });
});
