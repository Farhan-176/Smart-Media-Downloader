const path = require('path');
const fs = require('fs');
const DownloadManager = require('../src/modules/DownloadManager');
const MetadataManager = require('../src/modules/MetadataManager');

(async () => {
  const downloadDir = path.join(__dirname, 'tmp_downloads');
  const metadataDir = path.join(__dirname, 'tmp_metadata');

  // Ensure directories exist
  fs.mkdirSync(downloadDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });

  const metadataManager = new MetadataManager(metadataDir);
  const manager = new DownloadManager(downloadDir, metadataManager);

  const url = process.argv[2] || 'https://www.google.com/robots.txt';
  const filename = 'robots_test.txt';

  try {
    const downloadId = await manager.startDownload(url, filename);
    console.log('Started download with id:', downloadId);

    manager.on('progress', (id, progress) => {
      console.log('Progress:', progress.percentage.toFixed(2) + '%', `Downloaded ${progress.downloadedBytes}/${progress.totalBytes}`);
    });

    manager.on('complete', (id) => {
      console.log('Download complete:', id);
      process.exit(0);
    });

    manager.on('error', (id, error) => {
      console.error('Download error:', id, error);
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start download:', err.message);
    process.exit(1);
  }
})();
