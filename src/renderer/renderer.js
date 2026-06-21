/**
 * Smart Media Downloader - Renderer Process
 * Handles UI interactions and communicates with main process
 */

// State Management
const state = {
  selectedDownloadId: null,
  currentDownloadId: null,
  currentMetadata: null,
  isAnalyzing: false,
  currentDownloadDir: '',
  currentCategoryFilter: 'all',
  downloads: []
};

// DOM Elements
const elements = {
  // Modals & Overlays
  addUrlModal: document.getElementById('addUrlModal'),
  optionsModal: document.getElementById('optionsModal'),
  fileInfoSection: document.getElementById('fileInfoSection'), // File Info Modal
  progressSection: document.getElementById('progressSection'), // Progress Modal
  recoverySection: document.getElementById('recoverySection'), // Recovery Modal
  dragOverlay: document.getElementById('dragOverlay'),
  clipboardToast: document.getElementById('clipboardToast'),

  // Toolbar Buttons
  tbAddUrl: document.getElementById('tbAddUrl'),
  tbResume: document.getElementById('tbResume'),
  tbStop: document.getElementById('tbStop'),
  tbStopAll: document.getElementById('tbStopAll'),
  tbDelete: document.getElementById('tbDelete'),
  tbDeleteCompleted: document.getElementById('tbDeleteCompleted'),
  tbOptions: document.getElementById('tbOptions'),
  tbScheduler: document.getElementById('tbScheduler'),

  // Menu Items
  menuAddUrl: document.getElementById('menuAddUrl'),
  menuExit: document.getElementById('menuExit'),
  menuStopAll: document.getElementById('menuStopAll'),
  menuClearCompleted: document.getElementById('menuClearCompleted'),
  menuOptions: document.getElementById('menuOptions'),
  menuScheduler: document.getElementById('menuScheduler'),
  menuThemeToggle: document.getElementById('menuThemeToggle'),
  menuAbout: document.getElementById('menuAbout'),

  // Modal Close Buttons
  closeAddUrlModal: document.getElementById('closeAddUrlModal'),
  closeOptionsModal: document.getElementById('closeOptionsModal'),
  closeProgressModal: document.getElementById('closeProgressModal'),
  cancelInfoBtnCross: document.getElementById('cancelInfoBtnCross'),
  closeRecoveryModal: document.getElementById('closeRecoveryModal'),

  // Add URL Inputs
  urlInput: document.getElementById('urlInput'),
  analyzeBtn: document.getElementById('analyzeBtn'),

  // File Info Modal Inputs
  fileInfoUrl: document.getElementById('fileInfoUrl'),
  fileInfoCategory: document.getElementById('fileInfoCategory'),
  fileInfoSavePath: document.getElementById('fileInfoSavePath'),
  rememberPathCheck: document.getElementById('rememberPathCheck'),
  fileInfoDesc: document.getElementById('fileInfoDesc'),
  fileInfoSizeDisplay: document.getElementById('fileInfoSizeDisplay'),
  browseSavePathBtn: document.getElementById('browseSavePathBtn'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  downloadLaterBtn: document.getElementById('downloadLaterBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  cancelInfoBtn: document.getElementById('cancelInfoBtn'),
  fileIconContainer: document.getElementById('fileIconContainer'),
  qualitySelectorContainer: document.getElementById('qualitySelectorContainer'),
  qualitySelect: document.getElementById('qualitySelect'),
  scheduleToggle: document.getElementById('scheduleToggle'),
  scheduleTimeInput: document.getElementById('scheduleTimeInput'),

  // Options Modal Inputs
  speedLimitSelect: document.getElementById('speedLimitSelect'),
  completionActionSelect: document.getElementById('completionActionSelect'),
  clipboardToggle: document.getElementById('clipboardToggle'),
  saveOptionsBtn: document.getElementById('saveOptionsBtn'),

  // Progress Modal Displays
  progressTitle: document.getElementById('progressTitle'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  downloadedDisplay: document.getElementById('downloadedDisplay'),
  speedDisplay: document.getElementById('speedDisplay'),
  etaDisplay: document.getElementById('etaDisplay'),
  statusDisplay: document.getElementById('statusDisplay'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  cancelBtn: document.getElementById('cancelBtn'),

  // Workspace Tables & Stats
  downloadsTableBody: document.getElementById('downloadsTableBody'),
  tableEmptyMessage: document.getElementById('tableEmptyMessage'),
  downloadDirDisplay: document.getElementById('downloadDirDisplay'),
  speedLimiterStatus: document.getElementById('speedLimiterStatus'),
  statusMessage: document.getElementById('statusMessage'),

  // Toast actions
  toastActionBtn: document.getElementById('toastActionBtn'),
  toastCloseBtn: document.getElementById('toastCloseBtn'),
  recoveryList: document.getElementById('recoveryList')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupSidebarFiltering();
  await loadDownloadDirectory();
  await checkPendingDownloads();
  await loadQueueState();
});

/**
 * Setup Sidebar Filtering
 */
function setupSidebarFiltering() {
  const categories = document.querySelectorAll('.category-item');
  categories.forEach(item => {
    item.addEventListener('click', () => {
      categories.forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      state.currentCategoryFilter = item.dataset.category;
      renderDownloadsTable();
    });
  });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Toolbar Buttons
  elements.tbAddUrl.addEventListener('click', openAddUrlDialog);
  elements.tbOptions.addEventListener('click', openOptionsDialog);
  elements.tbScheduler.addEventListener('click', () => {
    openOptionsDialog(); // Opens options with schedule settings
  });

  elements.tbResume.addEventListener('click', handleToolbarResume);
  elements.tbStop.addEventListener('click', handleToolbarStop);
  elements.tbDelete.addEventListener('click', handleToolbarDelete);
  elements.tbStopAll.addEventListener('click', handleStopAll);
  elements.tbDeleteCompleted.addEventListener('click', handleDeleteCompleted);

  // Menu Bar Dropdowns
  elements.menuAddUrl.addEventListener('click', openAddUrlDialog);
  elements.menuExit.addEventListener('click', () => window.close());
  elements.menuStopAll.addEventListener('click', handleStopAll);
  elements.menuClearCompleted.addEventListener('click', handleDeleteCompleted);
  elements.menuOptions.addEventListener('click', openOptionsDialog);
  elements.menuScheduler.addEventListener('click', openOptionsDialog);
  elements.menuThemeToggle.addEventListener('click', toggleTheme);
  elements.menuAbout.addEventListener('click', () => {
    alert('Smart Media Downloader v1.0.0\nAn IDM-inspired segmented download engine.');
  });

  // Modal Closures
  elements.closeAddUrlModal.addEventListener('click', () => elements.addUrlModal.style.display = 'none');
  elements.closeOptionsModal.addEventListener('click', () => elements.optionsModal.style.display = 'none');
  elements.closeProgressModal.addEventListener('click', () => elements.progressSection.style.display = 'none');
  elements.cancelInfoBtnCross.addEventListener('click', () => elements.fileInfoSection.style.display = 'none');
  if (elements.closeRecoveryModal) {
    elements.closeRecoveryModal.addEventListener('click', () => elements.recoverySection.style.display = 'none');
  }

  // Analyze button inside Add URL dialog
  elements.analyzeBtn.addEventListener('click', handleAnalyze);
  elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyze();
  });

  // Save options
  elements.saveOptionsBtn.addEventListener('click', () => {
    const limitRateVal = parseInt(elements.speedLimitSelect.value, 10);
    elements.speedLimiterStatus.textContent = limitRateVal > 0 ? `Speed Limit: ${formatFileSize(limitRateVal)}/s` : 'Speed Limit: Off';
    window.electronAPI.setCompletionAction(elements.completionActionSelect.value);
    elements.optionsModal.style.display = 'none';
    showMessage('Options saved successfully', 'success');
  });

  // File Info Buttons
  elements.downloadBtn.addEventListener('click', () => handleDownload(false));
  elements.downloadLaterBtn.addEventListener('click', () => handleDownload(true));
  elements.cancelInfoBtn.addEventListener('click', () => elements.fileInfoSection.style.display = 'none');

  // Browse save path
  elements.browseSavePathBtn.addEventListener('click', async () => {
    const defaultPath = elements.fileInfoSavePath.value;
    const result = await window.electronAPI.selectSavePath(defaultPath);
    if (result && !result.canceled && result.filePath) {
      elements.fileInfoSavePath.value = result.filePath;
    }
  });

  // Add Category inside File Info
  elements.addCategoryBtn.addEventListener('click', () => {
    const newCategory = prompt('Enter name of new category:');
    if (newCategory) {
      const option = document.createElement('option');
      option.value = newCategory;
      option.textContent = newCategory;
      elements.fileInfoCategory.appendChild(option);
      elements.fileInfoCategory.value = newCategory;
      elements.fileInfoCategory.dispatchEvent(new Event('change'));
    }
  });

  // Category change inside File Info
  elements.fileInfoCategory.addEventListener('change', () => {
    if (!state.currentMetadata) return;
    const category = elements.fileInfoCategory.value;
    const filename = state.currentMetadata.filename;
    elements.fileInfoSavePath.value = `${state.currentDownloadDir}\\${category}\\${filename}`;
  });

  // Quality change inside File Info
  elements.qualitySelect.addEventListener('change', () => {
    if (!state.currentMetadata) return;
    const selectedOption = elements.qualitySelect.selectedOptions[0];
    if (selectedOption) {
      const size = selectedOption.dataset.fileSize;
      if (size && size !== 'null' && size !== 'undefined' && size !== '') {
        elements.fileInfoSizeDisplay.textContent = formatFileSize(parseInt(size, 10));
      } else {
        elements.fileInfoSizeDisplay.textContent = 'Unknown';
      }
    }
  });

  // Schedule toggle inside File Info
  elements.scheduleToggle.addEventListener('change', () => {
    elements.scheduleTimeInput.style.display = elements.scheduleToggle.checked ? 'block' : 'none';
  });

  // Live Progress Modal Controls
  elements.pauseBtn.addEventListener('click', handleProgressPause);
  elements.resumeBtn.addEventListener('click', handleProgressResume);
  elements.cancelBtn.addEventListener('click', handleProgressCancel);

  // Toast actions
  elements.toastCloseBtn.addEventListener('click', () => elements.clipboardToast.style.display = 'none');
  elements.toastActionBtn.addEventListener('click', () => {
    elements.clipboardToast.style.display = 'none';
    openAddUrlDialog();
    handleAnalyze();
  });

  // Clipboard Sniffing Link Detection
  window.electronAPI.onClipboardLinkDetected((url) => {
    if (elements.clipboardToggle.checked) {
      elements.urlInput.value = url;
      elements.clipboardToast.style.display = 'block';
    }
  });

  // Drag & Drop
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    elements.dragOverlay.style.display = 'flex';
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', (e) => {
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      elements.dragOverlay.style.display = 'none';
    }
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dragOverlay.style.display = 'none';
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      elements.urlInput.value = text.trim();
      openAddUrlDialog();
      handleAnalyze();
    }
  });

  // Main process listeners
  window.electronAPI.onDownloadProgress((progress) => {
    updateActiveProgress(progress);
  });
  window.electronAPI.onDownloadComplete((downloadId) => {
    showMessage('✓ Download completed successfully!', 'success');
    loadQueueState();
  });
  window.electronAPI.onDownloadError((error) => {
    showMessage(`Download error: ${error}`, 'error');
    loadQueueState();
  });
  window.electronAPI.onQueueUpdated((queue) => {
    state.downloads = queue;
    renderDownloadsTable();
  });

  window.electronAPI.onBrowserDownloadTrigger((data) => {
    elements.urlInput.value = data.url;
    openAddUrlDialog();
    handleAnalyze();
  });
}

