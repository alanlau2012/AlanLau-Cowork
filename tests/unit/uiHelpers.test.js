/**
 * Unit tests for uiHelpers module
 */

import { describe, it, expect } from 'vitest';
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
  buildAttachedFileHTML,
  getTemplateContent,
  matchesSearch
} from '../../renderer/uiHelpers.js';

describe('calculateTextareaHeight', () => {
  it('should return scrollHeight when below max', () => {
    const result = calculateTextareaHeight(100, 200);

    expect(result.height).toBe(100);
    expect(result.hasScroll).toBe(false);
  });

  it('should cap at maxHeight when exceeded', () => {
    const result = calculateTextareaHeight(300, 200);

    expect(result.height).toBe(200);
    expect(result.hasScroll).toBe(true);
  });

  it('should use default maxHeight of 200', () => {
    const result = calculateTextareaHeight(150);

    expect(result.height).toBe(150);
    expect(result.hasScroll).toBe(false);
  });
});

describe('createToastConfig', () => {
  it('should return success config', () => {
    const config = createToastConfig('success');

    expect(config.icon).toBe('✓');
    expect(config.color).toBe('#10b981');
  });

  it('should return error config', () => {
    const config = createToastConfig('error');

    expect(config.icon).toBe('✕');
    expect(config.color).toBe('#ef4444');
  });

  it('should return info config for info type', () => {
    const config = createToastConfig('info');

    expect(config.icon).toBe('ℹ');
    expect(config.color).toBe('#3b82f6');
  });

  it('should default to info for unknown type', () => {
    const config = createToastConfig('unknown');

    expect(config.icon).toBe('ℹ');
    expect(config.color).toBe('#3b82f6');
  });
});

describe('buildInlineToolCallHTML', () => {
  it('should build HTML with tool name and input', () => {
    const html = buildInlineToolCallHTML('Read', { path: '/test' }, 'tool_123');

    expect(html).toContain('Read');
    expect(html).toContain('path');
    expect(html).toContain('/test');
  });

  it('should include status badge', () => {
    const runningHtml = buildInlineToolCallHTML('Read', {}, 'tool_123', 'running');
    const successHtml = buildInlineToolCallHTML('Read', {}, 'tool_123', 'success');
    const errorHtml = buildInlineToolCallHTML('Read', {}, 'tool_123', 'error');

    expect(runningHtml).toContain('...');
    expect(successHtml).toContain('✓');
    expect(errorHtml).toContain('✕');
  });

  it('should include result when provided', () => {
    const html = buildInlineToolCallHTML('Read', {}, 'tool_123', 'success', {
      content: 'file content'
    });

    expect(html).toContain('Output');
    expect(html).toContain('file content');
  });

  it('should hide output section when no result', () => {
    const html = buildInlineToolCallHTML('Read', {}, 'tool_123', 'running', null);

    expect(html).toContain('style="display: none;"');
  });
});

describe('buildSidebarToolCallHTML', () => {
  it('should build HTML with tool call data', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Bash',
      input: { command: 'ls -la' },
      status: 'success',
      result: 'file list'
    };

    const html = buildSidebarToolCallHTML(toolCall);

    expect(html).toContain('Bash');
    expect(html).toContain('command');
    expect(html).toContain('ls -la');
    expect(html).toContain('Completed');
  });

  it('should show Running status', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Read',
      input: {},
      status: 'running',
      result: null
    };

    const html = buildSidebarToolCallHTML(toolCall);

    expect(html).toContain('Running...');
  });

  it('should show Failed status', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Write',
      input: {},
      status: 'error',
      result: null
    };

    const html = buildSidebarToolCallHTML(toolCall);

    expect(html).toContain('Failed');
  });
});

describe('buildChatItemHTML', () => {
  it('should build chat item HTML', () => {
    const chat = { id: 'chat_123', title: 'Test Chat' };

    const html = buildChatItemHTML(chat, false);

    expect(html).toContain('Test Chat');
    expect(html).toContain('chat_123');
    expect(html).toContain('delete-chat-btn');
  });

  it('should use default title if not provided', () => {
    const chat = { id: 'chat_123' };

    const html = buildChatItemHTML(chat, false);

    expect(html).toContain('New chat');
  });

  it('should escape HTML in title', () => {
    const chat = { id: 'chat_123', title: '<script>alert("xss")</script>' };

    const html = buildChatItemHTML(chat, false);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('buildStepItemHTML', () => {
  it('should build completed step HTML', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Read',
      input: { path: '/test.js' },
      status: 'success'
    };

    const html = buildStepItemHTML(toolCall);

    expect(html).toContain('completed');
    expect(html).toContain('Read');
    expect(html).toContain('test.js');
  });

  it('should build error step HTML', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Write',
      input: {},
      status: 'error'
    };

    const html = buildStepItemHTML(toolCall);

    expect(html).toContain('error');
  });

  it('should build in-progress step HTML', () => {
    const toolCall = {
      id: 'tool_123',
      name: 'Bash',
      input: { command: 'npm install' },
      status: 'running'
    };

    const html = buildStepItemHTML(toolCall);

    expect(html).toContain('in_progress');
  });
});

