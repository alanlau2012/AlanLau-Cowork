---
name: Skill 市场功能
overview: 为 open-claude-cowork 项目添加 Skill 市场功能，支持本地技能管理、UI 界面、远程市场和高级功能。分4个阶段实现，对话1完成阶段1-2（核心功能），对话2完成阶段3-4（市场生态）。
todos:
  - id: phase1-skill-loader
    content: '阶段1.1-1.2: 创建 skill-loader.js 模块，实现目录初始化和技能加载'
    status: pending
  - id: phase1-server-integration
    content: '阶段1.3: 修改 server.js 集成 SkillLoader，实现技能注入'
    status: pending
  - id: phase1-skills-api
    content: '阶段1.4: 创建 skills-api.js，实现技能管理 API 端点'
    status: pending
  - id: phase2-settings-tab
    content: '阶段2.1: 扩展设置面板，添加 Skills Tab'
    status: pending
  - id: phase2-ui-components
    content: '阶段2.2-2.3: 创建技能管理 UI 组件和 API 调用逻辑'
    status: pending
  - id: phase2-example-skill
    content: '阶段2.4: 预置示例技能'
    status: pending
  - id: phase2-claude-compat
    content: '阶段2.5: 实现与 Claude Code ~/.claude/plugins/ 格式兼容'
    status: pending
  - id: phase3-market-manager
    content: '阶段3.1: 创建 market-manager.js，实现 Git 市场管理'
    status: pending
  - id: phase3-market-api
    content: '阶段3.2: 扩展 Skills API，添加市场相关端点'
    status: pending
  - id: phase3-market-ui
    content: '阶段3.3-3.4: 实现市场浏览 UI 和预置官方源'
    status: pending
  - id: phase4-version
    content: '阶段4.1: 实现技能版本管理'
    status: pending
  - id: phase4-search
    content: '阶段4.2: 实现技能分类与搜索'
    status: pending
  - id: phase4-wizard
    content: '阶段4.3: 实现技能创建向导'
    status: pending
  - id: phase4-offline
    content: '阶段4.4: 实现离线模式支持'
    status: pending
isProject: false
---

# Skill 市场功能实现计划

## 架构总览

```mermaid
flowchart TB
    subgraph electron [Electron App]
        UI[Skill 市场 UI]
        Settings[设置面板集成]
    end

    subgraph server [Express Server]
        SkillsAPI[/api/skills/* API]
        SkillLoader[SkillLoader 模块]
        GitManager[Git 市场管理]
    end

    subgraph storage [本地存储 ~/.occ/]
        LocalSkills[skills/]
        Markets[marketplaces/]
        Config[installed.json]
    end

    subgraph claude [Claude Agent SDK]
        Query[query 调用]
        Prompt[增强 Prompt]
    end

    UI --> SkillsAPI
    Settings --> SkillsAPI
    SkillsAPI --> SkillLoader
    SkillsAPI --> GitManager
    SkillLoader --> LocalSkills
    SkillLoader --> Config
    GitManager --> Markets
    SkillLoader --> Prompt
    Prompt --> Query
```

---

## 阶段 1：核心基础设施（后端）

**目标**：建立 Skill 存储结构和加载机制，实现 Skills 注入到 Claude Agent

### 1.1 创建 Skill 存储目录结构

**目录规划** (`~/.occ/`)：

```
~/.occ/
├── skills/                    # 本地技能目录
│   └── example-skill/
│       └── SKILL.md
├── installed.json             # 已安装技能索引
└── markets.json               # 市场源配置（阶段3使用）
```

### 1.2 创建 SkillLoader 模块

**新建文件**: [server/skill-loader.js](server/skill-loader.js)

核心功能：

- `initSkillsDirectory()` - 初始化目录结构
- `loadInstalledSkills()` - 读取 installed.json
- `loadSkillContent(skillName)` - 读取单个 SKILL.md
- `sanitizeSkillContent(content)` - **安全过滤**，移除危险标记
- `buildSkillsPrompt()` - 构建所有已启用技能的 prompt 片段
- `saveInstalledSkills(data)` - 保存安装状态

**安全防护**：

- 技能内容禁止包含 `</available_skills>`、`</system>` 等系统标记
- 单个技能内容限制 50KB
- 启用技能总数限制 20 个

**installed.json 格式**：

```json
{
  "version": 1,
  "skills": [
    {
      "name": "frontend-design",
      "source": "local",
      "enabled": true,
      "installedAt": "2025-01-23T10:00:00Z"
    }
  ]
}
```

