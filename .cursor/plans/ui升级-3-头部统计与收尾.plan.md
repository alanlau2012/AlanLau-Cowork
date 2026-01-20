---
name: UI升级子Plan 3 - 头部统计与响应式收尾
overview: 完成头部统计区域、可访问性增强、响应式布局适配，以及所有测试和清理收尾工作。这是UI升级的最后一个子Plan。
todos:
  - id: p4-header-layout
    content: 'P4.1: 添加 .main-header 布局样式 [验收: 标题和统计并排]'
    status: pending
  - id: p4-task-stats
    content: 'P4.2: 添加任务统计样式 (时长/费用/步骤) [验收: 3 个指标显示]'
    status: pending
  - id: p5-focus-states
    content: 'P5.1: 添加 :focus-visible 样式 [验收: Tab 键导航有焦点环]'
    status: pending
  - id: p5-color-contrast
    content: 'P5.2: 检查并修复颜色对比度 (WCAG AA) [验收: 对比度 >= 4.5:1]'
    status: pending
  - id: p6-mobile-sidebar
    content: 'P6.1: 添加 <768px 左侧边栏抽屉化 [验收: 移动端可收起]'
    status: pending
  - id: p6-tablet-panel
    content: 'P6.2: 添加 768-1024px 右面板折叠 [验收: 平板端面板可折叠]'
    status: pending
  - id: p6-desktop-full
    content: 'P6.3: 添加 >1024px 完整三栏布局 [验收: 桌面端三栏显示]'
    status: pending
  - id: p7-header-html
    content: 'P7.1: 重构 chat-header 为 main-header 结构 [验收: 统计区域存在]'
    status: pending
  - id: p12-task-stats
    content: 'P12.1: 实现 updateTaskStats() [验收: 时长/费用/步骤更新]'
    status: pending
  - id: p14-unit-tests
    content: 'P14.1: 为新 uiHelpers 函数添加单元测试 [验收: 覆盖率 > 80%]'
    status: pending
  - id: p14-e2e-timeline
    content: 'P14.2: 更新 E2E 测试验证时间线渲染 [验收: 测试通过]'
    status: pending
  - id: p14-e2e-tabs
    content: 'P14.3: 添加 Tab 切换 E2E 测试 [验收: 测试通过]'
    status: pending
  - id: p14-a11y-audit
    content: 'P14.4: 运行 axe 可访问性审计 [验收: 无严重问题]'
    status: pending
  - id: p14-responsive-test
    content: 'P14.5: 手动测试 3 个断点 [验收: 截图确认]'
    status: pending
  - id: p15-cleanup
    content: 'P15.1: 删除废弃的 messages-container 相关代码'
    status: pending
  - id: p15-screenshots
    content: 'P15.2: 更新 screenshots/ 目录截图'
    status: pending
---

# UI升级子Plan 3: 头部统计与响应式收尾

## 概述

本子Plan完成UI升级的最后部分，包括：

1. 头部统计区域（时长/费用/步骤）
2. 可访问性增强（焦点状态、颜色对比度）
3. 响应式布局（3个断点）
4. 所有测试和清理收尾

**任务数量**: 16 个
**预估时间**: ~2.5 小时
**依赖**: 子Plan 1 (CSS变量系统), 子Plan 2 (Tab面板)

## 前置条件

- 子Plan 1 已完成（CSS变量系统、时间线视图）
- 子Plan 2 已完成（Tab面板系统）

## 依赖关系

```
P4.1-P4.2 头部CSS样式
  ↓
P7.1 头部HTML结构
  ↓
P12.1 任务统计JS
  ↓
P5.1-P5.2 可访问性增强 (并行)
P6.1-P6.3 响应式布局 (并行)
  ↓
P14.1-P14.5 测试
  ↓
P15.1-P15.2 清理收尾
```

---

## Phase 4: 头部样式

**文件**: `renderer/style.css`

| ID   | 任务                  | 验收标准       |
| ---- | --------------------- | -------------- |
| P4.1 | .main-header 布局样式 | 标题和统计并排 |
| P4.2 | 任务统计样式          | 3 个指标显示   |

