/**
 * 工具调用管理模块
 * 管理工具调用的显示、状态更新和动画效果
 */

import { escapeHtml, escapeHtmlPure, formatToolPreview, calculateDiffStats } from '../utils.js';
import {
  buildInlineToolCallHTML,
  buildSidebarToolCallHTML,
  buildDiffStatsHTML
} from '../uiHelpers.js';
import { logInlineToolUpdate, logStreamableContent } from './logger.js';

// Store active typewriter animations for cleanup
const activeTypewriters = new Map();

/**
 * 创建工具调用对象
 * @param {string} name - 工具名称
 * @param {Object} input - 工具输入
 * @param {string} status - 初始状态
 * @returns {Object} 工具调用对象
 */
export function createToolCallData(name, input, status = 'running') {
  const id = 'tool_' + Date.now();
  return { id, name, input, status, result: null };
}

/**
 * 渲染侧边栏工具调用项
 * @param {Object} toolCall - 工具调用对象
 * @returns {HTMLElement} 工具调用 DOM 元素
 */
export function createSidebarToolCallElement(toolCall) {
  const { id, name, input, status } = toolCall;
  const toolDiv = document.createElement('div');
  toolDiv.className = 'tool-call-item expanded';
  toolDiv.dataset.toolId = id;

  toolDiv.innerHTML = `
    <div class="tool-call-header" onclick="toggleToolCall(this)">
      <div class="tool-call-icon ${status}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      </div>
      <div class="tool-call-info">
        <div class="tool-call-name">${name}</div>
        <div class="tool-call-status">${status === 'running' ? 'Running...' : 'Completed'}</div>
      </div>
      <div class="tool-call-expand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
    <div class="tool-call-details">
      <div class="tool-detail-section">
        <div class="tool-detail-label">Input</div>
        <pre>${escapeHtmlPure(JSON.stringify(input, null, 2))}</pre>
      </div>
      <div class="tool-detail-section tool-output-section" style="display: none;">
        <div class="tool-detail-label">Output</div>
        <pre class="sidebar-tool-output"></pre>
      </div>
    </div>
  `;

  return toolDiv;
}

/**
 * 更新侧边栏工具调用状态
 * @param {string} toolId - 工具 ID
 * @param {string} status - 新状态
 */
export function updateSidebarToolCallStatus(toolId, status) {
  const toolDiv = document.querySelector(`.tool-call-item[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const icon = toolDiv.querySelector('.tool-call-icon');
    const statusText = toolDiv.querySelector('.tool-call-status');

    icon.className = `tool-call-icon ${status}`;
    statusText.textContent =
      status === 'success' ? 'Completed' : status === 'error' ? 'Failed' : 'Running...';
  }
}

/**
 * 更新侧边栏工具调用结果
 * @param {string} toolId - 工具 ID
 * @param {*} result - 执行结果
 */
export function updateSidebarToolCallResult(toolId, result) {
  const toolDiv = document.querySelector(`.tool-call-item[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const outputSection = toolDiv.querySelector('.tool-output-section');
    const outputContent = toolDiv.querySelector('.sidebar-tool-output');
    if (outputSection && outputContent) {
      const resultStr =
        typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      outputContent.textContent =
        resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
      outputSection.style.display = 'block';
    }
  }
}

/**
 * 创建内联工具调用元素
 * @param {string} toolName - 工具名称
 * @param {Object} toolInput - 工具输入
 * @param {string} toolId - 工具 ID
 * @returns {HTMLElement} 内联工具调用 DOM 元素
 */
export function createInlineToolCallElement(toolName, toolInput, toolId) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call expanded running';
  toolDiv.dataset.toolId = toolId;
  toolDiv.dataset.toolName = toolName;

  const inputPreview = formatToolPreview(toolInput);
  const inputStr = JSON.stringify(toolInput, null, 2);

  // Store diff stats for later display
  const diffStats = calculateDiffStats(toolName, toolInput);
  if (diffStats) {
    toolDiv.dataset.diffStats = JSON.stringify(diffStats);
  }

  // Check if this tool has streamable content
  const streamableContent = getStreamableContent(toolName, toolInput);
  const hasStreamableContent = streamableContent && streamableContent.length > 0;

  // Spinner SVG for running state
  const spinnerIcon = `
    <svg class="tool-status-icon running tool-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
    </svg>`;

  // Streaming preview section
  const isWriteOperation = ['Write', 'StrReplace', 'Edit'].includes(toolName);
  const isBashEcho = (toolName === 'Shell' || toolName === 'Bash') && hasStreamableContent;
  const streamingLabel = isWriteOperation ? '正在写入' : isBashEcho ? '正在输出' : '执行中';

  const streamingPreviewHtml = hasStreamableContent
    ? `
    <div class="streaming-preview-section">
      <div class="streaming-preview-label">
        ${streamingLabel}
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
      <pre class="streaming-preview typing"></pre>
    </div>
  `
    : '';

  toolDiv.innerHTML = `
    <div class="inline-tool-header" onclick="toggleInlineToolCall(this)">
      ${spinnerIcon}
      <span class="tool-name">${escapeHtml(toolName)}</span>
      <span class="tool-preview">${escapeHtml(inputPreview)}</span>
      <div class="diff-stats-container"></div>
      <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <div class="inline-tool-result">
      ${streamingPreviewHtml}
      <div class="tool-section">
        <div class="tool-section-label">Input</div>
        <pre>${escapeHtmlPure(inputStr)}</pre>
      </div>
      <div class="tool-section tool-output-section" style="display: none;">
        <div class="tool-section-label">Output</div>
        <pre class="tool-output-content"></pre>
      </div>
    </div>
  `;

  // Start typewriter animation if there's streamable content
  if (hasStreamableContent) {
    const previewElement = toolDiv.querySelector('.streaming-preview');
    if (previewElement) {
      const timer = startTypewriterAnimation(previewElement, streamableContent, {
        speed: 8,
        maxLength: 600
      });
      activeTypewriters.set(toolId, timer);
    }
  }

  return toolDiv;
}