/**
 * Open dialogs
 */
function openAddUrlDialog() {
  elements.addUrlModal.style.display = 'flex';
  elements.urlInput.focus();
}

function openOptionsDialog() {
  elements.optionsModal.style.display = 'flex';
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

  state.isAnalyzing = true;
  elements.analyzeBtn.disabled = true;
  elements.analyzeBtn.querySelector('.btn-text').style.display = 'none';
  elements.analyzeBtn.querySelector('.spinner').style.display = 'block';
  hideMessage();

  try {
    const result = await window.electronAPI.analyzeUrl(url);
    if (result.success) {
      state.currentMetadata = result.data;
      elements.addUrlModal.style.display = 'none';
      displayFileInfo(result.data);
    } else {
      showMessage(`Analysis failed: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    state.isAnalyzing = false;
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.querySelector('.btn-text').style.display = 'inline';
    elements.analyzeBtn.querySelector('.spinner').style.display = 'none';
  }
}

/**
 * Display File Information popup
 */
function displayFileInfo(metadata) {
  elements.fileInfoUrl.value = metadata.url;
  elements.fileInfoDesc.value = '';
  elements.fileInfoSizeDisplay.textContent = formatFileSize(metadata.fileSize);

  let defaultCategory = 'Others';
  const ext = metadata.filename.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'm4v'];
  const audioExts = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'wma'];
  const docExts = ['pdf', 'docx', 'doc', 'txt', 'rtf', 'xlsx', 'xls', 'pptx', 'ppt', 'zip', 'rar', '7z', 'tar', 'gz'];

  if (metadata.isVideoSource || videoExts.includes(ext)) {
    defaultCategory = 'Videos';
  } else if (audioExts.includes(ext)) {
    defaultCategory = 'Music';
  } else if (docExts.includes(ext)) {
    defaultCategory = 'Documents';
  }

  elements.fileInfoCategory.value = defaultCategory;
  elements.fileIconContainer.innerHTML = getFileIconSVG(defaultCategory);
  elements.fileInfoSavePath.value = `${state.currentDownloadDir}\\${defaultCategory}\\${metadata.filename}`;

  // Quality settings for streaming videos
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
    
    // Set size display to match the default selected (first) quality option
    const firstFormat = metadata.availableFormats[0];
    if (firstFormat && firstFormat.fileSize) {
      elements.fileInfoSizeDisplay.textContent = formatFileSize(firstFormat.fileSize);
    } else {
      elements.fileInfoSizeDisplay.textContent = 'Unknown';
    }
  } else {
    elements.qualitySelectorContainer.style.display = 'none';
    elements.fileInfoSizeDisplay.textContent = formatFileSize(metadata.fileSize);
  }

  elements.fileInfoSection.style.display = 'flex';
}

/**
 * Start/Queue Download from Info Card
 */
async function handleDownload(isLater = false) {
  if (!state.currentMetadata) return;

  try {
    const options = {
      filePath: elements.fileInfoSavePath.value.trim(),
      description: elements.fileInfoDesc.value.trim(),
      downloadLater: !!isLater
    };

    const limitRateVal = parseInt(elements.speedLimitSelect.value, 10);
    if (limitRateVal > 0) {
      options.limitRate = limitRateVal;
    }

    if (elements.scheduleToggle.checked && elements.scheduleTimeInput.value) {
      options.scheduleTime = elements.scheduleTimeInput.value;
    }

    if (state.currentMetadata.isVideoSource && elements.qualitySelect.value) {
      const selectedOption = elements.qualitySelect.selectedOptions[0];
      options.format = selectedOption.value;
      options.isAudio = selectedOption.dataset.isAudio === 'true';
    }

    if (!state.currentMetadata.supportsRanges || !state.currentMetadata.fileSize) {
      options.singleConnection = true;
    }

    const customFilename = options.filePath.split('\\').pop();

    const result = await window.electronAPI.startDownload(
      state.currentMetadata.url,
      customFilename,
      options
    );

    if (result.success) {
      state.currentDownloadId = result.downloadId;
      elements.fileInfoSection.style.display = 'none';

      if (!isLater && !options.scheduleTime) {
        // Automatically open live progress modal for direct download
        elements.progressTitle.textContent = `Downloading ${customFilename}`;
        elements.progressSection.style.display = 'flex';
        updateProgressUI(0, 0, state.currentMetadata.fileSize, 0, Infinity, 'downloading');
      } else {
        showMessage(options.scheduleTime ? 'Download scheduled successfully!' : 'Download queued later.', 'success');
      }

      await loadQueueState();
    } else {
      showMessage(`Start download failed: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
}

/**
 * Toolbar Actions
 */
function handleToolbarResume() {
  if (!state.selectedDownloadId) return;
  window.electronAPI.resumeDownload(state.selectedDownloadId).then(res => {
    if (!res.success) showMessage(res.error, 'error');
    else {
      // Find the item and open progress modal
      const item = state.downloads.find(d => d.downloadId === state.selectedDownloadId);
      if (item) {
        state.currentDownloadId = item.downloadId;
        elements.progressTitle.textContent = `Downloading ${item.filename}`;
        elements.progressSection.style.display = 'flex';
      }
      loadQueueState();
    }
  });
}

function handleToolbarStop() {
  if (!state.selectedDownloadId) return;
  window.electronAPI.pauseDownload(state.selectedDownloadId).then(res => {
    if (!res.success) showMessage(res.error, 'error');
    loadQueueState();
  });
}

function handleToolbarDelete() {
  if (!state.selectedDownloadId) return;
  const confirmed = confirm('Are you sure you want to delete this download?');
  if (!confirmed) return;

  const deleteFile = confirm('Do you also want to delete the downloaded file from your storage?');
  window.electronAPI.deleteDownload(state.selectedDownloadId, deleteFile).then(res => {
    if (res.success) {
      state.selectedDownloadId = null;
      updateToolbarButtons();
      loadQueueState();
      showMessage('Download deleted', 'info');
    }
  });
}

function handleStopAll() {
  const running = state.downloads.filter(d => d.status === 'downloading');
  if (running.length === 0) return;
  
  Promise.all(running.map(d => window.electronAPI.pauseDownload(d.downloadId))).then(() => {
    loadQueueState();
    showMessage('All active downloads stopped', 'info');
  });
}

function handleDeleteCompleted() {
  const completed = state.downloads.filter(d => d.status === 'completed');
  if (completed.length === 0) return;

  const confirmed = confirm('Delete all completed download entries? (Files on disk will remain)');
  if (!confirmed) return;

  Promise.all(completed.map(d => window.electronAPI.deleteDownload(d.downloadId, false))).then(() => {
    state.selectedDownloadId = null;
    updateToolbarButtons();
    loadQueueState();
    showMessage('Completed entries cleared', 'info');
  });
}

/**
 * Progress Modal Controls
 */
function handleProgressPause() {
  if (!state.currentDownloadId) return;
  window.electronAPI.pauseDownload(state.currentDownloadId).then(() => {
    updateProgressStatus('paused');
  });
}

function handleProgressResume() {
  if (!state.currentDownloadId) return;
  window.electronAPI.resumeDownload(state.currentDownloadId).then(() => {
    updateProgressStatus('downloading');
  });
}

function handleProgressCancel() {
  if (!state.currentDownloadId) return;
  const confirmed = confirm('Cancel this download?');
  if (confirmed) {
    window.electronAPI.cancelDownload(state.currentDownloadId).then(() => {
      elements.progressSection.style.display = 'none';
      loadQueueState();
    });
  }
}

/**
 * Live Progress callback from IPC
 */
function updateActiveProgress(progress) {
  if (state.currentDownloadId === progress.downloadId) {
    updateProgressUI(
      progress.percentage,
      progress.downloadedBytes,
      progress.totalBytes,
      progress.speed,
      progress.eta,
      'downloading'
    );
  }

  // Update in-memory data for real-time table rendering
  const item = state.downloads.find(d => d.downloadId === progress.downloadId);
  if (item) {
    item.progress = progress;
    item.status = 'downloading';
    updateTableRowProgress(progress);
  }
}

function updateProgressStatus(status) {
  elements.statusDisplay.className = `status-badge status-${status}`;
  elements.statusDisplay.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  if (status === 'paused') {
    elements.pauseBtn.style.display = 'none';
    elements.resumeBtn.style.display = 'inline-flex';
  } else {
    elements.resumeBtn.style.display = 'none';
    elements.pauseBtn.style.display = 'inline-flex';
  }
}

function updateProgressUI(percentage, downloaded, total, speed, eta, status) {
  const roundedPercentage = Math.min(100, Math.max(0, percentage));
  elements.progressBar.style.width = `${roundedPercentage}%`;
  elements.progressText.textContent = `${roundedPercentage.toFixed(1)}%`;
  elements.downloadedDisplay.textContent = `${formatFileSize(downloaded)} / ${formatFileSize(total)}`;
  elements.speedDisplay.textContent = `${formatFileSize(speed)}/s`;
  elements.etaDisplay.textContent = formatETA(eta);
  updateProgressStatus(status);
}

/**
 * Real-time row progress updates to prevent full-table flickering
 */
function updateTableRowProgress(progress) {
  const row = elements.downloadsTableBody.querySelector(`tr[data-id="${progress.downloadId}"]`);
  if (!row) return;

  const progressCell = row.querySelector('.progress-cell-val');
  if (progressCell) {
    progressCell.innerHTML = `
      <div class="table-progress-container">
        <div class="table-progress-bar" style="width: ${progress.percentage}%"></div>
      </div>
      <span class="table-progress-text">${progress.percentage.toFixed(1)}%</span>
    `;
  }

  const timeLeftCell = row.querySelector('.time-left-cell-val');
  if (timeLeftCell) {
    timeLeftCell.textContent = formatETA(progress.eta);
  }

  const rateCell = row.querySelector('.rate-cell-val');
  if (rateCell) {
    rateCell.textContent = `${formatFileSize(progress.speed)}/s`;
  }
}

/**
 * Render Main Downloads Table Grid
 */
function renderDownloadsTable() {
  elements.downloadsTableBody.innerHTML = '';
  
  let filtered = [...state.downloads];

  // Category Filtering
  if (state.currentCategoryFilter === 'finished') {
    filtered = filtered.filter(d => d.status === 'completed');
  } else if (state.currentCategoryFilter === 'unfinished') {
    filtered = filtered.filter(d => d.status !== 'completed');
  } else if (state.currentCategoryFilter !== 'all') {
    // Check if category matches file directory/metadata category
    filtered = filtered.filter(d => {
      const category = getFileCategory(d.filename);
      return category.toLowerCase() === state.currentCategoryFilter.toLowerCase();
    });
  }

  if (filtered.length === 0) {
    elements.tableEmptyMessage.style.display = 'block';
    return;
  }
  elements.tableEmptyMessage.style.display = 'none';

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.downloadId;
    if (state.selectedDownloadId === item.downloadId) {
      tr.classList.add('selected');
    }

    // File name cell
    const nameCell = document.createElement('td');
    nameCell.className = 'table-file-cell';
    const category = getFileCategory(item.filename);
    nameCell.innerHTML = `
      <span class="table-file-icon">${getFileEmoji(category)}</span>
      <span title="${item.filename}">${item.filename}</span>
    `;

    // Size cell
    const sizeCell = document.createElement('td');
    sizeCell.textContent = formatFileSize(item.fileSize);

    // Status cell
    const statusCell = document.createElement('td');
    statusCell.className = 'progress-cell-val';
    
    // Time Left, Rate cells
    const timeLeftCell = document.createElement('td');
    timeLeftCell.className = 'time-left-cell-val';

    const rateCell = document.createElement('td');
    rateCell.className = 'rate-cell-val';

    if (item.status === 'downloading' && item.progress) {
      statusCell.innerHTML = `
        <div class="table-progress-container">
          <div class="table-progress-bar" style="width: ${item.progress.percentage}%"></div>
        </div>
        <span class="table-progress-text">${item.progress.percentage.toFixed(1)}%</span>
      `;
      timeLeftCell.textContent = formatETA(item.progress.eta);
      rateCell.textContent = `${formatFileSize(item.progress.speed)}/s`;
    } else {
      statusCell.textContent = item.status.charAt(0).toUpperCase() + item.status.slice(1);
      timeLeftCell.textContent = item.status === 'completed' ? 'Completed' : '-';
      rateCell.textContent = '-';
    }

    // Description cell
    const descCell = document.createElement('td');
    descCell.textContent = item.description || '';

    tr.appendChild(nameCell);
    tr.appendChild(sizeCell);
    tr.appendChild(statusCell);
    tr.appendChild(timeLeftCell);
    tr.appendChild(rateCell);
    tr.appendChild(descCell);

    // Event listeners
    tr.addEventListener('click', () => {
      const rows = elements.downloadsTableBody.querySelectorAll('tr');
      rows.forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
      state.selectedDownloadId = item.downloadId;
      updateToolbarButtons();
    });

    tr.addEventListener('dblclick', () => {
      if (item.status === 'downloading' || item.status === 'paused' || item.status === 'queued') {
        state.currentDownloadId = item.downloadId;
        elements.progressTitle.textContent = `Downloading ${item.filename}`;
        elements.progressSection.style.display = 'flex';
        if (item.progress) {
          updateProgressUI(item.progress.percentage, item.progress.downloadedBytes, item.progress.totalBytes, item.progress.speed, item.progress.eta, item.status);
        } else {
          updateProgressUI(0, 0, item.fileSize || 0, 0, Infinity, item.status);
        }
      } else if (item.status === 'completed') {
        // Alert detailing path info
        alert(`File save path:\n${item.filePath}`);
      }
    });

    elements.downloadsTableBody.appendChild(tr);
  });
}

/**
 * Enable/Disable Toolbar actions based on selection state
 */
function updateToolbarButtons() {
  if (!state.selectedDownloadId) {
    elements.tbResume.disabled = true;
    elements.tbStop.disabled = true;
    elements.tbDelete.disabled = true;
    return;
  }

  const selectedItem = state.downloads.find(d => d.downloadId === state.selectedDownloadId);
  if (!selectedItem) {
    elements.tbResume.disabled = true;
    elements.tbStop.disabled = true;
    elements.tbDelete.disabled = true;
    return;
  }

  elements.tbDelete.disabled = false;

  if (selectedItem.status === 'downloading' || selectedItem.status === 'queued' || selectedItem.status === 'scheduled') {
    elements.tbStop.disabled = false;
    elements.tbResume.disabled = true;
  } else {
    elements.tbStop.disabled = true;
    elements.tbResume.disabled = selectedItem.status === 'completed';
  }
}

/**
 * Get category metadata tags
 */
function getFileCategory(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'm4v'];
  const audioExts = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'wma'];
  const docExts = ['pdf', 'docx', 'doc', 'txt', 'rtf', 'xlsx', 'xls', 'pptx', 'ppt', 'zip', 'rar', '7z', 'tar', 'gz'];

  if (videoExts.includes(ext)) return 'Videos';
  if (audioExts.includes(ext)) return 'Music';
  if (docExts.includes(ext)) return 'Documents';
  return 'Others';
}