### 1.3 修改 server.js 集成 SkillLoader

**修改文件**: [server/server.js](server/server.js)

修改点：

- 导入 SkillLoader 模块
- 服务启动时调用 `initSkillsDirectory()`
- 在 `/api/chat` 中调用 `buildSkillsPrompt()` 获取技能上下文
- 将技能上下文作为 prompt 前缀注入

**集成方案**（基于现有 Claude Agent SDK 调用）：

```javascript
// 在 /api/chat 路由中，query() 调用前构建增强 prompt
const skillsContext = await skillLoader.buildSkillsPrompt();
const enhancedPrompt = skillsContext
  ? `<available_skills>\n${skillsContext}\n</available_skills>\n\n${message}`
  : message;

// 传入 agent.query()
const result = await agent.query({
  prompt: enhancedPrompt, // 技能上下文 + 用户消息
  sessionId: resume
});
```

**Token 控制**：

- `buildSkillsPrompt()` 返回内容限制 30K 字符（约 10K tokens）
- 超限时按启用顺序截断，并在日志中警告

### 1.4 创建 Skills API 端点

**新建文件**: [server/skills-api.js](server/skills-api.js)

**API 端点**：

- `GET /api/skills` - 列出所有已安装技能
- `GET /api/skills/:name` - 获取技能详情（含 SKILL.md 内容）
- `POST /api/skills/toggle` - 启用/禁用技能 `{ name, enabled }`
- `POST /api/skills/create` - 创建本地技能 `{ name, content }`
- `DELETE /api/skills/:name` - 删除本地技能

### 1.5 错误处理策略

| 场景 | 处理方式 |

|------|----------|

| `~/.occ/` 目录无写入权限 | 启动时检查，失败则提示用户并禁用技能功能 |

| SKILL.md 格式解析失败 | 跳过该技能，记录警告日志，不影响其他技能 |

| installed.json 损坏 | 备份后重建空索引 |

| 技能内容含危险标记 | 拒绝加载，返回安全错误 |

---

## 阶段 2：UI 界面

**目标**：在 Electron 前端实现 Skill 管理界面

### 2.1 扩展设置面板 Tab

**修改文件**: [renderer/renderer.js](renderer/renderer.js)

在设置面板中添加「Skills」Tab，与现有「常规设置」Tab 并列

### 2.2 创建 Skill 管理 UI 组件

**修改文件**: [renderer/index.html](renderer/index.html) + [renderer/style.css](renderer/style.css)

UI 组件：

- **SkillList** - 已安装技能列表（卡片形式）
- **SkillCard** - 单个技能卡片（名称、描述、启用开关、删除按钮）
- **SkillDetail** - 技能详情弹窗（显示完整 SKILL.md 内容）
- **CreateSkillForm** - 创建本地技能表单

**卡片设计**：

```
┌─────────────────────────────────────────┐
│ [icon] frontend-design           [ON/OFF]│
│ 创建高质量前端界面的设计指南              │
│ 来源: local  |  [查看详情] [删除]        │
└─────────────────────────────────────────┘
```

### 2.3 实现 API 调用逻辑

**修改文件**: [renderer/renderer.js](renderer/renderer.js)

功能：

- `loadSkillsList()` - 加载技能列表
- `toggleSkill(name, enabled)` - 切换技能状态
- `viewSkillDetail(name)` - 查看详情
- `createLocalSkill(name, content)` - 创建技能
- `deleteSkill(name)` - 删除技能

### 2.4 预置示例技能

在 `~/.occ/skills/` 中预置一个示例技能，便于用户理解格式：

**example-skill/SKILL.md**：

```markdown
---
name: example-skill
description: 一个示例技能，展示 SKILL.md 的格式
---

# 示例技能

## Overview

这是一个示例技能，用于演示技能格式。

## When to Use

当用户询问如何创建技能时使用此示例。
```

### 2.5 Claude Code 格式兼容

**修改文件**: [server/skill-loader.js](server/skill-loader.js)

功能：

- 可选读取 `~/.claude/plugins/` 目录中的技能
- 解析 Claude Code 的 `plugin.json` 格式，提取 `skills/` 子目录
- 在 UI 中以「来源: claude-code」标识
- 用户可在设置中启用/禁用此兼容模式

**兼容逻辑**：

```javascript
// 扫描 ~/.claude/plugins/cache/ 下的技能
// 解析 skills/*/SKILL.md 文件
// 合并到统一的技能列表中
```

---

## 阶段 3：远程市场集成

