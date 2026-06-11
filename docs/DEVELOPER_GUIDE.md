# Smart Media Downloader - Developer Documentation

## Architecture Overview

The Smart Media Downloader follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                      │
│  ┌──────────────┐  ┌────────────────────────────┐  │
│  │   main.js    │──│  IPC Handlers              │  │
│  └──────────────┘  └────────────────────────────┘  │
│         │                                            │
│         ├─────────────────────────────────────────┐ │
│         │              Modules                    │ │
│  ┌──────▼──────┐  ┌─────────────┐  ┌───────────┐│ │
│  │DownloadMgr  │  │LinkAnalyzer │  │ Metadata  ││ │
│  │             │  │             │  │  Manager  ││ │
│  └──────┬──────┘  └─────────────┘  └───────────┘│ │
│         │                                         │ │
│  ┌──────▼──────┐  ┌─────────────────────────────┤ │
│  │SegmentMgr   │  │   SegmentWorker (x4)        │ │
│  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                    IPC Channel
                         │
┌─────────────────────────────────────────────────────┐
│                 Renderer Process                    │
│  ┌──────────────┐  ┌────────────────────────────┐  │
│  │ renderer.js  │──│  UI Components (HTML/CSS) │  │
│  └──────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Core Modules

### 1. LinkAnalyzer (`src/modules/LinkAnalyzer.js`)

**Purpose**: Validates URLs and extracts resource metadata

**Key Methods**:
- `analyze(url)`: Performs HEAD request and returns metadata
- `validateUrl(url)`: Validates URL format
- `parseHeaders(url, headers)`: Extracts metadata from headers
- `extractFilename(url, headers)`: Determines filename
- `checkRangeSupport(headers)`: Checks for Accept-Ranges header

**Dependencies**:
- `axios`: HTTP requests
- `url`: URL parsing
- `path`: Filename handling

**Error Handling**:
- Invalid URL format
- Network timeouts
- Server errors (404, 500, etc.)
- Missing headers

### 2. SegmentWorker (`src/modules/SegmentWorker.js`)

**Purpose**: Downloads a single byte-range segment

**Key Features**:
- Retry logic with exponential backoff
- Stream-based file writing
- Progress reporting
- Pause/resume capability

**Key Methods**:
- `download(progressCallback)`: Start downloading the segment
- `downloadSegmentChunk(progressCallback)`: Handle streaming
- `pause()`: Abort the current download
- `getProgress()`: Return current progress
- `serialize()`: Save state for persistence

**Configuration**:
```javascript
{
  maxRetries: 3,        // Number of retry attempts
  timeout: 30000        // Request timeout in milliseconds
}
```

### 3. SegmentManager (`src/modules/SegmentManager.js`)

**Purpose**: Orchestrates multiple segment workers

**Key Features**:
- Byte range calculation
- Parallel download coordination
- Speed calculation
- ETA estimation
- Progress aggregation

**Key Methods**:
- `initialize()`: Create file and segment workers
- `startDownload()`: Begin parallel downloads
- `pause()`: Pause all workers
- `resume()`: Resume incomplete workers
- `calculateSegmentRanges()`: Split file into segments
- `getProgress()`: Get overall progress

**Events**:
- `progress`: Emitted on progress updates
- `complete`: Emitted when all segments finish
- `error`: Emitted on download errors

### 4. MetadataManager (`src/modules/MetadataManager.js`)

**Purpose**: Persist download state for crash recovery

**Key Methods**:
- `saveMetadata(downloadId, metadata)`: Save download state
- `loadMetadata(downloadId)`: Load download state
- `deleteMetadata(downloadId)`: Remove metadata file
- `getPendingDownloads()`: Get all incomplete downloads
- `updateProgress(downloadId, progress)`: Update progress
- `updateStatus(downloadId, status)`: Update download status

