/**
 * API tests for Skills endpoints
 * Tests skills listing, toggle, create, and delete operations
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';

// Mock skill-loader functions
const mockSkills = [
  { name: 'code-review', source: 'local', enabled: true, description: 'Review code' },
  { name: 'debugging', source: 'local', enabled: false, description: 'Debug issues' },
  { name: 'claude-skill', source: 'claude-code', enabled: true, description: 'From Claude Code' }
];

const mockGetAllSkills = vi.fn(() => Promise.resolve(mockSkills));
const mockLoadSkillContent = vi.fn((name, source) =>
  Promise.resolve({
    name,
    content: `# ${name}\n\nSkill content here`,
    description: `Description for ${name}`,
    source
  })
);
const mockToggleSkill = vi.fn((name, enabled) => Promise.resolve({ success: true }));
const mockCreateLocalSkill = vi.fn((name, content) => Promise.resolve({ success: true }));
const mockDeleteLocalSkill = vi.fn(name => Promise.resolve({ success: true }));
const mockLoadInstalledSkills = vi.fn(() =>
  Promise.resolve({
    version: 1,
    skills: mockSkills.map(s => ({
      name: s.name,
      source: s.source,
      enabled: s.enabled,
      installedAt: Date.now()
    }))
  })
);

// Create test server
function createSkillsTestServer() {
  const app = express();
  app.use(express.json());

  const router = express.Router();

  // GET /api/skills - List all skills
  router.get('/', async (req, res) => {
    try {
      const includeClaudeCode = req.query.claudeCode !== 'false';
      let skills = await mockGetAllSkills(includeClaudeCode);

      if (!includeClaudeCode) {
        skills = skills.filter(s => s.source !== 'claude-code');
      }

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
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/skills/:name - Get skill details
  router.get('/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const source = req.query.source || 'local';

      const installed = await mockLoadInstalledSkills();
      const skillInfo = installed.skills.find(s => s.name === name);

      if (!skillInfo) {
        return res.status(404).json({ success: false, error: 'Skill not found' });
      }

      const loaded = await mockLoadSkillContent(name, source);

      if (loaded.error) {
        return res.status(404).json({ success: false, error: loaded.error });
      }

      res.json({
        success: true,
        skill: {
          name: loaded.name,
          source: skillInfo.source || source,
          enabled: skillInfo.enabled ?? false,
          description: loaded.description,
          content: loaded.content,
          installedAt: skillInfo.installedAt
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/skills/toggle - Enable/disable skill
  router.post('/toggle', async (req, res) => {
    try {
      const { name, enabled } = req.body;

      if (!name || typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: name and enabled (boolean) required'
        });
      }

      const result = await mockToggleSkill(name, enabled);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({ success: true, message: `Skill "${name}" ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/skills/create - Create local skill
  router.post('/create', async (req, res) => {
    try {
      const { name, content } = req.body;

      if (!name || !content) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request: name and content required'
        });
      }

      const result = await mockCreateLocalSkill(name, content);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({ success: true, message: `Skill "${name}" created` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/skills/:name - Delete local skill
  router.delete('/:name', async (req, res) => {
    try {
      const { name } = req.params;

      const result = await mockDeleteLocalSkill(name);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({ success: true, message: `Skill "${name}" deleted` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api/skills', router);
  return app;
}

describe('Skills API - List Skills', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createSkillsTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of skills', async () => {
    const response = await fetch(`${baseUrl}/api/skills`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills.length).toBe(3);
  });

  it('should include skill properties in response', async () => {
    const response = await fetch(`${baseUrl}/api/skills`);
    const data = await response.json();

    const skill = data.skills[0];
    expect(skill.name).toBeDefined();
    expect(skill.source).toBeDefined();
    expect(skill.enabled).toBeDefined();
    expect(skill.description).toBeDefined();
  });

  it('should filter out claude-code skills when claudeCode=false', async () => {
    const response = await fetch(`${baseUrl}/api/skills?claudeCode=false`);
    const data = await response.json();

    expect(data.success).toBe(true);
    const claudeSkills = data.skills.filter(s => s.source === 'claude-code');
    expect(claudeSkills.length).toBe(0);
  });

  it('should include claude-code skills by default', async () => {
    const response = await fetch(`${baseUrl}/api/skills`);
    const data = await response.json();

    const claudeSkills = data.skills.filter(s => s.source === 'claude-code');
    expect(claudeSkills.length).toBeGreaterThan(0);
  });
});

describe('Skills API - Get Skill Details', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createSkillsTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return skill details', async () => {
    const response = await fetch(`${baseUrl}/api/skills/code-review`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skill).toBeDefined();
    expect(data.skill.name).toBe('code-review');
    expect(data.skill.content).toBeDefined();
  });

  it('should include content in skill details', async () => {
    const response = await fetch(`${baseUrl}/api/skills/code-review`);
    const data = await response.json();

    expect(data.skill.content).toContain('# code-review');
  });

  it('should return 404 for non-existent skill', async () => {
    mockLoadInstalledSkills.mockResolvedValueOnce({
      version: 1,
      skills: []
    });

    const response = await fetch(`${baseUrl}/api/skills/non-existent`);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should support source query parameter', async () => {
    const response = await fetch(`${baseUrl}/api/skills/claude-skill?source=claude-code`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skill.source).toBeDefined();
  });
});

describe('Skills API - Toggle Skill', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createSkillsTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enable a skill', async () => {
    const response = await fetch(`${baseUrl}/api/skills/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'debugging', enabled: true })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('enabled');
    expect(mockToggleSkill).toHaveBeenCalledWith('debugging', true);
  });

  it('should disable a skill', async () => {
    const response = await fetch(`${baseUrl}/api/skills/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'code-review', enabled: false })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('disabled');
    expect(mockToggleSkill).toHaveBeenCalledWith('code-review', false);
  });

  it('should return 400 for missing name', async () => {
    const response = await fetch(`${baseUrl}/api/skills/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing enabled', async () => {
    const response = await fetch(`${baseUrl}/api/skills/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' })
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 for non-boolean enabled', async () => {
    const response = await fetch(`${baseUrl}/api/skills/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', enabled: 'yes' })
    });

    expect(response.status).toBe(400);
  });
});

describe('Skills API - Create Skill', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createSkillsTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new skill', async () => {
    const response = await fetch(`${baseUrl}/api/skills/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'new-skill',
        content: '# New Skill\n\nSkill content'
      })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('created');
    expect(mockCreateLocalSkill).toHaveBeenCalledWith('new-skill', '# New Skill\n\nSkill content');
  });

  it('should return 400 for missing name', async () => {
    const response = await fetch(`${baseUrl}/api/skills/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Some content' })
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing content', async () => {
    const response = await fetch(`${baseUrl}/api/skills/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-skill' })
    });

    expect(response.status).toBe(400);
  });

  it('should handle creation failure', async () => {
    mockCreateLocalSkill.mockResolvedValueOnce({
      success: false,
      error: 'Skill already exists'
    });

    const response = await fetch(`${baseUrl}/api/skills/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'existing-skill', content: 'Content' })
    });

    expect(response.status).toBe(400);
  });
});

describe('Skills API - Delete Skill', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createSkillsTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a skill', async () => {
    const response = await fetch(`${baseUrl}/api/skills/code-review`, {
      method: 'DELETE'
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
    expect(mockDeleteLocalSkill).toHaveBeenCalledWith('code-review');
  });

  it('should handle deletion failure', async () => {
    mockDeleteLocalSkill.mockResolvedValueOnce({
      success: false,
      error: 'Cannot delete non-local skill'
    });

    const response = await fetch(`${baseUrl}/api/skills/claude-skill`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(400);
  });
});

describe('Skills API - Error Handling', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createSkillsTestServer();
    await new Promise(resolve => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 500 on internal error in list', async () => {
    mockGetAllSkills.mockRejectedValueOnce(new Error('Database error'));

    const response = await fetch(`${baseUrl}/api/skills`);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 500 on internal error in toggle', async () => {
    mockToggleSkill.mockRejectedValueOnce(new Error('Toggle failed'));

    const response = await fetch(`${baseUrl}/api/skills/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', enabled: true })
    });

    expect(response.status).toBe(500);
  });

  it('should return 500 on internal error in create', async () => {
    mockCreateLocalSkill.mockRejectedValueOnce(new Error('Create failed'));

    const response = await fetch(`${baseUrl}/api/skills/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', content: 'content' })
    });

    expect(response.status).toBe(500);
  });

  it('should return 500 on internal error in delete', async () => {
    mockDeleteLocalSkill.mockRejectedValueOnce(new Error('Delete failed'));

    const response = await fetch(`${baseUrl}/api/skills/test-skill`, {
      method: 'DELETE'
    });

    expect(response.status).toBe(500);
  });
});
