/**
 * Unit tests for generationControl module
 * Tests generation state management, stop functionality, and UI controls
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock feedback module
vi.mock('../../renderer/modules/feedback.js', () => ({
  showToast: vi.fn()
}));

import {
  setGeneratingState,
  handleStopGeneration,
  updateSendButton,
  autoResizeTextarea,
  insertNewlineAtCursor
} from '../../renderer/modules/generationControl.js';

import { showToast } from '../../renderer/modules/feedback.js';

/**
 * Helper: Create mock elements for testing
 */
function createMockElements() {
  return {
    homeStopBtn: document.createElement('button'),
    chatStopBtn: document.createElement('button'),
    homeSendBtn: document.createElement('button'),
    chatSendBtn: document.createElement('button'),
    homeInput: document.createElement('textarea'),
    messageInput: document.createElement('textarea'),
    homeView: document.createElement('div')
  };
}

/**
 * Helper: Setup DOM with all required elements
 */
function setupDOM() {
  document.body.innerHTML = `
    <div id="homeView">
      <textarea id="homeInput"></textarea>
      <button id="homeSendBtn"></button>
      <button id="homeStopBtn" style="display: none;"></button>
    </div>
    <div id="chatView" class="hidden">
      <textarea id="messageInput"></textarea>
      <button id="chatSendBtn"></button>
      <button id="chatStopBtn" style="display: none;"></button>
    </div>
  `;
}

