const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const LinkAnalyzer = require('./LinkAnalyzer');
const SegmentManager = require('./SegmentManager');
const VideoDownloadManager = require('./VideoDownloadManager');

function getCategorySubfolder(filename, contentType) {
  const ext = path.extname(filename).toLowerCase().replace(/^\./, '');
  const type = String(contentType || '').toLowerCase();

  const videoExts = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'm4v'];
  const audioExts = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'wma'];
  const docExts = ['pdf', 'docx', 'doc', 'txt', 'rtf', 'xlsx', 'xls', 'pptx', 'ppt', 'zip', 'rar', '7z', 'tar', 'gz'];

  if (videoExts.includes(ext) || type.startsWith('video/')) {
    return 'Videos';
  } else if (audioExts.includes(ext) || type.startsWith('audio/')) {
    return 'Music';
  } else if (docExts.includes(ext) || type.startsWith('application/') || type.startsWith('text/')) {
    return 'Documents';
  } else {
    return 'Others';
  }
}

/**
 * DownloadManager - Orchestrates the entire download process
 * 
 * Responsibilities:
 * - Manage download lifecycle
 * - Coordinate analyzer, segment manager, and metadata
 * - Handle pause/resume/cancel
 * - Emit progress events
 * - Support crash recovery
 */
class DownloadManager extends EventEmitter {
  constructor(downloadDir, metadataManager) {
    super();
    this.downloadDir = downloadDir;
    this.metadataManager = metadataManager;
    this.activeDownloads = new Map();
    this.maxConcurrent = 2;
    this.queue = [];
    this.downloadsList = [];
    this.loadDownloadsList();
    this.startScheduler();
  }

  async loadDownloadsList() {
    try {
      const allMetadata = await this.metadataManager.getAllDownloads();
      this.downloadsList = allMetadata.map(meta => ({
        downloadId: meta.downloadId,
        filename: meta.filename,
        url: meta.url,
        filePath: meta.filePath,
        fileSize: meta.fileSize,
        contentType: meta.contentType,
        status: meta.status,
        createdAt: meta.createdAt || new Date().toISOString(),
        progress: meta.progress || null,
        scheduleTime: meta.scheduleTime,
        description: meta.description || ''
      }));
      this.downloadsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.error('Failed to load downloads list:', err);
    }
  }

  /**
   * Start a new download
   * @param {string} url - URL to download
   * @param {string} filename - Optional filename
   * @returns {Promise<string>} Download ID
   */
  async startDownload(url, filename, options = {}) {
    const downloadId = this.generateDownloadId(url);

    try {
      // Analyze URL
      const analyzer = new LinkAnalyzer();
      const metadata = await analyzer.analyze(url);

      const finalFilename = filename || metadata.filename;
      const category = getCategorySubfolder(finalFilename, metadata.contentType);
      const filePath = options.filePath || path.join(this.downloadDir, category, finalFilename);

      let initialStatus = 'queued';
      let scheduleTime = null;
      if (options.scheduleTime) {
        scheduleTime = new Date(options.scheduleTime).getTime();
        if (scheduleTime > Date.now()) {
          initialStatus = 'scheduled';
        }
      }

      if (options.downloadLater) {
        initialStatus = 'queued';
      }

      // Save initial metadata
      const downloadMetadata = {
        downloadId,
        url,
        filename: finalFilename,
        filePath,
        fileSize: metadata.fileSize,
        contentType: metadata.contentType,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        engine: metadata.isVideoSource ? 'yt-dlp' : (options.singleConnection ? 'single' : 'segment'),
        isVideoSource: !!metadata.isVideoSource,
        singleConnection: !metadata.isVideoSource && options.singleConnection,
        segments: [],
        scheduleTime: scheduleTime ? new Date(scheduleTime).toISOString() : null,
        lastUpdated: new Date().toISOString()
      };

      await this.metadataManager.saveMetadata(downloadId, downloadMetadata);

      // Add to in-memory list
      const itemIndex = this.downloadsList.findIndex(d => d.downloadId === downloadId);
      const newListItem = {
        downloadId,
        url,
        filename: finalFilename,
        filePath,
        fileSize: metadata.fileSize,
        contentType: metadata.contentType,
        status: initialStatus,
        createdAt: downloadMetadata.createdAt,
        progress: null,
        scheduleTime: downloadMetadata.scheduleTime,
        description: options.description || ''
      };
      if (itemIndex > -1) {
        this.downloadsList[itemIndex] = newListItem;
      } else {
        this.downloadsList.unshift(newListItem);
      }

      // Add to queue
      this.queue.push({
        downloadId,
        url,
        filename: finalFilename,
        options,
        metadata,
        status: initialStatus,
        scheduleTime
      });

      this.emit('queue-updated', this.getQueueState());

      if (initialStatus === 'scheduled' || options.downloadLater) {
        return downloadId;
      }

      await this.processQueue();
      return downloadId;
    } catch (error) {
      throw new Error(`Failed to start download: ${error.message}`);
    }
  }

