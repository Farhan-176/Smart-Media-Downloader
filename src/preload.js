const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // URL Analysis
  analyzeUrl: (url) => ipcRenderer.invoke('analyze-url', url),
  
  // Download Control
  startDownload: (url, filename, options) => ipcRenderer.invoke('start-download', url, filename, options),
  pauseDownload: (downloadId) => ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId) => ipcRenderer.invoke('resume-download', downloadId),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  deleteDownload: (downloadId, deleteFile) => ipcRenderer.invoke('delete-download', downloadId, deleteFile),
  
  // Recovery
  getPendingDownloads: () => ipcRenderer.invoke('get-pending-downloads'),
  
  // Settings
  getDownloadDir: () => ipcRenderer.invoke('get-download-dir'),
  
  // Event Listeners
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, downloadId) => callback(downloadId));
  },
  
  onDownloadError: (callback) => {
    ipcRenderer.on('download-error', (event, error) => callback(error));
  },
  
  onClipboardLinkDetected: (callback) => {
    ipcRenderer.on('clipboard-link-detected', (event, url) => callback(url));
  },

  onBrowserDownloadTrigger: (callback) => {
    ipcRenderer.on('browser-download-trigger', (event, data) => callback(data));
  },
  
  openProgressWindow: (downloadId) => ipcRenderer.invoke('open-progress-window', downloadId),
  
  getQueueState: () => ipcRenderer.invoke('get-queue-state'),
  onQueueUpdated: (callback) => {
    ipcRenderer.on('queue-updated', (event, queue) => callback(queue));
  },
  setCompletionAction: (action) => ipcRenderer.invoke('set-completion-action', action),
  selectSavePath: (defaultPath) => ipcRenderer.invoke('select-save-path', defaultPath)
});
