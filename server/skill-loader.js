/**
 * SkillLoader - 技能加载与管理模块
 *
 * 负责：
 * - 初始化技能目录结构 (~/.occ/skills/)
 * - 加载本地技能和 Claude Code 兼容技能
 * - 构建技能上下文 prompt
 * - 安全过滤危险内容
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// 配置常量
const OCC_DIR = path.join(os.homedir(), '.occ');
const SKILLS_DIR = path.join(OCC_DIR, 'skills');
const INSTALLED_JSON = path.join(OCC_DIR, 'installed.json');
const MARKETS_JSON = path.join(OCC_DIR, 'markets.json');

// 安全限制
const MAX_SKILL_SIZE = 50 * 1024; // 50KB per skill
const MAX_ENABLED_SKILLS = 20;
const MAX_PROMPT_CHARS = 30000; // ~10K tokens

// 危险标记黑名单
const DANGEROUS_PATTERNS = [
  '</available_skills>',
  '</system>',
  '</user>',
  '</assistant>',
  '<system>',
  '</instructions>',
  '</context>'
];

/**
 * 初始化技能目录结构
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function initSkillsDirectory() {
  try {
    // 创建 ~/.occ/ 目录
    if (!fs.existsSync(OCC_DIR)) {
      fs.mkdirSync(OCC_DIR, { recursive: true });
      console.log('[SKILLS] Created directory:', OCC_DIR);
    }

    // 创建 skills/ 子目录
    if (!fs.existsSync(SKILLS_DIR)) {
      fs.mkdirSync(SKILLS_DIR, { recursive: true });
      console.log('[SKILLS] Created directory:', SKILLS_DIR);
    }

    // 初始化 installed.json
    if (!fs.existsSync(INSTALLED_JSON)) {
      const initialData = { version: 1, skills: [] };
      fs.writeFileSync(INSTALLED_JSON, JSON.stringify(initialData, null, 2));
      console.log('[SKILLS] Created installed.json');
    }

    // 初始化 markets.json（阶段3使用）
    if (!fs.existsSync(MARKETS_JSON)) {
      const initialMarkets = { version: 1, sources: [] };
      fs.writeFileSync(MARKETS_JSON, JSON.stringify(initialMarkets, null, 2));
      console.log('[SKILLS] Created markets.json');
    }

    // 验证写入权限
    const testFile = path.join(OCC_DIR, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    return { success: true };
  } catch (error) {
    console.error('[SKILLS] Init error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 读取已安装技能索引
 * @returns {Promise<{version: number, skills: Array}>}
 */