function getFileEmoji(category) {
  if (category === 'Videos') return '🎬';
  if (category === 'Music') return '🎵';
  if (category === 'Documents') return '📄';
  return '📦';
}

function getFileIconSVG(category) {
  if (category === 'Videos') {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
      <line x1="7" y1="2" x2="7" y2="22"></line>
      <line x1="17" y1="2" x2="17" y2="22"></line>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <line x1="2" y1="7" x2="7" y2="7"></line>
      <line x1="2" y1="17" x2="7" y2="17"></line>
      <line x1="17" y1="17" x2="22" y2="17"></line>
      <line x1="17" y1="7" x2="22" y2="7"></line>
    </svg>`;
  } else if (category === 'Music') {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2">
      <path d="M9 18V5l12-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>`;
  } else if (category === 'Documents') {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>`;
  } else {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2">
      <path d="M12.89 2.24a2 2 0 0 0-1.78 0L3.78 6.24a2 2 0 0 0-1 1.73v8a2 2 0 0 0 1 1.73l7.33 4.07a2 2 0 0 0 1.78 0l7.33-4.07a2 2 0 0 0 1-1.73v-8a2 2 0 0 0-1-1.73L12.89 2.24z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>`;
  }
}

/**
 * Load initial queue and states
 */
async function loadQueueState() {
  try {
    const result = await window.electronAPI.getQueueState();
    if (result.success) {
      state.downloads = result.data;
      renderDownloadsTable();
      updateToolbarButtons();
    }
  } catch (error) {
    console.error('Failed to load queue state:', error);
  }
}

