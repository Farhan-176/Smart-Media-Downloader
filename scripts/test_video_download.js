const path = require('path');
const fs = require('fs');
const DownloadManager = require('../src/modules/DownloadManager');
const MetadataManager = require('../src/modules/MetadataManager');

(async () => {
  const downloadDir = path.join(__dirname, 'tmp_video_downloads');
  const metadataDir = path.join(__dirname, 'tmp_video_metadata');
  const url = process.argv[2] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  fs.mkdirSync(downloadDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });

  const metadataManager = new MetadataManager(metadataDir);
  const manager = new DownloadManager(downloadDir, metadataManager);

  manager.on('progress', (id, progress) => {
    const percent = Number.isFinite(progress.percentage) ? progress.percentage.toFixed(2) : '0.00';
    console.log(`Progress: ${percent}%`, `Downloaded ${progress.downloadedBytes}/${progress.totalBytes}`);
  });

  manager.on('complete', (id) => {
    console.log('Download complete:', id);
    process.exit(0);
  });

  manager.on('error', (id, error) => {
    console.error('Download error:', id, error);
    process.exit(1);
  });

  try {
    const downloadId = await manager.startDownload(url);
    console.log('Started download with id:', downloadId);
  } catch (error) {
    console.error('Failed to start download:', error.message);
    process.exit(1);
  }
})();
