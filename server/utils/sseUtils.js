/**
 * SSE (Server-Sent Events) Utility Functions
 * 提供统一的 SSE 响应写入工具
 */

/**
 * 写入 SSE 数据到响应流
 * @param {Response} res - Express 响应对象
 * @param {string} type - 事件类型
 * @param {object} data - 事件数据
 */
export function writeSSE(res, type, data = {}) {
  const payload = { type, ...data };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * 写入 SSE 错误响应
 * @param {Response} res - Express 响应对象
 * @param {string} message - 错误消息
 */
export function writeSSEError(res, message) {
  writeSSE(res, 'error', { error: message });
}

/**
 * 写入 SSE 完成标记
 * @param {Response} res - Express 响应对象
 */
export function writeSSEDone(res) {
  writeSSE(res, 'done');
}

/**
 * 设置 SSE 响应头
 * @param {Response} res - Express 响应对象
 */
export function setSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}
