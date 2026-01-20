/**
 * Unit tests for sessionManager module
 */

import { describe, it, expect } from 'vitest';
import {
  createToolCallObject,
  findToolCallById,
  updateToolCallInList,
  getToolCallStats,
  createPendingToolCallsMap,
  addPendingToolCall,
  resolveToolCall,
  formatToolCallStatus,
  formatStepsCount,
  truncateToolResult,
  isToolCallComplete,
  getPendingToolCalls,
  markAllRunningAsSuccess,
  addToolCallToList
} from '../../renderer/sessionManager.js';

describe('createToolCallObject', () => {
  it('should create a tool call object with all properties', () => {
    const toolCall = createToolCallObject('Read', { path: '/test' }, 'running');

    expect(toolCall.name).toBe('Read');
    expect(toolCall.input).toEqual({ path: '/test' });
    expect(toolCall.status).toBe('running');
    expect(toolCall.result).toBeNull();
    expect(toolCall.id).toMatch(/^tool_\d+_/);
    expect(typeof toolCall.createdAt).toBe('number');
  });

  it('should use defaults for missing parameters', () => {
    const toolCall = createToolCallObject();

    expect(toolCall.name).toBe('Unknown');
    expect(toolCall.input).toEqual({});
    expect(toolCall.status).toBe('running');
  });

  it('should generate unique IDs', () => {
    const tool1 = createToolCallObject('Tool1');
    const tool2 = createToolCallObject('Tool2');

    expect(tool1.id).not.toBe(tool2.id);
  });
});

describe('findToolCallById', () => {
  const mockToolCalls = [
    { id: 'tool_1', name: 'Read' },
    { id: 'tool_2', name: 'Write' },
    { id: 'tool_3', name: 'Bash' }
  ];

  it('should find a tool call by ID', () => {
    const result = findToolCallById(mockToolCalls, 'tool_2');
    expect(result).toEqual({ id: 'tool_2', name: 'Write' });
  });

  it('should return undefined for non-existent ID', () => {
    const result = findToolCallById(mockToolCalls, 'tool_999');
    expect(result).toBeUndefined();
  });

  it('should handle null/undefined inputs', () => {
    expect(findToolCallById(null, 'tool_1')).toBeUndefined();
    expect(findToolCallById(mockToolCalls, null)).toBeUndefined();
  });
});

describe('updateToolCallInList', () => {
  it('should update a tool call in the list', () => {
    const toolCalls = [
      { id: 'tool_1', status: 'running' },
      { id: 'tool_2', status: 'running' }
    ];

    const result = updateToolCallInList(toolCalls, 'tool_1', { status: 'success' });

    expect(result[0].status).toBe('success');
    expect(result[1].status).toBe('running');
  });

  it('should not mutate original array', () => {
    const toolCalls = [{ id: 'tool_1', status: 'running' }];

    updateToolCallInList(toolCalls, 'tool_1', { status: 'success' });

    expect(toolCalls[0].status).toBe('running');
  });

  it('should handle non-existent ID', () => {
    const toolCalls = [{ id: 'tool_1', status: 'running' }];

    const result = updateToolCallInList(toolCalls, 'tool_999', { status: 'success' });

    expect(result[0].status).toBe('running');
  });

  it('should handle invalid inputs', () => {
    expect(updateToolCallInList(null, 'tool_1', {})).toEqual([]);
    expect(updateToolCallInList([], null, {})).toEqual([]);
  });
});

describe('getToolCallStats', () => {
  it('should calculate correct statistics', () => {
    const toolCalls = [
      { status: 'success' },
      { status: 'success' },
      { status: 'error' },
      { status: 'running' }
    ];

    const stats = getToolCallStats(toolCalls);

    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.running).toBe(1);
  });

  it('should return zeros for empty array', () => {
    const stats = getToolCallStats([]);

    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.running).toBe(0);
  });

  it('should handle invalid input', () => {
    const stats = getToolCallStats(null);

    expect(stats.total).toBe(0);
  });
});

describe('createPendingToolCallsMap', () => {
  it('should create an empty Map', () => {
    const map = createPendingToolCallsMap();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });
});

describe('addPendingToolCall', () => {
  it('should add mapping to the map', () => {
    const map = new Map();

    addPendingToolCall(map, 'api_123', 'local_456');

    expect(map.get('api_123')).toBe('local_456');
  });

  it('should handle null inputs gracefully', () => {
    const map = new Map();

    addPendingToolCall(null, 'api_123', 'local_456');
    addPendingToolCall(map, null, 'local_456');
    addPendingToolCall(map, 'api_123', null);

    expect(map.size).toBe(0);
  });
});

describe('resolveToolCall', () => {
  it('should resolve and remove mapping', () => {
    const map = new Map([['api_123', 'local_456']]);

    const localId = resolveToolCall(map, 'api_123');

    expect(localId).toBe('local_456');
    expect(map.has('api_123')).toBe(false);
  });

  it('should return null for non-existent mapping', () => {
    const map = new Map();

    const localId = resolveToolCall(map, 'api_123');

    expect(localId).toBeNull();
  });

  it('should handle null inputs', () => {
    expect(resolveToolCall(null, 'api_123')).toBeNull();
    expect(resolveToolCall(new Map(), null)).toBeNull();
  });
});

