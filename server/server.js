import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query } from '@anthropic-ai/claude-agent-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Config file path for persistence
const CONFIG_FILE = path.join(__dirname, 'workspace-config.json');

// Load persisted config or use defaults
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...getDefaultConfig(), ...saved };
    }
  } catch (err) {
    console.warn('[CONFIG] Failed to load saved config:', err.message);
  }
  return getDefaultConfig();
}

function getDefaultConfig() {
  return {
    apiEndpoint: process.env.ANTHROPIC_API_ENDPOINT || 'https://api.anthropic.com',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxTurns: 20,
    permissionMode: 'bypassPermissions',
    // Workspace sandbox settings
    workspaceDir: process.env.WORKSPACE_DIR || '',
    sandboxEnabled: process.env.SANDBOX_ENABLED !== 'false'
  };
}

function saveConfig() {
  try {
    const toSave = {
      workspaceDir: serverConfig.workspaceDir,
      sandboxEnabled: serverConfig.sandboxEnabled,
      maxTurns: serverConfig.maxTurns
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2));
    console.log('[CONFIG] Saved to', CONFIG_FILE);
  } catch (err) {
    console.warn('[CONFIG] Failed to save config:', err.message);
  }
}

// In-memory config
const serverConfig = loadConfig();

// ============================================
// File Sandbox Utilities
// ============================================

/**
 * Check if a path is an absolute path (Windows or Unix)
 */
function isAbsolutePath(p) {
  if (!p) {
    return false;
  }
  // Windows: C:\, D:\, etc. or UNC paths \\server\share
  if (/^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\')) {
    return true;
  }
  // Unix: starts with /
  if (p.startsWith('/')) {
    return true;
  }
  return false;
}

/**
 * Normalize and resolve a path relative to workspace
 */