**Metadata Structure**:
```javascript
{
  downloadId: string,
  url: string,
  filename: string,
  filePath: string,
  fileSize: number,
  contentType: string,
  status: 'downloading' | 'paused' | 'completed' | 'error',
  createdAt: ISO8601 timestamp,
  lastUpdated: ISO8601 timestamp,
  segments: Array<SegmentState>,
  progress: ProgressObject
}
```

### 5. DownloadManager (`src/modules/DownloadManager.js`)

**Purpose**: High-level download orchestration

**Key Features**:
- Lifecycle management
- Event coordination
- Active download tracking
- Recovery support

**Key Methods**:
- `startDownload(url, filename)`: Initiate new download
- `pauseDownload(downloadId)`: Pause download
- `resumeDownload(downloadId)`: Resume download
- `cancelDownload(downloadId)`: Cancel download
- `cleanup()`: Save state and clean up

**Events**:
- `progress`: Progress updates with download ID
- `complete`: Download completion with download ID
- `error`: Error with download ID and message

## IPC Communication

### Main → Renderer

**Events**:
```javascript
// Progress updates
mainWindow.webContents.send('download-progress', progress)

// Download complete
mainWindow.webContents.send('download-complete', downloadId)

// Download error
mainWindow.webContents.send('download-error', errorMessage)
```

### Renderer → Main

**Handlers**:
```javascript
// Analyze URL
ipcRenderer.invoke('analyze-url', url)

// Download control
ipcRenderer.invoke('start-download', url, filename)
ipcRenderer.invoke('pause-download', downloadId)
ipcRenderer.invoke('resume-download', downloadId)
ipcRenderer.invoke('cancel-download', downloadId)

// Recovery
ipcRenderer.invoke('get-pending-downloads')

// Settings
ipcRenderer.invoke('get-download-dir')
```

## Data Flow

### Download Lifecycle

1. **URL Analysis**
   ```
   User Input → LinkAnalyzer → Metadata → UI Display
   ```

2. **Download Start**
   ```
   UI Action → DownloadManager → SegmentManager → Workers
   ```

3. **Progress Updates**
   ```
   Workers → SegmentManager → DownloadManager → Main → Renderer
   ```

4. **Persistence**
   ```
   DownloadManager → MetadataManager → Disk (JSON)
   ```

5. **Completion**
   ```
   Workers Complete → SegmentManager → DownloadManager → UI Update
   ```

## File Structure

```
internet download manager/
├── package.json
├── README.md
├── .gitignore
├── docs/
│   ├── USER_GUIDE.md
│   └── DEVELOPER_GUIDE.md
└── src/
    ├── main.js              # Main Electron process
    ├── preload.js           # Preload script (IPC bridge)
    ├── modules/
    │   ├── LinkAnalyzer.js
    │   ├── SegmentWorker.js
    │   ├── SegmentManager.js
    │   ├── MetadataManager.js
    │   └── DownloadManager.js
    └── renderer/
        ├── index.html
        ├── styles.css
        └── renderer.js
```

## Development Setup

### Prerequisites
```bash
Node.js >= 16.0.0
npm >= 7.0.0
```

### Installation
```bash
npm install
```

### Development Mode
```bash
npm run dev  # Starts with DevTools enabled
```

### Production Build
```bash
npm run build
```

## Testing Strategies

### Manual Testing Checklist

1. **URL Analysis**
   - [ ] Valid HTTP URL
   - [ ] Valid HTTPS URL
   - [ ] Invalid URL format
   - [ ] Unreachable server
   - [ ] Server with no range support
   - [ ] Server with no Content-Length

2. **Download Functionality**
   - [ ] Small file (< 1 MB)
   - [ ] Medium file (10-100 MB)
   - [ ] Large file (> 1 GB)
   - [ ] Pause and resume
   - [ ] Cancel during download
   - [ ] Network interruption

3. **Recovery**
   - [ ] Application restart during download
   - [ ] Resume from recovery list
   - [ ] Multiple pending downloads

