---
name: renderer-js-css-refactor
overview: 重构 renderer.js (2353行) 和 style.css (3933行) 两个超大文件，按功能模块拆分，提升代码可维护性和可读性
todos:
  - id: refactor-prep
    content: 准备工作：创建备份、运行测试、创建目录结构
    status: pending
  - id: refactor-state-dom
    content: 创建state.js和domElements.js模块，提取全局状态和DOM引用
    status: pending
  - id: refactor-ui-renderer
    content: 创建uiRenderer.js模块，提取UI渲染相关功能
    status: pending
  - id: refactor-message-handler
    content: 创建messageHandler.js模块，提取消息处理功能
    status: pending
  - id: refactor-markdown
    content: 创建markdownRenderer.js模块，提取Markdown渲染功能
    status: pending
  - id: refactor-tool-call
    content: 创建toolCallHandler.js模块，提取工具调用处理功能
    status: pending
  - id: refactor-stream-handler
    content: 创建streamHandler.js模块，提取SSE流式处理逻辑（高风险）
    status: pending
  - id: refactor-file-handler
    content: 创建fileHandler.js和searchHandler.js模块
    status: pending
  - id: refactor-main-renderer
    content: 重构主renderer.js文件，整合所有模块
    status: pending
  - id: refactor-css-base
    content: 创建base.css，提取CSS变量和基础样式
    status: pending
  - id: refactor-css-modules
    content: 按功能区域拆分CSS文件（layout, sidebar, views, input等）
    status: pending
  - id: refactor-css-update-html
    content: 更新index.html引入所有CSS文件
    status: pending
  - id: refactor-testing
    content: 运行完整测试套件，修复发现的问题
    status: pending
  - id: refactor-cleanup
    content: 代码清理、添加注释、更新文档
    status: pending
isProject: false
---

# renderer.js 和 style.css 重构计划

## 重构把握与技术难度评估

### renderer.js 重构评估

- **把握度：85%** - 已有部分模块化基础（utils.js, chatStore.js, uiHelpers.js, modules/），重构路径清晰
- **技术难度：中等偏高** - 需要仔细处理状态管理和函数依赖关系
- **风险点**：
- SSE流式处理逻辑复杂（handleSendMessage约300行）
- 全局状态变量较多（allChats, currentChatId, toolCalls等）
- DOM元素引用分散

### style.css 重构评估

- **把握度：95%** - CSS拆分相对简单，结构清晰，有注释分隔
- **技术难度：低到中等** - 主要是按功能区域拆分，注意CSS变量共享
- **风险点**：
- 确保CSS变量（:root）在所有文件中可访问
- 避免样式冲突和优先级问题

## 重构方案

### Phase 1: renderer.js 模块化拆分

#### 1.1 创建状态管理模块 `renderer/modules/state.js`

- 集中管理全局状态变量
- 导出状态访问和更新函数
- 状态包括：allChats, currentChatId, toolCalls, todos, attachedFiles, fileChanges, isWaitingForResponse等

#### 1.2 创建DOM元素管理模块 `renderer/modules/domElements.js`

- 统一管理所有DOM元素引用
- 提供getter函数，延迟初始化
- 避免在文件顶部大量const声明

#### 1.3 创建消息处理模块 `renderer/modules/messageHandler.js`

- 提取消息相关功能：
- addUserMessage()
- createAssistantMessage()
- appendToContent()
- updateGenerationStatus()
- removeGenerationStatus()
- getConversationHistory()

#### 1.4 创建SSE流式处理模块 `renderer/modules/streamHandler.js`

- 提取SSE流式处理逻辑：
- handleSendMessage() 的核心流式处理部分
- 处理text、tool_use、tool_result等事件
- 管理pendingToolCalls Map

#### 1.5 创建Markdown渲染模块 `renderer/modules/markdownRenderer.js`

- 提取Markdown相关功能：
- getCurrentMarkdownContainer()
- renderMarkdownContainer()
- renderMarkdown()
- enhanceCodeBlocks()

#### 1.6 创建工具调用模块 `renderer/modules/toolCallHandler.js`

- 提取工具调用相关功能：
- addToolCall()
- updateToolCallStatus()
- updateToolCallResult()
- addInlineToolCall()
- updateInlineToolResult()
- getStreamableContent()
- startTypewriterAnimation()
- stopTypewriterAnimation()

#### 1.7 创建UI渲染模块 `renderer/modules/uiRenderer.js`

- 提取UI渲染功能：
- renderTimeline()
- renderChatHistory()
- renderFileChanges()
- renderAttachedFiles()
- updateChatHistoryActiveState()

#### 1.8 创建文件处理模块 `renderer/modules/fileHandler.js`

