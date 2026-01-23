/**
 * Skills Manager Module
 * Handles skills list, creation, deletion, and toggle functionality
 */

import { showToast } from './feedback.js';
import { escapeHtml, debounce } from '../utils.js';

// Skills cache
let skillsCache = [];

/**
 * Switch settings tab
 * @param {string} tabId - Tab ID ('general' | 'skills')
 */
window.switchSettingsTab = function (tabId) {
  // Update tab buttons
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  // Update tab content
  document.querySelectorAll('.settings-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `settingsTab-${tabId}`);
  });

  // Load skills when switching to skills tab
  if (tabId === 'skills') {
    loadSkillsList();
  }
};

/**
 * Load skills list from API
 */
async function loadSkillsList() {
  const skillsList = document.getElementById('skillsList');
  const skillsCount = document.getElementById('skillsCount');
  const claudeCodeEnabled = document.getElementById('claudeCodeEnabled')?.checked !== false;

  if (!skillsList) {
    return;
  }

  // Show loading
  skillsList.innerHTML = `
    <div class="skills-loading">
      <div class="loading-spinner"></div>
      <span>加载技能列表...</span>
    </div>
  `;

  try {
    const response = await fetch(
      `http://localhost:3001/api/skills?claudeCode=${claudeCodeEnabled}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load skills');
    }

    skillsCache = data.skills || [];
    renderSkillsList(skillsCache);

    if (skillsCount) {
      skillsCount.textContent = `${skillsCache.length} 个技能`;
    }
  } catch (error) {
    console.error('[SKILLS] Failed to load skills:', error);
    skillsList.innerHTML = `
      <div class="skills-empty">
        <div class="skills-empty-icon">⚠️</div>
        <div>加载技能失败: ${error.message}</div>
      </div>
    `;
  }
}

/**
 * Render skills list
 * @param {Array} skills - Skills array
 */
function renderSkillsList(skills) {
  const skillsList = document.getElementById('skillsList');
  const searchQuery = document.getElementById('skillsSearch')?.value?.toLowerCase() || '';
  const sourceFilter = document.getElementById('skillsSourceFilter')?.value || 'all';

  // Filter skills
  const filtered = skills.filter(skill => {
    const matchesSearch =
      !searchQuery ||
      skill.name.toLowerCase().includes(searchQuery) ||
      (skill.description || '').toLowerCase().includes(searchQuery);
    const matchesSource = sourceFilter === 'all' || skill.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  if (filtered.length === 0) {
    skillsList.innerHTML = `
      <div class="skills-empty">
        <div class="skills-empty-icon">📦</div>
        <div>${searchQuery || sourceFilter !== 'all' ? '没有匹配的技能' : '暂无已安装技能'}</div>
      </div>
    `;
    return;
  }

  skillsList.innerHTML = filtered
    .map(
      skill => `
    <div class="skill-card ${skill.error ? 'error' : ''}" data-skill-name="${escapeHtml(skill.name)}">
      <div class="skill-card-icon ${skill.source}">
        ${skill.source === 'claude-code' ? '🔌' : '⭐'}
      </div>
      <div class="skill-card-body">
        <div class="skill-card-header">
          <span class="skill-card-name">${escapeHtml(skill.name)}</span>
          <span class="skill-card-source">${skill.source === 'claude-code' ? 'Claude Code' : '本地'}</span>
        </div>
        <div class="skill-card-desc">${escapeHtml(skill.description || '无描述')}</div>
        ${skill.error ? `<div class="skill-card-error">⚠ ${escapeHtml(skill.error)}</div>` : ''}
      </div>
      <div class="skill-card-actions">
        <button class="skill-card-btn" onclick="viewSkillDetail('${escapeHtml(skill.name)}', '${skill.source}')">详情</button>
        ${skill.source === 'local' ? `<button class="skill-card-btn delete" onclick="deleteSkill('${escapeHtml(skill.name)}')">删除</button>` : ''}
        <label class="skill-toggle">
          <input type="checkbox" ${skill.enabled ? 'checked' : ''} onchange="toggleSkillEnabled('${escapeHtml(skill.name)}', this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * Toggle skill enabled state
 * @param {string} name - Skill name
 * @param {boolean} enabled - New enabled state
 */
window.toggleSkillEnabled = async function (name, enabled) {
  try {
    const response = await fetch('http://localhost:3001/api/skills/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, enabled })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Toggle failed');
    }

    showToast(`技能 "${name}" 已${enabled ? '启用' : '禁用'}`, 'success');

    // Update cache
    const skill = skillsCache.find(s => s.name === name);
    if (skill) {
      skill.enabled = enabled;
    }
  } catch (error) {
    console.error('[SKILLS] Toggle failed:', error);
    showToast(`操作失败: ${error.message}`, 'error');
    // Reload to restore state
    loadSkillsList();
  }
};

/**
 * View skill detail
 * @param {string} name - Skill name
 * @param {string} source - Skill source
 */
window.viewSkillDetail = async function (name, source) {
  const modal = document.getElementById('skillDetailModal');
  const titleEl = document.getElementById('skillDetailTitle');
  const metaEl = document.getElementById('skillDetailMeta');
  const contentEl = document.getElementById('skillDetailContent');

  if (!modal) {
    return;
  }

  // Show modal with loading
  modal.classList.remove('hidden');
  titleEl.textContent = name;
  metaEl.innerHTML = '<span>加载中...</span>';
  contentEl.textContent = '';

  try {
    const response = await fetch(
      `http://localhost:3001/api/skills/${encodeURIComponent(name)}?source=${source}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load skill');
    }

    const skill = data.skill;

    metaEl.innerHTML = `
      <div class="skill-detail-meta-item">
        <span class="skill-detail-meta-label">来源</span>
        <span class="skill-detail-meta-value">${skill.source === 'claude-code' ? 'Claude Code' : '本地'}</span>
      </div>
      <div class="skill-detail-meta-item">
        <span class="skill-detail-meta-label">状态</span>
        <span class="skill-detail-meta-value">${skill.enabled ? '✅ 已启用' : '⏸️ 已禁用'}</span>
      </div>
      ${
        skill.installedAt
          ? `
        <div class="skill-detail-meta-item">
          <span class="skill-detail-meta-label">安装时间</span>
          <span class="skill-detail-meta-value">${new Date(skill.installedAt).toLocaleDateString()}</span>
        </div>
      `
          : ''
      }
    `;

    contentEl.textContent = skill.content || '(无内容)';
  } catch (error) {
    console.error('[SKILLS] Load detail failed:', error);
    metaEl.innerHTML = `<span style="color: #ef4444;">加载失败: ${error.message}</span>`;
  }
};

/**
 * Close skill detail modal
 */
window.closeSkillDetailModal = function () {
  const modal = document.getElementById('skillDetailModal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

/**
 * Open create skill modal
 */
function openCreateSkillModal() {
  const modal = document.getElementById('createSkillModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('newSkillName').value = '';
    document.getElementById('newSkillContent').value = '';
  }
}

/**
 * Close create skill modal
 */
window.closeCreateSkillModal = function () {
  const modal = document.getElementById('createSkillModal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

/**
 * Create new skill
 */
async function createSkill() {
  const nameInput = document.getElementById('newSkillName');
  const contentInput = document.getElementById('newSkillContent');

  const name = nameInput?.value?.trim();
  const content = contentInput?.value;

  if (!name) {
    showToast('请输入技能名称', 'error');
    return;
  }

  if (!content) {
    showToast('请输入技能内容', 'error');
    return;
  }

  try {
    const response = await fetch('http://localhost:3001/api/skills/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Create failed');
    }

    showToast(`技能 "${name}" 创建成功`, 'success');
    window.closeCreateSkillModal();
    loadSkillsList();
  } catch (error) {
    console.error('[SKILLS] Create failed:', error);
    showToast(`创建失败: ${error.message}`, 'error');
  }
}

/**
 * Delete skill
 * @param {string} name - Skill name
 */
window.deleteSkill = async function (name) {
  if (!confirm(`确定要删除技能 "${name}" 吗？此操作不可撤销。`)) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/skills/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Delete failed');
    }

    showToast(`技能 "${name}" 已删除`, 'success');
    loadSkillsList();
  } catch (error) {
    console.error('[SKILLS] Delete failed:', error);
    showToast(`删除失败: ${error.message}`, 'error');
  }
};

/**
 * Setup skills event listeners
 */
export function setupSkillsListeners() {
  // Create skill button
  const createBtn = document.getElementById('createSkillBtn');
  if (createBtn) {
    createBtn.addEventListener('click', openCreateSkillModal);
  }

  // Confirm create button
  const confirmBtn = document.getElementById('confirmCreateSkillBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', createSkill);
  }

  // Search input
  const searchInput = document.getElementById('skillsSearch');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce(() => {
        renderSkillsList(skillsCache);
      }, 200)
    );
  }

  // Source filter
  const sourceFilter = document.getElementById('skillsSourceFilter');
  if (sourceFilter) {
    sourceFilter.addEventListener('change', () => {
      renderSkillsList(skillsCache);
    });
  }

  // Claude Code toggle
  const claudeCodeToggle = document.getElementById('claudeCodeEnabled');
  if (claudeCodeToggle) {
    claudeCodeToggle.addEventListener('change', () => {
      loadSkillsList();
    });
  }
}
