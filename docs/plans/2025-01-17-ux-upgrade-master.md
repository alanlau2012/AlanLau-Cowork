# UX Upgrade Master Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Incrementally upgrade Open Claude Cowork with 6 feature packs, delivering user value every 1-2 days.

**Architecture:** Break down the monolithic UX upgrade into 6 independent sub-plans, each ~6 hours of work. Dependencies are minimized - most sub-plans can be developed in parallel.

**Tech Stack:** Electron.js, Express (ES modules), Claude Agent SDK, Server-Sent Events (SSE)

---

## Overview

This master plan coordinates 6 sub-development plans for incremental delivery:

| Sub-Plan | File | Effort | Priority | Status |
|----------|------|--------|----------|--------|
| #1 反馈基础能力 | [2025-01-17-feedback-foundation.md](2025-01-17-ux-upgrade-master/2025-01-17-feedback-foundation.md) | 2h | P0 | Pending |
| #2 核心输入体验 | [2025-01-17-input-experience.md](2025-01-17-ux-upgrade-master/2025-01-17-input-experience.md) | 5.5h | P0 | Pending |
| #3 生成控制与启动 | [2025-01-17-generation-control.md](2025-01-17-ux-upgrade-master/2025-01-17-generation-control.md) | 5.5h | P1 | Pending |
| #4 开发者体验套件 | [2025-01-17-dev-experience.md](2025-01-17-ux-upgrade-master/2025-01-17-dev-experience.md) | 7h | P1 | Pending |
| #5 历史管理增强 | [2025-01-17-history-enhancement.md](2025-01-17-ux-upgrade-master/2025-01-17-history-enhancement.md) | 6h | P2 | Pending |
| #6 个性化与可访问性 | [2025-01-17-personalization.md](2025-01-17-ux-upgrade-master/2025-01-17-personalization.md) | 12h | P3 | Pending |

---

## Dependency Graph

```
#1 反馈基础 (Toast System)
    │
    ├──→ #2 核心输入体验 (uses Toast for error feedback)
    │
    └──→ #3 生成控制与启动 (uses Toast for status feedback)

#4 开发者体验套件 (independent)
#5 历史管理增强 (independent)
#6 个性化与可访问性 (independent)
```

**Key**: #1 must be completed first. Plans #2 and #3 depend on #1. Plans #4, #5, #6 can be developed in parallel.

---

## Execution Order (Recommended)

**Sprint 1 (Day 1-2):** Complete #1, start #2
**Sprint 2 (Day 3-4):** Complete #2, start #3
**Sprint 3 (Day 5-6):** Complete #3, start #4
**Sprint 4 (Day 7-9):** Complete #4
**Sprint 5 (Day 10-11):** Complete #5
**Sprint 6 (Day 12-15):** Complete #6

---

## Verification

After each sub-plan is complete:

```bash
# Start backend
cd server && npm start

# Start Electron app
npm start

# Manual testing checklist:
- [ ] Toast notifications appear for success/error/info
- [ ] Multi-line input works with auto-resize
- [ ] Stop generation button interrupts correctly
- [ ] Code blocks have copy button and syntax highlighting
- [ ] Search filters chat history in real-time
- [ ] Theme toggle switches between light/dark mode
```

---

## Core Files Reference

| File | Purpose |
|------|---------|
| [main.js](../main.js) | Electron main process, IPC handlers |
| [preload.js](../preload.js) | IPC bridge via contextBridge |
| [renderer/renderer.js](../renderer/renderer.js) | Frontend logic, UI handling, SSE parsing |
| [renderer/style.css](../renderer/style.css) | Styles |
| [server/server.js](../server/server.js) | Express backend, SDK integration |

---

## Development Notes

1. **ES Modules**: Backend uses `"type": "module"` in [server/package.json](../server/package.json)
2. **IPC Safety**: Use `contextBridge` in preload.js, never direct `ipcRenderer`
3. **SSE Handling**: Stream responses using `for await` loops
4. **Session Management**: SDK `session_id` stored in `chatSessions` Map
5. **LocalStorage**: All chat state persisted in `localStorage`

---

## Next Steps

Execute sub-plans in dependency order. Each sub-plan is self-contained with:
- Exact file paths to modify
- Complete code snippets
- Testing instructions
- Commit messages

Start with [2025-01-17-feedback-foundation.md](2025-01-17-ux-upgrade-master/2025-01-17-feedback-foundation.md).
