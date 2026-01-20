# 修改快速开始模板计划

## 任务

将默认的3个快速开始模板改为：

1. **文件夹整理** - 整理文件结构
2. **数据分析** - 数据处理分析
3. **批量文件处理** - 批量文件操作

## 修改文件

### 1. `renderer/index.html` (第 61-75 行)

**原代码：**

```html
<button class="template-card" data-template="code-review">...</button>
<button class="template-card" data-template="explain">...</button>
<button class="template-card" data-template="debug">...</button>
```

**新代码：**

```html
<button class="template-card" data-template="folder-org">
  <div class="template-icon">📁</div>
  <div class="template-title">文件夹整理</div>
  <div class="template-desc">整理文件结构，清理冗余文件</div>
</button>
<button class="template-card" data-template="data-analysis">
  <div class="template-icon">📊</div>
  <div class="template-title">数据分析</div>
  <div class="template-desc">处理和分析数据文件</div>
</button>
<button class="template-card" data-template="batch-file">
  <div class="template-icon">📋</div>
  <div class="template-title">批量文件处理</div>
  <div class="template-desc">批量重命名、移动或处理文件</div>
</button>
```

### 2. `renderer/renderer.js` (第 577-580 行)

**原代码：**

```javascript
const templates = {
  'code-review': '请帮我审查以下代码...',
  explain: '请用简单易懂的语言解释...',
  debug: '我遇到了一个代码问题...'
};
```

**新代码：**

```javascript
const templates = {
  'folder-org':
    '请帮我整理文件夹结构。我需要你：\n1. 分析当前目录结构\n2. 识别冗余或重复文件\n3. 建议合理的目录组织方案\n\n[描述你的文件夹路径或当前问题]',
  'data-analysis':
    '请帮我进行数据分析。我需要你：\n1. 读取和处理数据文件\n2. 统计关键指标\n3. 生成分析报告或可视化\n\n[描述你的数据源和分析需求]',
  'batch-file':
    '请帮我批量处理文件。我需要你：\n1. 执行批量重命名操作\n2. 移动或复制文件到指定目录\n3. 按规则分类整理文件\n\n[描述批量处理的具体需求]'
};
```

## 验证步骤

1. 启动应用 (`npm start`)
2. 新建聊天，确认首页显示3个新模板卡片
3. 点击每个模板，确认提示词正确加载到输入框
