const axios = require('axios');
const path = require('path');
const { URL } = require('url');
const VideoExtractor = require('./VideoExtractor');

/**
 * LinkAnalyzer - Validates URLs and extracts resource metadata
 * 
 * Responsibilities:
 * - URL validation
 * - HEAD request for metadata
 * - Header parsing
 * - Filename suggestion
 * - Range support detection
 */
class LinkAnalyzer {
  constructor() {
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Analyze a URL and extract metadata
   * @param {string} url - The URL to analyze
   * @returns {Promise<Object>} Metadata object
   */
  async analyze(url) {
    // Validate URL
    this.validateUrl(url);

    // For known video hosts, use yt-dlp to extract actual video metadata rather than the webpage HTML
    if (VideoExtractor.canHandle(url)) {
      try {
        return await VideoExtractor.extract(url);
      } catch (error) {
        // Fall back to HTTP header analysis if the extractor cannot handle the URL
      }
    }

    try {
      // Send HEAD request to get metadata
      const response = await axios.head(url, {
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      // Parse headers
      const metadata = this.parseHeaders(url, response.headers);

      return metadata;
    } catch (error) {
      // If HEAD fails, try GET with range 0-0
      if (error.response && error.response.status === 405) {
        return await this.analyzeWithGet(url);
      }
      throw new Error(`Failed to analyze URL: ${error.message}`);
    }
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL: URL must be a non-empty string');
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL: Only HTTP and HTTPS protocols are supported');
      }
    } catch (error) {
      throw new Error(`Invalid URL format: ${error.message}`);
    }
  }

  /**
   * Parse response headers to extract metadata
   * @param {string} url - Original URL
   * @param {Object} headers - Response headers
   * @returns {Object} Parsed metadata
   */
  parseHeaders(url, headers) {
    const metadata = {
      url,
      filename: this.extractFilename(url, headers),
      fileSize: this.extractFileSize(headers),
      contentType: headers['content-type'] || 'application/octet-stream',
      supportsRanges: this.checkRangeSupport(headers),
      lastModified: headers['last-modified'] || null,
      etag: headers['etag'] || null
    };

    return metadata;
  }

  /**
   * Extract filename from headers or URL
   * @param {string} url - Original URL
   * @param {Object} headers - Response headers
   * @returns {string} Suggested filename
   */
  extractFilename(url, headers) {
    // Try Content-Disposition header
    const disposition = headers['content-disposition'];
    if (disposition) {
      const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        let filename = filenameMatch[1].replace(/['"]/g, '');
        filename = decodeURIComponent(filename);
        if (this.isValidFilename(filename)) {
          return this.sanitizeFilename(filename);
        }
      }
    }

    // Extract from URL
    try {
      const parsed = new URL(url);
      let pathname = parsed.pathname;
      let filename = path.basename(pathname);
      
      // Remove query parameters from filename
      filename = filename.split('?')[0];
      
      if (filename && this.isValidFilename(filename)) {
        return this.sanitizeFilename(filename);
      }
    } catch (error) {
      // Fallback
    }

    // Generate default filename
    return `download_${Date.now()}`;
  }

  /**
   * Extract file size from headers
   * @param {Object} headers - Response headers
   * @returns {number|null} File size in bytes or null if unknown
   */
  extractFileSize(headers) {
    const contentLength = headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > 0) {
        return size;
      }
    }
    return null;
  }

  /**
   * Check if server supports range requests
   * @param {Object} headers - Response headers
   * @returns {boolean} True if ranges are supported
   */
  checkRangeSupport(headers) {
    const acceptRanges = headers['accept-ranges'];
    return acceptRanges && acceptRanges.toLowerCase() !== 'none';
  }

  /**
   * Validate filename
   * @param {string} filename - Filename to validate
   * @returns {boolean} True if valid
   */
  isValidFilename(filename) {
    if (!filename || filename.length === 0 || filename.length > 255) {
      return false;
    }
    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/g;
    return !invalidChars.test(filename);
  }

  /**
   * Sanitize filename for safe file system usage
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Remove invalid characters
    let sanitized = filename.replace(/[<>:"|?*\x00-\x1f]/g, '_');
    
    // Remove leading/trailing spaces and dots
    sanitized = sanitized.trim().replace(/^\.+/, '').replace(/\.+$/, '');
    
    // Limit length
    if (sanitized.length > 200) {
      const ext = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      sanitized = base.substring(0, 200 - ext.length) + ext;
    }
    
    return sanitized || 'download';
  }

  /**
   * Fallback analysis using GET request with small range
   * @param {string} url - URL to analyze
   * @returns {Promise<Object>} Metadata object
   */
  async analyzeWithGet(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Range': 'bytes=0-0'
        },
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      return this.parseHeaders(url, response.headers);
    } catch (error) {
      throw new Error(`Failed to analyze URL with GET: ${error.message}`);
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  static formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) {
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
}

module.exports = LinkAnalyzer;
