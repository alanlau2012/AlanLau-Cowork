/**
 * 集中状态管理模块
 * 管理应用的全局状态，提供响应式更新机制
 */

class AppState {
  constructor() {
    // 聊天状态
    this.isFirstMessage = true;
    this.allChats = [];
    this.currentChatId = null;

    // 当前会话状态
    this.todos = [];
    this.toolCalls = [];
    this.fileChanges = [];
    this.attachedFiles = [];

    // UI 状态
    this.selectedModel = 'minimax-2-1';
    this.thinkingMode = 'normal'; // 'normal' or 'extended'
    this.isWaitingForResponse = false;
    this.currentRequestId = null;

    // 事件订阅者
    this._listeners = new Map();
  }

  /**
   * 重置当前会话状态（用于新建聊天）
   */
  resetSession() {
    this.isFirstMessage = true;
    this.currentChatId = null;
    this.todos = [];
    this.toolCalls = [];
    this.fileChanges = [];
    this.attachedFiles = [];
  }

  /**
   * 加载聊天数据到状态
   * @param {Object} chat - 聊天数据
   */
  loadChat(chat) {
    this.currentChatId = chat.id;
    this.isFirstMessage = false;
    this.todos = chat.todos || [];
    this.toolCalls = chat.toolCalls || [];
    this.fileChanges = chat.fileChanges || [];
  }

  /**
   * 添加工具调用
   * @param {Object} toolCall - 工具调用对象
   */
  addToolCall(toolCall) {
    this.toolCalls.push(toolCall);
    this._emit('toolCallsChanged', this.toolCalls);
  }

  /**
   * 更新工具调用状态
   * @param {string} toolId - 工具调用 ID
   * @param {string} status - 新状态
   */
  updateToolCallStatus(toolId, status) {
    const toolCall = this.toolCalls.find(t => t.id === toolId);
    if (toolCall) {
      toolCall.status = status;
      this._emit('toolCallsChanged', this.toolCalls);
    }
  }

  /**
   * 更新工具调用结果
   * @param {string} toolId - 工具调用 ID
   * @param {*} result - 执行结果
   */
  updateToolCallResult(toolId, result) {
    const toolCall = this.toolCalls.find(t => t.id === toolId);
    if (toolCall) {
      toolCall.result = result;
      this._emit('toolCallsChanged', this.toolCalls);
    }
  }

  /**
   * 添加文件变更
   * @param {Object} change - 文件变更对象
   */
  addFileChange(change) {
    this.fileChanges.push(change);
    this._emit('fileChangesChanged', this.fileChanges);
  }

  /**
   * 添加附件
   * @param {Object} file - 文件对象
   */
  addAttachedFile(file) {
    if (this.attachedFiles.length >= 5) {
      return false;
    }
    this.attachedFiles.push(file);
    this._emit('attachedFilesChanged', this.attachedFiles);
    return true;
  }

  /**
   * 移除附件
   * @param {number} index - 文件索引
   */
  removeAttachedFile(index) {
    this.attachedFiles.splice(index, 1);
    this._emit('attachedFilesChanged', this.attachedFiles);
  }

  /**
   * 清空附件
   */
  clearAttachedFiles() {
    this.attachedFiles = [];
    this._emit('attachedFilesChanged', this.attachedFiles);
  }

  /**
   * 设置生成状态
   * @param {boolean} waiting - 是否等待响应
   * @param {string|null} requestId - 请求 ID
   */
  setWaitingState(waiting, requestId = null) {
    this.isWaitingForResponse = waiting;
    this.currentRequestId = requestId;
    this._emit('waitingStateChanged', { waiting, requestId });
  }

  /**
   * 订阅状态变化
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event).delete(callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {*} data - 事件数据
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

// 导出单例
export const appState = new AppState();

// 导出类用于测试
export { AppState };
