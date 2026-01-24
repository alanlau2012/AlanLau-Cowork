/**
 * Session Manager - 工具调用纯函数工具库
 *
 * 提供不依赖 DOM 的纯函数操作，用于单元测试和数据处理。
 *
 * 注意：UI 相关的工具调用操作请使用 modules/toolCalls.js
 * 本模块主要用于：
 * - 单元测试
 * - 数据层操作（不涉及 DOM）
 */

/**
 * 创建工具调用对象
 * @param {string} name - 工具名称
 * @param {object} input - 工具输入
 * @param {string} status - 状态 ('running' | 'success' | 'error')
 * @returns {object} 工具调用对象
 */
export function createToolCallObject(name, input, status = 'running') {
  return {
    id: 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: name || 'Unknown',
    input: input || {},
    status,
    result: null,
    createdAt: Date.now()
  };
}

/**
 * 根据 ID 查找工具调用
 * @param {Array} toolCalls - 工具调用列表
 * @param {string} toolId - 工具调用 ID
 * @returns {object|undefined} 找到的工具调用或 undefined
 */
export function findToolCallById(toolCalls, toolId) {
  if (!Array.isArray(toolCalls) || !toolId) {
    return undefined;
  }
  return toolCalls.find(t => t.id === toolId);
}

/**
 * 更新工具调用列表中的指定工具调用
 * @param {Array} toolCalls - 工具调用列表
 * @param {string} toolId - 要更新的工具调用 ID
 * @param {object} updates - 更新内容
 * @returns {Array} 更新后的工具调用列表（新数组）
 */
export function updateToolCallInList(toolCalls, toolId, updates) {
  if (!Array.isArray(toolCalls) || !toolId) {
    return toolCalls || [];
  }

  return toolCalls.map(tc => {
    if (tc.id === toolId) {
      return { ...tc, ...updates };
    }
    return tc;
  });
}

/**
 * 获取工具调用统计信息
 * @param {Array} toolCalls - 工具调用列表
 * @returns {object} { total, completed, failed, running }
 */
export function getToolCallStats(toolCalls) {
  if (!Array.isArray(toolCalls)) {
    return { total: 0, completed: 0, failed: 0, running: 0 };
  }

  const completed = toolCalls.filter(t => t.status === 'success').length;
  const failed = toolCalls.filter(t => t.status === 'error').length;
  const running = toolCalls.filter(t => t.status === 'running').length;

  return {
    total: toolCalls.length,
    completed,
    failed,
    running
  };
}

/**
 * 创建待处理工具调用映射（API ID -> 本地 ID）
 * @returns {Map} 新的 Map 对象
 */
export function createPendingToolCallsMap() {
  return new Map();
}

/**
 * 添加待处理工具调用映射
 * @param {Map} pendingMap - 待处理映射
 * @param {string} apiId - API 返回的工具 ID
 * @param {string} localId - 本地工具调用 ID
 */
export function addPendingToolCall(pendingMap, apiId, localId) {
  if (pendingMap && apiId && localId) {
    pendingMap.set(apiId, localId);
  }
}

/**
 * 解析待处理工具调用，返回本地 ID 并从映射中删除
 * @param {Map} pendingMap - 待处理映射
 * @param {string} apiId - API 返回的工具 ID
 * @returns {string|null} 本地工具调用 ID 或 null
 */
export function resolveToolCall(pendingMap, apiId) {
  if (!pendingMap || !apiId) {
    return null;
  }

  const localId = pendingMap.get(apiId);
  if (localId) {
    pendingMap.delete(apiId);
  }
  return localId || null;
}

/**
 * 格式化工具调用状态文本
 * @param {string} status - 状态 ('running' | 'success' | 'error')
 * @returns {string} 状态文本
 */
export function formatToolCallStatus(status) {
  switch (status) {
    case 'success':
      return 'Completed';
    case 'error':
      return 'Failed';
    case 'running':
    default:
      return 'Running...';
  }
}

/**
 * 格式化步骤统计文本
 * @param {object} stats - 统计对象 { total, completed, failed }
 * @returns {string} 格式化的统计文本
 */
export function formatStepsCount(stats) {
  if (!stats || stats.total === 0) {
    return '0 steps';
  }

  if (stats.failed > 0) {
    return `${stats.completed}/${stats.total} steps (${stats.failed} failed)`;
  }

  return `${stats.completed}/${stats.total} steps`;
}

/**
 * 截断工具结果以便显示
 * @param {*} result - 工具结果
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的字符串
 */
export function truncateToolResult(result, maxLength = 2000) {
  if (result === null || result === undefined) {
    return '';
  }

  const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);

  if (resultStr.length <= maxLength) {
    return resultStr;
  }

  return resultStr.substring(0, maxLength) + '...';
}

/**
 * 检查工具调用是否已完成（成功或失败）
 * @param {object} toolCall - 工具调用对象
 * @returns {boolean} 是否已完成
 */
export function isToolCallComplete(toolCall) {
  if (!toolCall) {
    return false;
  }
  return toolCall.status === 'success' || toolCall.status === 'error';
}

/**
 * 获取所有未完成的工具调用
 * @param {Array} toolCalls - 工具调用列表
 * @returns {Array} 未完成的工具调用列表
 */
export function getPendingToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls)) {
    return [];
  }
  return toolCalls.filter(tc => tc.status === 'running');
}

/**
 * 标记所有运行中的工具调用为成功
 * @param {Array} toolCalls - 工具调用列表
 * @returns {Array} 更新后的工具调用列表（新数组）
 */
export function markAllRunningAsSuccess(toolCalls) {
  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls.map(tc => {
    if (tc.status === 'running') {
      return { ...tc, status: 'success' };
    }
    return tc;
  });
}

/**
 * 添加工具调用到列表
 * @param {Array} toolCalls - 现有工具调用列表
 * @param {object} toolCall - 新的工具调用对象
 * @returns {Array} 更新后的列表（新数组）
 */
export function addToolCallToList(toolCalls, toolCall) {
  if (!Array.isArray(toolCalls)) {
    return toolCall ? [toolCall] : [];
  }
  return [...toolCalls, toolCall];
}
