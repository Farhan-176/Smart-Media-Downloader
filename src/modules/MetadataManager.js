const fs = require('fs').promises;
const path = require('path');

/**
 * MetadataManager - Handles persistence of download state
 * 
 * Responsibilities:
 * - Save download metadata
 * - Load download metadata
 * - Track download state
 * - Enable crash recovery
 */
class MetadataManager {
  constructor(metadataDir) {
    this.metadataDir = metadataDir;
  }

  /**
   * Save download metadata
   * @param {string} downloadId - Download identifier
   * @param {Object} metadata - Metadata to save
   * @returns {Promise<void>}
   */
  async saveMetadata(downloadId, metadata) {
    const metadataPath = this.getMetadataPath(downloadId);
    const data = {
      ...metadata,
      lastUpdated: new Date().toISOString()
    };

    try {
      await fs.writeFile(
        metadataPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new Error(`Failed to save metadata: ${error.message}`);
    }
  }

  /**
   * Load download metadata
   * @param {string} downloadId - Download identifier
   * @returns {Promise<Object>} Metadata object
   */
  async loadMetadata(downloadId) {
    const metadataPath = this.getMetadataPath(downloadId);

    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load metadata: ${error.message}`);
    }
  }

  /**
   * Delete download metadata
   * @param {string} downloadId - Download identifier
   * @returns {Promise<void>}
   */
  async deleteMetadata(downloadId) {
    const metadataPath = this.getMetadataPath(downloadId);

    try {
      await fs.unlink(metadataPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete metadata: ${error.message}`);
      }
    }
  }

  /**
   * Get all pending downloads
   * @returns {Promise<Array<Object>>} Array of pending downloads
   */
  async getPendingDownloads() {
    try {
      const files = await fs.readdir(this.metadataDir);
      const metadataFiles = files.filter(file => file.endsWith('.json'));

      const downloads = await Promise.all(
        metadataFiles.map(async (file) => {
          const downloadId = path.basename(file, '.json');
          const metadata = await this.loadMetadata(downloadId);
          
          if (metadata && metadata.status !== 'completed') {
            return {
              downloadId,
              ...metadata
            };
          }
          return null;
        })
      );

      return downloads.filter(d => d !== null);
    } catch (error) {
      throw new Error(`Failed to get pending downloads: ${error.message}`);
    }
  }

  /**
   * Check if metadata exists
   * @param {string} downloadId - Download identifier
   * @returns {Promise<boolean>} True if exists
   */
  async exists(downloadId) {
    const metadataPath = this.getMetadataPath(downloadId);
    try {
      await fs.access(metadataPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata file path
   * @param {string} downloadId - Download identifier
   * @returns {string} Full path to metadata file
   */
  getMetadataPath(downloadId) {
    return path.join(this.metadataDir, `${downloadId}.json`);
  }

  /**
   * Update download progress
   * @param {string} downloadId - Download identifier
   * @param {Object} progress - Progress data
   * @returns {Promise<void>}
   */
  async updateProgress(downloadId, progress) {
    const metadata = await this.loadMetadata(downloadId);
    if (metadata) {
      metadata.progress = progress;
      metadata.lastUpdated = new Date().toISOString();
      await this.saveMetadata(downloadId, metadata);
    }
  }

  /**
   * Update download status
   * @param {string} downloadId - Download identifier
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(downloadId, status) {
    const metadata = await this.loadMetadata(downloadId);
    if (metadata) {
      metadata.status = status;
      metadata.lastUpdated = new Date().toISOString();
      await this.saveMetadata(downloadId, metadata);
    }
  }
}

module.exports = MetadataManager;
