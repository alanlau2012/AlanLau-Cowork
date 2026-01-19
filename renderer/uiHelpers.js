/**
 * UI Helpers - UI 操作逻辑模块
 * 提供可测试的 UI 相关纯函数
 */

import { escapeHtmlPure, formatToolPreview, getToolDescription } from './utils.js';

/**
 * 计算文本框高度
 * @param {number} scrollHeight - 内容滚动高度
 * @param {number} maxHeight - 最大高度
 * @returns {object} { height, hasScroll }
 */
export function calculateTextareaHeight(scrollHeight, maxHeight = 200) {
  const height = Math.min(scrollHeight, maxHeight);
  const hasScroll = scrollHeight > maxHeight;
  return { height, hasScroll };
}

/**
 * 创建 Toast 配置
 * @param {string} type - Toast 类型 ('success' | 'error' | 'info')
 * @returns {object} { icon, color }
 */
export function createToastConfig(type) {
  switch (type) {
    case 'success':
      return { icon: '✓', color: '#10b981' };
    case 'error':
      return { icon: '✕', color: '#ef4444' };
    case 'info':
    default:
      return { icon: 'ℹ', color: '#3b82f6' };
  }
}

/**
 * 构建内联工具调用 HTML
 * @param {string} toolName - 工具名称
 * @param {object} toolInput - 工具输入
 * @param {string} toolId - 工具 ID
 * @param {string} status - 状态
 * @param {*} result - 结果（可选）
 * @returns {string} HTML 字符串
 */
export function buildInlineToolCallHTML(
  toolName,
  toolInput,
  toolId,
  status = 'running',
  result = null
) {
  const inputPreview = formatToolPreview(toolInput);
  const inputStr = JSON.stringify(toolInput, null, 2);

  let resultHtml = '';
  if (result !== null && result !== undefined) {
    const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    const truncatedResult = resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
    resultHtml = `
      <div class="tool-section tool-output-section">
        <div class="tool-section-label">Output</div>
        <pre class="tool-output-content">${escapeHtmlPure(truncatedResult)}</pre>
      </div>`;
  } else {
    resultHtml = `
      <div class="tool-section tool-output-section" style="display: none;">
        <div class="tool-section-label">Output</div>
        <pre class="tool-output-content"></pre>
      </div>`;
  }

  const statusBadge = status === 'success' ? '✓' : status === 'error' ? '✕' : '...';

  return `
    <div class="inline-tool-header" onclick="toggleInlineToolCall(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
      <span class="tool-name">${escapeHtmlPure(toolName)}</span>
      <span class="tool-preview">${escapeHtmlPure(inputPreview)}</span>
      <span class="tool-status-badge ${status}">${statusBadge}</span>
      <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    <div class="inline-tool-result">
      <div class="tool-section">
        <div class="tool-section-label">Input</div>
        <pre>${escapeHtmlPure(inputStr)}</pre>
      </div>
      ${resultHtml}
    </div>
  `;
}

/**
 * 构建侧边栏工具调用项 HTML
 * @param {object} toolCall - 工具调用对象
 * @returns {string} HTML 字符串
 */
export function buildSidebarToolCallHTML(toolCall) {
  const { name, input, status, result } = toolCall;

  let resultHtml = '';
  if (result !== null && result !== undefined) {
    const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    const truncatedResult = resultStr.substring(0, 2000) + (resultStr.length > 2000 ? '...' : '');
    resultHtml = `
      <div class="tool-detail-section tool-output-section">
        <div class="tool-detail-label">Output</div>
        <pre class="sidebar-tool-output">${escapeHtmlPure(truncatedResult)}</pre>
      </div>`;
  } else {
    resultHtml = `
      <div class="tool-detail-section tool-output-section" style="display: none;">
        <div class="tool-detail-label">Output</div>
        <pre class="sidebar-tool-output"></pre>
      </div>`;
  }

  const statusText =
    status === 'success' ? 'Completed' : status === 'error' ? 'Failed' : 'Running...';

  return `
    <div class="tool-call-header" onclick="toggleToolCall(this)">
      <div class="tool-call-icon ${status}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      </div>
      <div class="tool-call-info">
        <div class="tool-call-name">${escapeHtmlPure(name)}</div>
        <div class="tool-call-status">${statusText}</div>
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
      ${resultHtml}
    </div>
  `;
}