### 头部CSS代码

```css
/* P4.1 头部布局 */
.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-title .icon {
  font-size: 20px;
}

/* P4.2 任务统计 */
.task-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.stat-item .icon {
  font-size: 14px;
}

.stat-item .value {
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* 统计项hover效果 */
.stat-item:hover {
  background: var(--bg-hover);
}

/* 费用统计特殊样式 */
.stat-item.cost .value {
  color: var(--status-success);
}

/* 运行中动画 */
.stat-item.running .icon {
  animation: pulse 1.5s infinite;
}
```

---

## Phase 5: 可访问性增强

**文件**: `renderer/style.css`

| ID   | 任务                | 验收标准           |
| ---- | ------------------- | ------------------ |
| P5.1 | :focus-visible 样式 | Tab 键导航有焦点环 |
| P5.2 | 颜色对比度修复      | 对比度 >= 4.5:1    |

### 可访问性CSS代码

```css
/* P5.1 焦点状态 */
:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* 特定元素焦点样式 */
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
[role='tab']:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* 移除默认焦点样式（仅保留 focus-visible） */
:focus:not(:focus-visible) {
  outline: none;
}

/* P5.2 颜色对比度修复 */
/* 确保次要文本对比度足够 */
:root {
  /* 浅色主题 - 确保次要文本对比度 >= 4.5:1 */
  --text-secondary: #5a5a5a; /* 对比度 6.5:1 on white */
  --text-tertiary: #7a7a7a; /* 对比度 4.7:1 on white */
}

[data-theme='dark'] {
  /* 暗色主题 - 确保次要文本对比度 >= 4.5:1 */
  --text-secondary: #a0a0a0; /* 对比度 6.8:1 on #1a1a1a */
  --text-tertiary: #808080; /* 对比度 4.6:1 on #1a1a1a */
}

/* 跳过链接（屏幕阅读器可见） */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  z-index: 1000;
  transition: top var(--transition-fast);
}

.skip-link:focus {
  top: 0;
}
```

---

## Phase 6: 响应式布局

**文件**: `renderer/style.css`

| ID   | 任务                  | 验收标准         |
| ---- | --------------------- | ---------------- |
| P6.1 | <768px 左侧边栏抽屉化 | 移动端可收起     |
| P6.2 | 768-1024px 右面板折叠 | 平板端面板可折叠 |
| P6.3 | >1024px 完整三栏布局  | 桌面端三栏显示   |

### 响应式CSS代码

```css
/* P6.3 桌面端 (>1024px) - 默认布局 */
.app-container {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  height: 100vh;
}

.left-sidebar {
  border-right: 1px solid var(--border-color);
}

.right-panel {
  border-left: 1px solid var(--border-color);
}

/* P6.2 平板端 (768-1024px) */
@media (max-width: 1024px) {
  .app-container {
    grid-template-columns: 240px 1fr;
  }

  .right-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 320px;
    transform: translateX(100%);
    transition: transform var(--transition-normal);
    z-index: 100;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  }

  .right-panel.open {
    transform: translateX(0);
  }

  /* 面板遮罩 */
  .panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-normal);
    z-index: 99;
  }

  .panel-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* 面板切换按钮 */
  .panel-toggle {
    display: flex;
    position: fixed;
    right: 16px;
    bottom: 80px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--accent-color);
    color: white;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-card);
    z-index: 98;
  }
}

/* P6.1 移动端 (<768px) */
@media (max-width: 768px) {
  .app-container {
    grid-template-columns: 1fr;
  }

  .left-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
    z-index: 101;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
  }

  .left-sidebar.open {
    transform: translateX(0);
  }

  /* 侧边栏遮罩 */
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-normal);
    z-index: 100;
  }

  .sidebar-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* 汉堡菜单按钮 */
  .menu-toggle {
    display: flex;
    position: fixed;
    left: 16px;
    top: 16px;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    align-items: center;
    justify-content: center;
    z-index: 99;
  }

  /* 头部响应式调整 */
  .main-header {
    padding: 12px 16px;
    padding-left: 64px; /* 为汉堡菜单留空间 */
  }

  .task-stats {
    gap: 8px;
  }

  .stat-item {
    padding: 4px 8px;
    font-size: 12px;
  }

  /* 隐藏统计标签，只显示值 */
  .stat-item .label {
    display: none;
  }
}

/* 隐藏移动端专用元素（桌面端） */
@media (min-width: 769px) {
  .menu-toggle,
  .sidebar-overlay {
    display: none;
  }
}

@media (min-width: 1025px) {
  .panel-toggle,
  .panel-overlay {
    display: none;
  }
}
```

