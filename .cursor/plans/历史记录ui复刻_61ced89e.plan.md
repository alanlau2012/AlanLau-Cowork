---
name: 历史记录UI复刻
overview: 将历史记录部分的UI按照 upgraded-prototype.html 中最左侧历史记录部分的效果进行100%复刻，包括HTML结构、CSS样式和JavaScript逻辑的完整改造
todos:
  - id: '1'
    content: 添加任务分组相关CSS样式（task-section, task-section-title, task-list, task-item等）
    status: completed
  - id: '2'
    content: 修改buildChatItemHTML函数生成新的HTML结构（task-item-header, task-status, task-title, task-meta）
    status: completed
  - id: '3'
    content: 修改renderChatHistory函数实现新的分组逻辑（进行中、今天等）
    status: completed
  - id: '4'
    content: 添加时间格式化函数（相对时间显示）
    status: completed
  - id: '5'
    content: 更新updateChatHistoryActiveState函数使用新的类名选择器
    status: completed
  - id: '6'
    content: 测试并验证所有功能和视觉效果
    status: completed
---

# 历史记录UI复刻计划

## 目标

将历史记录部分的UI按照 `ux-prototype/upgraded-prototype.html` 中最左侧历史记录部分的效果进行100%复刻。

## 原型分析

### HTML结构

原型中的历史记录部分使用以下结构：

- `.task-section` - 任务分组容器（如"进行中"、"今天"）
- `.task-section-title` - 分组标题（11px，大写，灰色）
- `.task-list` - 任务列表容器（flex column，gap 2px）
- `.task-item` - 单个任务项（padding 10px 12px，圆角 10px）
  - `.task-item-header` - 头部容器（flex，gap 8px，margin-bottom 4px）
    - `.task-status` - 状态指示器（8px圆形，running/completed/error）
    - `.task-title` - 任务标题（13px，font-weight 500）
  - `.task-meta` - 元信息（11px，灰色，flex，gap 8px）

### 样式特点

- 分组标题：11px，font-weight 600，text-transform uppercase，letter-spacing 0.5px，color var(--text-tertiary)
- 任务项：padding 10px 12px，border-radius var(--radius-md)，border 1px solid transparent
- hover状态：background var(--bg-cream)
- active状态：background var(--bg-tertiary)，border-color var(--border-light)
- 状态指示器：8px圆形，running有pulse动画
- 任务标题：13px，font-weight 500，ellipsis溢出处理
- 元信息：11px，color var(--text-tertiary)

## 实施步骤

### 1. 更新CSS样式（renderer/style.css）

#### 1.1 添加任务分组相关样式

- 添加 `.task-section` 样式（padding: 12px 8px）
- 添加 `.task-section-title` 样式（匹配原型）
- 添加 `.task-list` 样式（flex column，gap 2px）
- 添加 `.task-item` 样式（匹配原型）
- 添加 `.task-item-header` 样式
- 添加 `.task-status` 样式（包括 running/completed/error 状态）
- 添加 `.task-title` 样式
- 添加 `.task-meta` 样式
- 添加 `@keyframes pulse` 动画

#### 1.2 更新现有样式

- 保留 `.chat-history-list` 的基础样式（flex: 1, overflow-y: auto, padding: 8px）
- 移除或注释掉 `.time-group-label` 相关样式（如果不再使用）
- 确保 `.chat-history-item` 样式与 `.task-item` 兼容（或直接替换）

### 2. 更新HTML结构生成（renderer/uiHelpers.js）

#### 2.1 修改 `buildChatItemHTML` 函数

- 改为生成新的HTML结构：

  ```html
  <div class="task-item-header">
    <div class="task-status [status]"></div>
    <div class="task-title">${title}</div>
  </div>
  <div class="task-meta">
    <span>${path}</span>
    <span>${time}</span>
  </div>
  ```

- 移除旧的SVG图标和删除按钮（删除按钮可以保留但调整位置）

#### 2.2 添加分组标题生成函数

- 创建 `buildTaskSectionTitleHTML(groupName)` 函数
- 返回：`<div class="task-section-title">${groupName}</div>`

### 3. 更新渲染逻辑（renderer/renderer.js）

#### 3.1 修改 `renderChatHistory` 函数

- 移除时间分组逻辑（`getTimeGroupLabel`）
- 实现新的分组逻辑：
  - "进行中" - 当前活动的聊天（如果有）
  - "今天" - 今天创建的聊天
  - "昨天" - 昨天创建的聊天（可选）
  - "更早" - 更早的聊天（可选）
- 使用 `.task-section` 和 `.task-list` 结构
- 每个分组包含 `.task-section-title` 和 `.task-list`
- 每个聊天项使用 `.task-item` 类名

#### 3.2 更新状态判断逻辑

- 根据聊天状态设置 `.task-status` 的类名：
  - `running` - 如果聊天正在生成响应
  - `completed` - 如果聊天已完成（有消息）
  - `error` - 如果聊天有错误（可选）
- 提取聊天路径信息（如果有）显示在 `.task-meta` 中
- 格式化时间显示（如"2 分钟前"、"1 小时前"）

#### 3.3 更新相关函数

- 更新 `updateChatHistoryActiveState` 函数，使用新的类名选择器
- 确保删除按钮功能正常（可能需要调整位置或样式）

### 4. 更新HTML模板（renderer/index.html）

#### 4.1 检查左侧边栏结构

- 确保 `.left-sidebar` 结构正确
- 确保 `.left-sidebar-header` 包含 New Chat 按钮
- 确保 `.chat-history-list` 容器存在

### 5. 样式变量检查

#### 5.1 确保CSS变量存在

- `--bg-tertiary` - 用于active状态背景
- `--radius-md` - 圆角值（10px）
- `--status-success` - 成功状态颜色
- `--status-error` - 错误状态颜色
- `--accent-coral` - 运行状态颜色

## 文件修改清单

1. **renderer/style.css**
   - 添加任务分组相关样式（约100行）
   - 更新/移除时间分组样式

2. **renderer/uiHelpers.js**
   - 修改 `buildChatItemHTML` 函数
   - 添加 `buildTaskSectionTitleHTML` 函数

3. **renderer/renderer.js**
   - 修改 `renderChatHistory` 函数
   - 更新 `updateChatHistoryActiveState` 函数
   - 添加时间格式化辅助函数（如果需要）

4. **renderer/index.html**
   - 检查并确保结构正确（可能无需修改）

## 注意事项

1. **保持功能完整性**：确保删除聊天、切换聊天、搜索等功能正常工作
2. **状态指示器**：需要根据实际聊天状态设置正确的状态类名
3. **时间显示**：需要实现相对时间格式化（"2 分钟前"等）
4. **路径信息**：如果聊天数据中没有路径信息，可以显示其他元信息或留空
5. **响应式**：确保新样式在不同屏幕尺寸下正常工作
6. **动画**：确保pulse动画正常工作

## 验证要点

1. 视觉对比：与原型文件中的历史记录部分进行像素级对比
2. 交互测试：测试hover、active、点击等交互效果
3. 功能测试：确保所有功能（切换、删除、搜索）正常工作
4. 状态测试：测试不同状态下的显示效果（running、completed、error）
