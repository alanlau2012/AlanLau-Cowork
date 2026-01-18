---
name: 时间线与Tab面板升级
overview: 在保持当前珊瑚色/奶油色视觉风格的基础上，增强现有inline-tool-call为时间线节点，并引入Tab化右侧面板，提升任务执行过程的可视化体验。
todos:
  - id: tab-html
    content: 修改index.html：添加Tab容器和按钮结构（任务/活动）
    status: completed
  - id: tab-css
    content: 实现Tab组件CSS：按钮样式、内容区切换、暗色主题适配
    status: completed
    dependencies:
      - tab-html
  - id: tab-js
    content: 实现Tab切换JS逻辑
    status: completed
    dependencies:
      - tab-css
  - id: timeline-css
    content: 增强inline-tool-call为时间线节点：连接线、状态标记器、折叠动画
    status: completed
    dependencies:
      - tab-js
  - id: timeline-js
    content: 重构renderer.js：耗时计算、折叠状态持久化、性能优化
    status: completed
    dependencies:
      - timeline-css
---

# UX升级计划：时间线步骤展示与Tab面板

## 升级范围

### 保持当前设计

- 整体色系（珊瑚色 `#c4917b`、奶油色 `#f5f5f0`）
- 字体选择（Inter + EB Garamond）
- 左侧边栏样式
- 主界面输入框和快速模板

### 引入新设计

- **增强现有 `.inline-tool-call` 为时间线节点**（非新建结构）
- 右侧面板Tab切换（任务/活动两个Tab）

---

## 一、右侧面板Tab化（优先实现）

将当前的线性布局改为Tab切换模式，简化信息架构。

### Tab结构

```
┌────────────────────────────────────┐
│     [任务]      [活动]             │ ← Tab 按钮
├────────────────────────────────────┤
│                                    │
│         Tab 内容区域               │
│                                    │
└────────────────────────────────────┘
```

| Tab名称 | 内容 | 对应现有元素 |

|---------|------|--------------|

| 任务 | TodoWrite 产生的任务列表 | `#stepsList` |

| 活动 | 所有工具调用的时间线 | `#toolCallsList` |

> ⚠️ **设计决策**：原计划中的「文件变更」Tab因需要后端支持文件diff，从MVP中移除。

### 修改文件

**[renderer/index.html](renderer/index.html)**

```html
<!-- 在 aside.sidebar 内部，sidebar-header 之后添加 -->
<div class="panel-tabs">
  <button class="panel-tab active" data-tab="tasks">任务</button>
  <button class="panel-tab" data-tab="activity">活动</button>
</div>

<!-- 包装现有内容 -->
<div class="tab-pane active" id="tasksPane">
  <!-- 移动 stepsList 到这里 -->
</div>
<div class="tab-pane" id="activityPane">
  <!-- 移动 toolCallsList 到这里 -->
</div>
```

**[renderer/style.css](renderer/style.css)**

```css
/* Tab容器 */
.panel-tabs {
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid #3a3a3a;
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  padding: 12px 8px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #808080;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.panel-tab:hover {
  color: #b0b0b0;
}

.panel-tab.active {
  color: #ffffff;
  border-bottom-color: var(--accent-coral);
}

/* Tab内容区 */
.tab-pane {
  display: none;
  flex: 1;
  overflow: hidden;
  flex-direction: column;
}

.tab-pane.active {
  display: flex;
}
```

**[renderer/renderer.js](renderer/renderer.js)**

```javascript
// 新增 switchTab() 函数
function switchTab(tabName) {
  // 更新Tab按钮状态
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // 更新Tab内容区
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabName}Pane`);
  });
}

// 在 setupEventListeners() 中添加
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});
```

---

## 二、时间线式步骤展示

**核心策略**：增强现有 `.inline-tool-call` 组件，添加时间线视觉效果，避免创建重复结构。

### 增强后的视觉结构

```
┌─ .message.assistant (添加时间线容器样式)
│
│  ┌─ .inline-tool-call (增强为时间线节点)
│  │  ├─ ::before (垂直连接线)
│  │  ├─ .step-marker (状态圆点，新增)
│  │  │  └─ 状态图标 (success/running/error)
│  │  │
│  │  ├─ .inline-tool-header (复用，添加耗时显示)
│  │  │  ├─ 工具图标
│  │  │  ├─ 工具名称
│  │  │  ├─ 耗时标签 (新增)
│  │  │  └─ 展开按钮
│  │  │
│  │  └─ .inline-tool-result (复用，可折叠)
│  │
│  ├─ .inline-tool-call (下一个节点)
│  ...
```

### 修改文件

**[renderer/style.css](renderer/style.css)**

```css
/* 时间线连接线 */
.message.assistant .message-content {
  position: relative;
}

.inline-tool-call {
  position: relative;
  padding-left: 28px; /* 为标记器留空间 */
}

/* 垂直连接线 */
.inline-tool-call::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-light);
}

