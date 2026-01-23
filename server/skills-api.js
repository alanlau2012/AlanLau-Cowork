/**
 * Skills API - 技能管理 REST API 端点
 *
 * 端点：
 * - GET /api/skills - 列出所有已安装技能
 * - GET /api/skills/:name - 获取技能详情
 * - POST /api/skills/toggle - 启用/禁用技能
 * - POST /api/skills/create - 创建本地技能
 * - DELETE /api/skills/:name - 删除本地技能
 */

import express from 'express';
import {
  getAllSkills,
  loadSkillContent,
  toggleSkill,
  createLocalSkill,
  deleteLocalSkill,
  loadInstalledSkills
} from './skill-loader.js';

const router = express.Router();

/**
 * GET /api/skills
 * 列出所有已安装技能（本地 + Claude Code）
 */
router.get('/', async (req, res) => {
  try {
    const includeClaudeCode = req.query.claudeCode !== 'false';
    const skills = await getAllSkills(includeClaudeCode);

    // 返回精简信息（不含完整内容）
    const list = skills.map(s => ({
      name: s.name,
      source: s.source,
      enabled: s.enabled,
      description: s.description,
      error: s.error,
      installedAt: s.installedAt
    }));

    res.json({ success: true, skills: list });
  } catch (error) {
    console.error('[SKILLS API] Failed to list skills:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/skills/:name
 * 获取技能详情（含完整 SKILL.md 内容）
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const source = req.query.source || 'local';

    // 获取已安装技能信息
    const installed = await loadInstalledSkills();
    const skillInfo = installed.skills.find(s => s.name === name);

    // 加载内容
    let loaded;
    if (source === 'claude-code' && skillInfo?.path) {
      loaded = await loadSkillContent(skillInfo.path, 'claude-code');
    } else {
      loaded = await loadSkillContent(name, 'local');
    }

    if (loaded.error) {
      return res.status(404).json({ success: false, error: loaded.error });
    }

    res.json({
      success: true,
      skill: {
        name: loaded.name,
        source: skillInfo?.source || source,
        enabled: skillInfo?.enabled ?? false,
        description: loaded.description,
        content: loaded.content,
        installedAt: skillInfo?.installedAt
      }
    });
  } catch (error) {
    console.error('[SKILLS API] Failed to get skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/skills/toggle
 * 启用/禁用技能
 * Body: { name: string, enabled: boolean }
 */
router.post('/toggle', async (req, res) => {
  try {
    const { name, enabled } = req.body;

    if (!name || typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: name and enabled (boolean) required'
      });
    }

    const result = await toggleSkill(name, enabled);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: `Skill "${name}" ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('[SKILLS API] Failed to toggle skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/skills/create
 * 创建本地技能
 * Body: { name: string, content: string }
 */
router.post('/create', async (req, res) => {
  try {
    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: name and content required'
      });
    }

    const result = await createLocalSkill(name, content);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: `Skill "${name}" created` });
  } catch (error) {
    console.error('[SKILLS API] Failed to create skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/skills/:name
 * 删除本地技能
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const result = await deleteLocalSkill(name);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: `Skill "${name}" deleted` });
  } catch (error) {
    console.error('[SKILLS API] Failed to delete skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
