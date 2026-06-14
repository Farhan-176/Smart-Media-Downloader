const { app, BrowserWindow, ipcMain, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const LinkAnalyzer = require('./modules/LinkAnalyzer');
const DownloadManager = require('./modules/DownloadManager');
const MetadataManager = require('./modules/MetadataManager');
const VideoExtractor = require('./modules/VideoExtractor');

function showSystemNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

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
let integrationServer;

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

  // Start local HTTP server for browser extension integration
  integrationServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/download') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.url) {
            // Forward to renderer to trigger analysis & Download File Info panel
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
              mainWindow.focus();
              mainWindow.webContents.send('browser-download-trigger', { url: data.url, filename: data.filename || '' });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'URL is required' }));
          }
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  integrationServer.listen(3010, '127.0.0.1', () => {
    console.log('Local integration server listening on port 3010');
  });

  let completionAction = 'none';

  function executeCompletionAction() {
    const { exec } = require('child_process');
    if (completionAction === 'shutdown') {
      showSystemNotification('PC Shutdown Scheduled', 'The computer will shut down in 30 seconds.');
      exec('shutdown /s /f /t 30', (err) => {
        if (err) console.error('Shutdown command failed:', err);
      });
    } else if (completionAction === 'sleep') {
      showSystemNotification('PC Sleep Initiated', 'The computer is entering sleep mode.');
      exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0', (err) => {
        if (err) console.error('Sleep command failed:', err);
      });
    }
  }

  // Register completion action IPC handler insidesetup
  ipcMain.handle('set-completion-action', (event, action) => {
    completionAction = action;
    return { success: true };
  });

  downloadManager.on('queue-updated', (queue) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('queue-updated', queue);
    }
  });

  downloadManager.on('complete', async (downloadId) => {
    try {
      const metadata = await metadataManager.loadMetadata(downloadId);
      if (metadata) {
        showSystemNotification('Download Completed! 🎉', `Successfully downloaded: ${metadata.filename}`);
      }

      // Check if all downloads in the queue are finished
      const queue = downloadManager.getQueueState();
      const hasActiveOrQueued = queue.some(item => ['downloading', 'queued', 'scheduled'].includes(item.status));
      if (!hasActiveOrQueued) {
        executeCompletionAction();
      }
    } catch (err) {
      console.error(err);
    }
  });

  downloadManager.on('error', async (downloadId, errMsg) => {
    try {
      const metadata = await metadataManager.loadMetadata(downloadId);
      if (metadata) {
        showSystemNotification('Download Failed ❌', `Error downloading ${metadata.filename}: ${errMsg}`);
      }
    } catch (err) {
      console.error(err);
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

  // Delete download
  ipcMain.handle('delete-download', async (event, downloadId, deleteFile) => {
    try {
      await downloadManager.deleteDownload(downloadId, deleteFile);
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

  // Select save path dialog
  ipcMain.handle('select-save-path', async (event, defaultPath) => {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath,
      properties: ['showOverwriteConfirmation']
    });
    return result;
  });
}

// Graceful shutdown
app.on('before-quit', async () => {
  if (integrationServer) {
    integrationServer.close();
  }
  if (downloadManager) {
    await downloadManager.cleanup();
  }
});
