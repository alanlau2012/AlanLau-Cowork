const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  try {
    // Enable live-reload for the main and renderer processes during development
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
    });
  } catch (err) {
    console.warn('Live reload unavailable:', err);
  }
}

// Global window reference
let mainWindow;

// Default settings
const DEFAULT_SETTINGS = {
  apiEndpoint: 'https://api.anthropic.com',
  apiKey: '',
  models: [
    { id: 'minimax-2-1', name: 'Minimax 2.1', default: true },
    { id: 'glm-4-7', name: 'GLM 4.7' }
  ]
};

// Initialize electron-store
const store = new Store({
  name: 'open-claude-cowork-settings',
  defaults: DEFAULT_SETTINGS
});

// Ensure only one default model
function ensureSingleDefault(models) {
  let foundDefault = false;
  return models.map((m, index) => {
    const isDefault = m.default && !foundDefault;
    if (m.default && !foundDefault) {
      foundDefault = true;
    }
    return { ...m, default: isDefault };
  });
}

// IPC handlers for settings
ipcMain.handle('getSettings', () => {
  const settings = store.get('settings');
  if (!settings) {
    return DEFAULT_SETTINGS;
  }
  // Ensure models have valid structure
  if (settings.models) {
    settings.models = ensureSingleDefault(settings.models);
  }
  return { ...DEFAULT_SETTINGS, ...settings };
});

ipcMain.handle('saveSettings', (event, newSettings) => {
  const currentSettings = store.get('settings') || {};

  // Merge with defaults, but respect user-specified values
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ...newSettings,
    models: newSettings.models || currentSettings.models || DEFAULT_SETTINGS.models
  };

  // Ensure only one default model
  if (mergedSettings.models) {
    mergedSettings.models = ensureSingleDefault(mergedSettings.models);
  }

  store.set('settings', mergedSettings);
  console.log('[MAIN] Settings saved:', mergedSettings);
  return mergedSettings;
});

ipcMain.handle('resetSettings', () => {
  store.set('settings', DEFAULT_SETTINGS);
  console.log('[MAIN] Settings reset to defaults');
  return DEFAULT_SETTINGS;
});

// Create Electron window
function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const htmlPath = path.join(__dirname, 'renderer', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  });

  // Load the app
  mainWindow.loadFile(htmlPath);

  // Open DevTools in development (comment out for production)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // If navigating away from our app, open in external browser
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  console.log('Electron app ready');
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active until user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
