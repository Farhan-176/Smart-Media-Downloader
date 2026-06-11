const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * SegmentWorker - Handles downloading a single segment with retry logic
 * 
 * Responsibilities:
 * - Download byte range
 * - Stream to file position
 * - Retry with exponential backoff
 * - Report progress
 */
class SegmentWorker {
  constructor(segmentId, url, startByte, endByte, filePath, options = {}) {
    this.segmentId = segmentId;
    this.url = url;
    this.startByte = startByte;
    this.endByte = endByte;
    this.filePath = filePath;
    this.downloadedBytes = 0;
    this.status = 'pending'; // pending, downloading, completed, paused, failed
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
    this.options = options;
    this.abortController = null;
  }

  /**
   * Start downloading the segment
   * @param {Function} progressCallback - Called with progress updates
   * @returns {Promise<void>}
   */
  async download(progressCallback) {
    this.status = 'downloading';
    let retryDelay = 1000; // Start with 1 second

    while (this.retryCount <= this.maxRetries) {
      try {
        this.abortController = new AbortController();
        
        await this.downloadSegmentChunk(progressCallback);
        
        this.status = 'completed';
        return;
      } catch (error) {
        this.retryCount++;
        
        if (this.status === 'paused' || this.retryCount > this.maxRetries) {
          throw error;
        }

        // Exponential backoff
        await this.sleep(retryDelay);
        retryDelay *= 2;
      }
    }

    this.status = 'failed';
    throw new Error(`Segment ${this.segmentId} failed after ${this.maxRetries} retries`);
  }

  /**
   * Download the segment chunk with streaming
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<void>}
   */
  async downloadSegmentChunk(progressCallback) {
    const currentStartByte = this.startByte + this.downloadedBytes;
    
    if (currentStartByte >= this.endByte) {
      return; // Already completed
    }

    const response = await axios({
      method: 'get',
      url: this.url,
      headers: {
        'Range': `bytes=${currentStartByte}-${this.endByte}`,
        'Accept-Encoding': 'identity'
      },
      responseType: 'stream',
      timeout: this.timeout,
      signal: this.abortController.signal
    });

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(this.filePath, {
        flags: 'r+',
        start: currentStartByte
      });

      let bytesReceived = 0;

      let bytesLimit = this.options.limitRate;
      let bytesThisPeriod = 0;
      let periodStart = Date.now();

      response.data.on('data', (chunk) => {
        bytesReceived += chunk.length;
        this.downloadedBytes += chunk.length;
        
        if (progressCallback) {
          progressCallback(this.segmentId, chunk.length);
        }

        if (bytesLimit) {
          bytesThisPeriod += chunk.length;
          const elapsed = Date.now() - periodStart;
          if (elapsed < 1000) {
            const expectedTime = (bytesThisPeriod / bytesLimit) * 1000;
            if (expectedTime > elapsed) {
              const delay = expectedTime - elapsed;
              response.data.pause();
              setTimeout(() => {
                response.data.resume();
              }, delay);
            }
          } else {
            bytesThisPeriod = chunk.length;
            periodStart = Date.now();
          }
        }
      });

      response.data.on('end', () => {
        writeStream.end();
      });

      writeStream.on('finish', () => {
        resolve();
      });

      response.data.on('error', (error) => {
        writeStream.destroy();
        reject(error);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

      response.data.pipe(writeStream);
    });
  }

  /**
   * Pause the download
   */
  pause() {
    this.status = 'paused';
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get segment progress
   * @returns {Object} Progress information
   */
  getProgress() {
    const totalBytes = this.endByte - this.startByte + 1;
    const percentage = (this.downloadedBytes / totalBytes) * 100;
    
    return {
      segmentId: this.segmentId,
      downloadedBytes: this.downloadedBytes,
      totalBytes,
      percentage,
      status: this.status
    };
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Serialize segment state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      segmentId: this.segmentId,
      startByte: this.startByte,
      endByte: this.endByte,
      downloadedBytes: this.downloadedBytes,
      status: this.status
    };
  }
}

module.exports = SegmentWorker;