describe('setGeneratingState', () => {
  let elements;

  beforeEach(() => {
    vi.clearAllMocks();
    elements = createMockElements();
    // Set initial styles
    elements.homeStopBtn.style.display = 'none';
    elements.chatStopBtn.style.display = 'none';
    elements.homeSendBtn.style.display = 'flex';
    elements.chatSendBtn.style.display = 'flex';
    elements.homeInput.disabled = false;
    elements.messageInput.disabled = false;
  });

  describe('when generating is true', () => {
    it('should show stop buttons', () => {
      setGeneratingState(true, elements);

      expect(elements.homeStopBtn.style.display).toBe('flex');
      expect(elements.chatStopBtn.style.display).toBe('flex');
    });

    it('should hide send buttons', () => {
      setGeneratingState(true, elements);

      expect(elements.homeSendBtn.style.display).toBe('none');
      expect(elements.chatSendBtn.style.display).toBe('none');
    });

    it('should disable input fields', () => {
      setGeneratingState(true, elements);

      expect(elements.homeInput.disabled).toBe(true);
      expect(elements.messageInput.disabled).toBe(true);
    });
  });

  describe('when generating is false', () => {
    beforeEach(() => {
      // First set to generating state
      elements.homeStopBtn.style.display = 'flex';
      elements.chatStopBtn.style.display = 'flex';
      elements.homeSendBtn.style.display = 'none';
      elements.chatSendBtn.style.display = 'none';
      elements.homeInput.disabled = true;
      elements.messageInput.disabled = true;
    });

    it('should hide stop buttons', () => {
      setGeneratingState(false, elements);

      expect(elements.homeStopBtn.style.display).toBe('none');
      expect(elements.chatStopBtn.style.display).toBe('none');
    });

    it('should show send buttons', () => {
      setGeneratingState(false, elements);

      expect(elements.homeSendBtn.style.display).toBe('flex');
      expect(elements.chatSendBtn.style.display).toBe('flex');
    });

    it('should enable input fields', () => {
      setGeneratingState(false, elements);

      expect(elements.homeInput.disabled).toBe(false);
      expect(elements.messageInput.disabled).toBe(false);
    });

    it('should focus homeInput when homeView is visible', () => {
      elements.homeView.classList.remove('hidden');
      const focusSpy = vi.spyOn(elements.homeInput, 'focus');

      setGeneratingState(false, elements);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus messageInput when homeView is hidden', () => {
      elements.homeView.classList.add('hidden');
      const focusSpy = vi.spyOn(elements.messageInput, 'focus');

      setGeneratingState(false, elements);

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('with null elements', () => {
    it('should handle null homeStopBtn gracefully', () => {
      const elementsWithNull = { ...elements, homeStopBtn: null };

      expect(() => setGeneratingState(true, elementsWithNull)).not.toThrow();
    });

    it('should handle null chatStopBtn gracefully', () => {
      const elementsWithNull = { ...elements, chatStopBtn: null };

      expect(() => setGeneratingState(true, elementsWithNull)).not.toThrow();
    });

    it('should handle null homeSendBtn gracefully', () => {
      const elementsWithNull = { ...elements, homeSendBtn: null };

      expect(() => setGeneratingState(true, elementsWithNull)).not.toThrow();
    });

    it('should handle null chatSendBtn gracefully', () => {
      const elementsWithNull = { ...elements, chatSendBtn: null };

      expect(() => setGeneratingState(true, elementsWithNull)).not.toThrow();
    });

    it('should handle null homeInput gracefully', () => {
      const elementsWithNull = { ...elements, homeInput: null };

      expect(() => setGeneratingState(true, elementsWithNull)).not.toThrow();
    });

    it('should handle null messageInput gracefully', () => {
      const elementsWithNull = { ...elements, messageInput: null };

      expect(() => setGeneratingState(true, elementsWithNull)).not.toThrow();
    });

    it('should handle null homeView gracefully', () => {
      const elementsWithNull = { ...elements, homeView: null };

      expect(() => setGeneratingState(false, elementsWithNull)).not.toThrow();
    });
  });
});

describe('handleStopGeneration', () => {
  let elements;
  let abortRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    elements = createMockElements();
    abortRequest = vi.fn();
  });

  it('should call abortRequest with requestId', () => {
    const requestId = 'test-request-123';

    handleStopGeneration(requestId, elements, abortRequest);

    expect(abortRequest).toHaveBeenCalledWith(requestId);
  });

  it('should show toast message', () => {
    const requestId = 'test-request-123';

    handleStopGeneration(requestId, elements, abortRequest);

    expect(showToast).toHaveBeenCalledWith('Stopping generation...', 'info');
  });

  it('should set generating state to false', () => {
    const requestId = 'test-request-123';
    elements.homeStopBtn.style.display = 'flex';
    elements.homeSendBtn.style.display = 'none';

    handleStopGeneration(requestId, elements, abortRequest);

    // After stopping, buttons should be reset
    expect(elements.homeStopBtn.style.display).toBe('none');
    expect(elements.homeSendBtn.style.display).toBe('flex');
  });

  it('should return true when requestId exists', () => {
    const requestId = 'test-request-123';

    const result = handleStopGeneration(requestId, elements, abortRequest);

    expect(result).toBe(true);
  });

  it('should return false when requestId is null', () => {
    const result = handleStopGeneration(null, elements, abortRequest);

    expect(result).toBe(false);
  });

  it('should return false when requestId is undefined', () => {
    const result = handleStopGeneration(undefined, elements, abortRequest);

    expect(result).toBe(false);
  });

  it('should return false when requestId is empty string', () => {
    const result = handleStopGeneration('', elements, abortRequest);

    expect(result).toBe(false);
  });

  it('should not call abortRequest when requestId is falsy', () => {
    handleStopGeneration(null, elements, abortRequest);

    expect(abortRequest).not.toHaveBeenCalled();
  });

  it('should not show toast when requestId is falsy', () => {
    handleStopGeneration(null, elements, abortRequest);

    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('updateSendButton', () => {
  let input;
  let button;

  beforeEach(() => {
    input = document.createElement('textarea');
    button = document.createElement('button');
    button.disabled = false;
  });

  describe('button disabled state', () => {
    it('should disable button when input is empty', () => {
      input.value = '';

      updateSendButton(input, button);

      expect(button.disabled).toBe(true);
    });

    it('should disable button when input is only whitespace', () => {
      input.value = '   ';

      updateSendButton(input, button);

      expect(button.disabled).toBe(true);
    });

    it('should disable button when input is tabs only', () => {
      input.value = '\t\t';

      updateSendButton(input, button);

      expect(button.disabled).toBe(true);
    });

    it('should disable button when input is newlines only', () => {
      input.value = '\n\n\n';

      updateSendButton(input, button);

      expect(button.disabled).toBe(true);
    });

    it('should enable button when input has content', () => {
      input.value = 'Hello';

      updateSendButton(input, button);

      expect(button.disabled).toBe(false);
    });

    it('should enable button when input has content with leading whitespace', () => {
      input.value = '   Hello';

      updateSendButton(input, button);

      expect(button.disabled).toBe(false);
    });

    it('should enable button when input has content with trailing whitespace', () => {
      input.value = 'Hello   ';

      updateSendButton(input, button);

      expect(button.disabled).toBe(false);
    });
  });

  describe('with isWaitingForResponse flag', () => {
    it('should disable button when waiting for response even with content', () => {
      input.value = 'Hello';

      updateSendButton(input, button, true);

      expect(button.disabled).toBe(true);
    });

    it('should enable button when not waiting and has content', () => {
      input.value = 'Hello';

      updateSendButton(input, button, false);

      expect(button.disabled).toBe(false);
    });

    it('should disable button when not waiting but no content', () => {
      input.value = '';

      updateSendButton(input, button, false);

      expect(button.disabled).toBe(true);
    });
  });

  describe('with null elements', () => {
    it('should handle null input gracefully', () => {
      expect(() => updateSendButton(null, button)).not.toThrow();
    });

    it('should handle null button gracefully', () => {
      expect(() => updateSendButton(input, null)).not.toThrow();
    });

    it('should handle both null gracefully', () => {
      expect(() => updateSendButton(null, null)).not.toThrow();
    });
  });
});

describe('autoResizeTextarea', () => {
  let textarea;

  beforeEach(() => {
    textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.style.height = '50px';
  });

  afterEach(() => {
    document.body.removeChild(textarea);
  });

  it('should handle null textarea gracefully', () => {
    expect(() => autoResizeTextarea(null)).not.toThrow();
  });

  it('should reset height to auto first', () => {
    autoResizeTextarea(textarea);

    // Height should be set based on scrollHeight
    expect(textarea.style.height).not.toBe('');
  });

  it('should set height based on scrollHeight', () => {
    // Mock scrollHeight
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 100,
      configurable: true
    });

    autoResizeTextarea(textarea);

    expect(textarea.style.height).toBe('100px');
  });

  it('should respect maxHeight parameter', () => {
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 300,
      configurable: true
    });

    autoResizeTextarea(textarea, 200);

    expect(textarea.style.height).toBe('200px');
  });

  it('should use default maxHeight of 200', () => {
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 500,
      configurable: true
    });

    autoResizeTextarea(textarea);

    expect(textarea.style.height).toBe('200px');
  });

  it('should add has-scroll class when content exceeds maxHeight', () => {
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 300,
      configurable: true
    });

    autoResizeTextarea(textarea, 200);

    expect(textarea.classList.contains('has-scroll')).toBe(true);
  });

  it('should remove has-scroll class when content fits', () => {
    textarea.classList.add('has-scroll');
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 100,
      configurable: true
    });

    autoResizeTextarea(textarea, 200);

    expect(textarea.classList.contains('has-scroll')).toBe(false);
  });

  it('should handle small scrollHeight', () => {
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 30,
      configurable: true
    });

    autoResizeTextarea(textarea);

    expect(textarea.style.height).toBe('30px');
  });

  it('should handle zero scrollHeight', () => {
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 0,
      configurable: true
    });

    autoResizeTextarea(textarea);

    expect(textarea.style.height).toBe('0px');
  });
});

