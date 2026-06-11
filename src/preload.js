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
  
  getQueueState: () => ipcRenderer.invoke('get-queue-state'),
  onQueueUpdated: (callback) => {
    ipcRenderer.on('queue-updated', (event, queue) => callback(queue));
  }
});