async function loadDownloadDirectory() {
  try {
    const result = await window.electronAPI.getDownloadDir();
    if (result.success) {
      state.currentDownloadDir = result.path;
      elements.downloadDirDisplay.textContent = `Download Directory: ${result.path}`;
    }
  } catch (error) {
    console.error('Failed to load download directory:', error);
  }
}

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
    resumeBtn.className = 'btn btn-success btn-sm';
    resumeBtn.textContent = 'Resume';
    resumeBtn.onclick = () => {
      elements.recoverySection.style.display = 'none';
      state.selectedDownloadId = download.downloadId;
      handleToolbarResume();
    };

    item.appendChild(info);
    item.appendChild(resumeBtn);
    elements.recoveryList.appendChild(item);
  });

  elements.recoverySection.style.display = 'flex';
}

/**
 * Theme Toggle logic
 */
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  if (isLight) {
    document.documentElement.style.setProperty('--dark-bg', '#f5f6f8');
    document.documentElement.style.setProperty('--darker-bg', '#ffffff');
    document.documentElement.style.setProperty('--light-bg', 'rgba(230, 235, 245, 0.75)');
    document.documentElement.style.setProperty('--text-primary', '#1e2022');
    document.documentElement.style.setProperty('--text-secondary', '#686f7a');
    document.documentElement.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
  } else {
    document.documentElement.style.setProperty('--dark-bg', '#0d0e12');
    document.documentElement.style.setProperty('--darker-bg', '#060709');
    document.documentElement.style.setProperty('--light-bg', 'rgba(22, 25, 35, 0.65)');
    document.documentElement.style.setProperty('--text-primary', '#f5f6f8');
    document.documentElement.style.setProperty('--text-secondary', '#9da4b0');
    document.documentElement.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
  }
}

/**
 * Format tools
 */
function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return 'Unknown';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatETA(seconds) {
  if (!isFinite(seconds) || seconds < 0) return 'Calculating...';
  if (seconds === 0) return 'Complete';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

function showMessage(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.style.display = 'block';
  setTimeout(hideMessage, 4000);
}

function hideMessage() {
  elements.statusMessage.style.display = 'none';
}
