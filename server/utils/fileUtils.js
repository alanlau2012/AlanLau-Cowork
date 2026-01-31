/**
 * File Utility Functions
 * 提供统一的文件操作工具函数
 */

import fs from 'fs';
import path from 'path';

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dir - 目录路径
 * @returns {boolean} 是否成功
 */
export function ensureDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`[fileUtils] Failed to create directory ${dir}:`, error.message);
    return false;
  }
}

/**
 * 安全读取 JSON 文件
 * @param {string} filePath - 文件路径
 * @param {*} defaultValue - 读取失败时的默认值
 * @returns {*} 解析后的 JSON 或默认值
 */
export function readJsonFile(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[fileUtils] Failed to read JSON file ${filePath}:`, error.message);
    return defaultValue;
  }
}

/**
 * 安全写入 JSON 文件
 * @param {string} filePath - 文件路径
 * @param {*} data - 要写入的数据
 * @param {boolean} pretty - 是否格式化（默认 true）
 * @returns {{ success: boolean, error?: string }} 结果
 */
export function writeJsonFile(filePath, data, pretty = true) {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    ensureDirectory(dir);

    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error(`[fileUtils] Failed to write JSON file ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 安全读取文本文件
 * @param {string} filePath - 文件路径
 * @param {string} defaultValue - 读取失败时的默认值
 * @returns {string} 文件内容或默认值
 */
export function readTextFile(filePath, defaultValue = '') {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.warn(`[fileUtils] Failed to read text file ${filePath}:`, error.message);
    return defaultValue;
  }
}
