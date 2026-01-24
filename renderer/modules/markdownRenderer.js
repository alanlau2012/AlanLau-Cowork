/**
 * Markdown 渲染模块
 * 负责 Markdown 内容的渲染和代码块增强
 */

import { showToast } from './feedback.js';

/**
 * 获取或创建当前 Markdown 容器（用于流式渲染）
 * @param {HTMLElement} contentDiv - 消息内容容器
 * @returns {HTMLElement} Markdown 容器
 */
export function getCurrentMarkdownContainer(contentDiv) {
  const chunkIndex = parseInt(contentDiv.dataset.currentChunk || '0');
  let container = contentDiv.querySelector(`.markdown-content[data-chunk="${chunkIndex}"]`);

  if (!container) {
    container = document.createElement('div');
    container.className = 'markdown-content';
    container.dataset.chunk = chunkIndex;
    container.dataset.rawContent = '';
    contentDiv.appendChild(container);
  }

  return container;
}

/**
 * 渲染特定容器的 Markdown 内容
 * @param {HTMLElement} container - Markdown 容器
 */
export function renderMarkdownContainer(container) {
  const rawContent = container.dataset.rawContent || '';

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  container.innerHTML = marked.parse(rawContent);

  // 增强代码块
  enhanceCodeBlocks(container);
}

/**
 * 渲染消息内容中的 Markdown（用于恢复保存的消息）
 * @param {HTMLElement} contentDiv - 消息内容容器
 */
export function renderMarkdown(contentDiv) {
  const rawContent = contentDiv.dataset.rawContent || '';

  marked.setOptions({
    breaks: true,
    gfm: true
  });

  let markdownContainer = contentDiv.querySelector('.markdown-content');
  if (!markdownContainer) {
    markdownContainer = document.createElement('div');
    markdownContainer.className = 'markdown-content';
    contentDiv.appendChild(markdownContainer);
  }

  markdownContainer.innerHTML = marked.parse(rawContent);

  // 增强代码块
  enhanceCodeBlocks(markdownContainer);
}

/**
 * 追加内容到 contentDiv（流式渲染）
 * @param {HTMLElement} contentDiv - 消息内容容器
 * @param {string} content - 要追加的内容
 */
export function appendToContent(contentDiv, content) {
  if (!contentDiv.dataset.rawContent) {
    contentDiv.dataset.rawContent = '';
  }
  contentDiv.dataset.rawContent += content;

  // 获取当前 chunk 容器并追加内容
  const container = getCurrentMarkdownContainer(contentDiv);
  container.dataset.rawContent += content;
  renderMarkdownContainer(container);
}

/**
 * 递增 chunk 计数器（在插入工具调用后调用）
 * @param {HTMLElement} contentDiv - 消息内容容器
 */
export function incrementChunkCounter(contentDiv) {
  const currentChunk = parseInt(contentDiv.dataset.currentChunk || '0');
  contentDiv.dataset.currentChunk = currentChunk + 1;
}

/**
 * 增强代码块（添加语言标签和复制按钮）
 * @param {HTMLElement} container - 容器元素
 */
export function enhanceCodeBlocks(container) {
  // 找到所有代码块
  const codeBlocks = container.querySelectorAll('pre code');

  codeBlocks.forEach(block => {
    // 跳过已增强的代码块
    if (block.closest('.code-wrapper')) {
      return;
    }

    // 从 class 名提取语言（如 "language-javascript"）
    const className = block.className;
    const langMatch = className.match(/language-(\w+)/);
    const language = langMatch ? langMatch[1] : 'text';

    // 创建包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';

    // 创建头部
    const header = document.createElement('div');
    header.className = 'code-header';

    // 添加语言标签
    const langTag = document.createElement('span');
    langTag.className = 'lang-tag';
    langTag.textContent = language;

    // 添加复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.setAttribute('aria-label', `Copy ${language} code`);

    // 复制处理器
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.textContent);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');

        // 显示 Toast 反馈
        showToast('Code copied to clipboard', 'success', 1500);

        // 2 秒后重置按钮
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy code', 'error');
      }
    });

    // 组装头部
    header.appendChild(langTag);
    header.appendChild(copyBtn);

    // 包装 pre 块
    const preBlock = block.parentNode;
    preBlock.parentNode.replaceChild(wrapper, preBlock);
    wrapper.appendChild(header);
    wrapper.appendChild(preBlock);
  });
}