describe('buildMessageActionsHTML', () => {
  it('should return copy button HTML', () => {
    const html = buildMessageActionsHTML();

    expect(html).toContain('action-btn');
    expect(html).toContain('Copy');
    expect(html).toContain('copyMessage');
  });
});

describe('buildLoadingIndicatorHTML', () => {
  it('should return loading SVG', () => {
    const html = buildLoadingIndicatorHTML();

    expect(html).toContain('loading-asterisk');
    expect(html).toContain('svg');
  });
});

describe('buildErrorRetryHTML', () => {
  it('should include error message', () => {
    const html = buildErrorRetryHTML('Network error');

    expect(html).toContain('Network error');
    expect(html).toContain('message-error-retry');
    expect(html).toContain('重新发送');
  });

  it('should escape HTML in error message', () => {
    const html = buildErrorRetryHTML('<script>alert("xss")</script>');

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });
});

describe('buildAttachedFileHTML', () => {
  it('should build file attachment HTML', () => {
    const file = { name: 'document.pdf' };

    const html = buildAttachedFileHTML(file, 0, 'home');

    expect(html).toContain('document.pdf');
    expect(html).toContain('attached-file');
    expect(html).toContain("removeAttachedFile(0, 'home')");
  });

  it('should escape HTML in filename', () => {
    const file = { name: '<script>.txt' };

    const html = buildAttachedFileHTML(file, 0, 'chat');

    expect(html).toContain('&lt;script&gt;');
  });
});

describe('getTemplateContent', () => {
  it('should return config-translate template', () => {
    const content = getTemplateContent('config-translate');

    expect(content).toContain('跨厂商配置翻译');
    expect(content).toContain('华为设备脚本');
  });

  it('should return lld-calibration template', () => {
    const content = getTemplateContent('lld-calibration');

    expect(content).toContain('LLD与现网数据校准');
    expect(content).toContain('资源分配差异');
  });

  it('should return pac-review template', () => {
    const content = getTemplateContent('pac-review');

    expect(content).toContain('审核验收交付件');
    expect(content).toContain('验收标准');
  });

  it('should return fault-evidence template', () => {
    const content = getTemplateContent('fault-evidence');

    expect(content).toContain('梳理故障证据链');
    expect(content).toContain('故障时间轴');
  });

  it('should return soc-response template', () => {
    const content = getTemplateContent('soc-response');

    expect(content).toContain('应答技术规范书要求');
    expect(content).toContain('SOC技术需求');
  });

  it('should return subcon-audit template', () => {
    const content = getTemplateContent('subcon-audit');

    expect(content).toContain('审计分包商作业质量');
    expect(content).toContain('操作日志');
  });

  it('should return null for unknown template', () => {
    expect(getTemplateContent('unknown')).toBeNull();
    expect(getTemplateContent(null)).toBeNull();
  });
});

describe('matchesSearch', () => {
  it('should return true when text contains query', () => {
    expect(matchesSearch('Hello World', 'world')).toBe(true);
    expect(matchesSearch('Test Case', 'TEST')).toBe(true);
  });

  it('should return false when text does not contain query', () => {
    expect(matchesSearch('Hello World', 'foo')).toBe(false);
  });

  it('should return true for empty query', () => {
    expect(matchesSearch('Hello', '')).toBe(true);
    expect(matchesSearch('Hello', '   ')).toBe(true);
    expect(matchesSearch('Hello', null)).toBe(true);
  });

  it('should return false for null text with query', () => {
    expect(matchesSearch(null, 'test')).toBe(false);
    expect(matchesSearch('', 'test')).toBe(false);
  });

  it('should handle partial matches', () => {
    expect(matchesSearch('JavaScript', 'java')).toBe(true);
    expect(matchesSearch('TypeScript', 'Script')).toBe(true);
  });
});
