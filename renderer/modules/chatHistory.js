/**
 * 聊天历史渲染模块
 * 负责左侧边栏聊天历史列表的渲染和管理
 */

import { formatRelativeTime } from '../utils.js';
import { buildChatItemHTML, buildTaskSectionTitleHTML } from '../uiHelpers.js';

/**
 * 将聊天按时间分组
 * @param {Array} chats - 聊天列表
 * @param {string} currentChatId - 当前聊天 ID
 * @param {boolean} isWaitingForResponse - 是否正在等待响应
 * @returns {Object} 分组后的聊天
 */
export function categorizeChatsByTime(chats, currentChatId, isWaitingForResponse) {
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {
    running: [],
    today: [],
    yesterday: [],
    older: []
  };

  chats.forEach(chat => {
    const isActive = chat.id === currentChatId;
    const timestamp = chat.updatedAt || chat.createdAt || now;
    const chatDate = new Date(timestamp);
    chatDate.setHours(0, 0, 0, 0);

    // 判断是否为进行中的聊天（当前活动且正在生成响应）
    if (isActive && isWaitingForResponse) {
      groups.running.push(chat);
    } else if (chatDate.getTime() === today.getTime()) {
      groups.today.push(chat);
    } else if (chatDate.getTime() === yesterday.getTime()) {
      groups.yesterday.push(chat);
    } else {
      groups.older.push(chat);
    }
  });

  return groups;
}

/**
 * 创建单个聊天项元素
 * @param {Object} chat - 聊天数据
 * @param {string} currentChatId - 当前聊天 ID
 * @param {boolean} isWaitingForResponse - 是否正在等待响应
 * @param {Function} onSwitch - 切换聊天回调
 * @returns {HTMLElement} 聊天项元素
 */
export function createChatItem(chat, currentChatId, isWaitingForResponse, onSwitch) {
  const now = Date.now();
  const isActive = chat.id === currentChatId;
  const timestamp = chat.updatedAt || chat.createdAt || now;
  const relativeTime = formatRelativeTime(timestamp);
  const status = isActive && isWaitingForResponse ? 'running' : 'completed';

  const item = document.createElement('div');
  item.className = 'task-item' + (isActive ? ' active' : '');
  item.dataset.chatId = chat.id;
  item.innerHTML = buildChatItemHTML(chat, isActive, status, relativeTime);
  item.onclick = e => {
    if (!e.target.closest('.delete-chat-btn')) {
      onSwitch(chat.id);
    }
  };

  return item;
}

/**
 * 渲染单个聊天分组
 * @param {Array} chats - 该分组的聊天列表
 * @param {string} groupTitle - 分组标题
 * @param {Object} options - 渲染选项
 * @param {string} options.currentChatId - 当前聊天 ID
 * @param {boolean} options.isWaitingForResponse - 是否正在等待响应
 * @param {Function} options.onSwitch - 切换聊天回调
 * @returns {HTMLElement} 分组元素
 */
export function renderChatGroup(chats, groupTitle, options) {
  const { currentChatId, isWaitingForResponse, onSwitch } = options;

  const section = document.createElement('div');
  section.className = 'task-section';
  section.innerHTML = buildTaskSectionTitleHTML(groupTitle);

  const taskList = document.createElement('div');
  taskList.className = 'task-list';

  chats.forEach(chat => {
    const item = createChatItem(chat, currentChatId, isWaitingForResponse, onSwitch);
    taskList.appendChild(item);
  });

  section.appendChild(taskList);
  return section;
}

/**
 * 渲染聊天历史列表
 * @param {HTMLElement} container - 容器元素
 * @param {Array} sortedChats - 已排序的聊天列表
 * @param {Object} options - 渲染选项
 * @param {string} options.currentChatId - 当前聊天 ID
 * @param {boolean} options.isWaitingForResponse - 是否正在等待响应
 * @param {Function} options.onSwitch - 切换聊天回调
 */
export function renderChatHistoryList(container, sortedChats, options) {
  const { currentChatId, isWaitingForResponse, onSwitch } = options;

  // 保存当前滚动位置
  const scrollTop = container.scrollTop;

  // 清空容器
  container.innerHTML = '';

  if (sortedChats.length === 0) {
    container.innerHTML = '<div class="chat-history-empty">No chats yet</div>';
    return;
  }

  // 分组聊天
  const groups = categorizeChatsByTime(sortedChats, currentChatId, isWaitingForResponse);

  // 渲染各分组
  const groupConfigs = [
    { chats: groups.running, title: '进行中' },
    { chats: groups.today, title: '今天' },
    { chats: groups.yesterday, title: '昨天' },
    { chats: groups.older, title: '更早' }
  ];

  groupConfigs.forEach(({ chats, title }) => {
    if (chats.length > 0) {
      const section = renderChatGroup(chats, title, {
        currentChatId,
        isWaitingForResponse,
        onSwitch
      });
      container.appendChild(section);
    }
  });

  // 恢复滚动位置（如果列表内容没有变化）
  if (scrollTop > 0 && container.scrollHeight >= scrollTop) {
    container.scrollTop = scrollTop;
  }
}

/**
 * 只更新历史记录中的 active 状态，避免完全重新渲染
 * @param {HTMLElement} container - 容器元素
 * @param {string} currentChatId - 当前聊天 ID
 */
export function updateChatHistoryActiveState(container, currentChatId) {
  const items = container.querySelectorAll('.task-item');
  items.forEach(item => {
    const isActive = item.dataset.chatId === currentChatId;
    if (isActive) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
