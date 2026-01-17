// #region agent log
fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:1',message:'main.js started',data:{dirname:__dirname,cwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
// #endregion

let app, BrowserWindow, shell;
try {
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:require-electron',message:'Attempting to require electron',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  shell = electron.shell;
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:require-success',message:'Electron loaded successfully',data:{electronVersion:process.versions.electron},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
} catch (err) {
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:require-error',message:'Electron require FAILED',data:{error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.error('Failed to load Electron:', err);
  process.exit(1);
}
const path = require('path');

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

// Create Electron window
function createWindow() {
  // #region agent log
  const preloadPath = path.join(__dirname, 'preload.js');
  const htmlPath = path.join(__dirname, 'renderer', 'index.html');
  fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:createWindow',message:'Creating window',data:{preloadPath,htmlPath,dirname:__dirname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D,E'})}).catch(()=>{});
  // #endregion
  
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath
      }
    });

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:window-created',message:'BrowserWindow created successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Load the app
    mainWindow.loadFile(htmlPath).then(() => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:loadFile-success',message:'HTML loaded successfully',data:{htmlPath},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }).catch((err) => {
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:loadFile-error',message:'HTML load FAILED',data:{error:err.message,htmlPath},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:createWindow-error',message:'createWindow FAILED',data:{error:err.message,stack:err.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
    // #endregion
    console.error('createWindow error:', err);
  }

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
// #region agent log
fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:app-lifecycle',message:'Setting up app lifecycle',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
// #endregion

app.whenReady().then(() => {
  // #region agent log
  fetch('http://127.0.0.1:7247/ingest/28778416-76fe-4385-9db2-6fb941fcdbc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:app-ready',message:'App is ready, calling createWindow',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
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
