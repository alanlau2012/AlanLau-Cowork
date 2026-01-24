/**
 * 聊天管理模块
 * 负责聊天的加载、保存、切换和删除
 */

import {
  createChatData,
  findChatById,
  updateChatInList,
  removeChatById,
  sortChatsByTime,
  saveChatToStorage,
  loadChatsFromStorage
} from '../chatStore.js';
import { extractMessagesData, restoreMessages } from './messageHandler.js';
import { renderMarkdown } from './markdownRenderer.js';
import { restoreInlineToolCall, renderTimeline } from './toolCalls.js';
import { updateChatHistoryActiveState, renderChatHistoryList } from './chatHistory.js';

/**
 * 保存当前聊天状态
 * @param {Object} state - 当前状态
 * @param {Object} elements - DOM 元素
 * @param {Object} options - 选项
 * @returns {Array} 更新后的聊天列表
 */
export function saveCurrentChat(state, elements, options = {}) {
  // eslint-disable-next-line no-unused-vars
  const { preserveUpdatedAt = false, skipRenderHistory = false } = options;

  if (!state.currentChatId) {
    return state.allChats;
  }

  // 从消息容器提取消息数据
  const messages = extractMessagesData(elements.chatMessages);

  // 创建聊天数据
  const chatData = createChatData(
    state.currentChatId,
    elements.chatTitle.textContent,
    messages,
    state.todos,
    state.toolCalls,
    state.fileChanges
  );

  // 更新聊天列表
  const updatedChats = updateChatInList(state.allChats, chatData, preserveUpdatedAt);

  // 保存到 localStorage
  saveChatToStorage(localStorage, updatedChats, state.currentChatId);

  return updatedChats;
}

/**
 * 从 localStorage 加载所有聊天
 * @returns {Object} { allChats, currentChatId }
 */
export function loadAllChats() {
  return loadChatsFromStorage(localStorage);
}

/**
 * 加载指定聊天
 * @param {Object} chat - 聊天数据
 * @param {Object} state - 当前状态对象（将被修改）
 * @param {Object} elements - DOM 元素
 * @param {Object} callbacks - 回调函数
 */
export function loadChat(chat, state, elements, callbacks) {
  // 更新状态
  state.currentChatId = chat.id;
  state.isFirstMessage = false;
  state.todos = chat.todos || [];
  state.toolCalls = chat.toolCalls || [];
  state.fileChanges = chat.fileChanges || [];

  // 更新标题
  elements.chatTitle.textContent = chat.title;

  // 切换到聊天视图
  if (callbacks.switchToChatView) {
    callbacks.switchToChatView();
  }

  // 恢复消息
  const lastAssistantContentDiv = restoreMessages(
    elements.chatMessages,
    chat.messages,
    renderMarkdown
  );

  // 恢复内联工具调用
  if (lastAssistantContentDiv && state.toolCalls.length > 0) {
    state.toolCalls.forEach(tc => {
      restoreInlineToolCall(lastAssistantContentDiv, tc);
    });
  }

  // 恢复时间线
  renderTimeline(
    state.toolCalls,
    document.getElementById('timelineList'),
    document.getElementById('emptyTimeline')
  );

  // 恢复文件变更
  if (callbacks.renderFileChanges) {
    callbacks.renderFileChanges();
  }

  // 滚动到底部
  if (callbacks.scrollToBottom) {
    callbacks.scrollToBottom();
  }

  // 更新历史记录活动状态
  updateChatHistoryActiveState(elements.chatHistoryList, state.currentChatId);

  // 保存当前聊天 ID
  localStorage.setItem('currentChatId', state.currentChatId);
}

/**
 * 切换到指定聊天
 * @param {string} chatId - 目标聊天 ID
 * @param {Object} state - 当前状态
 * @param {Object} elements - DOM 元素
 * @param {Object} callbacks - 回调函数
 */
export function switchToChat(chatId, state, elements, callbacks) {
  // 保存当前聊天（保留 updatedAt，跳过重新渲染历史）
  if (state.currentChatId) {
    state.allChats = saveCurrentChat(state, elements, {
      preserveUpdatedAt: true,
      skipRenderHistory: true
    });
  }

  // 查找并加载目标聊天
  const chat = findChatById(state.allChats, chatId);
  if (chat) {
    loadChat(chat, state, elements, callbacks);
  }
}

