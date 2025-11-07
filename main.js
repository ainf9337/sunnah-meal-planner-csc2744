const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let splashWindow;

function createWindows() {
  // --- Create Larger Loading Screen (Splash) ---
  splashWindow = new BrowserWindow({
    width: 600,  // increased size
    height: 400, // increased size
    frame: false, // hide window border
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    center: true,
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  splashWindow.loadFile('src/html/loading.html'); // Use your correct filename

  // --- Create Main App Window ---
  mainWindow = new BrowserWindow({
    show: false, // hidden until splash closes
    fullscreen: true, // full screen once shown
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  mainWindow.loadFile('src/html/index.html');

  // Security: Add CSP
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      const meta = document.createElement('meta');
      meta.httpEquiv = "Content-Security-Policy";
      meta.content = "default-src 'self' 'unsafe-inline' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;";
      document.head.appendChild(meta);
    `);
  });

    // Show splash first, then open main app
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (!splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
      if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      }
    }, 2500); // show splash for 2.5 seconds
  });
}

app.whenReady().then(() => {
  createWindows();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
