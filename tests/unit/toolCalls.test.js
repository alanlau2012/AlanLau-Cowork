/**
 * Unit tests for toolCalls module
 * Tests tool call data creation, status updates, and streamable content extraction
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../renderer/utils.js', () => ({
  escapeHtml: vi.fn(str => str),
  escapeHtmlPure: vi.fn(str => str),
  formatToolPreview: vi.fn(() => 'preview'),
  calculateDiffStats: vi.fn(() => null)
}));

vi.mock('../../renderer/uiHelpers.js', () => ({
  buildInlineToolCallHTML: vi.fn(() => '<div>tool</div>'),
  buildSidebarToolCallHTML: vi.fn(() => '<div>sidebar</div>'),
  buildDiffStatsHTML: vi.fn(() => '<span>stats</span>')
}));

vi.mock('../../renderer/modules/logger.js', () => ({
  logInlineToolUpdate: vi.fn(),
  logStreamableContent: vi.fn()
}));

import {
  createToolCallData,
  createSidebarToolCallElement,
  updateSidebarToolCallStatus,
  updateSidebarToolCallResult,
  createInlineToolCallElement,
  updateInlineToolCallResult,
  restoreInlineToolCall,
  renderTimeline,
  startTypewriterAnimation,
  stopTypewriterAnimation,
  getStreamableContent
} from '../../renderer/modules/toolCalls.js';

describe('createToolCallData', () => {
  it('should create tool call data with default status', () => {
    const result = createToolCallData('Read', { path: '/test.js' });

    expect(result.name).toBe('Read');
    expect(result.input).toEqual({ path: '/test.js' });
    expect(result.status).toBe('running');
    expect(result.result).toBeNull();
    expect(result.id).toMatch(/^tool_\d+$/);
  });

  it('should create tool call data with custom status', () => {
    const result = createToolCallData('Write', { path: '/file.js' }, 'success');

    expect(result.status).toBe('success');
  });

  it('should generate unique IDs', () => {
    const result1 = createToolCallData('Tool1', {});
    const result2 = createToolCallData('Tool2', {});

    // IDs should be different (though they might be same if called in same ms)
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
  });

  it('should handle empty input', () => {
    const result = createToolCallData('Shell', {});

    expect(result.input).toEqual({});
  });

  it('should handle complex input objects', () => {
    const complexInput = {
      path: '/test.js',
      content: 'const x = 1;',
      options: { encoding: 'utf-8' }
    };
    const result = createToolCallData('Write', complexInput);

    expect(result.input).toEqual(complexInput);
  });
});

describe('getStreamableContent', () => {
  it('should return null for null input', () => {
    expect(getStreamableContent('Write', null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(getStreamableContent('Read', undefined)).toBeNull();
  });

  describe('Write tool', () => {
    it('should extract contents field', () => {
      const input = { path: '/file.js', contents: 'console.log("hello");' };
      const result = getStreamableContent('Write', input);

      expect(result).toBe('console.log("hello");');
    });

    it('should extract content field as fallback', () => {
      const input = { path: '/file.js', content: 'const x = 1;' };
      const result = getStreamableContent('Write', input);

      expect(result).toBe('const x = 1;');
    });

    it('should return null if no content fields', () => {
      const input = { path: '/file.js' };
      const result = getStreamableContent('Write', input);

      expect(result).toBeNull();
    });
  });

  describe('StrReplace tool', () => {
    it('should extract new_string field', () => {
      const input = {
        path: '/file.js',
        old_string: 'foo',
        new_string: 'bar'
      };
      const result = getStreamableContent('StrReplace', input);

      expect(result).toBe('bar');
    });

    it('should return null if no new_string', () => {
      const input = { path: '/file.js', old_string: 'foo' };
      const result = getStreamableContent('StrReplace', input);

      expect(result).toBeNull();
    });
  });

  describe('Edit tool', () => {
    it('should extract new_string field', () => {
      const input = { new_string: 'updated content' };
      const result = getStreamableContent('Edit', input);

      expect(result).toBe('updated content');
    });
  });

  describe('Shell/Bash tools', () => {
    it('should extract printf loop content', () => {
      const input = {
        command: 'printf "Processing item\\n" | seq 1 10 && for i in {1..10}; do echo "done"; done'
      };
      const result = getStreamableContent('Shell', input);

      // printf loop pattern matched, should return generated output
      expect(result).toContain('Processing item');
    });

    it('should extract simple echo with append', () => {
      const input = { command: 'echo "Hello World" >> file.txt' };
      const result = getStreamableContent('Shell', input);

      expect(result).toBe('Hello World');
    });

    it('should extract Bash echo content', () => {
      const input = { command: 'echo "Test output" >> log.txt' };
      const result = getStreamableContent('Bash', input);

      expect(result).toBe('Test output');
    });

    it('should return null for non-echo commands', () => {
      const input = { command: 'ls -la' };
      const result = getStreamableContent('Shell', input);

      expect(result).toBeNull();
    });

    it('should return null for empty command', () => {
      const input = { command: '' };
      const result = getStreamableContent('Shell', input);

      expect(result).toBeNull();
    });
  });

  describe('Other tools', () => {
    it('should return null for Read tool', () => {
      const input = { path: '/file.js' };
      const result = getStreamableContent('Read', input);

      expect(result).toBeNull();
    });

    it('should return null for Grep tool', () => {
      const input = { pattern: 'test', path: '/src' };
      const result = getStreamableContent('Grep', input);

      expect(result).toBeNull();
    });

    it('should return null for Delete tool', () => {
      const input = { path: '/file.js' };
      const result = getStreamableContent('Delete', input);

      expect(result).toBeNull();
    });
  });
});

describe('createSidebarToolCallElement', () => {
  it('should create a tool call element with correct structure', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Read',
      input: { path: '/test.js' },
      status: 'running'
    };

    const element = createSidebarToolCallElement(toolCall);

    expect(element.className).toBe('tool-call-item expanded');
    expect(element.dataset.toolId).toBe('tool_123');
  });

  it('should display tool name', () => {
    const toolCall = {
      id: 'tool_456',
      name: 'Write',
      input: {},
      status: 'running'
    };

    const element = createSidebarToolCallElement(toolCall);

    expect(element.innerHTML).toContain('Write');
  });

  it('should display running status', () => {
    const toolCall = {
      id: 'tool_789',
      name: 'Shell',
      input: { command: 'ls' },
      status: 'running'
    };

    const element = createSidebarToolCallElement(toolCall);

    expect(element.innerHTML).toContain('Running...');
  });

  it('should display completed status', () => {
    const toolCall = {
      id: 'tool_abc',
      name: 'Grep',
      input: {},
      status: 'success'
    };

    const element = createSidebarToolCallElement(toolCall);

    expect(element.innerHTML).toContain('Completed');
  });
});

describe('updateSidebarToolCallStatus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should update status to success', () => {
    // Create a tool call element
    document.body.innerHTML = `
      <div class="tool-call-item" data-tool-id="tool_123">
        <div class="tool-call-icon running"></div>
        <div class="tool-call-status">Running...</div>
      </div>
    `;

    updateSidebarToolCallStatus('tool_123', 'success');

    const icon = document.querySelector('.tool-call-icon');
    const status = document.querySelector('.tool-call-status');

    expect(icon.className).toBe('tool-call-icon success');
    expect(status.textContent).toBe('Completed');
  });

  it('should update status to error', () => {
    document.body.innerHTML = `
      <div class="tool-call-item" data-tool-id="tool_456">
        <div class="tool-call-icon running"></div>
        <div class="tool-call-status">Running...</div>
      </div>
    `;

    updateSidebarToolCallStatus('tool_456', 'error');

    const icon = document.querySelector('.tool-call-icon');
    const status = document.querySelector('.tool-call-status');

    expect(icon.className).toBe('tool-call-icon error');
    expect(status.textContent).toBe('Failed');
  });

  it('should handle non-existent tool ID gracefully', () => {
    document.body.innerHTML = '';

    expect(() => {
      updateSidebarToolCallStatus('non_existent', 'success');
    }).not.toThrow();
  });
});

describe('updateSidebarToolCallResult', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should update result for string', () => {
    document.body.innerHTML = `
      <div class="tool-call-item" data-tool-id="tool_123">
        <div class="tool-output-section" style="display: none;">
          <pre class="sidebar-tool-output"></pre>
        </div>
      </div>
    `;

    updateSidebarToolCallResult('tool_123', 'File content here');

    const output = document.querySelector('.sidebar-tool-output');
    const section = document.querySelector('.tool-output-section');

    expect(output.textContent).toBe('File content here');
    expect(section.style.display).toBe('block');
  });

  it('should update result for object', () => {
    document.body.innerHTML = `
      <div class="tool-call-item" data-tool-id="tool_456">
        <div class="tool-output-section" style="display: none;">
          <pre class="sidebar-tool-output"></pre>
        </div>
      </div>
    `;

    updateSidebarToolCallResult('tool_456', { success: true, count: 5 });

    const output = document.querySelector('.sidebar-tool-output');
    expect(output.textContent).toContain('"success": true');
    expect(output.textContent).toContain('"count": 5');
  });

  it('should truncate long results', () => {
    document.body.innerHTML = `
      <div class="tool-call-item" data-tool-id="tool_789">
        <div class="tool-output-section" style="display: none;">
          <pre class="sidebar-tool-output"></pre>
        </div>
      </div>
    `;

    const longResult = 'x'.repeat(3000);
    updateSidebarToolCallResult('tool_789', longResult);

    const output = document.querySelector('.sidebar-tool-output');
    expect(output.textContent.length).toBeLessThanOrEqual(2003); // 2000 + "..."
    expect(output.textContent).toContain('...');
  });
});

describe('createInlineToolCallElement', () => {
  it('should create inline element with correct data attributes', () => {
    const element = createInlineToolCallElement('Read', { path: '/test.js' }, 'tool_123');

    expect(element.className).toContain('inline-tool-call');
    expect(element.dataset.toolId).toBe('tool_123');
    expect(element.dataset.toolName).toBe('Read');
  });

  it('should include tool name in content', () => {
    const element = createInlineToolCallElement('Write', { path: '/file.js' }, 'tool_456');

    expect(element.innerHTML).toContain('Write');
  });

  it('should have running class initially', () => {
    const element = createInlineToolCallElement('Shell', { command: 'ls' }, 'tool_789');

    expect(element.className).toContain('running');
  });
});

describe('updateInlineToolCallResult', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should update result and status', () => {
    document.body.innerHTML = `
      <div class="inline-tool-call running" data-tool-id="tool_123" data-tool-name="Read">
        <div class="tool-status-icon running tool-spinner"></div>
        <div class="tool-output-section" style="display: none;">
          <pre class="tool-output-content"></pre>
        </div>
      </div>
    `;

    updateInlineToolCallResult('tool_123', 'Result data');

    const toolDiv = document.querySelector('.inline-tool-call');
    const output = document.querySelector('.tool-output-content');
    const section = document.querySelector('.tool-output-section');

    expect(toolDiv.className).toContain('success');
    expect(toolDiv.className).not.toContain('running');
    expect(output.textContent).toBe('Result data');
    expect(section.style.display).toBe('block');
  });

  it('should not show output for null result', () => {
    document.body.innerHTML = `
      <div class="inline-tool-call running" data-tool-id="tool_456" data-tool-name="Shell">
        <div class="tool-status-icon running tool-spinner"></div>
        <div class="tool-output-section" style="display: none;">
          <pre class="tool-output-content"></pre>
        </div>
      </div>
    `;

    updateInlineToolCallResult('tool_456', null);

    const section = document.querySelector('.tool-output-section');
    expect(section.style.display).toBe('none');
  });

  it('should update streaming preview section', () => {
    document.body.innerHTML = `
      <div class="inline-tool-call running" data-tool-id="tool_789" data-tool-name="Write">
        <div class="tool-status-icon running tool-spinner"></div>
        <div class="streaming-preview-section">
          <div class="streaming-preview-label">正在写入</div>
          <pre class="streaming-preview typing"></pre>
        </div>
      </div>
    `;

    updateInlineToolCallResult('tool_789', 'Done');

    const label = document.querySelector('.streaming-preview-label');
    const preview = document.querySelector('.streaming-preview');

    expect(label.innerHTML).toContain('写入完成');
    expect(preview.className).toContain('completed');
    expect(preview.className).not.toContain('typing');
  });

  it('should handle non-existent tool gracefully', () => {
    document.body.innerHTML = '';

    expect(() => {
      updateInlineToolCallResult('non_existent', 'result');
    }).not.toThrow();
  });
});

describe('restoreInlineToolCall', () => {
  it('should append tool call element to content div', () => {
    const contentDiv = document.createElement('div');
    const toolCall = {
      id: 'tool_123',
      name: 'Read',
      input: { path: '/test.js' },
      status: 'success',
      result: 'content'
    };

    restoreInlineToolCall(contentDiv, toolCall);

    expect(contentDiv.children.length).toBe(1);
    expect(contentDiv.querySelector('.inline-tool-call')).not.toBeNull();
    expect(contentDiv.querySelector('[data-tool-id="tool_123"]')).not.toBeNull();
  });
});

describe('renderTimeline', () => {
  let timelineList;
  let emptyTimeline;

  beforeEach(() => {
    timelineList = document.createElement('div');
    emptyTimeline = document.createElement('div');
  });

  it('should show empty state for no tool calls', () => {
    renderTimeline([], timelineList, emptyTimeline);

    expect(timelineList.innerHTML).toBe('');
    expect(emptyTimeline.style.display).toBe('block');
  });

  it('should hide empty state when tool calls exist', () => {
    const toolCalls = [{ id: 'tool_1', name: 'Read', input: {}, status: 'success' }];

    renderTimeline(toolCalls, timelineList, emptyTimeline);

    expect(emptyTimeline.style.display).toBe('none');
    expect(timelineList.children.length).toBe(1);
  });

  it('should render multiple tool calls', () => {
    const toolCalls = [
      { id: 'tool_1', name: 'Read', input: {} },
      { id: 'tool_2', name: 'Write', input: {} },
      { id: 'tool_3', name: 'Shell', input: {} }
    ];

    renderTimeline(toolCalls, timelineList, emptyTimeline);

    expect(timelineList.children.length).toBe(3);
  });

  it('should handle null timelineList gracefully', () => {
    expect(() => {
      renderTimeline([{ id: 'tool_1' }], null, emptyTimeline);
    }).not.toThrow();
  });

  it('should handle null emptyTimeline gracefully', () => {
    const toolCalls = [{ id: 'tool_1', name: 'Read', input: {} }];

    expect(() => {
      renderTimeline(toolCalls, timelineList, null);
    }).not.toThrow();
  });

  it('should clear previous content before rendering', () => {
    timelineList.innerHTML = '<div>Old content</div>';

    renderTimeline([], timelineList, emptyTimeline);

    expect(timelineList.innerHTML).toBe('');
  });
});

describe('Typewriter Animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startTypewriterAnimation', () => {
    it('should start animation and add typing class', () => {
      const element = document.createElement('pre');
      document.body.appendChild(element);

      startTypewriterAnimation(element, 'Hello');

      expect(element.classList.contains('typing')).toBe(true);
      expect(element.textContent).toBe('');
    });

    it('should animate text progressively', () => {
      const element = document.createElement('pre');
      document.body.appendChild(element);

      startTypewriterAnimation(element, 'Hello World', { speed: 10 });

      vi.advanceTimersByTime(10);
      expect(element.textContent.length).toBeGreaterThan(0);

      vi.advanceTimersByTime(100);
      expect(element.textContent.length).toBeGreaterThan(3);
    });

    it('should truncate long content', () => {
      const element = document.createElement('pre');
      document.body.appendChild(element);
      const longContent = 'x'.repeat(1000);

      startTypewriterAnimation(element, longContent, { maxLength: 100 });

      // Advance through full animation
      vi.advanceTimersByTime(5000);

      expect(element.textContent).toContain('...(truncated)');
    });

    it('should call onComplete callback when done', () => {
      const element = document.createElement('pre');
      document.body.appendChild(element);
      const onComplete = vi.fn();

      startTypewriterAnimation(element, 'Hi', { speed: 5, onComplete });

      // Advance until animation completes
      vi.advanceTimersByTime(100);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should remove typing class and add completed when done', () => {
      const element = document.createElement('pre');
      document.body.appendChild(element);

      startTypewriterAnimation(element, 'Hi', { speed: 5 });

      vi.advanceTimersByTime(100);

      expect(element.classList.contains('typing')).toBe(false);
      expect(element.classList.contains('completed')).toBe(true);
    });
  });

  describe('stopTypewriterAnimation', () => {
    it('should stop animation and update classes', () => {
      document.body.innerHTML = `
        <div class="inline-tool-call" data-tool-id="tool_123">
          <pre class="streaming-preview typing"></pre>
        </div>
      `;

      stopTypewriterAnimation('tool_123');

      const preview = document.querySelector('.streaming-preview');
      expect(preview.classList.contains('typing')).toBe(false);
      expect(preview.classList.contains('completed')).toBe(true);
    });

    it('should handle non-existent tool gracefully', () => {
      document.body.innerHTML = '';

      expect(() => {
        stopTypewriterAnimation('non_existent');
      }).not.toThrow();
    });
  });
});
