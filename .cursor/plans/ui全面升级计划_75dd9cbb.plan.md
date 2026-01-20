---
name: UI全面升级计划
overview: 根据 upgraded-prototype.html 高保真原型，全面升级当前项目的 UI，包括时间线视图、Tab 面板、任务头部统计、文件变更追踪等核心功能。
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
  - id: p7-timeline-wrapper
    content: 'P7.2: 添加 timeline-container 包装器 [验收: 容器存在]'
    status: pending
  - id: p7-timeline-step-tpl
    content: 'P7.3: 添加时间线步骤模板结构 [验收: 包含 marker + content]'
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
  - id: p9-empty-timeline
    content: 'P9.1: 添加时间线空状态 UI [验收: 无步骤时显示引导]'
    status: pending
  - id: p9-empty-files
    content: 'P9.2: 添加文件变更空状态 [验收: 无变更时显示提示]'
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
  - id: p12-task-stats
    content: 'P12.1: 实现 updateTaskStats() [验收: 时长/费用/步骤更新]'
    status: pending
  - id: p12-file-changes
    content: 'P12.2: 实现 addFileChange() 追踪文件 [验收: 文件列表更新]'
    status: pending
  - id: p12-progress-summary
    content: 'P12.3: 实现 updateProgressSummary() [验收: 进度条更新]'
    status: pending
  - id: p13-state-vars
    content: 'P13.1: 添加 fileChanges/taskStats/activeTab 状态变量'
    status: pending
  - id: p13-state-persist
    content: 'P13.2: 实现 Tab 状态 localStorage 持久化'
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

# UI 全面升级计划 (v2.0 - 细粒度版)

## 概述

本计划将原有 10 个粗粒度任务拆分为 **45 个可执行任务**，每个任务：

- 预估时间 ≤ 30 分钟
- 有明确的验收标准
- 可独立提交

## 里程碑

```
┌─────────────────────────────────────────────────────────────────┐
│ M0: 准备       │ M1: CSS完成      │ M2: HTML完成    │ M3: JS完成 │
│ (P0)           │ (P1-P6)          │ (P7-P9)         │ (P10-P13)  │
│ ~10min         │ ~3.5h            │ ~1.5h           │ ~2h        │
└─────────────────────────────────────────────────────────────────┘
                                                          ↓
                                               ┌──────────────────┐
                                               │ M4: 测试与收尾   │
                                               │ (P14-P15)        │
                                               │ ~1h              │
                                               └──────────────────┘
```

**总预估时间: ~8 小时**

---

## Phase 0: 准备工作

| ID | 任务 | 验收标准 |

|----|------|---------|

| P0.1 | 创建分支 `feature/ui-upgrade-v2` 并备份 `style.css` | 分支存在，备份文件存在 |

---

## Phase 1: CSS 变量系统

**文件**: `renderer/style.css`

| ID | 任务 | 验收标准 | 依赖 |

|----|------|---------|------|

| P1.1 | 状态色变量 | 8 个变量存在 | - |

| P1.2 | 圆角变量 | 4 个变量存在 | - |

| P1.3 | 阴影变量 | 3 个变量存在 | - |

| P1.4 | 过渡动画变量 | 3 个变量存在 | - |

| P1.5 | 响应式断点 | 媒体查询可用 | - |

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

| ID | 任务 | 验收标准 | 依赖 |

|----|------|---------|------|

| P2.1 | timeline-container 布局 | 空容器正确显示 | P1.1 |

| P2.2 | step-marker 4 种状态 | 4 种颜色圆点 | P2.1 |

| P2.3 | 步骤连接线 | 连接线显示 | P2.2 |

| P2.4 | step-content 卡片 | 有圆角和阴影 | P2.1 |

| P2.5 | 折叠/展开动画 | 点击可折叠 | P2.4, P1.4 |

| P2.6 | 当前/历史视觉层次 | 当前步骤高亮 | P2.4 |

---

