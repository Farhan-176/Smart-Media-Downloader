const path = require('path');
const { URL } = require('url');
const ytdlpRaw = require('yt-dlp-exec');

let ytdlpBinPath = path.join(path.dirname(require.resolve('yt-dlp-exec')), '..', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
if (ytdlpBinPath.includes('app.asar')) {
  ytdlpBinPath = ytdlpBinPath.replace('app.asar', 'app.asar.unpacked');
}
const ytdlp = ytdlpRaw.create(ytdlpBinPath);

function sanitizeFilename(filename) {
  return String(filename || 'video')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .replace(/\.+$/, '') || 'video';
}

class VideoExtractor {
  static getSupportedHosts() {
    return [
      'youtube.com',
      'youtu.be',
      'm.youtube.com',
      'music.youtube.com',
      'vimeo.com',
      'dailymotion.com',
      'tiktok.com',
      'instagram.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'reddit.com',
      'twitch.tv',
      'pinterest.com',
      'linkedin.com'
    ];
  }

  static canHandle(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.getSupportedHosts().some((host) => hostname === host || hostname.endsWith(`.${host}`));
    } catch {
      return false;
    }
  }

  static async extract(url) {
    const result = await ytdlp.exec(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      skipDownload: true,
      ignoreErrors: false,
      quiet: true
    });

    const info = JSON.parse(result.stdout);

    const formats = Array.isArray(info.formats) ? info.formats : [];
    const videoFormats = formats.filter((format) => format.vcodec !== 'none');

    videoFormats.sort((a, b) => {
      const scoreA = (a.height || 0) * 1000000 + (a.tbr || 0) * 1000 + (a.filesize || a.filesize_approx || 0);
      const scoreB = (b.height || 0) * 1000000 + (b.tbr || 0) * 1000 + (b.filesize || b.filesize_approx || 0);
      return scoreB - scoreA;
    });

    const bestFormat = videoFormats[0] || formats[0] || {};
    
    const audioFormats = formats.filter((format) => format.vcodec === 'none' && format.acodec !== 'none');
    audioFormats.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
    const bestAudio = audioFormats[0] || null;

    // Group and filter formats to find unique resolutions
    const availableFormats = [];
    const seenHeights = new Set();
    
    for (const f of videoFormats) {
      const h = f.height || 0;
      if (h > 0 && !seenHeights.has(h)) {
        seenHeights.add(h);
        
        let formatSize = f.filesize || f.filesize_approx || 0;
        if (f.acodec === 'none' && bestAudio) {
          formatSize += bestAudio.filesize || bestAudio.filesize_approx || 0;
        }

        const sizeLabel = formatSize ? ` (~${(formatSize / (1024 * 1024)).toFixed(1)} MB)` : '';

        availableFormats.push({
          quality: `${h}p`,
          formatId: f.format_id,
          ext: 'mp4',
          fileSize: formatSize || null,
          label: `${h}p (MP4)${sizeLabel}`,
          isVideo: true
        });
      }
    }

    // Add MP3 Audio Option
    const audioSize = bestAudio ? (bestAudio.filesize || bestAudio.filesize_approx || null) : null;
    const audioSizeLabel = audioSize ? ` (~${(audioSize / (1024 * 1024)).toFixed(1)} MB)` : '';
    availableFormats.push({
      quality: 'MP3 Audio',
      formatId: 'bestaudio',
      ext: 'mp3',
      fileSize: audioSize,
      label: `Audio Only (MP3)${audioSizeLabel}`,
      isAudio: true
    });

    const title = sanitizeFilename(info.title || info.fulltitle || info.id || 'video');
    const ext = bestFormat.ext || info.ext || 'mp4';
    
    let fileSize = bestFormat.filesize || bestFormat.filesize_approx || info.filesize || info.filesize_approx || null;
    if (fileSize && bestFormat.acodec === 'none' && bestAudio) {
      const audioSize = bestAudio.filesize || bestAudio.filesize_approx || 0;
      fileSize += audioSize;
    }

    return {
      url,
      filename: `${title}.${ext === 'mkv' ? 'mkv' : 'mp4'}`,
      fileSize,
      contentType: `video/${ext === 'mkv' ? 'x-matroska' : 'mp4'}`,
      supportsRanges: true,
      isVideoSource: true,
      extractor: 'yt-dlp',
      title: info.title || title,
      webpageUrl: info.webpage_url || url,
      duration: info.duration || null,
      thumbnail: info.thumbnail || null,
      bestFormat,
      availableFormats,
      formats
    };
  }
}

module.exports = VideoExtractor;