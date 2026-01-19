---
name: UI升级子Plan 1 - 时间线视图
overview: 将消息列表升级为时间线步骤视图，包含完整的CSS样式、HTML结构和JavaScript逻辑。这是UI升级的基础模块，包含CSS变量系统供后续子Plan依赖。
todos:
  - id: p0-backup
    content: 'P0.1: 创建 UI 升级分支并备份当前 style.css'
    status: pending
  - id: p1-css-status-colors
    content: 'P1.1: 添加状态色变量 (success/error/info/running) [验收: DevTools 检查 8 个变量]'
    status: pending
  - id: p1-css-radius
    content: 'P1.2: 添加圆角变量 (sm/md/lg/xl) [验收: 4 个变量存在]'
    status: pending
  - id: p1-css-shadows
    content: 'P1.3: 添加阴影变量 (soft/input/card) [验收: 3 个变量存在]'
    status: pending
  - id: p1-css-transitions
    content: 'P1.4: 添加过渡动画变量 (fast/normal/slow) [验收: 3 个变量存在]'
    status: pending
  - id: p1-css-breakpoints
    content: 'P1.5: 添加响应式断点变量 (768px/1024px/1280px) [验收: 媒体查询可用]'
    status: pending
  - id: p2-timeline-container
    content: 'P2.1: 添加 .timeline-container 基础布局 [验收: 空容器正确显示]'
    status: pending
  - id: p2-step-marker
    content: 'P2.2: 添加 .step-marker 及 4 种状态样式 [验收: 4 种颜色圆点]'
    status: pending
  - id: p2-step-line
    content: 'P2.3: 添加步骤之间的连接线样式 [验收: 连接线显示]'
    status: pending
  - id: p2-step-content
    content: 'P2.4: 添加 .step-content 卡片样式 [验收: 卡片有圆角和阴影]'
    status: pending
  - id: p2-step-collapse
    content: 'P2.5: 添加卡片折叠/展开动画 [验收: 点击头部可折叠]'
    status: pending
  - id: p2-step-states
    content: 'P2.6: 添加当前/历史步骤视觉层次 [验收: 当前步骤高亮]'
    status: pending
  - id: p7-timeline-wrapper
    content: 'P7.2: 添加 timeline-container 包装器 [验收: 容器存在]'
    status: pending
  - id: p7-timeline-step-tpl
    content: 'P7.3: 添加时间线步骤模板结构 [验收: 包含 marker + content]'
    status: pending
  - id: p9-empty-timeline
    content: 'P9.1: 添加时间线空状态 UI [验收: 无步骤时显示引导]'
    status: pending
  - id: p9-error-state
    content: 'P9.3: 添加步骤失败状态 UI [验收: 错误时显示重试按钮]'
    status: pending
  - id: p10-build-step-html
    content: 'P10.1: 实现 buildTimelineStepHTML() [验收: 单元测试通过]'
    status: pending
  - id: p10-render-timeline
    content: 'P10.2: 实现 renderTimelineStep() 替换 renderMessage [验收: 消息显示为步骤]'
    status: pending
  - id: p10-step-collapse-js
    content: 'P10.3: 实现步骤折叠/展开交互 [验收: 点击可折叠]'
    status: pending
  - id: p10-auto-scroll
    content: 'P10.4: 实现新步骤自动滚动 [验收: 新步骤自动进入视口]'
    status: pending
  - id: p13-state-vars-timeline
    content: 'P13.1a: 添加 timelineSteps 状态变量'
    status: pending
---

# UI升级子Plan 1: 时间线视图完整功能

## 概述

本子Plan实现时间线视图的完整功能，将原有的消息列表升级为可视化的步骤时间线。作为UI升级的第一个子Plan，还包含CSS变量系统（供后续子Plan复用）。

**任务数量**: 21 个
**预估时间**: ~3 小时

## 依赖关系