function resolveInWorkspace(targetPath, workspaceDir) {
  if (!workspaceDir) {
    return null;
  }

  const resolved = isAbsolutePath(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(workspaceDir, targetPath);

  return resolved;
}

/**
 * Check if a resolved path is within the workspace
 */
function isPathInWorkspace(resolvedPath, workspaceDir) {
  if (!workspaceDir || !resolvedPath) {
    return false;
  }

  const normalizedWorkspace = path.resolve(workspaceDir).toLowerCase();
  const normalizedPath = resolvedPath.toLowerCase();

  return (
    normalizedPath === normalizedWorkspace ||
    normalizedPath.startsWith(normalizedWorkspace + path.sep)
  );
}

/**
 * Validate file operation path against sandbox
 * Returns { allowed: boolean, reason?: string }
 */
function validateFilePath(targetPath, workspaceDir) {
  if (!workspaceDir) {
    return { allowed: false, reason: '工作目录未设置，请先在设置中配置工作目录' };
  }

  const resolved = resolveInWorkspace(targetPath, workspaceDir);

  if (!isPathInWorkspace(resolved, workspaceDir)) {
    return {
      allowed: false,
      reason: `路径 "${targetPath}" 超出工作目录范围 (${workspaceDir})`
    };
  }

  return { allowed: true };
}

const chatSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Chat endpoint using Claude Agent SDK
app.post('/api/chat', async (req, res) => {
  const { message, chatId, userId = 'default-user' } = req.body;

  console.log('[CHAT] Request received:', message);
  console.log('[CHAT] Chat ID:', chatId);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Check if we have an existing Claude session for this chat
    const existingSessionId = chatId ? chatSessions.get(chatId) : null;
    console.log(
      '[CHAT] Existing session ID for',
      chatId,
      ':',
      existingSessionId || 'none (new chat)'
    );

    // Check workspace configuration
    if (serverConfig.sandboxEnabled && !serverConfig.workspaceDir) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: '请先在设置中配置工作目录（Workspace Directory）'
        })}\n\n`
      );
      res.end();
      return;
    }

    // Build query options with workspace sandbox
    const queryOptions = {
      allowedTools: [
        'Read',
        'Write',
        'Edit',
        'Bash',
        'Glob',
        'Grep',
        'WebSearch',
        'WebFetch',
        'TodoWrite'
      ],
      maxTurns: serverConfig.maxTurns,
      permissionMode: serverConfig.permissionMode
    };

    // Set working directory for file sandbox
    if (serverConfig.workspaceDir) {
      queryOptions.cwd = serverConfig.workspaceDir;
      console.log('[SANDBOX] Working directory set to:', serverConfig.workspaceDir);
    }

    // Add path validation hook when sandbox is enabled
    if (serverConfig.sandboxEnabled && serverConfig.workspaceDir) {
      queryOptions.canUseTool = async (toolName, toolInput) => {
        // File operation tools that need path validation
        const fileTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

        if (fileTools.includes(toolName)) {
          // Extract path from various input formats
          const filePath =
            toolInput.path ||
            toolInput.file ||
            toolInput.target ||
            toolInput.pattern ||
            toolInput.glob_pattern;

          if (filePath) {
            const validation = validateFilePath(filePath, serverConfig.workspaceDir);
            if (!validation.allowed) {
              console.log(`[SANDBOX] Blocked ${toolName}: ${validation.reason}`);
              return { allowed: false, reason: validation.reason };
            }
          }
        }

        // Bash commands: log warning but allow (cwd restriction applies)
        if (toolName === 'Bash') {
          console.log('[SANDBOX] Bash command in workspace:', toolInput.command?.substring(0, 50));
        }

        return { allowed: true };
      };
    }

    // If we have an existing session, resume it
    if (existingSessionId) {
      queryOptions.resume = existingSessionId;
      console.log('[CHAT] Resuming session:', existingSessionId);
    }

    console.log('[CHAT] Calling Claude Agent SDK...');

    // Stream responses from Claude Agent SDK
    for await (const chunk of query({
      prompt: message,
      options: queryOptions
    })) {
      // Capture session ID from system init message
      if (chunk.type === 'system' && chunk.subtype === 'init') {
        const newSessionId = chunk.session_id || chunk.data?.session_id || chunk.sessionId;
        if (newSessionId && chatId) {
          chatSessions.set(chatId, newSessionId);
          console.log('[CHAT] Session ID captured:', newSessionId);
        }
        // Send session ID to frontend
        if (newSessionId) {
          res.write(
            `data: ${JSON.stringify({ type: 'session_init', session_id: newSessionId })}\n\n`
          );
        }
        continue;
      }

      // If it's an assistant message, extract and emit text content
      if (chunk.type === 'assistant' && chunk.message && chunk.message.content) {
        const content = chunk.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              res.write(`data: ${JSON.stringify({ type: 'text', content: block.text })}\n\n`);
            } else if (block.type === 'tool_use') {
              const toolEvent = {
                type: 'tool_use',
                name: block.name,
                input: block.input,
                id: block.id
              };
              res.write(`data: ${JSON.stringify(toolEvent)}\n\n`);
              console.log('[CHAT] Tool use:', block.name);
            }
          }
        }
        continue;
      }

      // If it's a tool result, format it nicely
      if (chunk.type === 'tool_result' || chunk.type === 'result') {
        // #region agent log - Debug: log full chunk structure to find tool_use_id field
        const logData = {
          location: 'server.js:291',
          message: 'tool_result chunk structure',
          data: {
            chunkKeys: Object.keys(chunk),
            tool_use_id: chunk.tool_use_id,
            id: chunk.id,
            block_id: chunk.block_id,
            toolId: chunk.toolId
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'B'
        };
        fs.appendFileSync(
          'd:\\AI项目\\AlanLau-cowork\\open-claude-cowork\\.cursor\\debug.log',
          JSON.stringify(logData) + '\n'
        );
        // #endregion
        const eventData = {
          type: 'tool_result',
          result: chunk.result || chunk.content || chunk,
          tool_use_id: chunk.tool_use_id
        };
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        continue;
      }

      // Skip system chunks, pass through others
      if (chunk.type !== 'system') {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    }

    // Send completion signal
    res.write('data: {"type": "done"}\n\n');
    res.end();
    console.log('[CHAT] Stream completed');
  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Health check endpoint with diagnostic info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      hasApiKey: !!serverConfig.apiKey,
      apiEndpoint: serverConfig.apiEndpoint
    }
  });
});

// Config endpoint - get current config
app.get('/api/config', (req, res) => {
  res.json({
    apiEndpoint: serverConfig.apiEndpoint,
    hasApiKey: !!serverConfig.apiKey,
    maxTurns: serverConfig.maxTurns,
    permissionMode: serverConfig.permissionMode,
    // Sandbox settings
    workspaceDir: serverConfig.workspaceDir,
    sandboxEnabled: serverConfig.sandboxEnabled
  });
});

// Config endpoint - update config (for dynamic configuration)
app.post('/api/config', (req, res) => {
  const { apiEndpoint, apiKey, maxTurns, permissionMode, workspaceDir, sandboxEnabled } = req.body;

  if (apiEndpoint !== undefined) {
    serverConfig.apiEndpoint = apiEndpoint;
  }
  if (apiKey !== undefined) {
    serverConfig.apiKey = apiKey;
  }
  if (maxTurns !== undefined) {
    serverConfig.maxTurns = maxTurns;
  }
  if (permissionMode !== undefined) {
    serverConfig.permissionMode = permissionMode;
  }
  if (workspaceDir !== undefined) {
    // Normalize path for Windows
    serverConfig.workspaceDir = workspaceDir ? path.resolve(workspaceDir) : '';
  }
  if (sandboxEnabled !== undefined) {
    serverConfig.sandboxEnabled = sandboxEnabled;
  }

  // Persist workspace settings
  saveConfig();

  console.log('[CONFIG] Config updated:', {
    apiEndpoint: serverConfig.apiEndpoint,
    hasApiKey: !!serverConfig.apiKey,
    maxTurns: serverConfig.maxTurns,
    permissionMode: serverConfig.permissionMode,
    workspaceDir: serverConfig.workspaceDir,
    sandboxEnabled: serverConfig.sandboxEnabled
  });

  res.json({
    success: true,
    config: {
      apiEndpoint: serverConfig.apiEndpoint,
      hasApiKey: !!serverConfig.apiKey,
      maxTurns: serverConfig.maxTurns,
      permissionMode: serverConfig.permissionMode,
      workspaceDir: serverConfig.workspaceDir,
      sandboxEnabled: serverConfig.sandboxEnabled
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ Backend server running on http://localhost:${PORT}`);
  console.log(`✓ Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`✓ Health check: GET http://localhost:${PORT}/api/health`);

  // Display sandbox status
  if (serverConfig.sandboxEnabled) {
    if (serverConfig.workspaceDir) {
      console.log(`✓ Sandbox enabled - Workspace: ${serverConfig.workspaceDir}`);
    } else {
      console.log('⚠ Sandbox enabled but no workspace directory set');
    }
  } else {
    console.log('⚠ Sandbox disabled - File access unrestricted');
  }
  console.log('');
});
