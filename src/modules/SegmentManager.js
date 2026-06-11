const SegmentWorker = require('./SegmentWorker');
const fs = require('fs').promises;
const EventEmitter = require('events');

/**
 * SegmentManager - Orchestrates segmented downloading
 * 
 * Responsibilities:
 * - Calculate byte ranges
 * - Create and manage workers
 * - Coordinate parallel downloads
 * - Aggregate progress
 * - Handle segment failures
 */
class SegmentManager extends EventEmitter {
  constructor(url, filePath, fileSize, options = {}) {
    super();
    this.url = url;
    this.filePath = filePath;
    this.fileSize = fileSize;
    this.segmentCount = options.segmentCount || 4;
    this.options = options;
    this.workers = [];
    this.isActive = false;
    this.totalDownloadedBytes = 0;
    this.lastProgressTime = Date.now();
    this.lastDownloadedBytes = 0;
    this.currentSpeed = 0;
  }

  /**
   * Initialize segments
   * @returns {Promise<void>}
   */
  async initialize() {
    // Create empty file with correct size
    const fileHandle = await fs.open(this.filePath, 'w');
    await fileHandle.truncate(this.fileSize);
    await fileHandle.close();

    // Calculate segment ranges
    const segments = this.calculateSegmentRanges();

    // Create workers
    const workerOptions = {
      ...this.options,
      limitRate: this.options.limitRate ? Math.round(this.options.limitRate / this.segmentCount) : undefined
    };

    this.workers = segments.map(segment => 
      new SegmentWorker(
        segment.id,
        this.url,
        segment.startByte,
        segment.endByte,
        this.filePath,
        workerOptions
      )
    );
  }

  /**
   * Calculate byte ranges for segments
   * @returns {Array<Object>} Segment definitions
   */
  calculateSegmentRanges() {
    const segments = [];
    const segmentSize = Math.floor(this.fileSize / this.segmentCount);

    for (let i = 0; i < this.segmentCount; i++) {
      const startByte = i * segmentSize;
      let endByte = (i + 1) * segmentSize - 1;
      
      // Last segment gets any remainder bytes
      if (i === this.segmentCount - 1) {
        endByte = this.fileSize - 1;
      }

      segments.push({
        id: i,
        startByte,
        endByte
      });
    }

    return segments;
  }

  /**
   * Start downloading all segments
   * @returns {Promise<void>}
   */
  async startDownload() {
    this.isActive = true;
    this.lastProgressTime = Date.now();
    this.lastDownloadedBytes = 0;

    // Start speed calculation interval
    const speedInterval = setInterval(() => {
      this.calculateSpeed();
    }, 1000);

    try {
      // Download all segments in parallel
      await Promise.all(
        this.workers.map(worker =>
          worker.download((segmentId, bytes) => {
            this.onSegmentProgress(segmentId, bytes);
          })
        )
      );

      clearInterval(speedInterval);
      this.emit('complete');
    } catch (error) {
      clearInterval(speedInterval);
      if (this.isActive) {
        this.emit('error', error);
      }
    }
  }

  /**
   * Handle progress from individual segments
   * @param {number} segmentId - Segment ID
   * @param {number} bytes - Bytes downloaded
   */
  onSegmentProgress(segmentId, bytes) {
    this.totalDownloadedBytes += bytes;
    
    const progress = {
      totalBytes: this.fileSize,
      downloadedBytes: this.totalDownloadedBytes,
      percentage: (this.totalDownloadedBytes / this.fileSize) * 100,
      speed: this.currentSpeed,
      eta: this.calculateETA()
    };

    this.emit('progress', progress);
  }

  /**
   * Calculate current download speed
   */
  calculateSpeed() {
    const now = Date.now();
    const timeDiff = (now - this.lastProgressTime) / 1000; // Convert to seconds
    const bytesDiff = this.totalDownloadedBytes - this.lastDownloadedBytes;

    if (timeDiff > 0) {
      this.currentSpeed = bytesDiff / timeDiff;
    }

    this.lastProgressTime = now;
    this.lastDownloadedBytes = this.totalDownloadedBytes;
  }

  /**
   * Calculate estimated time to completion
   * @returns {number} ETA in seconds
   */
  calculateETA() {
    if (this.currentSpeed === 0) {
      return Infinity;
    }

    const remainingBytes = this.fileSize - this.totalDownloadedBytes;
    return Math.ceil(remainingBytes / this.currentSpeed);
  }

  /**
   * Pause all segments
   */
  pause() {
    this.isActive = false;
    this.workers.forEach(worker => worker.pause());
  }

  /**
   * Resume all incomplete segments
   * @returns {Promise<void>}
   */
  async resume() {
    this.isActive = true;
    this.lastProgressTime = Date.now();
    this.lastDownloadedBytes = this.totalDownloadedBytes;

    const speedInterval = setInterval(() => {
      this.calculateSpeed();
    }, 1000);

    try {
      // Resume only incomplete workers
      const incompleteWorkers = this.workers.filter(
        worker => worker.status !== 'completed'
      );

      if (incompleteWorkers.length === 0) {
        clearInterval(speedInterval);
        this.emit('complete');
        return;
      }

      await Promise.all(
        incompleteWorkers.map(worker =>
          worker.download((segmentId, bytes) => {
            this.onSegmentProgress(segmentId, bytes);
          })
        )
      );

      clearInterval(speedInterval);
      this.emit('complete');
    } catch (error) {
      clearInterval(speedInterval);
      if (this.isActive) {
        this.emit('error', error);
      }
    }
  }

  /**
   * Get overall progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      totalBytes: this.fileSize,
      downloadedBytes: this.totalDownloadedBytes,
      percentage: (this.totalDownloadedBytes / this.fileSize) * 100,
      speed: this.currentSpeed,
      eta: this.calculateETA(),
      segments: this.workers.map(worker => worker.getProgress())
    };
  }

  /**
   * Restore from saved state
   * @param {Array<Object>} segmentsState - Saved segment states
   */
  async restoreState(segmentsState) {
    // Create file if it doesn't exist
    try {
      await fs.access(this.filePath);
    } catch {
      const fileHandle = await fs.open(this.filePath, 'w');
      await fileHandle.truncate(this.fileSize);
      await fileHandle.close();
    }

    // Restore workers
    const workerOptions = {
      ...this.options,
      limitRate: this.options.limitRate ? Math.round(this.options.limitRate / this.segmentCount) : undefined
    };

    this.workers = segmentsState.map(state => {
      const worker = new SegmentWorker(
        state.segmentId,
        this.url,
        state.startByte,
        state.endByte,
        this.filePath,
        workerOptions
      );
      worker.downloadedBytes = state.downloadedBytes;
      worker.status = state.status === 'downloading' ? 'pending' : state.status;
      return worker;
    });

    // Calculate total downloaded bytes
    this.totalDownloadedBytes = this.workers.reduce(
      (sum, worker) => sum + worker.downloadedBytes,
      0
    );
  }

  /**
   * Serialize manager state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      url: this.url,
      filePath: this.filePath,
      fileSize: this.fileSize,
      totalDownloadedBytes: this.totalDownloadedBytes,
      segments: this.workers.map(worker => worker.serialize())
    };
  }
}

module.exports = SegmentManager;
