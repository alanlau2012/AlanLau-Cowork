/**
 * 文件处理模块
 * 负责文件附件和文件变更的管理
 */

import { escapeHtml } from '../utils.js';
import { showToast } from './feedback.js';

/**
 * 处理文件选择
 * @param {Event} event - 文件选择事件
 * @param {string} context - 上下文 ('home' | 'chat')
 * @param {Array} attachedFiles - 已附加文件数组
 * @param {Function} renderCallback - 渲染回调
 * @returns {Array} 更新后的附加文件数组
 */
export function handleFileSelect(event, context, attachedFiles, renderCallback) {
  const files = Array.from(event.target.files);
  const updatedFiles = [...attachedFiles];

  files.forEach(file => {
    if (updatedFiles.length >= 5) {
      showToast('Maximum 5 files allowed', 'error');
      return;
    }

    // 读取文件
    const reader = new FileReader();
    reader.onload = e => {
      updatedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      });
      if (renderCallback) {
        renderCallback(updatedFiles, context);
      }
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });

  // 重置 input
  event.target.value = '';

  return updatedFiles;
}

/**
 * 渲染已附加文件预览
 * @param {HTMLElement} inputWrapper - 输入包装器
 * @param {Array} attachedFiles - 已附加文件数组
 * @param {string} context - 上下文 ('home' | 'chat')
 */
export function renderAttachedFiles(inputWrapper, attachedFiles, context) {
  if (!inputWrapper) {
    return;
  }

  let filesContainer = inputWrapper.querySelector('.attached-files');
  if (!filesContainer) {
    filesContainer = document.createElement('div');
    filesContainer.className = 'attached-files';
    inputWrapper.insertBefore(filesContainer, inputWrapper.firstChild);
  }

  filesContainer.innerHTML = attachedFiles
    .map(
      (file, index) => `
    <div class="attached-file">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>${escapeHtml(file.name)}</span>
      <svg class="remove-file" onclick="removeAttachedFile(${index}, '${context}')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `
    )
    .join('');

  if (attachedFiles.length === 0) {
    filesContainer.remove();
  }
}

/**
 * 移除附加文件
 * @param {Array} attachedFiles - 已附加文件数组
 * @param {number} index - 要移除的文件索引
 * @param {string} context - 上下文
 * @param {Function} renderCallback - 渲染回调
 * @returns {Array} 更新后的附加文件数组
 */
export function removeAttachedFile(attachedFiles, index, context, renderCallback) {
  const updatedFiles = [...attachedFiles];
  updatedFiles.splice(index, 1);
  if (renderCallback) {
    renderCallback(updatedFiles, context);
  }
  return updatedFiles;
}

/**
 * 添加文件变更
 * @param {Array} fileChanges - 文件变更数组
 * @param {string} name - 文件名
 * @param {string} path - 文件路径
 * @param {string} type - 变更类型 ('added' | 'modified' | 'deleted')
 * @param {Object} stats - 变更统计 { added, removed }
 * @returns {Object} { updatedChanges, change }
 */
export function addFileChange(fileChanges, name, path, type, stats = {}) {
  const id = 'file_' + Date.now();
  const change = { id, name, path, type, stats };
  const updatedChanges = [...fileChanges, change];
  return { updatedChanges, change };
}

/**
 * 渲染文件变更列表
 * @param {HTMLElement} container - 容器元素
 * @param {Array} fileChanges - 文件变更数组
 */
export function renderFileChanges(container, fileChanges) {
  if (!container) {
    return;
  }

  // 清空容器
  container.innerHTML = '';

  // 创建空状态元素
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-state';
  emptyDiv.id = 'emptyFiles';
  emptyDiv.textContent = '暂无文件变更';

  if (fileChanges.length === 0) {
    emptyDiv.style.display = 'block';
    container.appendChild(emptyDiv);
    return;
  }

  // 隐藏空状态
  emptyDiv.style.display = 'none';
  container.appendChild(emptyDiv);

  // 渲染文件变更
  fileChanges.forEach(change => {
    const item = document.createElement('div');
    item.className = 'file-change-item';
    item.innerHTML = `
      <div class="file-change-header">
        <div class="file-change-icon ${change.type}">${getFileChangeIcon(change.type)}</div>
        <div class="file-change-info">
          <div class="file-change-name">${escapeHtml(change.name)}</div>
          <div class="file-change-path">${escapeHtml(change.path)}</div>
        </div>
        ${renderFileStats(change.stats)}
      </div>
    `;
    container.appendChild(item);
  });
}

/**
 * 获取文件变更图标
 * @param {string} type - 变更类型
 * @returns {string} 图标字符
 */
export function getFileChangeIcon(type) {
  switch (type) {
    case 'added':
      return '+';
    case 'modified':
      return 'M';
    case 'deleted':
      return '-';
    default:
      return '?';
  }
}

/**
 * 渲染文件统计
 * @param {Object} stats - 统计对象 { added, removed }
 * @returns {string} HTML 字符串
 */
export function renderFileStats(stats) {
  if (!stats || (!stats.added && !stats.removed)) {
    return '';
  }
  let html = '<div class="file-change-stats">';
  if (stats.added) {
    html += `<span class="stat-added">+${stats.added}</span>`;
  }
  if (stats.removed) {
    html += `<span class="stat-removed">-${stats.removed}</span>`;
  }
  html += '</div>';
  return html;
}

/**
 * 清空文件变更
 * @param {HTMLElement} container - 容器元素
 * @returns {Array} 空数组
 */
export function clearFileChanges(container) {
  if (container) {
    container.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.id = 'emptyFiles';
    emptyDiv.textContent = '暂无文件变更';
    emptyDiv.style.display = 'block';
    container.appendChild(emptyDiv);
  }
  return [];
}
