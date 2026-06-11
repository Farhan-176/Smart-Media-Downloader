# Smart Media Downloader

A production-quality desktop download manager with segmented multi-connection engine for speed, reliability, and efficient resource usage.

## Features

- **Segmented Multi-Connection Downloads**: Split files into segments for parallel downloading
- **Video URL Downloads**: YouTube and other supported video pages are extracted with yt-dlp and downloaded as video files
- **Pause/Resume Support**: Reliably pause and resume downloads
- **Crash Recovery**: Automatically recover interrupted downloads
- **Real-time Metrics**: Live speed, progress, and ETA calculations
- **Modern UI**: Clean, responsive interface
- **Stream-based File Writing**: Efficient memory usage for large files

## Installation

```bash
npm install
```

## Usage

### Development Mode
```bash
npm start
```

### Build for Production
```bash
npm run build
```

### Smoke Tests

```bash
npm run test:download
npm run test:video
```

## Technology Stack

- **Framework**: Electron
- **Runtime**: Node.js
- **UI**: HTML/CSS/JavaScript
- **Networking**: Axios
- **Video Extraction**: yt-dlp-exec
- **Media Merging**: ffmpeg-static
- **File Handling**: Node.js Streams

## Architecture

- **Link Analyzer**: Validates URLs and extracts metadata
- **Video Extractor**: Uses yt-dlp for supported video pages
- **Segment Manager**: Calculates byte ranges and orchestrates workers
- **Worker Engine**: Handles parallel downloads with retry logic
- **Metadata Persistence**: Saves download state for recovery

## Requirements

- Node.js 16 or higher
- Internet access for extractor-based video downloads
- 200MB free disk space (application)
- Internet connection

## License

MIT
