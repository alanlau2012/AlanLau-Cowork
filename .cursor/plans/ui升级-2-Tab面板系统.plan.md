---
name: UI升级子Plan 2 - Tab面板系统
overview: 右侧边栏升级为Tab面板（进度/工具/文件），包含完整的CSS样式、HTML结构、ARIA可访问性属性和JavaScript交互逻辑。
todos:
  - id: p3-tab-nav
    content: 'P3.1: 添加 .panel-tabs 导航样式 [验收: Tab 按钮排列正确]'
    status: pending
  - id: p3-tab-active
    content: 'P3.2: 添加 Tab 激活状态和下划线 [验收: 选中态有下划线]'
    status: pending
  - id: p3-tab-pane
    content: 'P3.3: 添加 .tab-pane 内容区样式 [验收: 切换时隐藏/显示]'
    status: pending
  - id: p3-progress-summary
    content: 'P3.4: 添加进度摘要样式 [验收: 进度条正确显示]'
    status: pending
  - id: p3-file-change
    content: 'P3.5: 添加文件变更列表样式 [验收: 增删改有不同颜色]'
    status: pending
  - id: p8-tabs-structure
    content: 'P8.1: 添加 panel-tabs 导航结构 + ARIA 属性 [验收: role=tablist]'
    status: pending
  - id: p8-progress-pane
    content: 'P8.2: 添加进度 Tab 内容区 [验收: id=pane-progress]'
    status: pending
  - id: p8-tools-pane
    content: 'P8.3: 添加工具调用 Tab 内容区 [验收: id=pane-tools]'
    status: pending
  - id: p8-files-pane
    content: 'P8.4: 添加文件变更 Tab 内容区 [验收: id=pane-files]'
    status: pending
  - id: p9-empty-files
    content: 'P9.2: 添加文件变更空状态 [验收: 无变更时显示提示]'
    status: pending
  - id: p11-switch-tab
    content: 'P11.1: 实现 switchTab() 切换逻辑 [验收: Tab 切换正常]'
    status: pending
  - id: p11-tab-a11y
    content: 'P11.2: 添加 Tab 键盘导航 (方向键) [验收: 键盘可切换 Tab]'
    status: pending
  - id: p11-tab-scroll-pos
    content: 'P11.3: 实现 Tab 滚动位置保持 [验收: 切换回来位置不变]'
    status: pending
  - id: p11-tab-badge
    content: 'P11.4: 实现 Tab Badge 计数 [验收: 显示未读数量]'
    status: pending
  - id: p12-file-changes
    content: 'P12.2: 实现 addFileChange() 追踪文件 [验收: 文件列表更新]'
    status: pending
  - id: p12-progress-summary
    content: 'P12.3: 实现 updateProgressSummary() [验收: 进度条更新]'
    status: pending
  - id: p13-state-persist
    content: 'P13.2: 实现 Tab 状态 localStorage 持久化'
    status: pending
---

# UI升级子Plan 2: Tab面板系统完整功能

## 概述

本子Plan实现右侧边栏的Tab面板系统，包含进度、工具调用、文件变更三个Tab页，支持键盘导航和状态持久化。

**任务数量**: 17 个
**预估时间**: ~2.5 小时
**依赖**: 子Plan 1 (CSS变量系统)

## 前置条件

- 子Plan 1 已完成（CSS变量系统可用）
- 以下CSS变量已存在：
  - `--status-*` 状态色变量
  - `--radius-*` 圆角变量
  - `--shadow-*` 阴影变量
  - `--transition-*` 过渡变量

## 依赖关系

```
P3.1-P3.5 Tab CSS样式 (并行)
  ↓
P8.1-P8.4 Tab HTML结构
  ↓
P9.2 文件变更空状态
  ↓
P11.1-P11.4 Tab JS逻辑
  ↓
P12.2-P12.3 文件变更/进度摘要JS
  ↓
P13.2 Tab状态持久化
```

---

## Phase 3: Tab 面板样式

**文件**: `renderer/style.css`

| ID   | 任务                 | 验收标准         |
| ---- | -------------------- | ---------------- |
| P3.1 | .panel-tabs 导航样式 | Tab 按钮排列正确 |
| P3.2 | Tab 激活状态和下划线 | 选中态有下划线   |
| P3.3 | .tab-pane 内容区样式 | 切换时隐藏/显示  |
| P3.4 | 进度摘要样式         | 进度条正确显示   |
| P3.5 | 文件变更列表样式     | 增删改有不同颜色 |

### Tab CSS代码

