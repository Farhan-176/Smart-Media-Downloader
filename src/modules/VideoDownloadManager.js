const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const ytdlp = require('yt-dlp-exec');
const ffmpegPath = require('ffmpeg-static');

function parseHumanNumber(value) {
  if (!value) return null;

  const cleaned = String(value).trim().replace(/,/g, '');
  const match = cleaned.match(/^([0-9.]+)\s*([KMGTPE]?i?B|B|[KMGTPE]?b)?(?:\/s)?$/i);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const powers = {
    B: 0,
    KB: 1,
    KIB: 1,
    MB: 2,
    MIB: 2,
    GB: 3,
    GIB: 3,
    TB: 4,
    TIB: 4,
    PB: 5,
    PIB: 5,
    EB: 6,
    EIB: 6
  };
  const power = powers[unit] ?? 0;
  return Math.round(amount * (1024 ** power));
}

function parseEta(value) {
  if (!value || value === 'Unknown') return Infinity;
  const parts = String(value).trim().split(':').map((part) => parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return Infinity;
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  if (parts.length === 1) return parts[0];
  return Infinity;
}

class VideoDownloadManager extends EventEmitter {
  constructor(url, filePath, metadata = {}, options = {}) {
    super();
    this.url = url;
    this.filePath = filePath;
    this.outputBase = path.join(path.dirname(filePath), path.parse(filePath).name);
    this.metadata = metadata;
    this.options = options;
    this.status = 'pending';
    this.totalBytes = metadata.fileSize || null;
    this.downloadedBytes = metadata.progress?.downloadedBytes || 0;
    this.speed = 0;
    this.eta = Infinity;
    this.subprocess = null;
    this.partialBuffer = '';
    this.stderrBuffer = '';
  }

  getPreferredFormat() {
    if (this.options.format) {
      if (this.options.isAudio) {
        return 'bestaudio';
      }
      
      const selectedFormatId = this.options.format;
      const formats = this.metadata && this.metadata.formats ? this.metadata.formats : [];
      const matchingFormat = formats.find(f => String(f.format_id) === String(selectedFormatId));
      if (matchingFormat && matchingFormat.vcodec !== 'none' && matchingFormat.acodec === 'none') {
        return `${selectedFormatId}+ba[ext=m4a]/ba`;
      }
      return selectedFormatId;
    }

    const bestFormat = this.metadata && this.metadata.bestFormat ? this.metadata.bestFormat : null;

    if (bestFormat && bestFormat.format_id) {
      if (bestFormat.vcodec !== 'none' && bestFormat.acodec !== 'none') {
        return String(bestFormat.format_id);
      } else if (bestFormat.vcodec !== 'none') {
        // Video only stream, merge with best m4a (AAC) audio for MP4 compatibility
        return `${bestFormat.format_id}+ba[ext=m4a]/ba`;
      }
    }

    return 'bv*+ba[ext=m4a]/b';
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  buildFlags() {
    const flags = {
      format: this.getPreferredFormat(),
      output: `${this.outputBase}.%(ext)s`,
      newline: true,
      noPlaylist: true,
      noWarnings: true,
      quiet: false,
      progress: true,
      restrictFilenames: false,
      ffmpegLocation: ffmpegPath || undefined
    };

    if (this.options.isAudio) {
      flags.extractAudio = true;
      flags.audioFormat = 'mp3';
      flags.audioQuality = '0';
    } else {
      flags.mergeOutputFormat = this.options.mergeOutputFormat || 'mp4';
    }

    if (this.options.limitRate) {
      flags.limitRate = String(this.options.limitRate);
    }

    return flags;
  }

  async startDownload() {
    this.status = 'downloading';
    this.partialBuffer = '';
    this.stderrBuffer = '';

    const flags = this.buildFlags();
    this.subprocess = ytdlp.exec(this.url, flags);

    if (this.subprocess.stderr) {
      this.subprocess.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        this.stderrBuffer += text;
        this.consumeOutput(text);
      });
    }

    if (this.subprocess.stdout) {
      this.subprocess.stdout.on('data', (chunk) => {
        this.consumeOutput(chunk.toString());
      });
    }

    this.subprocess.on('error', (error) => {
      if (this.status === 'paused' || this.status === 'cancelled') return;
      this.status = 'failed';
      this.emit('error', error);
    });

    this.subprocess.on('close', (code) => {
      if (this.status === 'paused' || this.status === 'cancelled') return;

      if (code === 0) {
        this.status = 'completed';
        this.downloadedBytes = this.totalBytes || this.downloadedBytes;
        this.eta = 0;
        this.emit('complete');
      } else {
        this.status = 'failed';
        const detail = this.extractRelevantError(this.stderrBuffer) || `yt-dlp exited with code ${code}`;
        this.emit('error', new Error(detail));
      }
    });
  }

  extractRelevantError(stderr) {
    if (!stderr) return null;

    const lines = String(stderr)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const errorLine = [...lines].reverse().find((line) => line.startsWith('ERROR:'));
    if (errorLine) {
      return errorLine.replace(/^ERROR:\s*/, '');
    }

    return lines[lines.length - 1] || null;
  }

  consumeOutput(text) {
    this.partialBuffer += text;

    const lines = this.partialBuffer.split(/\r?\n/);
    this.partialBuffer = lines.pop() || '';

    for (const line of lines) {
      this.handleLine(line.trim());
    }
  }

  handleLine(line) {
    if (!line) return;

    const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%.*?of\s+([^\s]+)(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/i);
    if (!match) return;

    const percentage = parseFloat(match[1]);
    const totalBytes = this.totalBytes || parseHumanNumber(match[2]);
    const speed = parseHumanNumber(match[3]);
    const eta = parseEta(match[4]);

    if (Number.isFinite(totalBytes) && totalBytes > 0) {
      this.totalBytes = totalBytes;
      this.downloadedBytes = Math.round((percentage / 100) * totalBytes);
    } else {
      this.downloadedBytes = this.downloadedBytes || 0;
    }

    this.speed = speed || 0;
    this.eta = eta;

    this.emit('progress', {
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      percentage,
      speed: this.speed,
      eta: this.eta
    });
  }

  pause() {
    this.status = 'paused';
    if (this.subprocess && typeof this.subprocess.kill === 'function') {
      this.subprocess.kill('SIGTERM');
    }
  }

  async resume() {
    if (this.status !== 'paused' && this.status !== 'failed') {
      // resume is still implemented as a safe restart if the process was lost
    }
    await this.startDownload();
  }

  getProgress() {
    const percentage = this.totalBytes ? (this.downloadedBytes / this.totalBytes) * 100 : 0;
    return {
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      percentage,
      speed: this.speed,
      eta: this.eta,
      status: this.status
    };
  }

  serialize() {
    return {
      url: this.url,
      filePath: this.filePath,
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      status: this.status,
      engine: 'yt-dlp'
    };
  }
}

module.exports = VideoDownloadManager;