**目标**：支持从 Git 仓库克隆和管理远程技能市场

### 3.1 创建 MarketManager 模块

**新建文件**: [server/market-manager.js](server/market-manager.js)

依赖：`simple-git` npm 包

核心功能：

- `addMarketSource(name, gitUrl)` - 添加市场源
- `removeMarketSource(name)` - 删除市场源
- `refreshMarket(name)` - git pull 更新市场
- `listMarketSkills(marketName)` - 解析市场中的可用技能
- `installFromMarket(marketName, skillName)` - 从市场安装技能

**Git 操作错误处理**：

| 场景 | 处理方式 |

|------|----------|

| clone/pull 超时（>60s） | 终止操作，返回超时错误 |

| 网络不可用 | 使用本地缓存（如有），提示离线状态 |

| 仓库 URL 无效 | 验证失败，拒绝添加市场源 |

| 磁盘空间不足 | 检查后提示用户清理空间 |

**markets.json 格式**：

```json
{
  "version": 1,
  "sources": [
    {
      "name": "official",
      "url": "https://github.com/anthropics/claude-plugins-official",
      "type": "git",
      "lastUpdated": "2025-01-23T10:00:00Z"
    }
  ]
}
```

### 3.2 扩展 Skills API

**修改文件**: [server/skills-api.js](server/skills-api.js)

新增端点：

- `GET /api/skills/markets` - 列出所有市场源
- `POST /api/skills/markets/add` - 添加市场源 `{ name, url }`
- `POST /api/skills/markets/refresh` - 刷新指定市场
- `DELETE /api/skills/markets/:name` - 删除市场源
- `GET /api/skills/available` - 列出所有市场中可安装的技能
- `POST /api/skills/install` - 从市场安装技能 `{ market, skillName }`

### 3.3 扩展 UI - 市场浏览

**修改文件**: [renderer/index.html](renderer/index.html) + [renderer/renderer.js](renderer/renderer.js)

新增 UI：

- **MarketBrowser** - 市场技能浏览界面（Tab 切换：已安装 / 市场）
- **MarketSourceList** - 市场源管理列表
- **AddMarketForm** - 添加市场源表单
- **InstallButton** - 技能安装按钮（带进度状态）

### 3.4 预置官方市场源

首次启动时自动添加官方市场源：

- `https://github.com/anthropics/claude-plugins-official` (Anthropic 官方)

---

## 阶段 4：高级功能与优化

**目标**：完善用户体验，增加高级特性

### 4.1 技能版本管理

**修改文件**: [server/skill-loader.js](server/skill-loader.js)

功能：

- 在 installed.json 中记录版本号
- 检测市场中的新版本
- 支持技能更新操作

### 4.2 技能分类与搜索

**修改文件**: [renderer/renderer.js](renderer/renderer.js)

功能：

- 按分类筛选（development / productivity / learning）
- 关键词搜索（名称 + 描述）
- 排序选项（按名称 / 安装时间 / 来源）

### 4.3 技能创建向导

**修改文件**: [renderer/index.html](renderer/index.html)

功能：

- 多步骤创建表单（名称 → 描述 → 内容）
- SKILL.md 模板选择
- 实时预览

### 4.4 离线模式支持

**修改文件**: [server/market-manager.js](server/market-manager.js)

功能：

- 市场数据本地缓存
- 网络不可用时使用缓存
- 后台静默更新

---

## 文件变更汇总

| 阶段 | 新建文件 | 修改文件 |

|------|----------|----------|

| 1 | `server/skill-loader.js`, `server/skills-api.js` | `server/server.js` |

| 2 | - | `renderer/index.html`, `renderer/style.css`, `renderer/renderer.js`, `server/skill-loader.js`（Claude Code 兼容） |

| 3 | `server/market-manager.js` | `server/skills-api.js`, `renderer/*` |

| 4 | - | 各现有模块增强 |

## 依赖新增

| 阶段 | 依赖包 | 用途 |

|------|--------|------|

| 1 | 无 | 使用 Node.js 内置 fs |

| 3 | `simple-git` | Git 操作 |

| 4 | 无 | 优化现有代码 |

---

## 对话分配

**对话 1（阶段 1 + 2）**：

- 建立核心基础设施（含安全防护与错误处理）
- 实现本地技能管理
- 完成 UI 界面
- 实现 Claude Code 格式兼容
- 产出：可用的本地技能管理功能 + Claude Code 技能共享

**对话 2（阶段 3 + 4）**：

- 集成远程市场
- 添加高级功能
- 产出：完整的技能市场生态
