# Plans 目录组织规范

## 目录结构

本目录用于存放项目开发计划文档。所有计划按照以下规则组织：

```
docs/plans/
├── README.md                          # 本文件，说明组织规范
├── {主plan文件名}.md                  # 主计划文件（保留在根目录）
└── {主plan文件名}/                    # 以主plan命名的子文件夹
    ├── {子plan-1}.md                  # 子计划文件 1
    ├── {子plan-2}.md                  # 子计划文件 2
    └── ...                            # 其他子计划文件
```

## 命名规范

### 主 Plan 文件
- 格式：`{日期}-{计划名称}-master.md`
- 示例：`2025-01-17-ux-upgrade-master.md`
- 位置：`docs/plans/` 根目录

### 子 Plan 文件夹
- 格式：`{主plan文件名}`（去掉 `.md` 后缀）
- 示例：`2025-01-17-ux-upgrade-master`
- 位置：`docs/plans/` 根目录下

### 子 Plan 文件
- 格式：`{日期}-{功能名称}.md`
- 示例：`2025-01-17-feedback-foundation.md`
- 位置：对应的子文件夹内

## 组织原则

1. **主从关系**：每个主 plan 对应一个子文件夹，所有相关的子 plan 文件都放在该文件夹内
2. **清晰分离**：主 plan 文件保留在根目录，便于快速查找和导航
3. **引用更新**：主 plan 文件中的子 plan 引用路径需要指向子文件夹内的文件

## 示例

当前目录结构示例：

```
docs/plans/
├── README.md
├── 2025-01-17-ux-upgrade-master.md
└── 2025-01-17-ux-upgrade-master/
    ├── 2025-01-17-feedback-foundation.md
    ├── 2025-01-17-input-experience.md
    ├── 2025-01-17-generation-control.md
    ├── 2025-01-17-dev-experience.md
    ├── 2025-01-17-history-enhancement.md
    └── 2025-01-17-personalization.md
```

## 创建新 Plan 的步骤

1. **创建主 plan 文件**：在 `docs/plans/` 根目录创建主 plan 文件
2. **创建子文件夹**：创建以主 plan 文件名（不含 `.md`）命名的文件夹
3. **创建子 plan 文件**：在子文件夹内创建所有子 plan 文件
4. **更新引用**：在主 plan 文件中使用相对路径引用子 plan 文件，格式为 `{子文件夹名}/{子plan文件名}.md`

## 注意事项

- 所有计划文件使用 Markdown 格式
- 主 plan 文件中的子 plan 链接必须使用相对路径
- 保持命名一致性，便于后续维护和查找
