/**
 * Unit tests for fileHandler module
 * Tests file attachment and file change tracking logic
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../renderer/utils.js', () => ({
  escapeHtml: vi.fn(str => str)
}));

vi.mock('../../renderer/modules/feedback.js', () => ({
  showToast: vi.fn()
}));

import {
  handleFileSelect,
  renderAttachedFiles,
  removeAttachedFile,
  addFileChange,
  renderFileChanges,
  getFileChangeIcon,
  renderFileStats,
  clearFileChanges
} from '../../renderer/modules/fileHandler.js';

import { showToast } from '../../renderer/modules/feedback.js';

describe('getFileChangeIcon', () => {
  it('should return + for added', () => {
    expect(getFileChangeIcon('added')).toBe('+');
  });

  it('should return M for modified', () => {
    expect(getFileChangeIcon('modified')).toBe('M');
  });

  it('should return - for deleted', () => {
    expect(getFileChangeIcon('deleted')).toBe('-');
  });

  it('should return ? for unknown type', () => {
    expect(getFileChangeIcon('unknown')).toBe('?');
    expect(getFileChangeIcon('')).toBe('?');
    expect(getFileChangeIcon(undefined)).toBe('?');
  });
});

describe('renderFileStats', () => {
  it('should return empty string for null stats', () => {
    expect(renderFileStats(null)).toBe('');
  });

  it('should return empty string for empty stats', () => {
    expect(renderFileStats({})).toBe('');
  });

  it('should return empty string for zero stats', () => {
    expect(renderFileStats({ added: 0, removed: 0 })).toBe('');
  });

  it('should render added stats', () => {
    const result = renderFileStats({ added: 10 });

    expect(result).toContain('stat-added');
    expect(result).toContain('+10');
  });

  it('should render removed stats', () => {
    const result = renderFileStats({ removed: 5 });

    expect(result).toContain('stat-removed');
    expect(result).toContain('-5');
  });

  it('should render both added and removed stats', () => {
    const result = renderFileStats({ added: 15, removed: 8 });

    expect(result).toContain('stat-added');
    expect(result).toContain('+15');
    expect(result).toContain('stat-removed');
    expect(result).toContain('-8');
  });

  it('should wrap in file-change-stats div', () => {
    const result = renderFileStats({ added: 1 });

    expect(result).toContain('file-change-stats');
  });
});

describe('addFileChange', () => {
  it('should create file change object', () => {
    const { updatedChanges, change } = addFileChange([], 'test.js', '/src/test.js', 'added');

    expect(change.name).toBe('test.js');
    expect(change.path).toBe('/src/test.js');
    expect(change.type).toBe('added');
    expect(change.id).toMatch(/^file_\d+$/);
  });

  it('should append to existing changes', () => {
    const existingChanges = [{ id: 'file_1', name: 'old.js', path: '/old.js', type: 'modified' }];

    const { updatedChanges } = addFileChange(existingChanges, 'new.js', '/new.js', 'added');

    expect(updatedChanges).toHaveLength(2);
    expect(updatedChanges[0].name).toBe('old.js');
    expect(updatedChanges[1].name).toBe('new.js');
  });

  it('should include stats if provided', () => {
    const { change } = addFileChange([], 'file.js', '/file.js', 'modified', {
      added: 10,
      removed: 5
    });

    expect(change.stats).toEqual({ added: 10, removed: 5 });
  });

  it('should use empty stats if not provided', () => {
    const { change } = addFileChange([], 'file.js', '/file.js', 'added');

    expect(change.stats).toEqual({});
  });

  it('should not mutate original array', () => {
    const original = [{ id: 'file_1', name: 'original.js' }];

    addFileChange(original, 'new.js', '/new.js', 'added');

    expect(original).toHaveLength(1);
  });
});

describe('renderFileChanges', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should show empty state for no changes', () => {
    renderFileChanges(container, []);

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).not.toBeNull();
    expect(emptyState.style.display).toBe('block');
    expect(emptyState.textContent).toBe('暂无文件变更');
  });

  it('should render file changes', () => {
    const changes = [
      { id: 'file_1', name: 'test.js', path: '/src/test.js', type: 'added', stats: {} }
    ];

    renderFileChanges(container, changes);

    const items = container.querySelectorAll('.file-change-item');
    expect(items.length).toBe(1);
  });

  it('should display file name', () => {
    const changes = [
      {
        id: 'file_1',
        name: 'component.tsx',
        path: '/src/component.tsx',
        type: 'modified',
        stats: {}
      }
    ];

    renderFileChanges(container, changes);

    expect(container.innerHTML).toContain('component.tsx');
  });

  it('should display file path', () => {
    const changes = [
      { id: 'file_1', name: 'file.js', path: '/deep/nested/path/file.js', type: 'added', stats: {} }
    ];

    renderFileChanges(container, changes);

    expect(container.innerHTML).toContain('/deep/nested/path/file.js');
  });

  it('should display correct icon for type', () => {
    const changes = [
      { id: 'file_1', name: 'added.js', path: '/added.js', type: 'added', stats: {} },
      { id: 'file_2', name: 'modified.js', path: '/modified.js', type: 'modified', stats: {} },
      { id: 'file_3', name: 'deleted.js', path: '/deleted.js', type: 'deleted', stats: {} }
    ];

    renderFileChanges(container, changes);

    const icons = container.querySelectorAll('.file-change-icon');
    expect(icons[0].textContent).toBe('+');
    expect(icons[1].textContent).toBe('M');
    expect(icons[2].textContent).toBe('-');
  });

  it('should hide empty state when changes exist', () => {
    const changes = [{ id: 'file_1', name: 'file.js', path: '/file.js', type: 'added', stats: {} }];

    renderFileChanges(container, changes);

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState.style.display).toBe('none');
  });

  it('should clear container before rendering', () => {
    container.innerHTML = '<div>Old content</div>';

    renderFileChanges(container, []);

    expect(container.innerHTML).not.toContain('Old content');
  });

  it('should handle null container gracefully', () => {
    expect(() => {
      renderFileChanges(null, []);
    }).not.toThrow();
  });

  it('should render multiple changes', () => {
    const changes = [];
    for (let i = 0; i < 10; i++) {
      changes.push({
        id: `file_${i}`,
        name: `file${i}.js`,
        path: `/src/file${i}.js`,
        type: i % 3 === 0 ? 'added' : i % 3 === 1 ? 'modified' : 'deleted',
        stats: {}
      });
    }

    renderFileChanges(container, changes);

    const items = container.querySelectorAll('.file-change-item');
    expect(items.length).toBe(10);
  });
});

describe('clearFileChanges', () => {
  it('should clear container and show empty state', () => {
    const container = document.createElement('div');
    container.innerHTML = '<div class="file-change-item">Old item</div>';

    const result = clearFileChanges(container);

    expect(result).toEqual([]);
    expect(container.querySelector('.file-change-item')).toBeNull();
    expect(container.querySelector('.empty-state')).not.toBeNull();
  });

  it('should set empty state display to block', () => {
    const container = document.createElement('div');

    clearFileChanges(container);

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState.style.display).toBe('block');
  });

  it('should set correct empty state text', () => {
    const container = document.createElement('div');

    clearFileChanges(container);

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState.textContent).toBe('暂无文件变更');
  });

  it('should handle null container', () => {
    const result = clearFileChanges(null);

    expect(result).toEqual([]);
  });
});

describe('renderAttachedFiles', () => {
  let inputWrapper;

  beforeEach(() => {
    inputWrapper = document.createElement('div');
  });

  it('should create files container if not exists', () => {
    const files = [{ name: 'test.txt', size: 100 }];

    renderAttachedFiles(inputWrapper, files, 'home');

    const container = inputWrapper.querySelector('.attached-files');
    expect(container).not.toBeNull();
  });

  it('should render file preview', () => {
    const files = [{ name: 'document.pdf', size: 1024 }];

    renderAttachedFiles(inputWrapper, files, 'chat');

    expect(inputWrapper.innerHTML).toContain('document.pdf');
  });

  it('should render multiple files', () => {
    const files = [{ name: 'file1.txt' }, { name: 'file2.txt' }, { name: 'file3.txt' }];

    renderAttachedFiles(inputWrapper, files, 'home');

    const attachedFiles = inputWrapper.querySelectorAll('.attached-file');
    expect(attachedFiles.length).toBe(3);
  });

  it('should remove container when no files', () => {
    // First add files
    const files = [{ name: 'test.txt' }];
    renderAttachedFiles(inputWrapper, files, 'home');

    expect(inputWrapper.querySelector('.attached-files')).not.toBeNull();

    // Then clear
    renderAttachedFiles(inputWrapper, [], 'home');

    expect(inputWrapper.querySelector('.attached-files')).toBeNull();
  });

  it('should handle null inputWrapper', () => {
    expect(() => {
      renderAttachedFiles(null, [{ name: 'test.txt' }], 'home');
    }).not.toThrow();
  });

  it('should include remove button for each file', () => {
    const files = [{ name: 'test.txt' }];

    renderAttachedFiles(inputWrapper, files, 'home');

    const removeBtn = inputWrapper.querySelector('.remove-file');
    expect(removeBtn).not.toBeNull();
  });

  it('should reuse existing container', () => {
    const existingContainer = document.createElement('div');
    existingContainer.className = 'attached-files';
    inputWrapper.appendChild(existingContainer);

    const files = [{ name: 'new.txt' }];
    renderAttachedFiles(inputWrapper, files, 'home');

    const containers = inputWrapper.querySelectorAll('.attached-files');
    expect(containers.length).toBe(1);
  });
});

describe('removeAttachedFile', () => {
  it('should remove file at specified index', () => {
    const files = [{ name: 'file1.txt' }, { name: 'file2.txt' }, { name: 'file3.txt' }];

    const result = removeAttachedFile(files, 1, 'home', null);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('file1.txt');
    expect(result[1].name).toBe('file3.txt');
  });

  it('should call render callback', () => {
    const files = [{ name: 'file.txt' }];
    const renderCallback = vi.fn();

    removeAttachedFile(files, 0, 'chat', renderCallback);

    expect(renderCallback).toHaveBeenCalledWith([], 'chat');
  });

  it('should not mutate original array', () => {
    const original = [{ name: 'file1.txt' }, { name: 'file2.txt' }];

    removeAttachedFile(original, 0, 'home', null);

    expect(original).toHaveLength(2);
  });

  it('should handle removing first item', () => {
    const files = [{ name: 'first.txt' }, { name: 'second.txt' }];

    const result = removeAttachedFile(files, 0, 'home', null);

    expect(result[0].name).toBe('second.txt');
  });

  it('should handle removing last item', () => {
    const files = [{ name: 'first.txt' }, { name: 'last.txt' }];

    const result = removeAttachedFile(files, 1, 'home', null);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('first.txt');
  });
});

describe('handleFileSelect', () => {
  let event;
  let renderCallback;

  beforeEach(() => {
    renderCallback = vi.fn();
  });

  it('should reset input value after selection', () => {
    const input = document.createElement('input');
    input.type = 'file';

    // Create mock file list
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', {
      value: [mockFile]
    });

    event = { target: input };

    handleFileSelect(event, 'home', [], renderCallback);

    expect(input.value).toBe('');
  });

  it('should show toast when exceeding max files', () => {
    const input = document.createElement('input');
    input.type = 'file';

    // Create mock files - adding 2 files when already at 5 should trigger toast
    const mockFiles = [];
    for (let i = 0; i < 2; i++) {
      mockFiles.push(new File(['content'], `file${i}.txt`, { type: 'text/plain' }));
    }
    Object.defineProperty(input, 'files', {
      value: mockFiles
    });

    event = { target: input };

    // Already have 5 files (at max limit)
    const existingFiles = [
      { name: 'f1.txt' },
      { name: 'f2.txt' },
      { name: 'f3.txt' },
      { name: 'f4.txt' },
      { name: 'f5.txt' }
    ];

    handleFileSelect(event, 'home', existingFiles, renderCallback);

    // Toast should be called immediately in forEach, before async file read
    expect(showToast).toHaveBeenCalledWith('Maximum 5 files allowed', 'error');
  });

  it('should return updated files array', () => {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [] });

    event = { target: input };
    const existingFiles = [{ name: 'existing.txt' }];

    const result = handleFileSelect(event, 'home', existingFiles, renderCallback);

    // Result is a copy of existingFiles (no new files added synchronously)
    expect(result).toHaveLength(1);
  });
});

describe('Edge Cases', () => {
  it('should handle file with special characters in name', () => {
    const { change } = addFileChange(
      [],
      'file with spaces & symbols!.js',
      '/path/to/file with spaces & symbols!.js',
      'added'
    );

    expect(change.name).toBe('file with spaces & symbols!.js');
  });

  it('should handle very long file paths', () => {
    const longPath = '/a'.repeat(500) + '/file.js';
    const { change } = addFileChange([], 'file.js', longPath, 'modified');

    expect(change.path).toBe(longPath);
  });

  it('should handle file changes with large stats', () => {
    const result = renderFileStats({ added: 99999, removed: 88888 });

    expect(result).toContain('+99999');
    expect(result).toContain('-88888');
  });
});