describe('insertNewlineAtCursor', () => {
  let textarea;

  beforeEach(() => {
    textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
  });

  afterEach(() => {
    document.body.removeChild(textarea);
  });

  it('should insert newline at cursor position', () => {
    textarea.value = 'Hello World';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;

    insertNewlineAtCursor(textarea);

    expect(textarea.value).toBe('Hello\n World');
  });

  it('should place cursor after newline', () => {
    textarea.value = 'Hello World';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;

    insertNewlineAtCursor(textarea);

    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);
  });

  it('should insert newline at beginning', () => {
    textarea.value = 'Hello';
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;

    insertNewlineAtCursor(textarea);

    expect(textarea.value).toBe('\nHello');
    expect(textarea.selectionStart).toBe(1);
  });

  it('should insert newline at end', () => {
    textarea.value = 'Hello';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;

    insertNewlineAtCursor(textarea);

    expect(textarea.value).toBe('Hello\n');
    expect(textarea.selectionStart).toBe(6);
  });

  it('should replace selected text with newline', () => {
    textarea.value = 'Hello World';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 11; // Select " World"

    insertNewlineAtCursor(textarea);

    expect(textarea.value).toBe('Hello\n');
  });

  it('should dispatch input event', () => {
    textarea.value = 'Hello';
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;

    let eventFired = false;
    textarea.addEventListener('input', () => {
      eventFired = true;
    });

    insertNewlineAtCursor(textarea);

    expect(eventFired).toBe(true);
  });

  it('should handle empty textarea', () => {
    textarea.value = '';
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;

    insertNewlineAtCursor(textarea);

    expect(textarea.value).toBe('\n');
    expect(textarea.selectionStart).toBe(1);
  });

  it('should handle multiline text', () => {
    textarea.value = 'Line 1\nLine 2\nLine 3';
    textarea.selectionStart = 7; // After "Line 1\n"
    textarea.selectionEnd = 7;

    insertNewlineAtCursor(textarea);

    expect(textarea.value).toBe('Line 1\n\nLine 2\nLine 3');
  });
});

