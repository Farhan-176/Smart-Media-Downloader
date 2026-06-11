const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const LinkAnalyzer = require('./modules/LinkAnalyzer');
const DownloadManager = require('./modules/DownloadManager');
const MetadataManager = require('./modules/MetadataManager');
const VideoExtractor = require('./modules/VideoExtractor');

let lastClipboardText = '';
function startClipboardPolling() {
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const text = clipboard.readText().trim();
      if (text && text !== lastClipboardText) {
        lastClipboardText = text;
        if (VideoExtractor.canHandle(text)) {
          mainWindow.webContents.send('clipboard-link-detected', text);
        }
      }
    } catch (err) {
      console.error('Clipboard polling error:', err);
    }
  }, 1500);
}

let mainWindow;
let downloadManager;
let metadataManager;

// Create main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1e1e1e',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startClipboardPolling();
  });

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize application
app.whenReady().then(async () => {
  // Ensure required directories exist
  const downloadDir = path.join(app.getPath('downloads'), 'SmartDownloader');
  const metadataDir = path.join(app.getPath('userData'), 'metadata');
  
  await fs.mkdir(downloadDir, { recursive: true });
  await fs.mkdir(metadataDir, { recursive: true });

  // Initialize managers
  metadataManager = new MetadataManager(metadataDir);
  downloadManager = new DownloadManager(downloadDir, metadataManager);

  downloadManager.on('queue-updated', (queue) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('queue-updated', queue);
    }
  });

  // Set up IPC handlers
  setupIPCHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
function setupIPCHandlers() {
  // Analyze URL
  ipcMain.handle('analyze-url', async (event, url) => {
    try {
      const analyzer = new LinkAnalyzer();
      const metadata = await analyzer.analyze(url);
      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Start download
  ipcMain.handle('start-download', async (event, url, filename, options = {}) => {
    try {
      const downloadId = await downloadManager.startDownload(url, filename, options);
      
      // Set up progress callbacks
      downloadManager.on('progress', (id, progress) => {
        if (id === downloadId) {
          mainWindow.webContents.send('download-progress', progress);
        }
      });

      downloadManager.on('complete', (id) => {
        if (id === downloadId) {
          mainWindow.webContents.send('download-complete', id);
        }
      });

      downloadManager.on('error', (id, error) => {
        if (id === downloadId) {
          mainWindow.webContents.send('download-error', error);
        }
      });

      return { success: true, downloadId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Pause download
  ipcMain.handle('pause-download', async (event, downloadId) => {
    try {
      await downloadManager.pauseDownload(downloadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Resume download
  ipcMain.handle('resume-download', async (event, downloadId) => {
    try {
      await downloadManager.resumeDownload(downloadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Cancel download
  ipcMain.handle('cancel-download', async (event, downloadId) => {
    try {
      await downloadManager.cancelDownload(downloadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get pending downloads (for recovery)
  ipcMain.handle('get-pending-downloads', async () => {
    try {
      const pending = await metadataManager.getPendingDownloads();
      return { success: true, data: pending };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get download directory
  ipcMain.handle('get-download-dir', async () => {
    const downloadDir = path.join(app.getPath('downloads'), 'SmartDownloader');
    return { success: true, path: downloadDir };
  });

  // Get current queue state
  ipcMain.handle('get-queue-state', async () => {
    try {
      const queue = downloadManager.getQueueState();
      return { success: true, data: queue };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// Graceful shutdown
app.on('before-quit', async () => {
  if (downloadManager) {
    await downloadManager.cleanup();
  }
});
