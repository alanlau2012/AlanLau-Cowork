/**
 * 生成状态控制模块
 * 负责 AI 生成过程中的状态管理和 UI 控制
 */

import { showToast } from './feedback.js';

/**
 * 设置生成状态（显示/隐藏停止按钮）
 * @param {boolean} generating - 是否正在生成
 * @param {Object} elements - DOM 元素
 * @param {HTMLButtonElement} elements.homeStopBtn - 首页停止按钮
 * @param {HTMLButtonElement} elements.chatStopBtn - 聊天停止按钮
 * @param {HTMLButtonElement} elements.homeSendBtn - 首页发送按钮
 * @param {HTMLButtonElement} elements.chatSendBtn - 聊天发送按钮
 * @param {HTMLTextAreaElement} elements.homeInput - 首页输入框
 * @param {HTMLTextAreaElement} elements.messageInput - 聊天输入框
 * @param {HTMLElement} elements.homeView - 首页视图
 */
export function setGeneratingState(generating, elements) {
  const { homeStopBtn, chatStopBtn, homeSendBtn, chatSendBtn, homeInput, messageInput, homeView } =
    elements;

  if (generating) {
    // 显示停止按钮，隐藏发送按钮
    if (homeStopBtn) {
      homeStopBtn.style.display = 'flex';
    }
    if (chatStopBtn) {
      chatStopBtn.style.display = 'flex';
    }
    if (homeSendBtn) {
      homeSendBtn.style.display = 'none';
    }
    if (chatSendBtn) {
      chatSendBtn.style.display = 'none';
    }

    // 禁用输入框
    if (homeInput) {
      homeInput.disabled = true;
    }
    if (messageInput) {
      messageInput.disabled = true;
    }
  } else {
    // 显示发送按钮，隐藏停止按钮
    if (homeStopBtn) {
      homeStopBtn.style.display = 'none';
    }
    if (chatStopBtn) {
      chatStopBtn.style.display = 'none';
    }
    if (homeSendBtn) {
      homeSendBtn.style.display = 'flex';
    }
    if (chatSendBtn) {
      chatSendBtn.style.display = 'flex';
    }

    // 启用输入框
    if (homeInput) {
      homeInput.disabled = false;
    }
    if (messageInput) {
      messageInput.disabled = false;
    }

    // 聚焦到适当的输入框
    if (homeView && !homeView.classList.contains('hidden')) {
      if (homeInput) {
        homeInput.focus();
      }
    } else {
      if (messageInput) {
        messageInput.focus();
      }
    }
  }
}

/**
 * 处理停止生成
 * @param {string} requestId - 当前请求 ID
 * @param {Object} elements - DOM 元素
 * @param {Function} abortRequest - 中止请求函数
 * @returns {boolean} 是否成功停止
 */
export function handleStopGeneration(requestId, elements, abortRequest) {
  if (requestId) {
    console.log('Stopping generation:', requestId);
    abortRequest(requestId);
    showToast('Stopping generation...', 'info');
    setGeneratingState(false, elements);
    return true;
  }
  return false;
}

/**
 * 更新发送按钮状态
 * @param {HTMLTextAreaElement} input - 输入框
 * @param {HTMLButtonElement} button - 发送按钮
 * @param {boolean} isWaitingForResponse - 是否正在等待响应
 */
export function updateSendButton(input, button, isWaitingForResponse = false) {
  if (input && button) {
    button.disabled = !input.value.trim() || isWaitingForResponse;
  }
}

/**
 * 自动调整文本框高度
 * @param {HTMLTextAreaElement} textarea - 文本框
 * @param {number} maxHeight - 最大高度（默认 200）
 */
export function autoResizeTextarea(textarea, maxHeight = 200) {
  if (!textarea) {
    return;
  }

  // 重置高度以获取准确的 scrollHeight
  textarea.style.height = 'auto';

  // 计算新高度
  const scrollHeight = textarea.scrollHeight;
  const height = Math.min(scrollHeight, maxHeight);
  const hasScroll = scrollHeight > maxHeight;

  // 应用新高度
  textarea.style.height = height + 'px';

  // 控制滚动条显示
  if (hasScroll) {
    textarea.classList.add('has-scroll');
  } else {
    textarea.classList.remove('has-scroll');
  }
}

/**
 * 在光标位置插入换行
 * @param {HTMLTextAreaElement} textarea - 文本框
 */
export function insertNewlineAtCursor(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  textarea.value = value.substring(0, start) + '\n' + value.substring(end);

  // 将光标移到换行之后
  textarea.selectionStart = textarea.selectionEnd = start + 1;

  // 触发 input 事件以自动调整高度
  textarea.dispatchEvent(new Event('input'));
}