```
P0.1 准备工作
  ↓
P1.1-P1.5 CSS变量系统 (并行)
  ↓
P2.1-P2.6 时间线CSS样式
  ↓
P7.2-P7.3 时间线HTML结构
  ↓
P9.1, P9.3 空状态/错误状态
  ↓
P10.1-P10.4 时间线JS逻辑
  ↓
P13.1a 状态变量
```

---

## Phase 0: 准备工作

| ID   | 任务                                                | 验收标准               |
| ---- | --------------------------------------------------- | ---------------------- |
| P0.1 | 创建分支 `feature/ui-upgrade-v2` 并备份 `style.css` | 分支存在，备份文件存在 |

---

## Phase 1: CSS 变量系统

**文件**: `renderer/style.css`

此阶段添加的变量将被后续子Plan (Tab面板、响应式) 复用。

| ID   | 任务         | 验收标准     |
| ---- | ------------ | ------------ |
| P1.1 | 状态色变量   | 8 个变量存在 |
| P1.2 | 圆角变量     | 4 个变量存在 |
| P1.3 | 阴影变量     | 3 个变量存在 |
| P1.4 | 过渡动画变量 | 3 个变量存在 |
| P1.5 | 响应式断点   | 媒体查询可用 |

### CSS变量代码

```css
/* P1.1 状态色 */
--status-success: #4ade80;
--status-success-bg: rgba(74, 222, 128, 0.12);
--status-error: #ef4444;
--status-error-bg: rgba(239, 68, 68, 0.12);
--status-info: #5b8def;
--status-info-bg: rgba(91, 141, 239, 0.12);
--status-running: #c4917b;
--status-running-bg: rgba(196, 145, 123, 0.15);

/* P1.2 圆角 */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;

/* P1.3 阴影 */
--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.04);
--shadow-input: 0 4px 16px rgba(0, 0, 0, 0.06);
--shadow-card: 0 2px 12px rgba(0, 0, 0, 0.06);

/* P1.4 过渡 */
--transition-fast: 150ms ease-out;
--transition-normal: 250ms ease-out;
--transition-slow: 350ms ease-out;
```

---

## Phase 2: 时间线样式

**文件**: `renderer/style.css`

| ID   | 任务                    | 验收标准       | 依赖       |
| ---- | ----------------------- | -------------- | ---------- |
| P2.1 | timeline-container 布局 | 空容器正确显示 | P1.1       |
| P2.2 | step-marker 4 种状态    | 4 种颜色圆点   | P2.1       |
| P2.3 | 步骤连接线              | 连接线显示     | P2.2       |
| P2.4 | step-content 卡片       | 有圆角和阴影   | P2.1       |
| P2.5 | 折叠/展开动画           | 点击可折叠     | P2.4, P1.4 |
| P2.6 | 当前/历史视觉层次       | 当前步骤高亮   | P2.4       |

### 时间线CSS结构

```css
/* P2.1 容器 */
.timeline-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* P2.2 步骤标记 */
.timeline-step {
  display: flex;
  gap: 16px;
  position: relative;
}

.step-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.step-marker.success {
  background: var(--status-success);
}
.step-marker.error {
  background: var(--status-error);
}
.step-marker.info {
  background: var(--status-info);
}
.step-marker.running {
  background: var(--status-running);
  animation: pulse 1.5s infinite;
}

/* P2.3 连接线 */
.timeline-step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 24px;
  bottom: -8px;
  width: 2px;
  background: var(--border-color);
}

/* P2.4 内容卡片 */
.step-content {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* P2.5 折叠动画 */
.step-body {
  max-height: 1000px;
  overflow: hidden;
  transition: max-height var(--transition-normal);
}

.step-content.collapsed .step-body {
  max-height: 0;
}

/* P2.6 视觉层次 */
.timeline-step.current .step-content {
  border-left: 3px solid var(--accent-color);
}

.timeline-step.history .step-content {
  opacity: 0.85;
}
```