describe('formatToolCallStatus', () => {
  it('should format success status', () => {
    expect(formatToolCallStatus('success')).toBe('Completed');
  });

  it('should format error status', () => {
    expect(formatToolCallStatus('error')).toBe('Failed');
  });

  it('should format running status', () => {
    expect(formatToolCallStatus('running')).toBe('Running...');
  });

  it('should default to Running for unknown status', () => {
    expect(formatToolCallStatus('unknown')).toBe('Running...');
    expect(formatToolCallStatus(null)).toBe('Running...');
  });
});

describe('formatStepsCount', () => {
  it('should format completed steps', () => {
    const stats = { total: 5, completed: 3, failed: 0 };
    expect(formatStepsCount(stats)).toBe('3/5 steps');
  });

  it('should include failed count when present', () => {
    const stats = { total: 5, completed: 3, failed: 2 };
    expect(formatStepsCount(stats)).toBe('3/5 steps (2 failed)');
  });

  it('should handle zero steps', () => {
    const stats = { total: 0, completed: 0, failed: 0 };
    expect(formatStepsCount(stats)).toBe('0 steps');
  });

  it('should handle null input', () => {
    expect(formatStepsCount(null)).toBe('0 steps');
  });
});

describe('truncateToolResult', () => {
  it('should return short results unchanged', () => {
    const result = 'Short result';
    expect(truncateToolResult(result)).toBe(result);
  });

  it('should truncate long results', () => {
    const result = 'a'.repeat(3000);
    const truncated = truncateToolResult(result, 2000);

    expect(truncated.length).toBe(2003); // 2000 + '...'
    expect(truncated.endsWith('...')).toBe(true);
  });

  it('should stringify objects', () => {
    const result = { key: 'value' };
    expect(truncateToolResult(result)).toContain('key');
  });

  it('should handle null/undefined', () => {
    expect(truncateToolResult(null)).toBe('');
    expect(truncateToolResult(undefined)).toBe('');
  });
});

describe('isToolCallComplete', () => {
  it('should return true for success', () => {
    expect(isToolCallComplete({ status: 'success' })).toBe(true);
  });

  it('should return true for error', () => {
    expect(isToolCallComplete({ status: 'error' })).toBe(true);
  });

  it('should return false for running', () => {
    expect(isToolCallComplete({ status: 'running' })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isToolCallComplete(null)).toBe(false);
  });
});

describe('getPendingToolCalls', () => {
  it('should return only running tool calls', () => {
    const toolCalls = [
      { id: 'tool_1', status: 'success' },
      { id: 'tool_2', status: 'running' },
      { id: 'tool_3', status: 'running' }
    ];

    const pending = getPendingToolCalls(toolCalls);

    expect(pending.length).toBe(2);
    expect(pending[0].id).toBe('tool_2');
  });

  it('should return empty array if none pending', () => {
    const toolCalls = [{ id: 'tool_1', status: 'success' }];

    expect(getPendingToolCalls(toolCalls)).toEqual([]);
  });

  it('should handle invalid input', () => {
    expect(getPendingToolCalls(null)).toEqual([]);
  });
});

describe('markAllRunningAsSuccess', () => {
  it('should mark all running as success', () => {
    const toolCalls = [
      { id: 'tool_1', status: 'running' },
      { id: 'tool_2', status: 'success' },
      { id: 'tool_3', status: 'running' }
    ];

    const result = markAllRunningAsSuccess(toolCalls);

    expect(result[0].status).toBe('success');
    expect(result[1].status).toBe('success');
    expect(result[2].status).toBe('success');
  });

  it('should not mutate original array', () => {
    const toolCalls = [{ id: 'tool_1', status: 'running' }];

    markAllRunningAsSuccess(toolCalls);

    expect(toolCalls[0].status).toBe('running');
  });

  it('should handle invalid input', () => {
    expect(markAllRunningAsSuccess(null)).toEqual([]);
  });
});

describe('addToolCallToList', () => {
  it('should add tool call to list', () => {
    const toolCalls = [{ id: 'tool_1' }];
    const newTool = { id: 'tool_2' };

    const result = addToolCallToList(toolCalls, newTool);

    expect(result.length).toBe(2);
    expect(result[1].id).toBe('tool_2');
  });

  it('should not mutate original array', () => {
    const toolCalls = [{ id: 'tool_1' }];

    addToolCallToList(toolCalls, { id: 'tool_2' });

    expect(toolCalls.length).toBe(1);
  });

  it('should handle null array', () => {
    const result = addToolCallToList(null, { id: 'tool_1' });
    expect(result).toEqual([{ id: 'tool_1' }]);
  });

  it('should handle null tool call', () => {
    const result = addToolCallToList(null, null);
    expect(result).toEqual([]);
  });
});
