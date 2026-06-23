/**
 * Smart Media Downloader - Progress Window Process
 */

const downloadId = new URLSearchParams(window.location.search).get('id');

const elements = {
  fileTitle: document.getElementById('fileTitle'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  downloadedDisplay: document.getElementById('downloadedDisplay'),
  speedDisplay: document.getElementById('speedDisplay'),
  etaDisplay: document.getElementById('etaDisplay'),
  statusDisplay: document.getElementById('statusDisplay'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  cancelBtn: document.getElementById('cancelBtn')
};

// Initialize State
document.addEventListener('DOMContentLoaded', async () => {
  if (!downloadId) {
    elements.fileTitle.textContent = 'Error: No Download ID specified.';
    return;
  }

  setupEventListeners();
  await loadInitialState();
});

function setupEventListeners() {
  // Pause
  elements.pauseBtn.addEventListener('click', () => {
    window.electronAPI.pauseDownload(downloadId).then(res => {
      if (res.success) updateStatus('paused');
    });
  });

  // Resume
  elements.resumeBtn.addEventListener('click', () => {
    window.electronAPI.resumeDownload(downloadId).then(res => {
      if (res.success) updateStatus('downloading');
    });
  });

  // Cancel
  elements.cancelBtn.addEventListener('click', () => {
    if (confirm('Cancel this download?')) {
      window.electronAPI.cancelDownload(downloadId).then(() => {
        window.close();
      });
    }
  });

  // Listen for progress updates
  window.electronAPI.onDownloadProgress((progress) => {
    if (progress.downloadId === downloadId) {
      updateProgressUI(
        progress.percentage,
        progress.downloadedBytes,
        progress.totalBytes,
        progress.speed,
        progress.eta,
        'downloading'
      );
    }
  });

  // Listen for completion
  window.electronAPI.onDownloadComplete((id) => {
    if (id === downloadId) {
      updateProgressUI(100, 0, 0, 0, 0, 'completed');
      setTimeout(() => {
        window.close();
      }, 1500);
    }
  });

  // Listen for error
  window.electronAPI.onDownloadError((error) => {
    // Check if the error belongs to this download
    // Since download-error ipc is sent, we also listen to queue updates to check if this download has failed
    loadInitialState();
  });

  // Listen to queue updates for status changes
  window.electronAPI.onQueueUpdated((queue) => {
    const item = queue.find(d => d.downloadId === downloadId);
    if (item) {
      if (item.status === 'completed') {
        updateProgressUI(100, item.fileSize, item.fileSize, 0, 0, 'completed');
        setTimeout(() => {
          window.close();
        }, 1500);
      } else if (item.status === 'paused') {
        updateStatus('paused');
      } else if (item.status === 'error') {
        updateStatus('error', item.errorMessage || 'Unknown error');
      }
    }
  });
}

async function loadInitialState() {
  try {
    const result = await window.electronAPI.getQueueState();
    if (result.success && result.data) {
      const item = result.data.find(d => d.downloadId === downloadId);
      if (item) {
        elements.fileTitle.textContent = `Downloading ${item.filename}`;
        elements.fileTitle.title = item.filename;
        
        const progress = item.progress || {
          percentage: item.status === 'completed' ? 100 : 0,
          downloadedBytes: item.status === 'completed' ? item.fileSize : 0,
          totalBytes: item.fileSize || 0,
          speed: 0,
          eta: Infinity
        };

        updateProgressUI(
          progress.percentage,
          progress.downloadedBytes,
          progress.totalBytes,
          progress.speed,
          progress.eta,
          item.status
        );
      }
    }
  } catch (err) {
    console.error('Failed to load initial state:', err);
  }
}

function updateProgressUI(percentage, downloaded, total, speed, eta, status) {
  const roundedPercentage = Math.min(100, Math.max(0, percentage));
  elements.progressBar.style.width = `${roundedPercentage}%`;
  elements.progressText.textContent = `${roundedPercentage.toFixed(1)}%`;
  
  if (total > 0) {
    elements.downloadedDisplay.textContent = `${formatFileSize(downloaded)} / ${formatFileSize(total)}`;
  } else {
    elements.downloadedDisplay.textContent = `${formatFileSize(downloaded)} / Unknown`;
  }
  
  elements.speedDisplay.textContent = `${formatFileSize(speed)}/s`;
  elements.etaDisplay.textContent = formatETA(eta);
  updateStatus(status);
}

function updateStatus(status, errorMsg = '') {
  elements.statusDisplay.className = `status-badge status-${status}`;
  
  if (status === 'completed') {
    elements.statusDisplay.textContent = 'Completed';
    elements.pauseBtn.style.display = 'none';
    elements.resumeBtn.style.display = 'none';
  } else if (status === 'paused') {
    elements.statusDisplay.textContent = 'Paused';
    elements.pauseBtn.style.display = 'none';
    elements.resumeBtn.style.display = 'inline-flex';
  } else if (status === 'error') {
    elements.statusDisplay.textContent = 'Error';
    elements.statusDisplay.title = errorMsg;
    elements.pauseBtn.style.display = 'none';
    elements.resumeBtn.style.display = 'inline-flex';
  } else {
    elements.statusDisplay.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    elements.pauseBtn.style.display = 'inline-flex';
    elements.resumeBtn.style.display = 'none';
  }
}

// Utility Formatter Functions
function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatETA(seconds) {
  if (seconds === undefined || seconds === null || seconds === Infinity || isNaN(seconds)) return 'Calculating...';
  if (seconds <= 0) return '0s';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  let result = '';
  if (h > 0) result += `${h}h `;
  if (m > 0 || h > 0) result += `${m}m `;
  result += `${s}s`;
  return result;
}