/**
 * 构建聊天历史项 HTML
 * @param {object} chat - 聊天对象
 * @param {boolean} isActive - 是否为当前活动聊天
 * @returns {string} HTML 字符串
 */
export function buildChatItemHTML(chat, _isActive) {
  // _isActive is passed for potential future use but class is set by caller
  void _isActive;
  const title = chat.title || 'New chat';

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <span class="chat-item-title">${escapeHtmlPure(title)}</span>
    <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Delete">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
}

/**
 * 构建步骤项 HTML
 * @param {object} toolCall - 工具调用对象
 * @returns {string} HTML 字符串
 */
export function buildStepItemHTML(toolCall) {
  const { name, input, status } = toolCall;

  let statusIcon, statusClass;
  if (status === 'success') {
    statusClass = 'completed';
    statusIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (status === 'error') {
    statusClass = 'error';
    statusIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  } else {
    statusClass = 'in_progress';
    statusIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
  }

  const description = getToolDescription(name, input);
  const displayText = description ? `${name}: ${description}` : name;

  return `
    <div class="step-status ${statusClass}">${statusIcon}</div>
    <div class="step-content">
      <div class="step-text">${escapeHtmlPure(displayText)}</div>
    </div>
  `;
}

/**
 * 构建消息操作按钮 HTML
 * @returns {string} HTML 字符串
 */
export function buildMessageActionsHTML() {
  return `
    <button class="action-btn" title="Copy" onclick="copyMessage(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `;
}

/**
 * 构建加载指示器 HTML
 * @returns {string} HTML 字符串
 */
export function buildLoadingIndicatorHTML() {
  return `
    <svg class="loading-asterisk" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

/**
 * 构建错误重试 HTML
 * @param {string} errorMessage - 错误消息
 * @returns {string} HTML 字符串
 */
export function buildErrorRetryHTML(errorMessage) {
  return `
    <div class="message-error-content">
      <span class="message-error-icon">⚠</span>
      <span class="message-error-text">${escapeHtmlPure(errorMessage)}</span>
      <button class="message-error-retry">重新发送</button>
    </div>
  `;
}

/**
 * 构建附件文件项 HTML
 * @param {object} file - 文件对象 { name }
 * @param {number} index - 文件索引
 * @param {string} context - 上下文 ('home' | 'chat')
 * @returns {string} HTML 字符串
 */
export function buildAttachedFileHTML(file, index, context) {
  return `
    <div class="attached-file">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>${escapeHtmlPure(file.name)}</span>
      <svg class="remove-file" onclick="removeAttachedFile(${index}, '${context}')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `;
}

/**
 * 获取模板内容
 * @param {string} templateType - 模板类型
 * @returns {string|null} 模板内容或 null
 */
export function getTemplateContent(templateType) {
  const templates = {
    'folder-org':
      '请帮我整理文件夹结构。我需要你：\n1. 分析当前目录结构\n2. 识别冗余或重复文件\n3. 建议合理的目录组织方案\n\n[描述你的文件夹路径或当前问题]',
    'data-analysis':
      '请帮我进行数据分析。我需要你：\n1. 读取和处理数据文件\n2. 统计关键指标\n3. 生成分析报告或可视化\n\n[描述你的数据源和分析需求]',
    'batch-file':
      '请帮我批量处理文件。我需要你：\n1. 执行批量重命名操作\n2. 移动或复制文件到指定目录\n3. 按规则分类整理文件\n\n[描述批量处理的具体需求]'
  };

  return templates[templateType] || null;
}

/**
 * 判断搜索是否匹配
 * @param {string} text - 要搜索的文本
 * @param {string} query - 搜索查询
 * @returns {boolean} 是否匹配
 */
export function matchesSearch(text, query) {
  if (!query || !query.trim()) {
    return true;
  }
  if (!text) {
    return false;
  }
  return text.toLowerCase().includes(query.toLowerCase().trim());
}