/**
 * 更新内联工具调用结果
 * @param {string} toolId - 工具 ID
 * @param {*} result - 执行结果
 */
export function updateInlineToolCallResult(toolId, result) {
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  logInlineToolUpdate(toolId, !!toolDiv, toolDiv?.dataset?.toolName);

  if (toolDiv) {
    // Stop typewriter animation
    stopTypewriterAnimation(toolId);

    // Update streaming preview section
    const streamingSection = toolDiv.querySelector('.streaming-preview-section');
    if (streamingSection) {
      const label = streamingSection.querySelector('.streaming-preview-label');
      if (label) {
        const storedToolName = toolDiv.dataset.toolName;
        const isWriteOp = ['Write', 'StrReplace', 'Edit'].includes(storedToolName);
        const completionLabel = isWriteOp ? '写入完成' : '执行完成';
        label.innerHTML = `${completionLabel} <span style="color: #22c55e;">✓</span>`;
      }
      const preview = streamingSection.querySelector('.streaming-preview');
      if (preview) {
        preview.classList.remove('typing');
        preview.classList.add('completed');
      }
    }

    // Update output content (only if result is not null/undefined)
    if (result !== null && result !== undefined) {
      const outputSection = toolDiv.querySelector('.tool-output-section');
      const outputContent = toolDiv.querySelector('.tool-output-content');
      if (outputSection && outputContent) {
        const resultStr =
          typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        outputContent.textContent =
          resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
        outputSection.style.display = 'block';
      }
    }

    // Update status: running -> success
    toolDiv.classList.remove('running');
    toolDiv.classList.add('success');

    // Replace spinner with success checkmark
    const statusIcon = toolDiv.querySelector('.tool-status-icon');
    if (statusIcon) {
      statusIcon.classList.remove('running', 'tool-spinner');
      statusIcon.classList.add('success');
      statusIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    }

    // Display diff stats
    const diffStatsContainer = toolDiv.querySelector('.diff-stats-container');
    const diffStatsData = toolDiv.dataset.diffStats;
    if (diffStatsContainer && diffStatsData) {
      try {
        const stats = JSON.parse(diffStatsData);
        diffStatsContainer.innerHTML = buildDiffStatsHTML(stats);
      } catch (e) {
        // Silent fail on parse error
      }
    }
  }
}

/**
 * 恢复保存的内联工具调用（用于加载聊天历史）
 * @param {HTMLElement} contentDiv - 内容容器
 * @param {Object} toolCall - 工具调用数据
 */
export function restoreInlineToolCall(contentDiv, toolCall) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call';
  toolDiv.dataset.toolId = toolCall.id;

  toolDiv.innerHTML = buildInlineToolCallHTML(
    toolCall.name,
    toolCall.input,
    toolCall.id,
    toolCall.status,
    toolCall.result
  );

  contentDiv.appendChild(toolDiv);
}

/**
 * 渲染时间线（右侧边栏工具调用列表）
 * @param {Array} toolCalls - 工具调用列表
 * @param {HTMLElement} timelineList - 时间线容器
 * @param {HTMLElement} emptyTimeline - 空状态元素
 */
