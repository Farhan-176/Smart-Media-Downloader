import { useState } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Docs.css'

const quickStart = [
  { num: '1', icon: '📥', title: 'Download & Install', desc: 'Download the desktop app from the Download page. Run the installer — it takes less than a minute with no third-party software bundled.' },
  { num: '2', icon: '🧩', title: 'Add Browser Extension', desc: 'Install the Chrome/Edge/Brave extension for automatic download interception. The extension communicates with the desktop app via native messaging.' },
  { num: '3', icon: '⚙️', title: 'Configure Settings', desc: 'Set your download folder, speed limits, concurrent download slots, and scheduling preferences from the Settings panel.' },
  { num: '4', icon: '🚀', title: 'Start Downloading', desc: 'Browse the web normally. Clickable downloads are auto-intercepted and routed through our segmented multi-connection engine.' },
]

const featureDocs = [
  {
    title: 'Segmented Multi-Connection Downloads',
    icon: '⚡',
    content: 'The download engine splits each file into multiple segments (chunks) and downloads them in parallel using separate HTTP connections. This bypasses per-connection bandwidth throttling and can boost speeds by up to 5x. The Segment Manager calculates optimal byte ranges while the Worker Engine handles each segment with built-in retry logic.'
  },
  {
    title: 'Video Extraction with yt-dlp',
    icon: '🎬',
    content: 'Smart Media Downloader uses yt-dlp under the hood to detect and extract video streams from supported sites (YouTube, Vimeo, and 1000+ others). When you paste a video URL, the Link Analyzer detects it as a video page and routes it to the Video Extractor, which uses yt-dlp to fetch available formats. Audio and video streams are merged using ffmpeg-static.'
  },
  {
    title: 'Browser Extension Integration',
    icon: '🔌',
    content: 'The Manifest V3 browser extension intercepts download requests via the chrome.downloads API. It communicates with the desktop app through a local HTTP server running on port 8932. When the extension detects a new download, it sends the URL, headers, and cookies to the desktop app which takes over the download with its optimized engine.'
  },
  {
    title: 'Smart Scheduler',
    icon: '📅',
    content: 'Queue files for later download or set specific times for downloads to begin. The scheduler supports bandwidth-aware scheduling — set downloads to run during off-peak hours for maximum speed. You can also configure the app to automatically suspend your PC when all scheduled downloads complete.'
  },
  {
    title: 'Pause/Resume & Crash Recovery',
    icon: '⏸️',
    content: 'Every download\'s state is persisted to disk as metadata. This includes completed segments, byte ranges, and partial file data. If the app crashes or your PC restarts unexpectedly, Smart Media Downloader automatically detects interrupted downloads on next launch and resumes them from exactly where they left off — no data is lost.'
  },
]

const faqs = [
  { q: 'What browsers are supported?', a: 'The extension works with all Chromium-based browsers including Chrome (88+), Microsoft Edge, Brave, Opera, and Vivaldi. Firefox support is planned for a future release.' },
  { q: 'How do segmented downloads work?', a: 'Files are split into byte-range segments. Each segment is downloaded via a separate HTTP connection in parallel. Once all segments complete, they are merged into the final file. The number of segments is automatically optimized based on file size and server support.' },
  { q: 'Can I download YouTube videos?', a: 'Yes! Smart Media Downloader includes yt-dlp integration. Paste a video URL from YouTube, Vimeo, or 1000+ other supported sites, and the app will extract available video/audio formats for you to choose from.' },
  { q: 'Is this free to use?', a: 'Yes! The application is completely free and open-source under the MIT license.' },
  { q: 'How do I update the app?', a: 'The app will notify you when a new version is available. You can download the latest version from the Download page or from GitHub Releases. Auto-update functionality is planned for a future release.' },
  { q: 'What video formats are supported?', a: 'Through yt-dlp, the app supports virtually all video formats including MP4, MKV, WebM, AVI, FLV, and more. Audio formats like MP3, M4A, OPUS, and FLAC are also supported.' },
  { q: 'Does it work with a VPN?', a: 'Yes, Smart Media Downloader works seamlessly with VPNs. All network requests go through your system\'s network configuration, so if you have a VPN active, downloads will be routed through it.' },
  { q: 'How do I report a bug?', a: 'You can report bugs by opening an issue on our GitHub repository. Please include your operating system, app version, and steps to reproduce the issue. Screenshots and log files are very helpful.' },
]

