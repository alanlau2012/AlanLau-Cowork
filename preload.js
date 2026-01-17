// #region agent log
fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'preload.js:1',message:'preload.js started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
// #endregion

const { contextBridge, ipcRenderer } = require('electron');

const SERVER_URL = 'http://localhost:3001';

// #region agent log
fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'preload.js:after-require',message:'preload.js require complete',data:{hasContextBridge:!!contextBridge},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
// #endregion

// Expose safe API to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Track active requests for abort capability
  activeRequests: new Map(),

  // Generate unique request ID
  generateRequestId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Abort a specific request
  abortRequest: (requestId) => {
    const controller = window.electronAPI.activeRequests.get(requestId);
    if (controller) {
      console.log('[PRELOAD] Aborting request:', requestId);
      controller.abort();
      window.electronAPI.activeRequests.delete(requestId);
    }
  },

  // Send a chat message to the backend with chat ID for session management
  sendMessage: async (message, chatId) => {
    const requestId = window.electronAPI.generateRequestId();
    const controller = new AbortController();

    // Store controller for potential abort
    window.electronAPI.activeRequests.set(requestId, controller);

    return new Promise((resolve, reject) => {
      console.log('[PRELOAD] Sending message to backend:', message);
      console.log('[PRELOAD] Chat ID:', chatId);
      console.log('[PRELOAD] Request ID:', requestId);

      const timeoutId = setTimeout(() => {
        if (window.electronAPI.activeRequests.has(requestId)) {
          console.log('[PRELOAD] Request timeout, aborting:', requestId);
          controller.abort();
          window.electronAPI.activeRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 120000); // 2 minute timeout

      fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, chatId }),
        signal: controller.signal
      })
        .then(response => {
          clearTimeout(timeoutId);
          window.electronAPI.activeRequests.delete(requestId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log('[PRELOAD] Connected to backend successfully');

          // Return a custom object with methods to read the stream
          resolve({
            requestId,
            getReader: async function() {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              return {
                read: async () => {
                  const { done, value } = await reader.read();
                  return {
                    done,
                    value: done ? undefined : decoder.decode(value, { stream: true })
                  };
                }
              };
            }
          });
        })
        .catch(error => {
          clearTimeout(timeoutId);
          window.electronAPI.activeRequests.delete(requestId);

          if (error.name === 'AbortError') {
            console.log('[PRELOAD] Request was aborted:', requestId);
            reject(new Error('Request aborted'));
          } else {
            console.error('[PRELOAD] Connection error:', error.message);
            reject(new Error(`Failed to connect to backend: ${error.message}`));
          }
        });
    });
  }
});
