/**
 * Feedback Module
 * Handles toast notifications and error display with retry
 */

import { createToastConfig, buildErrorRetryHTML } from '../uiHelpers.js';

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 * @returns {Function|null} Function to manually dismiss the toast
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.error('Toast container not found');
    return null;
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Get toast config from uiHelpers
  const config = createToastConfig(type);

  // Create icon based on type
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.innerHTML = config.icon;
  icon.style.color = config.color;

  // Create message
  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;

  // Assemble toast
  toast.appendChild(icon);
  toast.appendChild(messageEl);

  // Add to container
  container.appendChild(toast);

  // Auto-remove after duration
  const timeout = setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);

  // Return function to manually dismiss
  return () => {
    clearTimeout(timeout);
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  };
}

/**
 * Store last failed message for retry
 */
let lastFailedMessage = null;
let lastFailedChatId = null;

// Callback references for retry functionality
let scrollToBottomCallback = null;
let handleSendMessageCallback = null;

/**
 * Initialize retry callbacks
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.scrollToBottom - Scroll to bottom function
 * @param {Function} callbacks.handleSendMessage - Send message function
 */
export function initFeedbackCallbacks(callbacks) {
  scrollToBottomCallback = callbacks.scrollToBottom;
  handleSendMessageCallback = callbacks.handleSendMessage;
}

/**
 * Show error message with retry button
 * @param {string} errorMessage - Error message to display
 * @param {string} message - Original message that failed
 * @param {string} chatId - Chat ID context
 */
export function showErrorWithRetry(errorMessage, message, chatId) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) {
    return;
  }

  // Store for retry
  lastFailedMessage = message;
  lastFailedChatId = chatId;

  // Create error element using uiHelpers
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message-error';
  errorDiv.innerHTML = buildErrorRetryHTML(errorMessage);

  // Add retry handler
  const retryBtn = errorDiv.querySelector('.message-error-retry');
  retryBtn.addEventListener('click', () => {
    errorDiv.remove();
    retryMessage();
  });

  messagesContainer.appendChild(errorDiv);
  if (scrollToBottomCallback) {
    scrollToBottomCallback();
  }
}

/**
 * Retry the last failed message
 */
export function retryMessage() {
  if (!lastFailedMessage) {
    showToast('No message to retry', 'error');
    return;
  }

  showToast('Retrying message...', 'info');

  // Trigger send with stored message and chat context
  if (handleSendMessageCallback) {
    handleSendMessageCallback(lastFailedMessage, lastFailedChatId);
  }
}
