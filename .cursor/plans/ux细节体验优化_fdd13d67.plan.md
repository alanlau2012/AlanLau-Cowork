---
name: UX细节体验优化
overview: 修复应用程序中滚动条不协调、视觉不一致等细节问题，提升整体用户体验的精细度和专业感。
todos:
  - id: scrollbar-left-sidebar
    content: 为 .chat-history-list 添加自定义滚动条样式
    status: completed
  - id: scrollbar-tool-details
    content: 为 .tool-call-details 和 .inline-tool-result 添加滚动条样式
    status: completed
  - id: dark-mode-scrollbar
    content: 为深色模式添加滚动条颜色覆盖
    status: completed
  - id: resizer-visibility
    content: 改进 resizer 的视觉可发现性
    status: completed
  - id: verify-all
    content: 启动应用验证所有修复效果
    status: completed
---

# UX细节体验优化计划

## 问题分析

### 1. 滚动条样式不统一（高优先级）

截图中左侧边栏红框标注的问题是 `.chat-history-list` 使用了系统默认滚动条，与应用其他区域的自定义滚动条风格不一致。

**受影响的元素**（有 `overflow-y: auto` 但缺少滚动条样式）：

- `.chat-history-list`（第144行）- **截图中标注的问题**
- `.tool-call-details`（第1468行）
- `.inline-tool-result`（第1622行）

**已有正确样式的元素**（可作为参考）：

- `.messages-container`（第1114-1129行）
- `.steps-list` / `.tool-calls-list`（第1273-1292行）
- `.panel-content`（第3111-3126行）

### 2. 顶部布局空白区域（中优先级）

截图顶部红框区域显示主内容区与窗口标题栏之间存在空白/间距问题。需要检查 `.home-view` 的定位和 padding 设置。

### 3. 其他细节问题排查

经过代码审查发现的潜在问题：

- **深色模式滚动条**：当前滚动条颜色使用 `--border-light`，在深色模式下可能对比度不足
- **Resizer可视性**：`.resizer.horizontal` 默认透明，用户可能难以发现可拖拽

---

## 修复方案

### Phase 1: 滚动条样式统一

在 [renderer/style.css](renderer/style.css) 中添加缺失的滚动条样式。

**位置**：在第146行（`.chat-history-list` 定义结束后）添加：

```css
/* Left sidebar scrollbar styling */
.chat-history-list::-webkit-scrollbar {
  width: 6px;
}

.chat-history-list::-webkit-scrollbar-track {
  background: transparent;
}

.chat-history-list::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.chat-history-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
```

**位置**：在第1507行后添加 `.tool-call-details` 和 `.inline-tool-result` 的滚动条样式。

### Phase 2: 顶部空白优化

检查并调整 `.home-view` 的 padding 和定位，确保内容区域与窗口边界的间距合理。

### Phase 3: 深色模式滚动条增强

为深色模式添加滚动条颜色覆盖，提升可见性：

```css
:root.dark .chat-history-list::-webkit-scrollbar-thumb,
:root.dark .messages-container::-webkit-scrollbar-thumb,
:root.dark .panel-content::-webkit-scrollbar-thumb {
  background: var(--bg-secondary);
}
```

### Phase 4: Resizer 可发现性改进

为 resizer 添加 hover 提示视觉，让用户更容易发现可拖拽边界。

---

## 验证方式

- 运行应用并验证左侧边栏滚动条外观
- 切换深色/浅色模式检查滚动条可见性
- 滚动各个可滚动区域确认一致性
- 运行 `npm test` 确保无回归