## Phase 3-6: Tab/头部/可访问性/响应式

（详见任务列表）

---

## Phase 7-9: HTML 结构重构

### 主面板目标结构

```html
<div class="chat-main">
  <!-- P7.1 任务头部 -->
  <header class="main-header">
    <div class="task-title">...</div>
    <div class="task-stats">
      <span class="stat-item">⏱️ <span id="stat-duration">0:00</span></span>
      <span class="stat-item">💰 <span id="stat-cost">$0.00</span></span>
      <span class="stat-item">📊 <span id="stat-steps">0</span> steps</span>
    </div>
  </header>

  <!-- P7.2 + P7.3 时间线容器 -->
  <div class="timeline-container" id="timelineContainer">
    <div class="timeline" id="timeline">
      <!-- 时间线步骤由 JS 动态渲染 -->
    </div>
    <!-- P9.1 空状态 -->
    <div class="empty-state" id="timelineEmpty">
      <p>开始对话，这里将显示执行步骤...</p>
    </div>
  </div>

  <!-- 输入区域保持不变 -->
  <div class="input-section">...</div>
</div>
```

### 右侧面板目标结构

```html
<!-- P8.1 Tab 导航 + ARIA -->
<aside class="right-panel" role="complementary">
  <div class="panel-tabs" role="tablist" aria-label="详情面板">
    <button role="tab" aria-selected="true" aria-controls="pane-progress">
      进度 <span class="tab-badge" id="badge-progress"></span>
    </button>
    <button role="tab" aria-selected="false" aria-controls="pane-tools">
      工具 <span class="tab-badge" id="badge-tools"></span>
    </button>
    <button role="tab" aria-selected="false" aria-controls="pane-files">
      文件 <span class="tab-badge" id="badge-files"></span>
    </button>
  </div>

  <!-- P8.2-P8.4 Tab 内容区 -->
  <div class="panel-content">
    <div id="pane-progress" role="tabpanel" class="tab-pane active">...</div>
    <div id="pane-tools" role="tabpanel" class="tab-pane" hidden>...</div>
    <div id="pane-files" role="tabpanel" class="tab-pane" hidden>...</div>
  </div>
</aside>
```

---

## Phase 10-13: JavaScript 逻辑

### 核心函数签名

```javascript
// P10.1 构建时间线步骤 HTML
export function buildTimelineStepHTML(step: {
  id: string;
  type: 'user' | 'assistant' | 'tool';
  status: 'success' | 'running' | 'error';
  content: string;
  timestamp: Date;
  collapsed?: boolean;
}) => string;

// P11.1 Tab 切换
export function switchTab(tabId: 'progress' | 'tools' | 'files') => void;

// P12.1 更新任务统计
export function updateTaskStats(stats: {
  duration?: number;
  cost?: number;
  steps?: number;
}) => void;

// P12.2 添加文件变更
export function addFileChange(change: {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  lines?: { added: number; removed: number };
}) => void;
```

---

## 风险与缓解

| 风险 | 影响 | 缓解策略 |

|------|------|---------|

| 用户习惯迁移 | 用户可能不适应时间线 | 保留 `messages-container` 作为 fallback，1 周后删除 |

| 信息密度过高 | 新用户可能困惑 | P9.1 添加空状态引导 |

| 性能感知变慢 | 更多元素渲染 | P2.5 使用 CSS 动画而非 JS |

| Tab 状态丢失 | 切换后滚动位置丢失 | P11.3 实现位置保持 |

---

## 验收检查清单

完成所有任务后，逐项检查：

- [ ] 时间线步骤正确渲染（用户/助手/工具）
- [ ] 步骤可折叠/展开，动画流畅
- [ ] Tab 切换正常，Badge 显示正确
- [ ] 键盘导航可用（Tab 键 + 方向键）
- [ ] 响应式布局在 3 个断点正常
- [ ] 空状态和错误状态正确显示
- [ ] 所有测试通过
- [ ] 无可访问性严重问题