/* 最后一个节点不显示下方连接线 */
.inline-tool-call:last-of-type::before {
  bottom: 50%;
}

/* 状态标记器 */
.step-marker {
  position: absolute;
  left: 0;
  top: 12px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  background: var(--bg-white);
}

.step-marker.running {
  background: var(--accent-coral);
  animation: pulse 1.5s ease-in-out infinite;
}

.step-marker.success {
  background: var(--status-success);
}

.step-marker.error {
  background: var(--status-error);
}

.step-marker svg {
  width: 10px;
  height: 10px;
  color: white;
}

/* 耗时标签 */
.tool-duration {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
  font-family: 'Monaco', monospace;
}

/* 折叠动画 */
.inline-tool-result {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.inline-tool-call.expanded .inline-tool-result {
  max-height: 500px;
}

/* 新增状态色彩变量 */
:root {
  --status-success: #4ade80;
  --status-error: #ef4444;
  --status-info: #5b8def;
}

[data-theme="dark"] {
  --status-success: #22c55e;
  --status-error: #f87171;
  --status-info: #60a5fa;
}
```

**[renderer/renderer.js](renderer/renderer.js)**

```javascript
// 修改 addInlineToolCall() - 添加状态标记器和耗时
function addInlineToolCall(contentDiv, toolName, toolInput, toolId) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'inline-tool-call';
  toolDiv.dataset.toolId = toolId;
  toolDiv.dataset.startTime = Date.now(); // 记录开始时间

  toolDiv.innerHTML = `
    <div class="step-marker running">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="12" cy="12" r="6"></circle>
      </svg>
    </div>
    <div class="inline-tool-header" onclick="toggleInlineToolCall(this)">
      <!-- 现有内容 -->
      <span class="tool-duration"></span>
      <svg class="expand-icon">...</svg>
    </div>
    <div class="inline-tool-result">...</div>
  `;
  // ...
}

// 新增：更新耗时显示
function updateToolDuration(toolId) {
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  if (!toolDiv) return;
  
  const startTime = parseInt(toolDiv.dataset.startTime);
  const duration = Date.now() - startTime;
  const durationEl = toolDiv.querySelector('.tool-duration');
  
  if (durationEl) {
    if (duration < 1000) {
      durationEl.textContent = `${duration}ms`;
    } else {
      durationEl.textContent = `${(duration / 1000).toFixed(1)}s`;
    }
  }
}

// 修改 updateInlineToolResult() - 更新状态标记器
function updateInlineToolResult(toolId, result) {
  const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
  if (!toolDiv) return;
  
  // 更新状态标记器
  const marker = toolDiv.querySelector('.step-marker');
  if (marker) {
    marker.className = 'step-marker success';
    marker.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
  }
  
  // 更新耗时
  updateToolDuration(toolId);
  
  // 现有结果更新逻辑...
}

// 新增：折叠状态持久化
function saveCollapsedState() {
  if (!currentChatId) return;
  
  const collapsed = Array.from(
    document.querySelectorAll('.inline-tool-call:not(.expanded)')
  ).map(el => el.dataset.toolId);
  
  localStorage.setItem(`collapsed_${currentChatId}`, JSON.stringify(collapsed));
}

function restoreCollapsedState() {
  if (!currentChatId) return;
  
  const collapsed = JSON.parse(
    localStorage.getItem(`collapsed_${currentChatId}`) || '[]'
  );
  
  collapsed.forEach(toolId => {
    const toolDiv = document.querySelector(`.inline-tool-call[data-tool-id="${toolId}"]`);
    if (toolDiv) {
      toolDiv.classList.remove('expanded');
    }
  });
}
```

---

## 三、验收标准

| 任务ID | 验收条件 |

|--------|----------|

| tab-html | Tab按钮可见，HTML结构正确 |

| tab-css | Tab切换时有视觉反馈，暗色主题下颜色正确 |

| tab-js | 点击Tab可切换内容区，状态不丢失 |

| timeline-css | 连接线可见，状态标记器颜色正确，折叠动画流畅 |

| timeline-js | 耗时显示准确，刷新后折叠状态保持 |

---

## 四、工作量估算

| 模块 | 代码行数 | 工作量 | 优先级 |

|------|----------|--------|--------|

| Tab HTML结构 | ~30行 | 较小 | P0 |

| Tab CSS样式 | ~60行 | 较小 | P0 |

| Tab JS逻辑 | ~20行 | 较小 | P0 |

| 时间线CSS增强 | ~100行 | 中等 | P0 |

| 时间线JS逻辑 | ~80行 | 中等 | P0 |

**总计约 290 行代码变更**（较原计划减少40%）

---

## 五、风险与缓解

| 风险 | 缓解措施 |

|------|----------|

| 长会话性能问题（50+步骤） | 使用CSS `content-visibility: auto` 优化渲染 |

| 暗色主题适配遗漏 | 每个CSS变更同步添加 `[data-theme="dark"]` 规则 |

| 折叠状态localStorage膨胀 | 限制保存最近20个会话的折叠状态 |