export function renderTimeline(toolCalls, timelineList, emptyTimeline) {
  if (!timelineList) {
    return;
  }

  timelineList.innerHTML = '';

  if (toolCalls.length === 0) {
    if (emptyTimeline) {
      emptyTimeline.style.display = 'block';
    }
    return;
  }

  if (emptyTimeline) {
    emptyTimeline.style.display = 'none';
  }

  toolCalls.forEach(tc => {
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-call-item';
    toolDiv.dataset.toolId = tc.id;
    toolDiv.innerHTML = buildSidebarToolCallHTML(tc);
    timelineList.appendChild(toolDiv);
  });
}

// ==================== TYPEWRITER ANIMATION ====================

/**
 * Start typewriter animation for streaming preview
 * @param {HTMLElement} element - Target element to display text
 * @param {string} content - Content to display
 * @param {object} options - Animation options
 * @returns {number} Timer ID for cleanup
 */
export function startTypewriterAnimation(element, content, options = {}) {
  const { speed = 5, maxLength = 500, onComplete = null } = options;

  const displayContent =
    content.length > maxLength ? content.substring(0, maxLength) + '\n...(truncated)' : content;

  let index = 0;
  element.textContent = '';
  element.classList.add('typing');
  element.classList.remove('completed');

  const timer = setInterval(() => {
    if (index < displayContent.length) {
      const charsPerTick = Math.min(3, displayContent.length - index);
      element.textContent += displayContent.substring(index, index + charsPerTick);
      index += charsPerTick;
      element.scrollTop = element.scrollHeight;
    } else {
      clearInterval(timer);
      element.classList.remove('typing');
      element.classList.add('completed');
      if (onComplete) {
        onComplete();
      }
    }
  }, speed);

  return timer;
}

/**
 * Stop typewriter animation
 * @param {string} toolId - Tool ID to stop animation for
 */
export function stopTypewriterAnimation(toolId) {
  const timer = activeTypewriters.get(toolId);
  if (timer) {
    clearInterval(timer);
    activeTypewriters.delete(toolId);
  }

  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  if (toolDiv) {
    const preview = toolDiv.querySelector('.streaming-preview');
    if (preview) {
      preview.classList.remove('typing');
      preview.classList.add('completed');
    }
  }
}

// ==================== STREAMABLE CONTENT EXTRACTION ====================

/**
 * Extract streamable content from tool input
 * @param {string} toolName - Name of the tool
 * @param {object} toolInput - Tool input parameters
 * @returns {string|null} Content to stream or null
 */
export function getStreamableContent(toolName, toolInput) {
  if (!toolInput) {
    return null;
  }

  // Write tool - show file content
  if (toolName === 'Write') {
    return toolInput.contents || toolInput.content || null;
  }

  // StrReplace/Edit - show new content
  if (toolName === 'StrReplace' || toolName === 'Edit') {
    return toolInput.new_string || null;
  }

  // Shell/Bash - extract echo content for better UX
  if (toolName === 'Shell' || toolName === 'Bash') {
    const command = toolInput.command || '';

    // Pattern 1: printf format
    const printfMatch = command.match(/printf\s+['"]([^'"\\]+)(?:\\n)?['"]/);
    const printfCountMatch = command.match(/\{1\.\.(\d+)\}/);
    if (printfMatch && printfCountMatch) {
      const content = printfMatch[1];
      const repeatCount = parseInt(printfCountMatch[1], 10);
      const lines = [];
      for (let i = 1; i <= Math.min(repeatCount, 30); i++) {
        lines.push(`[${i}/${repeatCount}] ${content}`);
      }
      logStreamableContent('printf loop', { content, repeatCount });
      return lines.join('\n');
    }

    // Pattern 2: for loop
    const forLoopMatch = command.match(
      /for\s+\w+\s+in\s+\{1\.\.(\d+)\}[^"']*echo\s+["']([^"']+)["']/
    );
    if (forLoopMatch) {
      const repeatCount = parseInt(forLoopMatch[1], 10);
      const content = forLoopMatch[2];
      const lines = [];
      for (let i = 1; i <= Math.min(repeatCount, 30); i++) {
        lines.push(`[${i}/${repeatCount}] ${content}`);
      }
      logStreamableContent('for-loop echo', { content, repeatCount });
      return lines.join('\n');
    }

    // Pattern 3: simple echo
    const echoMatch = command.match(/echo\s+["']([^"']+)["']\s*>>/);
    if (echoMatch) {
      const content = echoMatch[1];
      logStreamableContent('simple echo', { content });
      return content;
    }

    logStreamableContent('no echo', { toolName, command: command.substring(0, 200) });
    return null;
  }

  return null;
}