```css
/* P3.1 Tab导航 */
.panel-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;
}

.panel-tabs button {
  flex: 1;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color var(--transition-fast);
}

.panel-tabs button:hover {
  color: var(--text-primary);
}

/* P3.2 激活状态 */
.panel-tabs button[aria-selected='true'] {
  color: var(--accent-color);
}

.panel-tabs button[aria-selected='true']::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-color);
  border-radius: 2px 2px 0 0;
}

/* Tab Badge */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  background: var(--status-info-bg);
  color: var(--status-info);
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
}

.tab-badge:empty {
  display: none;
}

/* P3.3 Tab内容区 */
.panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tab-pane {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 16px;
  opacity: 1;
  transition: opacity var(--transition-fast);
}

.tab-pane[hidden] {
  display: block;
  opacity: 0;
  pointer-events: none;
}

/* P3.4 进度摘要 */
.progress-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-bar-container {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  height: 8px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--accent-color);
  border-radius: var(--radius-sm);
  transition: width var(--transition-normal);
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

/* P3.5 文件变更列表 */
.file-changes-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: 'SF Mono', Monaco, monospace;
}

.file-change-item .icon {
  width: 16px;
  text-align: center;
}

.file-change-item.added .icon {
  color: var(--status-success);
}
.file-change-item.modified .icon {
  color: var(--status-info);
}
.file-change-item.deleted .icon {
  color: var(--status-error);
}

.file-change-item .path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-change-item .lines {
  font-size: 11px;
  color: var(--text-secondary);
}

.file-change-item .lines .added {
  color: var(--status-success);
}
.file-change-item .lines .removed {
  color: var(--status-error);
}
```

---

## Phase 8: HTML 结构

**文件**: `renderer/index.html`

| ID   | 任务                       | 验收标准         |
| ---- | -------------------------- | ---------------- |
| P8.1 | panel-tabs 导航结构 + ARIA | role=tablist     |
| P8.2 | 进度 Tab 内容区            | id=pane-progress |
| P8.3 | 工具调用 Tab 内容区        | id=pane-tools    |
| P8.4 | 文件变更 Tab 内容区        | id=pane-files    |

### HTML模板

```html
<!-- P8.1 Tab 导航 + ARIA -->
<aside class="right-panel" role="complementary">
  <div class="panel-tabs" role="tablist" aria-label="详情面板">
    <button
      role="tab"
      id="tab-progress"
      aria-selected="true"
      aria-controls="pane-progress"
      tabindex="0"
    >
      进度 <span class="tab-badge" id="badge-progress"></span>
    </button>
    <button
      role="tab"
      id="tab-tools"
      aria-selected="false"
      aria-controls="pane-tools"
      tabindex="-1"
    >
      工具 <span class="tab-badge" id="badge-tools"></span>
    </button>
    <button
      role="tab"
      id="tab-files"
      aria-selected="false"
      aria-controls="pane-files"
      tabindex="-1"
    >
      文件 <span class="tab-badge" id="badge-files"></span>
    </button>
  </div>

  <!-- P8.2-P8.4 Tab 内容区 -->
  <div class="panel-content">
    <!-- P8.2 进度 Tab -->
    <div id="pane-progress" role="tabpanel" aria-labelledby="tab-progress" class="tab-pane">
      <div class="progress-summary" id="progressSummary">
        <!-- 进度内容由JS渲染 -->
      </div>
    </div>

    <!-- P8.3 工具 Tab -->
    <div id="pane-tools" role="tabpanel" aria-labelledby="tab-tools" class="tab-pane" hidden>
      <div class="tool-calls-list" id="toolCallsList">
        <!-- 工具调用列表由JS渲染 -->
      </div>
    </div>

    <!-- P8.4 文件 Tab -->
    <div id="pane-files" role="tabpanel" aria-labelledby="tab-files" class="tab-pane" hidden>
      <div class="file-changes-list" id="fileChangesList">
        <!-- 文件变更列表由JS渲染 -->
      </div>

      <!-- P9.2 空状态 -->
      <div class="empty-state" id="filesEmpty">
        <div class="empty-icon">📁</div>
        <p>暂无文件变更</p>
      </div>
    </div>
  </div>
</aside>
```

---

## Phase 9: 文件变更空状态

| ID   | 任务           | 验收标准         |
| ---- | -------------- | ---------------- |
| P9.2 | 文件变更空状态 | 无变更时显示提示 |

---

## Phase 11: Tab 切换逻辑

**文件**: `renderer/uiHelpers.js`