describe('Integration scenarios', () => {
  let elements;

  beforeEach(() => {
    vi.clearAllMocks();
    setupDOM();
    elements = {
      homeStopBtn: document.getElementById('homeStopBtn'),
      chatStopBtn: document.getElementById('chatStopBtn'),
      homeSendBtn: document.getElementById('homeSendBtn'),
      chatSendBtn: document.getElementById('chatSendBtn'),
      homeInput: document.getElementById('homeInput'),
      messageInput: document.getElementById('messageInput'),
      homeView: document.getElementById('homeView')
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should complete full generation cycle', () => {
    // Start generation
    setGeneratingState(true, elements);

    expect(elements.homeStopBtn.style.display).toBe('flex');
    expect(elements.homeInput.disabled).toBe(true);

    // Stop generation
    const abortRequest = vi.fn();
    handleStopGeneration('req-123', elements, abortRequest);

    expect(elements.homeStopBtn.style.display).toBe('none');
    expect(elements.homeInput.disabled).toBe(false);
    expect(abortRequest).toHaveBeenCalledWith('req-123');
  });

  it('should update send button after generation completes', () => {
    const input = elements.homeInput;
    const button = elements.homeSendBtn;

    input.value = 'Test message';
    updateSendButton(input, button, true); // Waiting
    expect(button.disabled).toBe(true);

    updateSendButton(input, button, false); // Done waiting
    expect(button.disabled).toBe(false);
  });

  it('should handle textarea resize during typing', () => {
    const input = elements.homeInput;
    input.value = 'Line 1\nLine 2\nLine 3';

    Object.defineProperty(input, 'scrollHeight', {
      value: 80,
      configurable: true
    });

    autoResizeTextarea(input);

    expect(input.style.height).toBe('80px');
    expect(input.classList.contains('has-scroll')).toBe(false);
  });
});

describe('Edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle rapid state changes', () => {
    const elements = createMockElements();

    // Rapid toggles
    setGeneratingState(true, elements);
    setGeneratingState(false, elements);
    setGeneratingState(true, elements);
    setGeneratingState(false, elements);

    expect(elements.homeStopBtn.style.display).toBe('none');
    expect(elements.homeSendBtn.style.display).toBe('flex');
  });

  it('should handle multiple stop attempts', () => {
    const elements = createMockElements();
    const abortRequest = vi.fn();

    handleStopGeneration('req-1', elements, abortRequest);
    handleStopGeneration('req-2', elements, abortRequest);
    handleStopGeneration(null, elements, abortRequest);

    expect(abortRequest).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it('should handle button update with special characters', () => {
    const input = document.createElement('textarea');
    const button = document.createElement('button');

    input.value = '特殊字符 🎉 <script>alert("xss")</script>';
    updateSendButton(input, button);

    expect(button.disabled).toBe(false);
  });

  it('should handle very long input', () => {
    const input = document.createElement('textarea');
    const button = document.createElement('button');

    input.value = 'a'.repeat(10000);
    updateSendButton(input, button);

    expect(button.disabled).toBe(false);
  });

  it('should handle textarea with custom maxHeight', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    Object.defineProperty(textarea, 'scrollHeight', {
      value: 150,
      configurable: true
    });

    autoResizeTextarea(textarea, 100);

    expect(textarea.style.height).toBe('100px');
    expect(textarea.classList.contains('has-scroll')).toBe(true);

    document.body.removeChild(textarea);
  });
});
