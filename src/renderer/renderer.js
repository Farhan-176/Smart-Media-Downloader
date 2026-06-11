/**
 * Smart Media Downloader - Renderer Process
 * Handles UI interactions and communicates with main process
 */

// State Management
const state = {
  currentDownloadId: null,
  currentMetadata: null,
  isAnalyzing: false,
  isDownloading: false
};

// DOM Elements
const elements = {
  urlInput: document.getElementById('urlInput'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  fileInfoSection: document.getElementById('fileInfoSection'),
  fileNameDisplay: document.getElementById('fileNameDisplay'),
  fileSizeDisplay: document.getElementById('fileSizeDisplay'),
  contentTypeDisplay: document.getElementById('contentTypeDisplay'),
  rangeSupportDisplay: document.getElementById('rangeSupportDisplay'),
  downloadBtn: document.getElementById('downloadBtn'),
  progressSection: document.getElementById('progressSection'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  downloadedDisplay: document.getElementById('downloadedDisplay'),
  speedDisplay: document.getElementById('speedDisplay'),
  etaDisplay: document.getElementById('etaDisplay'),
  statusDisplay: document.getElementById('statusDisplay'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  statusMessage: document.getElementById('statusMessage'),
  recoverySection: document.getElementById('recoverySection'),
  recoveryList: document.getElementById('recoveryList'),
  downloadDirDisplay: document.getElementById('downloadDirDisplay'),
  
  // New Elements
  speedLimitSelect: document.getElementById('speedLimitSelect'),
  clipboardToggle: document.getElementById('clipboardToggle'),
  qualitySelectorContainer: document.getElementById('qualitySelectorContainer'),
  qualitySelect: document.getElementById('qualitySelect'),
  scheduleToggle: document.getElementById('scheduleToggle'),
  scheduleTimeInput: document.getElementById('scheduleTimeInput'),
  queueList: document.getElementById('queueList'),
  clipboardToast: document.getElementById('clipboardToast'),
  toastActionBtn: document.getElementById('toastActionBtn'),
  toastCloseBtn: document.getElementById('toastCloseBtn')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadDownloadDirectory();
  await checkPendingDownloads();
  await loadQueueState();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Analyze button
  elements.analyzeBtn.addEventListener('click', handleAnalyze);
  
  // Enter key on URL input
  elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  });

  // Download button
  elements.downloadBtn.addEventListener('click', handleDownload);

  // Control buttons
  elements.pauseBtn.addEventListener('click', handlePause);
  elements.resumeBtn.addEventListener('click', handleResume);
  elements.cancelBtn.addEventListener('click', handleCancel);

  // Scheduler toggle listener
  elements.scheduleToggle.addEventListener('change', () => {
    elements.scheduleTimeInput.style.display = elements.scheduleToggle.checked ? 'block' : 'none';
  });

  // Toast controls
  elements.toastCloseBtn.addEventListener('click', () => {
    elements.clipboardToast.style.display = 'none';
  });

  elements.toastActionBtn.addEventListener('click', () => {
    elements.clipboardToast.style.display = 'none';
    handleAnalyze();
  });

  // Listen for download events from main process
  window.electronAPI.onDownloadProgress((progress) => {
    updateProgress(progress);
  });

  window.electronAPI.onDownloadComplete((downloadId) => {
    handleDownloadComplete();
  });

  window.electronAPI.onDownloadError((error) => {
    handleDownloadError(error);
  });

  // Listen for clipboard detection
  window.electronAPI.onClipboardLinkDetected((url) => {
    if (elements.clipboardToggle.checked) {
      elements.urlInput.value = url;
      elements.clipboardToast.style.display = 'block';
    }
  });

  // Listen for queue updates
  window.electronAPI.onQueueUpdated((queue) => {
    renderQueue(queue);
  });
}

/**
 * Handle URL analysis
 */
async function handleAnalyze() {
  const url = elements.urlInput.value.trim();

  if (!url) {
    showMessage('Please enter a URL', 'error');
    return;
  }

  // Update UI state
  state.isAnalyzing = true;
  elements.analyzeBtn.disabled = true;
  elements.analyzeBtn.querySelector('.btn-text').style.display = 'none';
  elements.analyzeBtn.querySelector('.spinner').style.display = 'block';
  hideMessage();

  try {
    const result = await window.electronAPI.analyzeUrl(url);

    if (result.success) {
      state.currentMetadata = result.data;
      displayFileInfo(result.data);
      showMessage('URL analyzed successfully', 'success');
    } else {
      showMessage(`Analysis failed: ${result.error}`, 'error');
      hideFileInfo();
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
    hideFileInfo();
  } finally {
    state.isAnalyzing = false;
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.querySelector('.btn-text').style.display = 'inline';
    elements.analyzeBtn.querySelector('.spinner').style.display = 'none';
  }
}

/**
 * Display file information
 */
function displayFileInfo(metadata) {
  elements.fileNameDisplay.textContent = metadata.filename;
  elements.fileSizeDisplay.textContent = formatFileSize(metadata.fileSize);
  elements.contentTypeDisplay.textContent = metadata.contentType;
  
  // Clear and update quality selector
  elements.qualitySelect.innerHTML = '';
  if (metadata.isVideoSource && metadata.availableFormats && metadata.availableFormats.length > 0) {
    metadata.availableFormats.forEach(format => {
      const option = document.createElement('option');
      option.value = format.formatId;
      option.textContent = format.label;
      option.dataset.isAudio = !!format.isAudio;
      option.dataset.fileSize = format.fileSize || '';
      elements.qualitySelect.appendChild(option);
    });
    elements.qualitySelectorContainer.style.display = 'block';
  } else {
    elements.qualitySelectorContainer.style.display = 'none';
  }

  elements.fileInfoSection.style.display = 'block';
  elements.downloadBtn.disabled = false;
  
  if (metadata.isVideoSource) {
    elements.downloadBtn.textContent = 'Add to Download List';
  } else {
    elements.downloadBtn.textContent = (!metadata.supportsRanges || !metadata.fileSize) ? 'Start Download (single connection)' : 'Start Download';
  }
}

/**
 * Hide file information
 */
function hideFileInfo() {
  elements.fileInfoSection.style.display = 'none';
}

/**
 * Handle download start
 */
async function handleDownload() {
  if (!state.currentMetadata) {
    showMessage('No file information available', 'error');
    return;
  }

  elements.downloadBtn.disabled = true;
  hideMessage();

  try {
    const options = {};
    
    // Add speed limit rate (bytes/s)
    const limitRateVal = parseInt(elements.speedLimitSelect.value, 10);
    if (limitRateVal > 0) {
      options.limitRate = limitRateVal;
    }

    // Add scheduling
    if (elements.scheduleToggle.checked && elements.scheduleTimeInput.value) {
      options.scheduleTime = elements.scheduleTimeInput.value;
    }

    // Add quality options
    if (state.currentMetadata.isVideoSource && elements.qualitySelect.value) {
      const selectedOption = elements.qualitySelect.selectedOptions[0];
      options.format = selectedOption.value;
      options.isAudio = selectedOption.dataset.isAudio === 'true';
    }

    // If metadata indicates no range support or unknown size, request single-connection fallback
    if (!state.currentMetadata.supportsRanges || !state.currentMetadata.fileSize) {
      options.singleConnection = true;
    }

    const result = await window.electronAPI.startDownload(
      state.currentMetadata.url,
      state.currentMetadata.filename,
      options
    );

    if (result.success) {
      state.currentDownloadId = result.downloadId;
      state.isDownloading = true;
      
      // Reset progress display
      updateProgressUI(0, 0, state.currentMetadata.fileSize, 0, Infinity);
      
      if (options.scheduleTime) {
        showMessage(`Download successfully scheduled for ${new Date(options.scheduleTime).toLocaleString()}`, 'success');
      } else {
        showMessage('Download added to queue', 'success');
      }

      // Hide file info and load queue status
      elements.fileInfoSection.style.display = 'none';
      await loadQueueState();
    } else {
      showMessage(`Failed to start download: ${result.error}`, 'error');
      elements.downloadBtn.disabled = false;
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
    elements.downloadBtn.disabled = false;
  }
}

/**
 * Handle pause
 */
async function handlePause() {
  if (!state.currentDownloadId) return;

  elements.pauseBtn.disabled = true;

  try {
    const result = await window.electronAPI.pauseDownload(state.currentDownloadId);

    if (result.success) {
      elements.pauseBtn.style.display = 'none';
      elements.resumeBtn.style.display = 'inline-flex';
      updateStatus('paused');
      showMessage('Download paused', 'info');
    } else {
      showMessage(`Failed to pause: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    elements.pauseBtn.disabled = false;
  }
}

/**
 * Handle resume
 */
async function handleResume() {
  if (!state.currentDownloadId) return;

  elements.resumeBtn.disabled = true;

  try {
    const result = await window.electronAPI.resumeDownload(state.currentDownloadId);

    if (result.success) {
      elements.resumeBtn.style.display = 'none';
      elements.pauseBtn.style.display = 'inline-flex';
      updateStatus('downloading');
      showMessage('Download resumed', 'success');
    } else {
      showMessage(`Failed to resume: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    elements.resumeBtn.disabled = false;
  }
}

/**
 * Handle cancel
 */
async function handleCancel() {
  if (!state.currentDownloadId) return;

  const confirmed = confirm('Are you sure you want to cancel this download?');
  if (!confirmed) return;

  try {
    const result = await window.electronAPI.cancelDownload(state.currentDownloadId);

    if (result.success) {
      resetUI();
      showMessage('Download cancelled', 'info');
    } else {
      showMessage(`Failed to cancel: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
}

/**
 * Update progress display
 */
function updateProgress(progress) {
  updateProgressUI(
    progress.percentage,
    progress.downloadedBytes,
    progress.totalBytes,
    progress.speed,
    progress.eta
  );
}

/**
 * Update progress UI elements
 */
function updateProgressUI(percentage, downloaded, total, speed, eta) {
  // Update progress bar
  const roundedPercentage = Math.min(100, Math.max(0, percentage));
  elements.progressBar.style.width = `${roundedPercentage}%`;
  elements.progressText.textContent = `${roundedPercentage.toFixed(1)}%`;

  // Update stats
  elements.downloadedDisplay.textContent = `${formatFileSize(downloaded)} / ${formatFileSize(total)}`;
  elements.speedDisplay.textContent = `${formatFileSize(speed)}/s`;
  elements.etaDisplay.textContent = formatETA(eta);
}

/**
 * Handle download completion
 */
function handleDownloadComplete() {
  updateStatus('completed');
  elements.pauseBtn.style.display = 'none';
  elements.resumeBtn.style.display = 'none';
  elements.cancelBtn.style.display = 'none';
  showMessage('✓ Download completed successfully!', 'success');
  
  state.isDownloading = false;
}

/**
 * Handle download error
 */
function handleDownloadError(error) {
  updateStatus('error');
  showMessage(`Download error: ${error}`, 'error');
  elements.pauseBtn.style.display = 'none';
  elements.resumeBtn.style.display = 'inline-flex';
}

/**
 * Update status badge
 */
function updateStatus(status) {
  elements.statusDisplay.className = `status-badge status-${status}`;
  elements.statusDisplay.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Reset UI to initial state
 */
function resetUI() {
  state.currentDownloadId = null;
  state.currentMetadata = null;
  state.isDownloading = false;

  elements.progressSection.style.display = 'none';
  elements.fileInfoSection.style.display = 'none';
  elements.urlInput.value = '';
  elements.downloadBtn.disabled = false;
  elements.pauseBtn.style.display = 'inline-flex';
  elements.resumeBtn.style.display = 'none';
  elements.cancelBtn.style.display = 'inline-flex';
}

/**
 * Show status message
 */
function showMessage(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.style.display = 'block';

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      hideMessage();
    }, 5000);
  }
}

/**
 * Hide status message
 */
function hideMessage() {
  elements.statusMessage.style.display = 'none';
}

/**
 * Check for pending downloads on startup
 */
async function checkPendingDownloads() {
  try {
    const result = await window.electronAPI.getPendingDownloads();

    if (result.success && result.data.length > 0) {
      displayPendingDownloads(result.data);
    }
  } catch (error) {
    console.error('Failed to check pending downloads:', error);
  }
}

/**
 * Display pending downloads for recovery
 */
function displayPendingDownloads(downloads) {
  elements.recoveryList.innerHTML = '';

  downloads.forEach((download) => {
    const item = document.createElement('div');
    item.className = 'recovery-item';

    const info = document.createElement('div');
    info.className = 'recovery-item-info';
    
    const title = document.createElement('h3');
    title.textContent = download.filename;
    
    const details = document.createElement('p');
    const progress = download.progress ? download.progress.percentage.toFixed(1) : 0;
    details.textContent = `${progress}% completed - ${formatFileSize(download.fileSize)}`;
    
    info.appendChild(title);
    info.appendChild(details);

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn btn-success';
    resumeBtn.textContent = 'Resume';
    resumeBtn.onclick = () => resumePendingDownload(download);

    item.appendChild(info);
    item.appendChild(resumeBtn);

    elements.recoveryList.appendChild(item);
  });

  elements.recoverySection.style.display = 'block';
}

/**
 * Resume a pending download
 */
async function resumePendingDownload(download) {
  state.currentDownloadId = download.downloadId;
  state.currentMetadata = {
    url: download.url,
    filename: download.filename,
    fileSize: download.fileSize,
    contentType: download.contentType
  };

  elements.recoverySection.style.display = 'none';
  elements.progressSection.style.display = 'block';
  
  if (download.progress) {
    updateProgressUI(
      download.progress.percentage,
      download.progress.downloadedBytes,
      download.progress.totalBytes,
      download.progress.speed || 0,
      download.progress.eta || Infinity
    );
  }

  await handleResume();
}

/**
 * Load download directory
 */
async function loadDownloadDirectory() {
  try {
    const result = await window.electronAPI.getDownloadDir();
    if (result.success) {
      elements.downloadDirDisplay.textContent = `Download Directory: ${result.path}`;
    }
  } catch (error) {
    console.error('Failed to load download directory:', error);
  }
}

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return 'Unknown';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format ETA to human-readable format
 */
function formatETA(seconds) {
  if (!isFinite(seconds) || seconds < 0) {
    return 'Calculating...';
  }

  if (seconds === 0) {
    return 'Complete';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Load the current state of the download queue
 */
async function loadQueueState() {
  try {
    const result = await window.electronAPI.getQueueState();
    if (result.success) {
      renderQueue(result.data);
    }
  } catch (error) {
    console.error('Failed to load queue state:', error);
  }
}

/**
 * Render the queue list in the UI
 */
function renderQueue(queue) {
  elements.queueList.innerHTML = '';
  
  if (!queue || queue.length === 0) {
    elements.queueList.innerHTML = '<div class="queue-empty-message">No active or queued downloads.</div>';
    return;
  }

  // Find the active downloading item to update the main progress section
  const activeDownloadingItem = queue.find(item => item.status === 'downloading');
  if (activeDownloadingItem) {
    state.currentDownloadId = activeDownloadingItem.downloadId;
    state.isDownloading = true;
    elements.progressSection.style.display = 'block';
    if (activeDownloadingItem.progress) {
      updateProgress(activeDownloadingItem.progress);
    }
  }

  queue.forEach(item => {
    const div = document.createElement('div');
    div.className = 'queue-item';

    const info = document.createElement('div');
    info.className = 'queue-item-info';

    const title = document.createElement('h3');
    title.textContent = item.filename || 'Analyzing/Queued file...';

    const desc = document.createElement('p');
    let statusText = '';
    let badgeClass = 'waiting';

    if (item.status === 'downloading') {
      badgeClass = 'downloading';
      const progressPercent = item.progress ? `${item.progress.percentage.toFixed(1)}%` : '0%';
      const speedStr = item.progress ? `${formatFileSize(item.progress.speed)}/s` : '0 B/s';
      statusText = `Downloading: ${progressPercent} at ${speedStr}`;
    } else if (item.status === 'queued') {
      badgeClass = 'waiting';
      statusText = 'In Queue (waiting...)';
    } else if (item.status === 'scheduled') {
      badgeClass = 'scheduled';
      statusText = `Scheduled: ${item.scheduleTime}`;
    } else if (item.status === 'paused') {
      statusText = 'Paused';
    } else if (item.status === 'completed') {
      badgeClass = 'downloading';
      statusText = 'Completed';
    } else if (item.status === 'failed') {
      statusText = 'Failed';
    }

    desc.textContent = statusText;
    info.appendChild(title);
    info.appendChild(desc);

    const badge = document.createElement('span');
    badge.className = `queue-badge ${badgeClass}`;
    badge.textContent = item.status.toUpperCase();

    div.appendChild(info);
    div.appendChild(badge);

    elements.queueList.appendChild(div);
  });
}