const troubleshooting = [
  {
    title: 'Extension Not Connecting',
    icon: '🔴',
    steps: [
      'Ensure the desktop app is running (check system tray)',
      'Verify the local server is active on port 8932',
      'Try removing and re-adding the extension',
      'Check that no firewall is blocking localhost connections',
    ]
  },
  {
    title: 'Downloads Stuck at 0%',
    icon: '⚠️',
    steps: [
      'Check your internet connection',
      'Verify the download URL is still valid',
      'Try reducing the number of segments in Settings',
      'Some servers don\'t support range requests — disable segmentation for that URL',
    ]
  },
  {
    title: 'Video Extraction Failing',
    icon: '🎬',
    steps: [
      'Ensure yt-dlp is up to date (check Settings > Updates)',
      'Verify the video URL is from a supported site',
      'Check if the video is age-restricted or private',
      'Try using the direct video URL instead of a playlist URL',
    ]
  },
  {
    title: 'Slow Download Speeds',
    icon: '🐌',
    steps: [
      'Increase the number of segments (Settings > Engine)',
      'Check if other applications are consuming bandwidth',
      'Some servers throttle connections — try at a different time',
      'Ensure your VPN isn\'t introducing latency',
    ]
  },
]

export default function Docs() {
  const [openFeature, setOpenFeature] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)
  const revealRef = useScrollReveal()

  return (
    <div className="docs-page" ref={revealRef}>
      {/* Header */}
      <section className="section docs-hero">
        <div className="grid-pattern"></div>
        <div className="bg-glow bg-glow-cyan" style={{ width: 500, height: 500, top: -100, right: -150 }}></div>
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">📖 Documentation</div>
            <h1 className="display-lg">Documentation &amp; Support</h1>
            <p>Everything you need to get started and troubleshoot.</p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="section quickstart-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <h2 className="headline-lg">Quick Start Guide</h2>
            <p>Get up and running in under a minute.</p>
          </div>

          <div className="quickstart-grid fade-in-up">
            {quickStart.map((s, i) => (
              <div className="quickstart-card glass-card" key={i} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="quickstart-num">{s.num}</div>
                <div className="quickstart-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p className="body-md">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Documentation */}
      <section className="section features-docs-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">📚 Feature Docs</div>
            <h2 className="headline-lg">Key Features Explained</h2>
            <p>Deep dives into how each feature works under the hood.</p>
          </div>

          <div className="feature-docs-list fade-in-up">
            {featureDocs.map((f, i) => (
              <div className={`feature-doc-item glass-card ${openFeature === i ? 'open' : ''}`} key={i}>
                <button className="feature-doc-header" onClick={() => setOpenFeature(openFeature === i ? null : i)}>
                  <div className="feature-doc-title">
                    <span className="feature-doc-icon">{f.icon}</span>
                    <span>{f.title}</span>
                  </div>
                  <span className="faq-chevron">{openFeature === i ? '−' : '+'}</span>
                </button>
                <div className="feature-doc-body">
                  <p>{f.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section faq-docs-section">
        <div className="bg-glow bg-glow-purple" style={{ width: 400, height: 400, bottom: -100, left: -100 }}></div>
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">❓ FAQ</div>
            <h2 className="headline-lg">Frequently Asked Questions</h2>
          </div>

          <div className="faq-list fade-in-up">
            {faqs.map((faq, i) => (
              <div className={`faq-item glass-card ${openFaq === i ? 'open' : ''}`} key={i}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="faq-chevron">{openFaq === i ? '−' : '+'}</span>
                </button>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="section troubleshoot-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">🔧 Troubleshooting</div>
            <h2 className="headline-lg">Common Issues</h2>
            <p>Quick fixes for the most frequently encountered problems.</p>
          </div>

          <div className="troubleshoot-grid fade-in-up">
            {troubleshooting.map((t, i) => (
              <div className="troubleshoot-card glass-card" key={i}>
                <div className="troubleshoot-header">
                  <span className="troubleshoot-icon">{t.icon}</span>
                  <h3>{t.title}</h3>
                </div>
                <ol className="troubleshoot-steps">
                  {t.steps.map((step, j) => (
                    <li key={j}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Support */}
      <section className="section support-section">
        <div className="container">
          <div className="support-card glass-card fade-in-up">
            <h2 className="headline-lg">Need More Help?</h2>
            <p className="body-lg">We're here to help. Reach out through any of these channels.</p>
            <div className="support-links">
              <a href="https://github.com/Farhan-176/Smart-Media-Downloader/issues" target="_blank" rel="noopener noreferrer" className="support-link glass-card">
                <span className="support-link-icon">🐛</span>
                <span className="support-link-title">Report a Bug</span>
                <span className="support-link-desc">GitHub Issues</span>
              </a>
              <a href="https://github.com/Farhan-176/Smart-Media-Downloader/discussions" target="_blank" rel="noopener noreferrer" className="support-link glass-card">
                <span className="support-link-icon">💬</span>
                <span className="support-link-title">Community</span>
                <span className="support-link-desc">GitHub Discussions</span>
              </a>
              <a href="mailto:support@smartdownloader.app" className="support-link glass-card">
                <span className="support-link-icon">✉️</span>
                <span className="support-link-title">Email Support</span>
                <span className="support-link-desc">Reach out to us</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
