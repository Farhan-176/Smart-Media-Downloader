const EventEmitter = require('events');
const axios = require('axios');
const fs = require('fs');

class SingleManager extends EventEmitter {
  constructor(url, filePath, options = {}) {
    super();
    this.url = url;
    this.filePath = filePath;
    this.downloadedBytes = 0;
    this.totalBytes = null;
    this.status = 'pending';
    this.abortController = null;
    this.options = options;
    this.timeout = options.timeout || 30000;
  }

  async initialize() {
    // create empty file if needed
    try {
      await fs.promises.access(this.filePath);
    } catch {
      const fh = await fs.promises.open(this.filePath, 'w');
      await fh.close();
    }
  }

  async startDownload() {
    this.status = 'downloading';
    this.abortController = new AbortController();

    let speedInterval;

    try {
      const response = await axios.get(this.url, {
        responseType: 'stream',
        timeout: this.timeout,
        signal: this.abortController.signal,
        headers: {
          'Accept-Encoding': 'identity'
        },
        maxRedirects: 5,
        validateStatus: (s) => s < 400
      });

      this.totalBytes = parseInt(response.headers['content-length'], 10) || null;

      const writeStream = fs.createWriteStream(this.filePath, { flags: 'w' });

      let bytesLimit = this.options.limitRate;
      let bytesThisPeriod = 0;
      let periodStart = Date.now();
      
      let lastProgressTime = Date.now();
      let lastDownloadedBytes = 0;
      let currentSpeed = 0;

      speedInterval = setInterval(() => {
        const now = Date.now();
        const timeDiff = (now - lastProgressTime) / 1000;
        const bytesDiff = this.downloadedBytes - lastDownloadedBytes;
        if (timeDiff > 0) {
          currentSpeed = bytesDiff / timeDiff;
        }
        lastProgressTime = now;
        lastDownloadedBytes = this.downloadedBytes;
      }, 1000);

      response.data.on('data', (chunk) => {
        this.downloadedBytes += chunk.length;
        const remainingBytes = this.totalBytes ? (this.totalBytes - this.downloadedBytes) : 0;
        const eta = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : Infinity;

        const progress = {
          totalBytes: this.totalBytes,
          downloadedBytes: this.downloadedBytes,
          percentage: this.totalBytes ? (this.downloadedBytes / this.totalBytes) * 100 : 0,
          speed: currentSpeed,
          eta
        };
        this.emit('progress', progress);

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
        clearInterval(speedInterval);
        this.status = 'completed';
        this.emit('complete');
      });

      response.data.on('error', (err) => {
        clearInterval(speedInterval);
        writeStream.destroy();
        this.status = 'failed';
        this.emit('error', err);
      });

      writeStream.on('error', (err) => {
        clearInterval(speedInterval);
        this.status = 'failed';
        this.emit('error', err);
      });

      response.data.pipe(writeStream);
    } catch (err) {
      if (speedInterval) clearInterval(speedInterval);
      if (this.status === 'paused') return; // aborted on purpose
      this.status = 'failed';
      this.emit('error', err);
    }
  }

  pause() {
    this.status = 'paused';
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // Resume is not supported for non-range endpoints
  async resume() {
    throw new Error('Resume not supported for single-connection downloads');
  }

  getProgress() {
    return {
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      percentage: this.totalBytes ? (this.downloadedBytes / this.totalBytes) * 100 : 0,
      speed: 0,
      eta: Infinity
    };
  }

  serialize() {
    return {
      url: this.url,
      filePath: this.filePath,
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      status: this.status
    };
  }
}

module.exports = SingleManager;
