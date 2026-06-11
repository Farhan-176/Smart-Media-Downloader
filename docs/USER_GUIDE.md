# Smart Media Downloader - User Guide

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
npm start
```

## Features Guide

### 1. Downloading Files

#### Step 1: Enter URL
- Paste or type the download URL in the input field
- Press Enter or click "Analyze" button

#### Step 2: Review File Information
- The application will display:
  - Filename
  - File size
  - Content type
  - Range support status
- If range support is available, proceed to download

#### Step 3: Start Download
- Click "Start Download" button
- The download will begin with segmented multi-connection technology
- Watch real-time progress, speed, and ETA

### 2. Download Controls

#### Pause
- Click "Pause" button to temporarily stop the download
- All segments will be safely paused
- Progress is automatically saved

#### Resume
- Click "Resume" button to continue a paused download
- Download will continue from where it left off
- No data is lost

#### Cancel
- Click "Cancel" button to stop and remove the download
- You will be asked to confirm
- Partial files will remain in the download directory

### 3. Crash Recovery

If the application crashes or closes during a download:

1. Restart the application
2. A recovery section will appear showing incomplete downloads
3. Click "Resume" on any incomplete download to continue
4. The download will resume from the last saved progress

## Technical Details

### Segmented Downloading

The application splits files into 4 segments by default and downloads them in parallel:
- Segment 1: Bytes 0 - 25%
- Segment 2: Bytes 25% - 50%
- Segment 3: Bytes 50% - 75%
- Segment 4: Bytes 75% - 100%

This approach significantly improves download speed.

### Range Request Support

The application requires servers to support HTTP Range requests (Accept-Ranges header). Most modern servers support this feature.

If a server doesn't support ranges:
- The download button will be disabled
- A message will indicate range support is not available

### File Locations

- **Downloads**: `[User Downloads Folder]/SmartDownloader/`
- **Metadata**: `[App Data]/metadata/`

### Progress Persistence

Download progress is saved:
- Every 5% of completion
- When you pause a download
- When the application closes

### Error Handling

The application includes robust error handling:
- **Network Errors**: Automatic retry with exponential backoff (3 attempts)
- **Disk Errors**: Clear error messages
- **Server Errors**: Graceful fallback

## Troubleshoads & Tips

### Download Won't Start

**Possible causes:**
1. Invalid URL format
2. Server doesn't support range requests
3. File size cannot be determined
4. Network connection issues

**Solutions:**
- Verify the URL is correct and accessible
- Check your internet connection
- Try a different file or server

### Download is Slow

**Tips to improve speed:**
1. Close other applications using bandwidth
2. Connect to a wired network if possible
3. Check if the server has bandwidth limits

### Incomplete Download Recovery

If a download shows in recovery but won't resume:
1. Check if you have sufficient disk space
2. Verify the original URL is still accessible
3. Try canceling and starting a fresh download

### Disk Space Warnings

The application pre-allocates the full file size before downloading. Ensure you have:
- Enough space for the file
- Additional 10% buffer for temporary data

## Keyboard Shortcuts

- **Enter** (in URL field): Analyze URL
- **Ctrl+V**: Paste URL (standard)

## Advanced Configuration

### Changing Segment Count

To modify the number of download segments, edit `src/modules/DownloadManager.js`:

```javascript
const segmentManager = new SegmentManager(
  url,
  filePath,
  metadata.fileSize,
  { segmentCount: 8 } // Change from 4 to preferred count
);
```

**Recommended values:**
- Small files (< 10 MB): 2-4 segments
- Medium files (10-100 MB): 4-8 segments
- Large files (> 100 MB): 8-16 segments

### Timeout Configuration

To adjust connection timeout, edit `src/modules/SegmentWorker.js`:

```javascript
this.timeout = options.timeout || 60000; // 60 seconds
```

## Performance Optimization

### Memory Usage
- The application uses streaming to minimize memory usage
- Large files don't significantly increase RAM consumption
- Typical memory overhead: 50-100 MB

### CPU Usage
- Minimal CPU usage during downloads
- Most work is network I/O bound
- Expect < 5% CPU usage on modern systems

### Network Usage
- Full bandwidth utilization with segmented downloads
- Efficient connection pooling
- Minimal protocol overhead

## Supported Platforms

- ✅ Windows 10/11
- ✅ macOS 10.14+
- ✅ Linux (Ubuntu 18.04+, Debian, Fedora)

## Troubleshooting Electron Issues

### Application Won't Start

1. Delete `node_modules` folder
2. Run `npm install` again
3. Try `npm start`

### DevTools for Debugging

Start with developer tools enabled:
```bash
npm run dev
```

## Getting Help

For issues not covered in this guide:
1. Check the console for error messages (DevTools)
2. Review log files in the application data directory
3. Ensure you're using the latest version

## Best Practices

1. **Test with Small Files First**: Verify everything works before downloading large files
2. **Check Disk Space**: Ensure adequate space before starting large downloads
3. **Stable Connection**: Use wired connection for large downloads
4. **Regular Updates**: Keep the application updated for best performance
5. **Backup Important Downloads**: Don't rely solely on the download manager for critical files

## Privacy & Security

- No data is sent to external servers
- All downloads are direct from source
- No telemetry or tracking
- Metadata is stored locally only
- URLs are not logged or shared

---

For more information, see the [README.md](../README.md)
