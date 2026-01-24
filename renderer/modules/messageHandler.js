/**
 * 消息处理模块
 * 负责用户消息和助手消息的创建、更新和管理
 */

import { buildLoadingIndicatorHTML, buildMessageActionsHTML } from '../uiHelpers.js';

/**
 * 添加用户消息到聊天容器
 * @param {HTMLElement} container - 消息容器
 * @param {string} text - 消息文本
 * @returns {HTMLElement} 创建的消息元素
 */
export function addUserMessage(container, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;

  messageDiv.appendChild(contentDiv);
  container.appendChild(messageDiv);
  scrollToBottom(container);

  return messageDiv;
}

/**
 * 创建助手消息（带加载状态）
 * @param {HTMLElement} container - 消息容器
 * @returns {HTMLElement} 创建的消息元素
 */
export function createAssistantMessage(container) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  // 使用 uiHelpers 中的加载指示器
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-indicator';
  loadingDiv.innerHTML = buildLoadingIndicatorHTML();

  contentDiv.appendChild(loadingDiv);

  // 使用 uiHelpers 中的消息操作按钮
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions hidden';
  actionsDiv.innerHTML = buildMessageActionsHTML();

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(actionsDiv);
  container.appendChild(messageDiv);
  scrollToBottom(container);

  return messageDiv;
}

/**
 * 移除加载指示器
 * @param {HTMLElement} contentDiv - 消息内容容器
 */
export function removeLoadingIndicator(contentDiv) {
  const loadingIndicator = contentDiv.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

/**
 * 显示消息操作按钮
 * @param {HTMLElement} messageDiv - 消息元素
 */
export function showMessageActions(messageDiv) {
  const actionsDiv = messageDiv.querySelector('.message-actions');
  if (actionsDiv) {
    actionsDiv.classList.remove('hidden');
  }
}

/**
 * 更新生成状态文本
 * @param {HTMLElement} assistantMessage - 助手消息容器
 * @param {string} text - 状态文本
 */
export function updateGenerationStatus(assistantMessage, text) {
  let statusDiv = assistantMessage.querySelector('.generation-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.className = 'generation-status';
    statusDiv.innerHTML = '<div class="status-dot"></div><span class="status-text"></span>';
    // 插入在 message-content 之后
    const contentDiv = assistantMessage.querySelector('.message-content');
    contentDiv.after(statusDiv);
  }

  const statusTextEl = statusDiv.querySelector('.status-text');
  if (statusTextEl) {
    statusTextEl.textContent = text;
  }
}

/**
 * 移除生成状态
 * @param {HTMLElement} assistantMessage - 助手消息容器
 */
export function removeGenerationStatus(assistantMessage) {
  const statusDiv = assistantMessage.querySelector('.generation-status');
  if (statusDiv) {
    statusDiv.remove();
  }
}

/**
 * 滚动到容器底部
 * @param {HTMLElement} container - 滚动容器
 */
export function scrollToBottom(container) {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * 复制消息内容到剪贴板
 * @param {HTMLButtonElement} button - 触发按钮
 * @returns {Promise<boolean>} 是否成功
 */
export async function copyMessage(button) {
  const messageDiv = button.closest('.message');
  const contentDiv = messageDiv.querySelector('.message-content');
  const text = contentDiv.dataset.rawContent || contentDiv.textContent;

  try {
    await navigator.clipboard.writeText(text);
    button.style.color = '#27ae60';
    setTimeout(() => {
      button.style.color = '';
    }, 1000);
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

/**
 * 获取对话历史
 * @param {HTMLElement} container - 消息容器
 * @returns {Array} 对话历史数组
 */
export function getConversationHistory(container) {
  const messages = Array.from(container.children);
  const history = [];

  // 跳过最后一条消息（当前助手加载状态）
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const contentDiv = msg.querySelector('.message-content');
    if (!contentDiv) {
      continue;
    }

    const content = contentDiv.dataset.rawContent || contentDiv.textContent || '';
    if (!content.trim()) {
      continue;
    }

    if (msg.classList.contains('user')) {
      history.push({ role: 'user', content });
    } else if (msg.classList.contains('assistant')) {
      history.push({ role: 'assistant', content });
    }
  }

  return history;
}

/**
 * 从消息容器提取消息数据（用于保存）
 * @param {HTMLElement} container - 消息容器
 * @returns {Array} 消息数据数组
 */
export function extractMessagesData(container) {
  return Array.from(container.children).map(msg => ({
    class: msg.className,
    content:
      msg.querySelector('.message-content')?.dataset.rawContent ||
      msg.querySelector('.message-content')?.textContent ||
      ''
  }));
}

/**
 * 恢复消息到容器（用于加载聊天历史）
 * @param {HTMLElement} container - 消息容器
 * @param {Array} messages - 消息数据数组
 * @param {Function} renderMarkdown - Markdown 渲染函数
 * @returns {HTMLElement|null} 最后一个助手消息的 contentDiv
 */
export function restoreMessages(container, messages, renderMarkdown) {
  container.innerHTML = '';
  let lastAssistantContentDiv = null;

  (messages || []).forEach(msgData => {
    const messageDiv = document.createElement('div');
    messageDiv.className = msgData.class;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.dataset.rawContent = msgData.content;

    if (msgData.class.includes('user')) {
      contentDiv.textContent = msgData.content;
    } else if (msgData.class.includes('assistant')) {
      renderMarkdown(contentDiv);
      lastAssistantContentDiv = contentDiv;
    }

    messageDiv.appendChild(contentDiv);

    if (msgData.class.includes('assistant')) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      actionsDiv.innerHTML = `
        <button class="action-btn" title="Copy" onclick="copyMessage(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      `;
      messageDiv.appendChild(actionsDiv);
    }

    container.appendChild(messageDiv);
  });

  return lastAssistantContentDiv;
}