---

## Phase 7: HTML 结构 (头部部分)

**文件**: `renderer/index.html`

| ID   | 任务                            | 验收标准     |
| ---- | ------------------------------- | ------------ |
| P7.1 | 重构 chat-header 为 main-header | 统计区域存在 |

### HTML模板

```html
<!-- P7.1 任务头部 -->
<header class="main-header">
  <div class="task-title">
    <span class="icon">💬</span>
    <span class="title" id="chatTitle">新对话</span>
  </div>
  <div class="task-stats">
    <span class="stat-item duration">
      <span class="icon">⏱️</span>
      <span class="label">时长</span>
      <span class="value" id="stat-duration">0:00</span>
    </span>
    <span class="stat-item cost">
      <span class="icon">💰</span>
      <span class="label">费用</span>
      <span class="value" id="stat-cost">$0.00</span>
    </span>
    <span class="stat-item steps">
      <span class="icon">📊</span>
      <span class="label">步骤</span>
      <span class="value" id="stat-steps">0</span>
    </span>
  </div>
</header>

<!-- 移动端菜单按钮 -->
<button class="menu-toggle" aria-label="打开菜单" aria-expanded="false">
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <rect y="3" width="20" height="2" rx="1" />
    <rect y="9" width="20" height="2" rx="1" />
    <rect y="15" width="20" height="2" rx="1" />
  </svg>
</button>

<!-- 平板端面板按钮 -->
<button class="panel-toggle" aria-label="打开详情面板" aria-expanded="false">
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h14v2H3v-2z" />
  </svg>
</button>

<!-- 遮罩层 -->
<div class="sidebar-overlay" aria-hidden="true"></div>
<div class="panel-overlay" aria-hidden="true"></div>
```

---

## Phase 12: 任务统计逻辑

**文件**: `renderer/uiHelpers.js`

| ID    | 任务              | 验收标准           |
| ----- | ----------------- | ------------------ |
| P12.1 | updateTaskStats() | 时长/费用/步骤更新 |

### 核心函数签名

```javascript
// P12.1 更新任务统计
export function updateTaskStats(stats) {
  // stats: { duration?: number, cost?: number, steps?: number }

  if (stats.duration !== undefined) {
    const durationEl = document.getElementById('stat-duration');
    durationEl.textContent = formatDuration(stats.duration);
  }

  if (stats.cost !== undefined) {
    const costEl = document.getElementById('stat-cost');
    costEl.textContent = formatCost(stats.cost);
  }

  if (stats.steps !== undefined) {
    const stepsEl = document.getElementById('stat-steps');
    stepsEl.textContent = stats.steps;
  }
}

// 格式化时长 (秒 -> mm:ss 或 hh:mm:ss)
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 格式化费用
function formatCost(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

---

## Phase 14: 测试

| ID    | 任务                      | 验收标准     |
| ----- | ------------------------- | ------------ |
| P14.1 | 新 uiHelpers 函数单元测试 | 覆盖率 > 80% |
| P14.2 | E2E 测试验证时间线渲染    | 测试通过     |
| P14.3 | Tab 切换 E2E 测试         | 测试通过     |
| P14.4 | axe 可访问性审计          | 无严重问题   |
| P14.5 | 手动测试 3 个断点         | 截图确认     |

### 单元测试示例

```javascript
// tests/unit/uiHelpers.test.js