export async function loadInstalledSkills() {
  try {
    if (!fs.existsSync(INSTALLED_JSON)) {
      return { version: 1, skills: [] };
    }

    const content = fs.readFileSync(INSTALLED_JSON, 'utf-8');
    const data = JSON.parse(content);
    return data;
  } catch (error) {
    console.warn(
      '[SKILLS] Failed to load installed.json, creating backup and resetting:',
      error.message
    );

    // 备份损坏的文件
    if (fs.existsSync(INSTALLED_JSON)) {
      const backupPath = INSTALLED_JSON + '.backup.' + Date.now();
      fs.copyFileSync(INSTALLED_JSON, backupPath);
      console.log('[SKILLS] Backed up corrupted file to:', backupPath);
    }

    // 重建空索引
    const initialData = { version: 1, skills: [] };
    fs.writeFileSync(INSTALLED_JSON, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

/**
 * 保存已安装技能索引
 * @param {object} data - 技能索引数据
 */
export async function saveInstalledSkills(data) {
  try {
    fs.writeFileSync(INSTALLED_JSON, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('[SKILLS] Failed to save installed.json:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 安全过滤技能内容，移除危险标记
 * @param {string} content - 技能内容
 * @returns {{safe: boolean, content: string, reason?: string}}
 */
export function sanitizeSkillContent(content) {
  if (!content || typeof content !== 'string') {
    return { safe: false, content: '', reason: 'Invalid content' };
  }

  // 检查大小限制
  if (content.length > MAX_SKILL_SIZE) {
    return {
      safe: false,
      content: '',
      reason: `Content exceeds ${MAX_SKILL_SIZE / 1024}KB limit`
    };
  }

  // 检查危险标记
  const contentLower = content.toLowerCase();
  for (const pattern of DANGEROUS_PATTERNS) {
    if (contentLower.includes(pattern.toLowerCase())) {
      return {
        safe: false,
        content: '',
        reason: `Contains dangerous pattern: ${pattern}`
      };
    }
  }

  return { safe: true, content };
}

/**
 * 加载单个技能内容
 * @param {string} skillName - 技能名称
 * @param {string} source - 来源类型 ('local' | 'claude-code')
 * @returns {Promise<{name: string, content: string, description: string, error?: string}>}
 */
export async function loadSkillContent(skillName, source = 'local') {
  try {
    let skillPath;

    if (source === 'claude-code') {
      // Claude Code 兼容路径
      skillPath = skillName; // 完整路径已经传入
    } else {
      // 本地技能路径
      skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
    }

    if (!fs.existsSync(skillPath)) {
      return { name: skillName, content: '', description: '', error: 'SKILL.md not found' };
    }

    const rawContent = fs.readFileSync(skillPath, 'utf-8');

    // 安全过滤
    const sanitized = sanitizeSkillContent(rawContent);
    if (!sanitized.safe) {
      console.warn(`[SKILLS] Skill "${skillName}" rejected: ${sanitized.reason}`);
      return { name: skillName, content: '', description: '', error: sanitized.reason };
    }

    // 解析 frontmatter 提取描述
    const description = extractDescription(rawContent);

    return {
      name: skillName,
      content: sanitized.content,
      description,
      source
    };
  } catch (error) {
    console.error(`[SKILLS] Failed to load skill "${skillName}":`, error.message);
    return { name: skillName, content: '', description: '', error: error.message };
  }
}

/**
 * 从 SKILL.md 提取描述
 * @param {string} content - Markdown 内容
 * @returns {string}
 */
function extractDescription(content) {
  // 尝试从 frontmatter 提取
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const descMatch = frontmatter.match(/description:\s*(.+)/i);
    if (descMatch) {
      return descMatch[1].trim();
    }
  }

  // 回退：使用第一个非空行
  const lines = content
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
  return lines[0]?.substring(0, 100) || '';
}

/**
 * 扫描 Claude Code 插件目录获取可用技能
 * @returns {Promise<Array<{name: string, path: string, source: string}>>}
 */
export async function scanClaudeCodeSkills() {
  const claudePluginsDir = path.join(os.homedir(), '.claude', 'plugins', 'cache');
  const skills = [];

  try {
    if (!fs.existsSync(claudePluginsDir)) {
      return skills;
    }

    // 递归扫描 skills/*/SKILL.md
    const scanDir = (dir, depth = 0) => {
      if (depth > 5) {
        return;
      } // 防止无限递归

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // 检查是否是 skills 目录
          if (entry.name === 'skills') {
            // 扫描 skills 下的子目录
            const skillEntries = fs.readdirSync(fullPath, { withFileTypes: true });
            for (const skillEntry of skillEntries) {
              if (skillEntry.isDirectory()) {
                const skillMdPath = path.join(fullPath, skillEntry.name, 'SKILL.md');
                if (fs.existsSync(skillMdPath)) {
                  skills.push({
                    name: skillEntry.name,
                    path: skillMdPath,
                    source: 'claude-code'
                  });
                }
              }
            }
          } else {
            // 继续递归
            scanDir(fullPath, depth + 1);
          }
        }
      }
    };

    scanDir(claudePluginsDir);
    console.log(`[SKILLS] Found ${skills.length} Claude Code skills`);
    return skills;
  } catch (error) {
    console.warn('[SKILLS] Failed to scan Claude Code skills:', error.message);
    return [];
  }
}

/**
 * 获取所有可用技能（本地 + Claude Code）
 * @param {boolean} includeClaudeCode - 是否包含 Claude Code 技能
 * @returns {Promise<Array>}
 */
export async function getAllSkills(includeClaudeCode = true) {
  const installed = await loadInstalledSkills();
  const allSkills = [];

  // 加载本地技能
  for (const skill of installed.skills) {
    const loaded = await loadSkillContent(skill.name, 'local');
    allSkills.push({
      ...skill,
      content: loaded.content,
      description: loaded.description || skill.description,
      error: loaded.error
    });
  }

  // 扫描 Claude Code 技能
  if (includeClaudeCode) {
    const claudeSkills = await scanClaudeCodeSkills();
    for (const cs of claudeSkills) {
      // 检查是否已在 installed 中
      const existing = installed.skills.find(s => s.name === cs.name && s.source === 'claude-code');
      if (!existing) {
        const loaded = await loadSkillContent(cs.path, 'claude-code');
        allSkills.push({
          name: cs.name,
          source: 'claude-code',
          enabled: false, // Claude Code 技能默认禁用
          path: cs.path,
          content: loaded.content,
          description: loaded.description,
          error: loaded.error
        });
      }
    }
  }

  return allSkills;
}

/**
 * 构建所有已启用技能的 prompt 片段
 * @returns {Promise<string>}
 */
export async function buildSkillsPrompt() {
  const installed = await loadInstalledSkills();
  const enabledSkills = installed.skills.filter(s => s.enabled);

  if (enabledSkills.length === 0) {
    return '';
  }

  // 限制启用技能数量
  if (enabledSkills.length > MAX_ENABLED_SKILLS) {
    console.warn(
      `[SKILLS] Too many enabled skills (${enabledSkills.length}), truncating to ${MAX_ENABLED_SKILLS}`
    );
    enabledSkills.length = MAX_ENABLED_SKILLS;
  }

  const promptParts = [];
  let totalChars = 0;

  for (const skill of enabledSkills) {
    let loaded;
    if (skill.source === 'claude-code' && skill.path) {
      loaded = await loadSkillContent(skill.path, 'claude-code');
    } else {
      loaded = await loadSkillContent(skill.name, 'local');
    }

    if (loaded.error) {
      console.warn(`[SKILLS] Skipping "${skill.name}": ${loaded.error}`);
      continue;
    }

    // 检查总字符限制
    if (totalChars + loaded.content.length > MAX_PROMPT_CHARS) {
      console.warn(`[SKILLS] Prompt limit reached (${MAX_PROMPT_CHARS} chars), truncating`);
      break;
    }

    promptParts.push(`<skill name="${skill.name}">\n${loaded.content}\n</skill>`);
    totalChars += loaded.content.length;
  }

  if (promptParts.length === 0) {
    return '';
  }

  return promptParts.join('\n\n');
}

/**
 * 创建本地技能
 * @param {string} name - 技能名称
 * @param {string} content - SKILL.md 内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function createLocalSkill(name, content) {
  try {
    // 验证名称
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { success: false, error: 'Invalid skill name (use alphanumeric, _ or -)' };
    }

    // 安全检查
    const sanitized = sanitizeSkillContent(content);
    if (!sanitized.safe) {
      return { success: false, error: sanitized.reason };
    }

    // 创建技能目录
    const skillDir = path.join(SKILLS_DIR, name);
    if (fs.existsSync(skillDir)) {
      return { success: false, error: 'Skill already exists' };
    }

    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);

    // 添加到 installed.json
    const installed = await loadInstalledSkills();
    installed.skills.push({
      name,
      source: 'local',
      enabled: true,
      installedAt: new Date().toISOString()
    });
    await saveInstalledSkills(installed);

    console.log(`[SKILLS] Created skill: ${name}`);
    return { success: true };
  } catch (error) {
    console.error('[SKILLS] Failed to create skill:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 删除本地技能
 * @param {string} name - 技能名称
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLocalSkill(name) {
  try {
    const skillDir = path.join(SKILLS_DIR, name);

    if (!fs.existsSync(skillDir)) {
      return { success: false, error: 'Skill not found' };
    }

    // 删除目录
    fs.rmSync(skillDir, { recursive: true, force: true });

    // 从 installed.json 移除
    const installed = await loadInstalledSkills();
    installed.skills = installed.skills.filter(s => s.name !== name);
    await saveInstalledSkills(installed);

    console.log(`[SKILLS] Deleted skill: ${name}`);
    return { success: true };
  } catch (error) {
    console.error('[SKILLS] Failed to delete skill:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 切换技能启用状态
 * @param {string} name - 技能名称
 * @param {boolean} enabled - 是否启用
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleSkill(name, enabled) {
  try {
    const installed = await loadInstalledSkills();
    const skill = installed.skills.find(s => s.name === name);

    if (!skill) {
      // 可能是 Claude Code 技能，需要添加到列表
      const claudeSkills = await scanClaudeCodeSkills();
      const claudeSkill = claudeSkills.find(s => s.name === name);

      if (claudeSkill) {
        installed.skills.push({
          name,
          source: 'claude-code',
          path: claudeSkill.path,
          enabled,
          installedAt: new Date().toISOString()
        });
      } else {
        return { success: false, error: 'Skill not found' };
      }
    } else {
      skill.enabled = enabled;
    }

    await saveInstalledSkills(installed);
    console.log(`[SKILLS] Toggled "${name}" to ${enabled}`);
    return { success: true };
  } catch (error) {
    console.error('[SKILLS] Failed to toggle skill:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 预置示例技能（首次启动时调用）
 */
export async function seedExampleSkill() {
  const exampleName = 'example-skill';
  const exampleDir = path.join(SKILLS_DIR, exampleName);

  if (fs.existsSync(exampleDir)) {
    return; // 已存在，跳过
  }

  const exampleContent = `---
name: example-skill
description: 一个示例技能，展示 SKILL.md 的格式
---

# 示例技能

## Overview
这是一个示例技能，用于演示技能格式。你可以参考这个文件创建自己的技能。

## When to Use
当用户询问如何创建技能时，可以参考此示例。

## Instructions
1. 在 ~/.occ/skills/ 目录下创建一个新文件夹
2. 在文件夹中创建 SKILL.md 文件
3. 使用 YAML frontmatter 定义 name 和 description
4. 在正文中编写技能的具体指令

## Example Usage
用户: "如何创建一个代码审查技能？"
助手: 参考 example-skill 的格式，创建一个包含代码审查规则的 SKILL.md 文件。
`;

  try {
    fs.mkdirSync(exampleDir, { recursive: true });
    fs.writeFileSync(path.join(exampleDir, 'SKILL.md'), exampleContent);

    // 添加到 installed.json（默认禁用）
    const installed = await loadInstalledSkills();
    if (!installed.skills.find(s => s.name === exampleName)) {
      installed.skills.push({
        name: exampleName,
        source: 'local',
        enabled: false,
        installedAt: new Date().toISOString()
      });
      await saveInstalledSkills(installed);
    }

    console.log('[SKILLS] Seeded example skill');
  } catch (error) {
    console.warn('[SKILLS] Failed to seed example skill:', error.message);
  }
}

// 导出路径常量供外部使用
export const PATHS = {
  OCC_DIR,
  SKILLS_DIR,
  INSTALLED_JSON,
  MARKETS_JSON
};
