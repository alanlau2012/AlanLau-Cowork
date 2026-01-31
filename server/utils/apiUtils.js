/**
 * API Utility Functions
 * 提供统一的 API 响应和错误处理工具
 */

/**
 * 发送成功响应
 * @param {Response} res - Express 响应对象
 * @param {object} data - 响应数据
 * @param {string} message - 可选的成功消息
 */
export function sendSuccess(res, data = {}, message = null) {
  const response = { success: true, ...data };
  if (message) {
    response.message = message;
  }
  res.json(response);
}

/**
 * 发送错误响应
 * @param {Response} res - Express 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {string} error - 错误消息
 */
export function sendError(res, statusCode, error) {
  res.status(statusCode).json({ success: false, error });
}

/**
 * 异步路由处理器包装器
 * 自动捕获异步错误并返回统一的错误响应
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的处理函数
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      console.error('[API Error]', error.message);
      sendError(res, 500, error.message);
    });
  };
}

/**
 * 验证请求体中的必需字段
 * @param {object} body - 请求体
 * @param {string[]} requiredFields - 必需字段列表
 * @returns {{ valid: boolean, missing?: string[] }} 验证结果
 */
export function validateRequiredFields(body, requiredFields) {
  const missing = requiredFields.filter(field => body[field] === undefined);
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  return { valid: true };
}