  startScheduler() {
    setInterval(async () => {
      const now = Date.now();
      let queueChanged = false;
      for (const item of this.queue) {
        if (item.status === 'scheduled' && item.scheduleTime && item.scheduleTime <= now) {
          item.status = 'queued';
          const listitem = this.downloadsList.find(d => d.downloadId === item.downloadId);
          if (listitem) listitem.status = 'queued';
          await this.metadataManager.updateStatus(item.downloadId, 'queued');
          queueChanged = true;
        }
      }
      if (queueChanged) {
        this.emit('queue-updated', this.getQueueState());
        await this.processQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  async processQueue() {
    let activeCount = 0;
    for (const [id, dl] of this.activeDownloads) {
      if (dl.segmentManager.status === 'downloading') {
        activeCount++;
      }
    }

    if (activeCount >= this.maxConcurrent) return;

    const nextItem = this.queue.find(item => item.status === 'queued');
    if (!nextItem) return;

    this.queue = this.queue.filter(item => item.downloadId !== nextItem.downloadId);
    
    try {
      await this.triggerDownloadStart(nextItem.downloadId, nextItem.url, nextItem.filename, nextItem.options, nextItem.metadata);
    } catch (error) {
      this.handleError(nextItem.downloadId, error);
    }
  }

  async triggerDownloadStart(downloadId, url, filename, options, metadata) {
    const category = getCategorySubfolder(filename, metadata.contentType);
    const categoryDir = path.join(this.downloadDir, category);
    const filePath = options.filePath || path.join(categoryDir, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    let managerInstance;

    if (metadata.isVideoSource) {
      managerInstance = new VideoDownloadManager(url, filePath, metadata, options);
      await managerInstance.initialize();
    }

    const shouldUseSingle = options.singleConnection || !metadata.supportsRanges || !metadata.fileSize;

    if (!managerInstance && shouldUseSingle) {
      const SingleManager = require('./SingleManager');
      managerInstance = new SingleManager(url, filePath, options);
      await managerInstance.initialize();
    }

    if (!managerInstance) {
      const segmentCount = options.segmentCount || 4;
      const segmentManager = new SegmentManager(
        url,
        filePath,
        metadata.fileSize,
        { segmentCount, limitRate: options.limitRate }
      );
      await segmentManager.initialize();
      managerInstance = segmentManager;
    }

    const currentMetadata = await this.metadataManager.loadMetadata(downloadId) || {};
    const downloadMetadata = {
      ...currentMetadata,
      status: 'downloading',
      engine: metadata.isVideoSource ? 'yt-dlp' : (shouldUseSingle ? 'single' : 'segment'),
      segments: managerInstance.serialize && managerInstance.serialize().segments ? managerInstance.serialize().segments : [],
      lastUpdated: new Date().toISOString()
    };
    await this.metadataManager.saveMetadata(downloadId, downloadMetadata);

    this.activeDownloads.set(downloadId, {
      segmentManager: managerInstance,
      metadata: downloadMetadata
    });

    managerInstance.on('progress', (progress) => {
      this.handleProgress(downloadId, progress);
    });

    managerInstance.on('complete', () => {
      this.handleComplete(downloadId);
    });

    managerInstance.on('error', (error) => {
      this.handleError(downloadId, error);
    });

    managerInstance.startDownload();
    this.emit('queue-updated', this.getQueueState());
  }

  getQueueState() {
    return this.downloadsList.map(item => {
      const active = this.activeDownloads.get(item.downloadId);
      if (active) {
        return {
          ...item,
          status: active.segmentManager.status,
          progress: active.segmentManager.getProgress()
        };
      }
      return item;
    });
  }

  /**
   * Pause a download
   * @param {string} downloadId - Download ID
   * @returns {Promise<void>}
   */
  async pauseDownload(downloadId) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) {
      // Check if it's in the queue (queued/paused/scheduled)
      const queuedItem = this.queue.find(item => item.downloadId === downloadId);
      if (queuedItem) {
        queuedItem.status = 'paused';
        const item = this.downloadsList.find(d => d.downloadId === downloadId);
        if (item) item.status = 'paused';
        await this.metadataManager.updateStatus(downloadId, 'paused');
        this.emit('queue-updated', this.getQueueState());
        return;
      }
      throw new Error('Download not found or not active');
    }

    download.segmentManager.pause();

    // Update metadata
    const state = download.segmentManager.serialize();
    const progress = download.segmentManager.getProgress();
    await this.metadataManager.saveMetadata(downloadId, {
      ...download.metadata,
      status: 'paused',
      segments: state.segments,
      progress: progress
    });

    const item = this.downloadsList.find(d => d.downloadId === downloadId);
    if (item) {
      item.status = 'paused';
      item.progress = progress;
    }

    await this.metadataManager.updateStatus(downloadId, 'paused');
    this.emit('queue-updated', this.getQueueState());
  }

  /**
   * Resume a download
   * @param {string} downloadId - Download ID
   * @returns {Promise<void>}
   */
  async resumeDownload(downloadId) {
    const queuedItem = this.queue.find(item => item.downloadId === downloadId);
    if (queuedItem) {
      queuedItem.status = 'queued';
      const item = this.downloadsList.find(d => d.downloadId === downloadId);
      if (item) item.status = 'queued';
      await this.metadataManager.updateStatus(downloadId, 'queued');
      this.emit('queue-updated', this.getQueueState());
      await this.processQueue();
      return;
    }

    let download = this.activeDownloads.get(downloadId);

    // If not in active downloads, load from metadata
    if (!download) {
      const metadata = await this.metadataManager.loadMetadata(downloadId);
      if (!metadata) {
        throw new Error('Download metadata not found');
      }

      // Handle single-connection downloads: resume not supported
      if (metadata.singleConnection) {
        throw new Error('Resume not supported for single-connection downloads');
      }

      // Update status in downloadsList
      const item = this.downloadsList.find(d => d.downloadId === downloadId);
      if (item) {
        item.status = 'downloading';
      }

      if (metadata.engine === 'yt-dlp' || metadata.isVideoSource) {
        const videoManager = new VideoDownloadManager(metadata.url, metadata.filePath, metadata);
        await videoManager.initialize();

        download = {
          segmentManager: videoManager,
          metadata
        };

        this.activeDownloads.set(downloadId, download);

        videoManager.on('progress', (progress) => {
          this.handleProgress(downloadId, progress);
        });

        videoManager.on('complete', () => {
          this.handleComplete(downloadId);
        });

        videoManager.on('error', (error) => {
          this.handleError(downloadId, error);
        });

        await this.metadataManager.updateStatus(downloadId, 'downloading');
        await videoManager.resume();
        this.emit('queue-updated', this.getQueueState());
        return;
      }

      // Recreate segment manager
      const segmentManager = new SegmentManager(
        metadata.url,
        metadata.filePath,
        metadata.fileSize,
        { segmentCount: metadata.segments.length }
      );

      // Restore state
      await segmentManager.restoreState(metadata.segments);

      download = {
        segmentManager,
        metadata
      };

      this.activeDownloads.set(downloadId, download);

      // Set up event handlers
      segmentManager.on('progress', (progress) => {
        this.handleProgress(downloadId, progress);
      });

      segmentManager.on('complete', () => {
        this.handleComplete(downloadId);
      });

      segmentManager.on('error', (error) => {
        this.handleError(downloadId, error);
      });
    }

    // Update status
    await this.metadataManager.updateStatus(downloadId, 'downloading');

    // Resume download
    await download.segmentManager.resume();
    this.emit('queue-updated', this.getQueueState());
  }

  /**
   * Cancel a download
   * @param {string} downloadId - Download ID
   * @returns {Promise<void>}
   */
  async cancelDownload(downloadId) {
    const download = this.activeDownloads.get(downloadId);
    if (download) {
      download.segmentManager.pause();
      this.activeDownloads.delete(downloadId);
    }

    // Update metadata
    await this.metadataManager.updateStatus(downloadId, 'cancelled');

    const item = this.downloadsList.find(d => d.downloadId === downloadId);
    if (item) {
      item.status = 'cancelled';
    }

    this.queue = this.queue.filter(item => item.downloadId !== downloadId);
    this.emit('queue-updated', this.getQueueState());
  }

  /**
   * Delete a download completely
   * @param {string} downloadId - Download ID
   * @param {boolean} deleteFile - Delete the downloaded file too
   * @returns {Promise<void>}
   */
  async deleteDownload(downloadId, deleteFile = false) {
    const download = this.activeDownloads.get(downloadId);
    if (download) {
      try {
        download.segmentManager.pause();
      } catch (e) {}
      this.activeDownloads.delete(downloadId);
    }

    this.queue = this.queue.filter(item => item.downloadId !== downloadId);
    this.downloadsList = this.downloadsList.filter(item => item.downloadId !== downloadId);

    const metadata = await this.metadataManager.loadMetadata(downloadId);
    if (metadata) {
      if (deleteFile && metadata.filePath) {
        try {
          const fs = require('fs').promises;
          await fs.unlink(metadata.filePath);
        } catch (e) {
          console.error(`Failed to delete file: ${e.message}`);
        }
      }
      await this.metadataManager.deleteMetadata(downloadId);
    }

    this.emit('queue-updated', this.getQueueState());
  }

  /**
   * Handle progress events
   * @param {string} downloadId - Download ID
   * @param {Object} progress - Progress data
   */
  async handleProgress(downloadId, progress) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) return;

    // Update in-memory cache
    const item = this.downloadsList.find(d => d.downloadId === downloadId);
    if (item) {
      item.progress = progress;
      item.status = 'downloading';
    }

    // Emit progress event
    this.emit('progress', downloadId, {
      downloadId,
      filename: download.metadata.filename,
      ...progress
    });

    // Periodically save progress (every 5%)
    const currentPercentage = Math.floor(progress.percentage);
    const lastPercentage = download.lastSavedPercentage || 0;

    if (currentPercentage - lastPercentage >= 5) {
      download.lastSavedPercentage = currentPercentage;
      const state = download.segmentManager.serialize();
      await this.metadataManager.saveMetadata(downloadId, {
        ...download.metadata,
        segments: state.segments,
        progress
      });
    }
  }

  /**
   * Handle download completion
   * @param {string} downloadId - Download ID
   */
  async handleComplete(downloadId) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) return;