| ID    | 任务                 | 验收标准         |
| ----- | -------------------- | ---------------- |
| P11.1 | switchTab() 切换逻辑 | Tab 切换正常     |
| P11.2 | Tab 键盘导航         | 键盘可切换 Tab   |
| P11.3 | Tab 滚动位置保持     | 切换回来位置不变 |
| P11.4 | Tab Badge 计数       | 显示未读数量     |

### 核心函数签名

```javascript
// Tab滚动位置缓存
const tabScrollPositions = {
  progress: 0,
  tools: 0,
  files: 0
};

// P11.1 Tab切换
export function switchTab(tabId) {
  // tabId: 'progress' | 'tools' | 'files'
  // 1. 保存当前Tab滚动位置
  // 2. 更新ARIA属性
  // 3. 切换Tab显示
  // 4. 恢复目标Tab滚动位置
}

// P11.2 键盘导航
export function initTabKeyboardNav() {
  // 监听方向键，切换Tab焦点
  // Left/Up: 前一个Tab
  // Right/Down: 下一个Tab
  // Home: 第一个Tab
  // End: 最后一个Tab
}

// P11.3 滚动位置保持
function saveTabScrollPosition(tabId) {
  const pane = document.getElementById(`pane-${tabId}`);
  tabScrollPositions[tabId] = pane.scrollTop;
}

function restoreTabScrollPosition(tabId) {
  const pane = document.getElementById(`pane-${tabId}`);
  pane.scrollTop = tabScrollPositions[tabId];
}

// P11.4 Badge计数
export function updateTabBadge(tabId, count) {
  const badge = document.getElementById(`badge-${tabId}`);
  badge.textContent = count > 0 ? count : '';
}
```

---

## Phase 12: 文件变更与进度摘要

**文件**: `renderer/uiHelpers.js`

| ID    | 任务                    | 验收标准     |
| ----- | ----------------------- | ------------ |
| P12.2 | addFileChange()         | 文件列表更新 |
| P12.3 | updateProgressSummary() | 进度条更新   |

### 核心函数签名

```javascript
// P12.2 添加文件变更
export function addFileChange(change) {
  // change: { path, type: 'added'|'modified'|'deleted', lines?: { added, removed } }
  // 1. 更新fileChanges数组
  // 2. 渲染文件变更项
  // 3. 更新Badge计数
  // 4. 隐藏空状态
}

// P12.3 更新进度摘要
export function updateProgressSummary(progress) {
  // progress: { completed, total, percentage, currentStep }
  // 1. 更新进度条宽度
  // 2. 更新统计文本
  // 3. 更新当前步骤描述
}
```

---

## Phase 13: 状态持久化

| ID    | 任务                         | 验收标准          |
| ----- | ---------------------------- | ----------------- |
| P13.2 | Tab 状态 localStorage 持久化 | 刷新后恢复上次Tab |

```javascript
// 保存当前Tab
function persistActiveTab(tabId) {
  localStorage.setItem('ui_active_tab', tabId);
}

// 恢复上次Tab
function restoreActiveTab() {
  const savedTab = localStorage.getItem('ui_active_tab');
  if (savedTab && ['progress', 'tools', 'files'].includes(savedTab)) {
    switchTab(savedTab);
  }
}
```

---

## 验收检查清单

完成本子Plan后，逐项验证：

- [ ] Tab按钮排列正确（进度/工具/文件）
- [ ] 选中Tab有下划线指示
- [ ] Tab切换时内容区正确显示/隐藏
- [ ] 键盘导航可用（方向键切换Tab焦点）
- [ ] Tab Badge显示未读数量
- [ ] 切换Tab后滚动位置保持
- [ ] 文件变更列表正确显示（增/删/改有不同颜色）
- [ ] 进度摘要正确显示（进度条+统计）
- [ ] 空状态正确显示（无文件变更时）
- [ ] 刷新页面后Tab状态恢复

## 验证命令

```bash
# 运行相关E2E测试
npm run test:e2e -- --grep "Tab"

# 手动验证
# 1. 启动应用：npm start
# 2. 点击各Tab按钮验证切换
# 3. 按方向键验证键盘导航
# 4. 刷新页面验证状态恢复
```

---

## 与其他子Plan的接口

### 依赖（来自子Plan 1）

- CSS变量系统（状态色、圆角、阴影、过渡）

### 提供（给子Plan 3）

- Tab切换函数 `switchTab()`
- Badge更新函数 `updateTabBadge()`
- 进度摘要更新函数 `updateProgressSummary()`