- 提取文件相关功能：
- handleFileSelect()
- addFileChange()
- getFileChangeIcon()
- renderFileStats()

#### 1.9 创建搜索模块 `renderer/modules/searchHandler.js`

- 提取搜索功能：
- searchChats()
- initializeSearch()
- matchesSearch() (已在uiHelpers.js)

#### 1.10 重构主文件 `renderer/renderer.js`

- 保留核心协调逻辑：
- init()
- setupEventListeners()
- switchToChatView()
- loadChat()
- switchToChat()
- startNewChat()
- 导入并使用各模块
- 保持向后兼容的全局函数（如window.startNewChat）

### Phase 2: style.css 模块化拆分

#### 2.1 创建基础样式文件 `renderer/styles/base.css`

- CSS变量定义（:root）
- 全局重置样式（\*）
- html, body基础样式
- .hidden工具类

#### 2.2 创建布局样式文件 `renderer/styles/layout.css`

- .app-container
- .main-content
- 响应式布局相关样式

#### 2.3 创建左侧边栏样式 `renderer/styles/leftSidebar.css`

- .left-sidebar及其子元素
- .chat-history-list
- .task-section
- .task-item
- 搜索相关样式

#### 2.4 创建主视图样式 `renderer/styles/homeView.css`

- .home-view
- .greeting-section
- .quick-start-templates
- .plan-badge

#### 2.5 创建聊天视图样式 `renderer/styles/chatView.css`

- .chat-view
- .chat-header
- .messages-container
- .message (user/assistant)
- .message-actions
- .generation-status

#### 2.6 创建输入框样式 `renderer/styles/input.css`

- .input-container
- .input-form
- .message-textarea
- .input-controls
- .model-select
- .send-btn
- .stop-btn
- 文件附件相关样式

#### 2.7 创建消息内容样式 `renderer/styles/messageContent.css`

- Markdown内容样式
- 代码块样式
- 内联工具调用样式
- 类型动画效果

#### 2.8 创建右侧面板样式 `renderer/styles/rightPanel.css`

- .right-panel
- .panel-header
- .panel-tabs
- .panel-content
- .tool-call-item
- .file-changes-list
- 时间线相关样式

#### 2.9 创建设置模态框样式 `renderer/styles/settings.css`

- .modal-overlay
- .modal
- .settings-tabs
- .settings-card
- .workspace-input-wrapper
- .sandbox-toggle
- 诊断相关样式

#### 2.10 创建技能管理样式 `renderer/styles/skills.css`

- .skills-header
- .skills-filter
- .skills-list
- .skill-card
- .skill-detail-modal

#### 2.11 创建工具类样式 `renderer/styles/utilities.css`

- Toast通知系统
- 加载指示器
- 错误消息样式
- 动画定义
- 滚动条样式

#### 2.12 更新 `renderer/index.html`

- 在head中按顺序引入所有CSS文件
- 确保base.css最先加载

## 实施步骤

### Step 1: 准备工作

1. 创建备份（git commit当前状态）
2. 运行测试确保当前功能正常
3. 创建新的目录结构

### Step 2: renderer.js 重构（分阶段）

1. 先创建state.js和domElements.js（低风险）
2. 然后拆分UI渲染模块（中等风险）
3. 最后拆分SSE流式处理（高风险，需要仔细测试）

### Step 3: style.css 重构

1. 先提取base.css（CSS变量和基础样式）
2. 按功能区域逐个拆分
3. 更新index.html引入顺序
4. 测试每个模块的样式是否正确

### Step 4: 测试验证

1. 运行所有单元测试
2. 运行E2E测试
3. 手动测试关键功能：

- 发送消息和流式响应
- 工具调用显示
- 文件附件
- 聊天历史切换
- 设置模态框
- 技能管理

### Step 5: 代码清理

1. 移除未使用的代码
2. 统一代码风格
3. 添加JSDoc注释
4. 更新README文档

## 预期成果

### renderer.js

- 主文件从2353行减少到约300-400行
- 拆分为8-10个功能模块，每个200-400行
- 提升代码可维护性和可测试性

### style.css

- 主文件从3933行减少到约100行（仅import）
- 拆分为12个功能模块，每个200-400行
- 提升样式可维护性和复用性

## 风险控制

1. **渐进式重构**：每次只拆分一个模块，测试通过后再继续
2. **保持向后兼容**：确保全局函数和事件监听器正常工作
3. **充分测试**：每个阶段都运行完整测试套件
4. **Git分支**：在feature分支进行，方便回滚

## 时间估算

- renderer.js重构：2-3天
- style.css重构：1-2天
- 测试和修复：1-2天
- **总计：4-7天**