    // Update metadata
    await this.metadataManager.updateStatus(downloadId, 'completed');

    // Update in-memory item status
    const item = this.downloadsList.find(d => d.downloadId === downloadId);
    if (item) {
      item.status = 'completed';
      if (item.fileSize) {
        item.progress = {
          percentage: 100,
          downloadedBytes: item.fileSize,
          totalBytes: item.fileSize,
          speed: 0,
          eta: 0
        };
      }
    }

    // Emit complete event
    this.emit('complete', downloadId);

    // Clean up
    this.activeDownloads.delete(downloadId);

    await this.processQueue();
    this.emit('queue-updated', this.getQueueState());
  }

  /**
   * Handle download errors
   * @param {string} downloadId - Download ID
   * @param {Error} error - Error object
   */
  async handleError(downloadId, error) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) return;

    // Update metadata
    await this.metadataManager.saveMetadata(downloadId, {
      ...download.metadata,
      status: 'error',
      error: error.message
    });

    // Update in-memory item status
    const item = this.downloadsList.find(d => d.downloadId === downloadId);
    if (item) {
      item.status = 'failed';
    }

    // Emit error event
    this.emit('error', downloadId, error.message);

    // Clean up
    this.activeDownloads.delete(downloadId);

    await this.processQueue();
    this.emit('queue-updated', this.getQueueState());
  }

  /**
   * Generate unique download ID
   * @param {string} url - URL
   * @returns {string} Download ID
   */
  generateDownloadId(url) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(url + timestamp).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Get active download info
   * @param {string} downloadId - Download ID
   * @returns {Object|null} Download info
   */
  getActiveDownload(downloadId) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) return null;

    return {
      downloadId,
      metadata: download.metadata,
      progress: download.segmentManager.getProgress()
    };
  }

  /**
   * Clean up all active downloads
   * @returns {Promise<void>}
   */
  async cleanup() {
    const pausePromises = [];

    for (const [downloadId, download] of this.activeDownloads) {
      download.segmentManager.pause();
      const state = download.segmentManager.serialize();
      pausePromises.push(
        this.metadataManager.saveMetadata(downloadId, {
          ...download.metadata,
          status: 'paused',
          segments: state.segments
        })
      );
    }

    await Promise.all(pausePromises);
    this.activeDownloads.clear();
  }
}

module.exports = DownloadManager;