describe('updateTaskStats', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="stat-duration">0:00</span>
      <span id="stat-cost">$0.00</span>
      <span id="stat-steps">0</span>
    `;
  });

  test('更新时长', () => {
    updateTaskStats({ duration: 125 });
    expect(document.getElementById('stat-duration').textContent).toBe('2:05');
  });

  test('更新费用', () => {
    updateTaskStats({ cost: 1234 });
    expect(document.getElementById('stat-cost').textContent).toBe('$12.34');
  });

  test('更新步骤数', () => {
    updateTaskStats({ steps: 15 });
    expect(document.getElementById('stat-steps').textContent).toBe('15');
  });
});

describe('formatDuration', () => {
  test('格式化秒数 < 1小时', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  test('格式化秒数 >= 1小时', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
```

### E2E测试示例

```javascript
// tests/e2e/ui-upgrade.spec.js

test('时间线步骤正确渲染', async ({ page }) => {
  await page.goto('/');
  await page.fill('#userInput', 'Hello');
  await page.click('#sendButton');

  // 验证时间线步骤出现
  await expect(page.locator('.timeline-step')).toBeVisible();
  await expect(page.locator('.step-marker')).toBeVisible();
  await expect(page.locator('.step-content')).toBeVisible();
});

test('Tab切换正常工作', async ({ page }) => {
  await page.goto('/');

  // 点击工具Tab
  await page.click('[aria-controls="pane-tools"]');
  await expect(page.locator('#pane-tools')).not.toHaveAttribute('hidden');
  await expect(page.locator('#pane-progress')).toHaveAttribute('hidden');

  // 键盘导航
  await page.press('[role="tab"]:focus', 'ArrowRight');
  await expect(page.locator('[aria-controls="pane-files"]')).toBeFocused();
});
```

---

## Phase 15: 清理收尾

| ID    | 任务                                   | 验收标准   |
| ----- | -------------------------------------- | ---------- |
| P15.1 | 删除废弃的 messages-container 相关代码 | 代码已清理 |
| P15.2 | 更新 screenshots/ 目录截图             | 截图已更新 |

### 清理检查清单

- [ ] 删除 `.messages-container` CSS
- [ ] 删除 `#messagesContainer` HTML
- [ ] 删除 `renderMessage()` 函数（如已被 `renderTimelineStep()` 替代）
- [ ] 删除 `style.css.backup`（如存在）
- [ ] 更新 README.md 截图引用

---

## 验收检查清单

完成本子Plan后，逐项验证：

- [ ] 头部显示时长/费用/步骤 3 个统计
- [ ] 统计数据实时更新
- [ ] Tab键导航有焦点环
- [ ] 颜色对比度 >= 4.5:1 (WCAG AA)
- [ ] 移动端 (<768px) 左侧边栏抽屉化
- [ ] 平板端 (768-1024px) 右面板可折叠
- [ ] 桌面端 (>1024px) 完整三栏布局
- [ ] 所有单元测试通过
- [ ] 所有E2E测试通过
- [ ] axe可访问性审计无严重问题
- [ ] 3个断点截图已更新
- [ ] 废弃代码已清理

## 验证命令

```bash
# 运行所有测试
npm run test:all

# 可访问性审计
npx axe-core renderer/index.html

# 响应式测试（手动）
# 1. 打开DevTools
# 2. 切换到设备模式
# 3. 测试 375px / 768px / 1024px / 1440px
# 4. 截图保存到 screenshots/
```

---

## 整体UI升级完成检查清单

完成所有3个子Plan后，进行整体验收：

- [ ] 时间线步骤正确渲染（用户/助手/工具）
- [ ] 步骤可折叠/展开，动画流畅
- [ ] Tab切换正常，Badge显示正确
- [ ] 键盘导航可用（Tab键 + 方向键）
- [ ] 响应式布局在3个断点正常
- [ ] 空状态和错误状态正确显示
- [ ] 所有测试通过
- [ ] 无可访问性严重问题
- [ ] 废弃代码已清理
- [ ] 截图已更新