4. **Edge Cases**
   - [ ] Disk full during download
   - [ ] Permission denied on write
   - [ ] URL becomes invalid during download
   - [ ] Filename with special characters

### Unit Testing (Future Implementation)

Recommended framework: Jest

```bash
npm install --save-dev jest
```

Example test structure:
```javascript
describe('LinkAnalyzer', () => {
  test('should validate correct URLs', () => {
    // Test implementation
  });
  
  test('should reject invalid URLs', () => {
    // Test implementation
  });
});
```

## Performance Considerations

### Memory Management

- **Streaming**: All downloads use Node.js streams to avoid loading entire files into memory
- **Worker Limit**: Default 4 workers balances speed and resource usage
- **Buffer Size**: Default buffer size optimized for typical network conditions

### Speed Optimization

- **Segment Count**: More segments = potentially faster, but diminishing returns
- **Connection Pooling**: Axios handles connection reuse automatically
- **Parallel Writes**: Each worker writes to different file positions

### Disk I/O

- **Pre-allocation**: File size is allocated upfront to avoid fragmentation
- **Random Access**: Workers write to specific byte offsets
- **Flush Strategy**: OS handles flushing; workers don't force sync

## Security Considerations

### Input Validation

- All URLs are validated before processing
- Filenames are sanitized to prevent path traversal
- File paths are constructed safely using `path.join()`

### Network Security

- Only HTTP/HTTPS protocols are supported
- TLS certificate validation is enabled by default
- No external data is sent (privacy-focused)

### File System Security

- Downloads are restricted to designated directory
- Metadata is stored in app-specific user data folder
- No execution of downloaded files

## Debugging Tips

### Enable DevTools

```bash
npm run dev
```

### Console Logging

Add debug logs in modules:
```javascript
console.log('[SegmentWorker]', this.segmentId, 'Downloaded:', bytes);
```

### Network Inspection

Use DevTools Network tab to monitor:
- Request headers
- Response headers
- Transfer size
- Timing

### State Inspection

Check metadata files directly:
```
Windows: %APPDATA%\smart-media-downloader\metadata\
macOS: ~/Library/Application Support/smart-media-downloader/metadata/
Linux: ~/.config/smart-media-downloader/metadata/
```

## Common Issues & Solutions

### High Memory Usage

**Cause**: Too many concurrent segments
**Solution**: Reduce segment count in SegmentManager options

### Slow Downloads

**Cause**: Server throttling, network congestion
**Solution**: Check server limits, test with different files

### File Corruption

**Cause**: Incomplete segment writes, disk errors
**Solution**: Implement checksum verification (future enhancement)

## Future Enhancements

### Planned Features (v2.0)

1. **Download Queue**
   - Multiple simultaneous downloads
   - Priority management
   - Batch operations

2. **Bandwidth Control**
   - Speed limiting
   - Scheduled downloads
   - Bandwidth allocation

3. **Advanced Features**
   - Checksum verification (MD5, SHA256)
   - Browser extension integration
   - Custom protocol handlers

4. **UI Improvements**
   - Dark/light theme toggle
   - Download history
   - Statistics and graphs

### Extension Points

To add new features:

1. **New Module**: Create in `src/modules/`
2. **IPC Handler**: Add to `main.js` setupIPCHandlers()
3. **UI Component**: Update renderer files
4. **Documentation**: Update guides

## Contributing Guidelines

### Code Style

- Use 2 spaces for indentation
- Use camelCase for variables and functions
- Use PascalCase for classes
- Add JSDoc comments for public methods
- Keep functions focused and small

### Commit Messages

Format: `[Module] Brief description`

Examples:
- `[SegmentWorker] Add retry logic for network errors`
- `[UI] Improve progress bar animation`
- `[Docs] Update user guide with troubleshooting`

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request with description

## License

MIT License - See LICENSE file for details

---

For usage information, see [USER_GUIDE.md](USER_GUIDE.md)
