const { app, BrowserWindow, shell, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  try {
    // Enable live-reload for the main and renderer processes during development
    // Exclude styles directory to prevent CSS file changes from triggering reloads
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      ignored: [/renderer[\\/]styles[\\/].*\.css$/, /\.git[\\/]/, /node_modules[\\/]/, /dist[\\/]/]
    });
  } catch (err) {
    console.warn('Live reload unavailable:', err);
  }
}

// Global window reference
let mainWindow;

// Backend server process reference
let serverProcess = null;

// Start backend server
function startBackendServer() {
  // Determine server directory based on whether app is packaged
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, 'server');

  const serverScript = path.join(serverDir, 'server.js');

  // Determine .env path for environment variables
  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '.env');

  console.log('[MAIN] Starting backend server:', serverScript);
  console.log('[MAIN] Server working directory:', serverDir);

  // Use system Node.js to run the server
  const nodePath = process.platform === 'win32' ? 'node.exe' : 'node';

  serverProcess = spawn(nodePath, [serverScript], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: '3001',
      DOTENV_CONFIG_PATH: envPath
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  serverProcess.stdout.on('data', data => {
    console.log('[SERVER]', data.toString().trim());
  });

  serverProcess.stderr.on('data', data => {
    console.error('[SERVER ERROR]', data.toString().trim());
  });

  serverProcess.on('error', err => {
    console.error('[MAIN] Failed to start server:', err);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[MAIN] Server exited with code ${code}, signal ${signal}`);
    serverProcess = null;
  });
}

// Stop backend server
function stopBackendServer() {
  if (serverProcess) {
    console.log('[MAIN] Stopping backend server...');
    // On Windows, we need to kill the process tree
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], { shell: true });
    } else {
      serverProcess.kill('SIGTERM');
    }
    serverProcess = null;
  }
}

// Default settings
const DEFAULT_SETTINGS = {};

// Initialize electron-store
const store = new Store({
  name: 'open-claude-cowork-settings',
  defaults: DEFAULT_SETTINGS
});

// IPC handlers for settings
ipcMain.handle('getSettings', () => {
  const settings = store.get('settings');
  if (!settings) {
    return DEFAULT_SETTINGS;
  }
  // Merge with defaults, ignoring deprecated fields (apiEndpoint, apiKey, models)
  const { apiEndpoint, apiKey, models, ...cleanSettings } = settings;
  return { ...DEFAULT_SETTINGS, ...cleanSettings };
});

ipcMain.handle('saveSettings', (event, newSettings) => {
  const currentSettings = store.get('settings') || {};

  // Merge with defaults, but respect user-specified values
  // Remove deprecated fields (apiEndpoint, apiKey, models) from old settings
  const { apiEndpoint, apiKey, models, ...cleanCurrentSettings } = currentSettings;
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...cleanCurrentSettings,
    ...newSettings
  };

  store.set('settings', mergedSettings);
  console.log('[MAIN] Settings saved:', mergedSettings);
  return mergedSettings;
});

ipcMain.handle('resetSettings', () => {
  store.set('settings', DEFAULT_SETTINGS);
  console.log('[MAIN] Settings reset to defaults');
  return DEFAULT_SETTINGS;
});

// Directory selection dialog for workspace sandbox
ipcMain.handle('selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择工作目录',
    properties: ['openDirectory'],
    buttonLabel: '选择'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  console.log('[MAIN] Directory selected:', result.filePaths[0]);
  return result.filePaths[0];
});

// Create Electron window
function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const htmlPath = path.join(__dirname, 'renderer', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'GTS Cowork',
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

  // Remove default menu bar (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  // Start backend server (only in packaged mode or if not using concurrently)
  if (app.isPackaged) {
    startBackendServer();
  }

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

app.on('before-quit', () => {
  // Stop backend server when app is quitting
  stopBackendServer();
});

app.on('will-quit', () => {
  // Ensure server is stopped
  stopBackendServer();
});
