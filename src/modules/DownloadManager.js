const EventEmitter = require('events');
const path = require('path');
const crypto = require('crypto');
const LinkAnalyzer = require('./LinkAnalyzer');
const SegmentManager = require('./SegmentManager');
const VideoDownloadManager = require('./VideoDownloadManager');

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
    this.startScheduler();
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

      // Use provided filename or suggested filename
      const finalFilename = filename || metadata.filename;
      const filePath = path.join(this.downloadDir, finalFilename);

      let initialStatus = 'queued';
      let scheduleTime = null;
      if (options.scheduleTime) {
        scheduleTime = new Date(options.scheduleTime).getTime();
        if (scheduleTime > Date.now()) {
          initialStatus = 'scheduled';
        }
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

      if (initialStatus === 'scheduled') {
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
    const filePath = path.join(this.downloadDir, filename);
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
    const active = Array.from(this.activeDownloads.entries()).map(([id, dl]) => ({
      downloadId: id,
      filename: dl.metadata.filename,
      status: dl.segmentManager.status,
      progress: dl.segmentManager.getProgress()
    }));

    const queued = this.queue.map(item => ({
      downloadId: item.downloadId,
      filename: item.filename,
      status: item.status,
      scheduleTime: item.scheduleTime ? new Date(item.scheduleTime).toLocaleString() : null
    }));

    return [...active, ...queued];
  }

  /**
   * Pause a download
   * @param {string} downloadId - Download ID
   * @returns {Promise<void>}
   */
  async pauseDownload(downloadId) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) {
      throw new Error('Download not found');
    }

    download.segmentManager.pause();

    // Update metadata
    const state = download.segmentManager.serialize();
    await this.metadataManager.saveMetadata(downloadId, {
      ...download.metadata,
      status: 'paused',
      segments: state.segments,
      progress: download.segmentManager.getProgress()
    });

    await this.metadataManager.updateStatus(downloadId, 'paused');
  }

  /**
   * Resume a download
   * @param {string} downloadId - Download ID
   * @returns {Promise<void>}
   */
  async resumeDownload(downloadId) {
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
  }

  /**
   * Handle progress events
   * @param {string} downloadId - Download ID
   * @param {Object} progress - Progress data
   */
  async handleProgress(downloadId, progress) {
    const download = this.activeDownloads.get(downloadId);
    if (!download) return;

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
