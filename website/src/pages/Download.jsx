import { useState, useEffect } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Download.css'

function detectOS() {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'macos'
  if (ua.includes('linux')) return 'linux'
  return 'windows'
}

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    icon: '🪟',
    version: 'Source Code',
    format: 'ZIP Archive',
    size: '~2 MB',
    link: 'https://github.com/Farhan-176/Smart-Media-Downloader/archive/refs/heads/main.zip',
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: '🍎',
    version: 'Source Code',
    format: 'ZIP Archive',
    size: '~2 MB',
    link: 'https://github.com/Farhan-176/Smart-Media-Downloader/archive/refs/heads/main.zip',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: '🐧',
    version: 'Source Code',
    format: 'ZIP Archive',
    size: '~2 MB',
    link: 'https://github.com/Farhan-176/Smart-Media-Downloader/archive/refs/heads/main.zip',
  },
]

const browsers = [
  { name: 'Chrome', icon: '🌐', desc: 'Works with Chrome 88+ and Chromium-based browsers.', link: '#' },
  { name: 'Edge', icon: '🔷', desc: 'Full support for Microsoft Edge (Chromium).', link: '#' },
  { name: 'Brave', icon: '🦁', desc: 'Compatible with Brave\'s Manifest V3 API.', link: '#' },
]

const steps = [
  { num: '1', title: 'Download Source Code', desc: 'Grab the source code ZIP archive from the links above.', icon: '📥' },
  { num: '2', title: 'Install Dependencies', desc: 'Extract the ZIP, open your terminal in the folder, and run npm install.', icon: '🔧' },
  { num: '3', title: 'Run the App', desc: 'Start the desktop app by running npm start in your terminal.', icon: '🚀' },
  { num: '4', title: 'Install Browser Extension', desc: 'Load the extension from the /extension folder in your browser.', icon: '🧩' },
]

const sysReqs = [
  { label: 'Operating System', value: 'Windows 10+, macOS 12+, Ubuntu 20.04+' },
  { label: 'RAM', value: '4 GB minimum' },
  { label: 'Disk Space', value: '200 MB free' },
  { label: 'Network', value: 'Broadband internet connection' },
  { label: 'Node.js', value: 'v16 or higher (bundled)' },
]

const changelog = [
  {
    version: 'v1.0.0',
    date: '2026-06-15',
    latest: true,
    changes: [
      'Initial stable release',
      'Segmented multi-connection download engine',
      'yt-dlp video extraction integration',
      'Browser extension (Manifest V3) for Chrome, Edge, Brave',
      'Pause/Resume with crash recovery',
      'Stream-based file writing for large files',
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-05-01',
    changes: [
      'Beta release',
      'Added pause/resume functionality',
      'Crash recovery via metadata persistence',
      'Basic UI with download list and progress tracking',
    ],
  },
]

export default function Download() {
  const [detectedOS, setDetectedOS] = useState('windows')
  const [changelogOpen, setChangelogOpen] = useState(null)
  const revealRef = useScrollReveal()

  useEffect(() => {
    setDetectedOS(detectOS())
  }, [])

  return (
    <div className="download-page" ref={revealRef}>
      {/* Header */}
      <section className="section download-hero">
        <div className="grid-pattern"></div>
        <div className="bg-glow bg-glow-purple" style={{ width: 500, height: 500, top: -100, left: -150 }}></div>
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">📥 Download</div>
            <h1 className="display-lg">Get Smart Media Downloader</h1>
            <p>Available for Windows, macOS, and Linux. Free and open-source.</p>
          </div>
        </div>
      </section>

      {/* Platform Cards */}
      <section className="platform-section">
        <div className="container">
          <div className="platform-grid fade-in-up">
            {platforms.map((p) => (
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`platform-card glass-card ${detectedOS === p.id ? 'detected' : ''}`}
                key={p.id}
              >
                {detectedOS === p.id && <div className="detected-badge">Detected</div>}
                <div className="platform-icon">{p.icon}</div>
                <h3>{p.name}</h3>
                <div className="platform-meta">
                  <span>v{p.version}</span>
                  <span>•</span>
                  <span>{p.format}</span>
                  <span>•</span>
                  <span>{p.size}</span>
                </div>
                <span className={`btn ${detectedOS === p.id ? 'btn-primary' : 'btn-secondary'} btn-large platform-btn`}>
                  Download for {p.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Browser Extension */}
      <section className="section browser-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">🧩 Extensions</div>
            <h2 className="headline-lg">Complete Your Setup</h2>
            <p>Install the browser extension for seamless download interception.</p>
          </div>

          <div className="browser-grid fade-in-up">
            {browsers.map((b, i) => (
              <div className="browser-card glass-card" key={i}>
                <div className="browser-icon">{b.icon}</div>
                <h3>{b.name}</h3>
                <p className="body-md">{b.desc}</p>
                <button className="btn btn-secondary">Add to {b.name}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="section install-section">
        <div className="bg-glow bg-glow-cyan" style={{ width: 400, height: 400, bottom: -100, right: -100 }}></div>
        <div className="container">
          <div className="section-header fade-in-up">
            <h2 className="headline-lg">Installation Guide</h2>
            <p>Up and running in under a minute.</p>
          </div>

          <div className="install-steps fade-in-up">
            {steps.map((s, i) => (
              <div className="install-step" key={i}>
                <div className="install-step-left">
                  <div className="install-num">{s.num}</div>
                  {i < steps.length - 1 && <div className="install-line"></div>}
                </div>
                <div className="install-step-content glass-card">
                  <span className="install-icon">{s.icon}</span>
                  <div>
                    <h4>{s.title}</h4>
                    <p className="body-md">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="section sysreq-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <h2 className="headline-lg">System Requirements</h2>
          </div>

          <div className="sysreq-table glass-card fade-in-up">
            {sysReqs.map((r, i) => (
              <div className="sysreq-row" key={i}>
                <span className="sysreq-label">{r.label}</span>
                <span className="sysreq-value">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Changelog */}
      <section className="section changelog-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">📋 Changelog</div>
            <h2 className="headline-lg">Release History</h2>
          </div>

          <div className="changelog-list fade-in-up">
            {changelog.map((release, i) => (
              <div className={`changelog-item glass-card ${changelogOpen === i ? 'open' : ''}`} key={i}>
                <button className="changelog-header" onClick={() => setChangelogOpen(changelogOpen === i ? null : i)}>
                  <div className="changelog-info">
                    <span className="changelog-version">{release.version}</span>
                    {release.latest && <span className="latest-badge">Latest</span>}
                    <span className="changelog-date">{release.date}</span>
                  </div>
                  <span className="faq-chevron">{changelogOpen === i ? '−' : '+'}</span>
                </button>
                <div className="changelog-body">
                  <ul>
                    {release.changes.map((c, j) => (
                      <li key={j}>
                        <span className="change-dot"></span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
