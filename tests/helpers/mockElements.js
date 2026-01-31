/**
 * Mock Elements - DOM 元素模拟工具
 * 用于单元测试中创建模拟 DOM 元素
 */

/**
 * 创建标准的聊天界面 DOM 元素
 * @param {object} options - 配置选项
 * @returns {object} 包含所有元素的对象
 */
export function createChatElements(options = {}) {
  const chatMessages = document.createElement('div');
  chatMessages.id = 'chatMessages';

  const chatTitle = document.createElement('h1');
  chatTitle.id = 'chatTitle';

  const messageInput = document.createElement('textarea');
  messageInput.id = 'messageInput';

  const sendBtn = document.createElement('button');
  sendBtn.id = 'sendBtn';

  const chatList = document.createElement('div');
  chatList.id = 'chatList';

  const newChatBtn = document.createElement('button');
  newChatBtn.id = 'newChatBtn';

  const elements = {
    chatMessages,
    chatTitle,
    messageInput,
    sendBtn,
    chatList,
    newChatBtn
  };

  // 如果需要添加到 DOM
  if (options.appendToBody !== false) {
    Object.values(elements).forEach(el => document.body.appendChild(el));
  }

  return elements;
}

/**
 * 创建工具调用相关的 DOM 元素
 * @param {object} options - 配置选项
 * @returns {object} 包含工具调用相关元素的对象
 */
export function createToolCallElements(options = {}) {
  const timelineList = document.createElement('div');
  timelineList.id = 'timelineList';

  const emptyTimeline = document.createElement('div');
  emptyTimeline.id = 'emptyTimeline';

  const toolCallDetails = document.createElement('div');
  toolCallDetails.id = 'toolCallDetails';

  const elements = {
    timelineList,
    emptyTimeline,
    toolCallDetails
  };

  if (options.appendToBody !== false) {
    Object.values(elements).forEach(el => document.body.appendChild(el));
  }

  return elements;
}

/**
 * 创建设置界面相关的 DOM 元素
 * @returns {object} 设置界面元素
 */
export function createSettingsElements() {
  const settingsModal = document.createElement('div');
  settingsModal.id = 'settingsModal';
  settingsModal.classList.add('hidden');

  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'settingsBtn';

  const closeSettingsBtn = document.createElement('button');
  closeSettingsBtn.id = 'closeSettingsBtn';

  const elements = {
    settingsModal,
    settingsBtn,
    closeSettingsBtn
  };

  Object.values(elements).forEach(el => document.body.appendChild(el));
  return elements;
}

/**
 * 清理所有测试 DOM 元素
 */
export function cleanupTestDOM() {
  document.body.innerHTML = '';
}

/**
 * 创建模拟的 Element 对象（不附加到 DOM）
 * @param {string} tag - 标签名
 * @param {object} attrs - 属性对象
 * @returns {HTMLElement} 模拟元素
 */
export function createMockElement(tag = 'div', attrs = {}) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'id' || key === 'className') {
      element[key] = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
}