/**
 * 删除聊天
 * @param {string} chatId - 要删除的聊天 ID
 * @param {Object} state - 当前状态
 * @param {Object} elements - DOM 元素
 * @param {Object} callbacks - 回调函数
 */
export function deleteChat(chatId, state, elements, callbacks) {
  // 从列表中移除
  state.allChats = removeChatById(state.allChats, chatId);

  // 更新存储
  const newCurrentChatId = state.currentChatId === chatId ? null : state.currentChatId;
  saveChatToStorage(localStorage, state.allChats, newCurrentChatId);

  if (state.currentChatId === chatId) {
    // 如果删除的是当前聊天
    if (state.allChats.length > 0) {
      // 加载第一个聊天
      loadChat(state.allChats[0], state, elements, callbacks);
    } else {
      // 没有聊天了，回到首页
      state.currentChatId = null;
      if (callbacks.switchToHomeView) {
        callbacks.switchToHomeView();
      }
      state.isFirstMessage = true;
    }
  }

  // 重新渲染历史列表
  if (callbacks.renderChatHistory) {
    callbacks.renderChatHistory();
  }
}

/**
 * 开始新聊天
 * @param {Object} state - 当前状态
 * @param {Object} elements - DOM 元素
 * @param {Object} callbacks - 回调函数
 */
export function startNewChat(state, elements, callbacks) {
  // 保存当前聊天
  if (state.currentChatId && elements.chatMessages.children.length > 0) {
    state.allChats = saveCurrentChat(state, elements);
  }

  // 重置状态
  state.currentChatId = null;
  state.isFirstMessage = true;
  state.todos = [];
  state.toolCalls = [];
  state.fileChanges = [];
  state.attachedFiles = [];

  // 清空 UI
  elements.chatMessages.innerHTML = '';
  elements.messageInput.value = '';
  elements.homeInput.value = '';
  elements.chatTitle.textContent = 'New chat';

  // 重置时间线
  const timelineList = document.getElementById('timelineList');
  const emptyTimeline = document.getElementById('emptyTimeline');
  if (timelineList) {
    timelineList.innerHTML = '';
  }
  if (emptyTimeline) {
    emptyTimeline.style.display = 'block';
  }

  // 重置文件变更
  const fileChangesList = document.getElementById('fileChangesList');
  const emptyFiles = document.getElementById('emptyFiles');
  if (fileChangesList) {
    fileChangesList.innerHTML = '';
  }
  if (emptyFiles) {
    emptyFiles.style.display = 'block';
  }

  // 切换到首页视图
  if (callbacks.switchToHomeView) {
    callbacks.switchToHomeView();
  }

  // 重置输入容器宽度
  const homeInputContainer = elements.homeInput.closest('.input-container');
  const chatInputContainer = elements.messageInput.closest('.input-container');
  if (homeInputContainer) {
    homeInputContainer.style.width = '';
    homeInputContainer.style.maxWidth = '';
  }
  if (chatInputContainer) {
    chatInputContainer.style.width = '';
    chatInputContainer.style.maxWidth = '';
  }

  // 重置输入框高度
  if (callbacks.autoResizeTextarea) {
    callbacks.autoResizeTextarea(elements.homeInput);
    callbacks.autoResizeTextarea(elements.messageInput);
  }

  // 重置发送按钮状态
  if (callbacks.updateSendButton) {
    callbacks.updateSendButton(elements.homeInput, elements.homeSendBtn);
    callbacks.updateSendButton(elements.messageInput, elements.chatSendBtn);
  }

  // 聚焦到首页输入框
  elements.homeInput.focus();

  // 显示模板
  if (callbacks.showTemplates) {
    callbacks.showTemplates();
  }

  // 清除 localStorage 中的 currentChatId
  localStorage.removeItem('currentChatId');

  // 重新渲染历史列表
  if (callbacks.renderChatHistory) {
    callbacks.renderChatHistory();
  }
}

/**
 * 渲染聊天历史列表
 * @param {Object} state - 当前状态
 * @param {HTMLElement} container - 历史列表容器
 * @param {Function} onSwitch - 切换聊天回调
 */
export function renderChatHistory(state, container, onSwitch) {
  const sortedChats = sortChatsByTime(state.allChats);
  renderChatHistoryList(container, sortedChats, {
    currentChatId: state.currentChatId,
    isWaitingForResponse: state.isWaitingForResponse,
    onSwitch
  });
}