---

## Phase 7: HTML 结构 (时间线部分)

**文件**: `renderer/index.html`

| ID   | 任务                           | 验收标准              |
| ---- | ------------------------------ | --------------------- |
| P7.2 | 添加 timeline-container 包装器 | 容器存在              |
| P7.3 | 添加时间线步骤模板结构         | 包含 marker + content |

### HTML模板

```html
<!-- P7.2 + P7.3 时间线容器 -->
<div class="timeline-container" id="timelineContainer">
  <div class="timeline" id="timeline">
    <!-- 时间线步骤由 JS 动态渲染 -->
  </div>

  <!-- P9.1 空状态 -->
  <div class="empty-state" id="timelineEmpty">
    <div class="empty-icon">📋</div>
    <p>开始对话，这里将显示执行步骤...</p>
  </div>
</div>
```

---

## Phase 9: 空状态与错误状态

| ID   | 任务            | 验收标准           |
| ---- | --------------- | ------------------ |
| P9.1 | 时间线空状态 UI | 无步骤时显示引导   |
| P9.3 | 步骤失败状态 UI | 错误时显示重试按钮 |

---

## Phase 10: JavaScript 逻辑

**文件**: `renderer/uiHelpers.js`, `renderer/renderer.js`

| ID    | 任务                         | 验收标准           |
| ----- | ---------------------------- | ------------------ |
| P10.1 | 实现 buildTimelineStepHTML() | 单元测试通过       |
| P10.2 | 实现 renderTimelineStep()    | 消息显示为步骤     |
| P10.3 | 实现步骤折叠/展开交互        | 点击可折叠         |
| P10.4 | 实现新步骤自动滚动           | 新步骤自动进入视口 |

### 核心函数签名

```javascript
// P10.1 构建时间线步骤 HTML
export function buildTimelineStepHTML(step) {
  // step: { id, type, status, content, timestamp, collapsed }
  // returns: HTML string
}

// P10.2 渲染时间线步骤
export function renderTimelineStep(step) {
  // 在 timeline 容器中添加/更新步骤
}

// P10.3 折叠/展开
export function toggleStepCollapse(stepId) {
  // 切换步骤的折叠状态
}

// P10.4 自动滚动
export function scrollToLatestStep() {
  // 滚动到最新步骤
}
```

---

## Phase 13: 状态变量

| ID     | 任务                        | 验收标准         |
| ------ | --------------------------- | ---------------- |
| P13.1a | 添加 timelineSteps 状态变量 | 变量存在并可读写 |

```javascript
// renderer.js 或 chatStore.js
let timelineSteps = []; // 当前聊天的时间线步骤
```

---

## 验收检查清单

完成本子Plan后，逐项验证：

- [ ] CSS变量系统完整 (18个变量)
- [ ] 时间线容器正确渲染
- [ ] 用户/助手/工具 3 种步骤类型显示
- [ ] 4 种状态颜色正确 (success/error/info/running)
- [ ] 步骤可折叠/展开，动画流畅
- [ ] 空状态正确显示（无步骤时）
- [ ] 错误状态正确显示（步骤失败时）
- [ ] 新步骤自动滚动进入视口

## 验证命令

```bash
# 运行相关E2E测试
npm run test:e2e -- --grep "时间线"

# 手动验证
# 1. 启动应用：npm start
# 2. 发送一条消息
# 3. 观察时间线步骤渲染
# 4. 点击步骤头部验证折叠功能
```

---

## 与其他子Plan的接口

本子Plan为后续子Plan提供：

1. **CSS变量系统** - 所有状态色、圆角、阴影、过渡变量
2. **时间线容器** - `#timelineContainer` 元素
3. **步骤渲染函数** - `buildTimelineStepHTML()`, `renderTimelineStep()`

后续子Plan不需要修改本子Plan的代码，只需使用已定义的接口。
