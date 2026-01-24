/**
 * 调试日志模块
 * 可配置的远程日志发送，用于开发调试
 */

// 调试开关 - 通过 localStorage 或环境变量控制
const DEBUG_ENABLED =
  typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true';

// 远程日志服务器配置
const LOG_SERVER_URL = 'http://127.0.0.1:7242/ingest/bc4b6979-3551-47d8-8d38-fd1c1280fe34';

/**
 * 发送调试日志到远程服务器
 * @param {string} location - 代码位置标识
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据
 * @param {Object} options - 可选配置
 * @param {string} options.sessionId - 会话 ID
 * @param {string} options.hypothesisId - 假设 ID
 */
export function debugLog(location, message, data = {}, options = {}) {
  if (!DEBUG_ENABLED) {
    return;
  }

  const { sessionId = 'debug-session', hypothesisId = '' } = options;

  fetch(LOG_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId,
      hypothesisId
    })
  }).catch(() => {
    // 静默失败，不影响主流程
  });
}

/**
 * SSE 数据接收日志
 * @param {Object} data - SSE 数据
 */
export function logSSEData(data) {
  debugLog(
    'sse:received',
    'SSE data received',
    {
      type: data.type,
      id: data.id,
      tool_use_id: data.tool_use_id,
      name: data.name
    },
    { hypothesisId: 'A-B' }
  );
}

/**
 * 工具调用日志
 * @param {string} toolName - 工具名称
 * @param {string} apiId - API ID
 * @param {Object} input - 输入参数
 */
export function logToolUse(toolName, apiId, input) {
  debugLog(
    'tool:use',
    'tool_use event',
    {
      toolName,
      apiId,
      inputKeys: Object.keys(input || {})
    },
    { hypothesisId: 'B' }
  );
}

/**
 * 工具结果日志
 * @param {string} apiId - API ID
 * @param {boolean} hasPending - 是否有待处理
 * @param {Array} pendingKeys - 待处理的 keys
 */
export function logToolResult(apiId, hasPending, pendingKeys) {
  debugLog(
    'tool:result',
    'tool_result received',
    {
      apiId,
      hasPending,
      pendingKeys
    },
    { hypothesisId: 'A-B' }
  );
}

/**
 * 工具匹配日志
 * @param {string} apiId - API ID
 * @param {string} localId - 本地 ID
 */
export function logToolMatch(apiId, localId) {
  debugLog(
    'tool:match',
    'tool_result matching',
    {
      apiId,
      localId,
      foundMatch: !!localId
    },
    { hypothesisId: 'B-C' }
  );
}

/**
 * 完成事件日志
 * @param {number} pendingCount - 待处理数量
 * @param {Array} pendingIds - 待处理 IDs
 */
export function logDone(pendingCount, pendingIds) {
  debugLog(
    'sse:done',
    'Done received - pending tools remaining',
    {
      pendingCount,
      pendingIds
    },
    { hypothesisId: 'A' }
  );
}

/**
 * 内联工具结果更新日志
 * @param {string} toolId - 工具 ID
 * @param {boolean} foundToolDiv - 是否找到工具 div
 * @param {string} toolName - 工具名称
 */
export function logInlineToolUpdate(toolId, foundToolDiv, toolName) {
  debugLog(
    'tool:inline',
    'updateInlineToolResult called',
    {
      toolId,
      foundToolDiv,
      toolName
    },
    { hypothesisId: 'C' }
  );
}

/**
 * 流式内容提取日志
 * @param {string} type - 提取类型
 * @param {Object} data - 相关数据
 */
export function logStreamableContent(type, data) {
  debugLog('stream:content', `Extracted ${type} content`, data, { hypothesisId: 'D-E' });
}

/**
 * 启用调试模式
 */
export function enableDebug() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('debug', 'true');
    console.log('[Logger] Debug mode enabled. Refresh to apply.');
  }
}

/**
 * 禁用调试模式
 */
export function disableDebug() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('debug');
    console.log('[Logger] Debug mode disabled. Refresh to apply.');
  }
}

// 暴露到 window 用于控制台调用
if (typeof window !== 'undefined') {
  window.enableDebug = enableDebug;
  window.disableDebug = disableDebug;
}
