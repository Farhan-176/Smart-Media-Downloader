import { Link } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Landing.css'

export default function Landing() {
  const revealRef = useScrollReveal()

  return (
    <div className="landing-page" ref={revealRef}>
      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="grid-pattern"></div>
        <div className="bg-glow bg-glow-purple hero-glow-1"></div>
        <div className="bg-glow bg-glow-cyan hero-glow-2"></div>

        <div className="hero-container container">
          <div className="hero-content">
            <div className="section-badge">
              <span className="badge-dot"></span>
              Version 1.0 — Free &amp; Open Source
            </div>
            <h1 className="display-lg">
              Supercharge Your <span className="gradient-text">Downloads</span>
            </h1>
            <p className="hero-subtitle body-lg">
              Experience lightning-fast speeds with our segmented multi-connection engine.
              Download up to <strong>5x faster</strong>, extract streaming media, and auto-intercept
              browser downloads — all in one sleek desktop app.
            </p>
            <div className="hero-actions">
              <Link to="/download" className="btn btn-primary btn-large">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download for Windows
              </Link>
              <a href="#features" className="btn btn-secondary">Learn More</a>
            </div>
          </div>

          <div className="hero-preview">
            <div className="preview-window">
              <div className="window-chrome">
                <div className="window-dots">
                  <span className="dot dot-close"></span>
                  <span className="dot dot-minimize"></span>
                  <span className="dot dot-expand"></span>
                </div>
                <span className="window-title">Smart Media Downloader</span>
              </div>
              <div className="window-body">
                <div className="mock-sidebar">
                  <div className="mock-sidebar-item active">📁 All Downloads</div>
                  <div className="mock-sidebar-item">🎬 Videos</div>
                  <div className="mock-sidebar-item">🎵 Music</div>
                  <div className="mock-sidebar-item">📄 Documents</div>
                </div>
                <div className="mock-content">
                  <div className="mock-table-header">
                    <span>File Name</span>
                    <span>Size</span>
                    <span>Progress</span>
                  </div>
                  <div className="mock-row">
                    <span className="mock-filename">Space-Launch-4K.mp4</span>
                    <span className="mock-size">242.4 MB</span>
                    <div className="mock-progress-col">
                      <div className="mock-progress-track">
                        <div className="mock-progress-fill" style={{ width: '82%' }}></div>
                      </div>
                      <span className="mock-pct">82%</span>
                    </div>
                  </div>
                  <div className="mock-row">
                    <span className="mock-filename">Album-Uncompressed.zip</span>
                    <span className="mock-size">1.2 GB</span>
                    <div className="mock-progress-col">
                      <div className="mock-progress-track">
                        <div className="mock-progress-fill secondary" style={{ width: '45%' }}></div>
                      </div>
                      <span className="mock-pct">45%</span>
                    </div>
                  </div>
                  <div className="mock-row">
                    <span className="mock-filename">Documentation.pdf</span>
                    <span className="mock-size">4.8 MB</span>
                    <div className="mock-progress-col">
                      <span className="mock-status-complete">✓ Completed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== IDM COMPARISON ========== */}
      <section className="section comparison-section" id="comparison">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">⚔️ Head-to-Head</div>
            <h2 className="headline-lg">Why Switch from IDM?</h2>
            <p>See how Smart Media Downloader stacks up against the legacy standard.</p>
          </div>

          <div className="comparison-table-wrapper fade-in-up">
            <div className="comparison-table glass-card">
              <div className="comparison-header">
                <div className="comparison-feature-col">Feature</div>
                <div className="comparison-col idm-col">
                  <span className="comparison-label">IDM</span>
                  <span className="comparison-price">$29.95</span>
                </div>
                <div className="comparison-col smd-col">
                  <span className="comparison-label">SmartDownloader</span>
                  <span className="comparison-price free">Free</span>
                </div>
              </div>

              {[
                { feature: 'Price', idm: '$29.95 (One-time)', smd: 'Free & Open Source', idmBad: true, smdGood: true },
                { feature: 'User Interface', idm: 'Outdated / Legacy', smd: 'Modern Dark UI', idmBad: true, smdGood: true },
                { feature: 'Platform Support', idm: 'Windows Only', smd: 'Windows, Mac, Linux', idmBad: true, smdGood: true },
                { feature: 'Video Extraction', idm: 'Basic / Limited', smd: 'Built-in yt-dlp Engine', idmBad: true, smdGood: true },
                { feature: 'Nag Screens / Ads', idm: 'Yes — Frequent', smd: 'None — Ever', idmBad: true, smdGood: true },
                { feature: 'Multi-Connection', idm: 'Yes', smd: 'Yes — Segmented Engine', idmOk: true, smdGood: true },
                { feature: 'Browser Integration', idm: 'Yes', smd: 'Yes — Manifest V3', idmOk: true, smdGood: true },
                { feature: 'Open Source', idm: 'No', smd: 'Yes — MIT License', idmBad: true, smdGood: true },
              ].map((row, i) => (
                <div className="comparison-row" key={i}>
                  <div className="comparison-feature-col">{row.feature}</div>
                  <div className={`comparison-col idm-col ${row.idmBad ? 'bad' : ''} ${row.idmOk ? 'ok' : ''}`}>
                    <span className="status-icon">{row.idmBad ? '✗' : '✓'}</span>
                    {row.idm}
                  </div>
                  <div className={`comparison-col smd-col ${row.smdGood ? 'good' : ''}`}>
                    <span className="status-icon">✓</span>
                    {row.smd}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section className="section features-section" id="features">
        <div className="bg-glow bg-glow-purple features-glow"></div>
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">✨ Core Features</div>
            <h2 className="headline-lg">Built for Speed &amp; Utility</h2>
            <p>A production-ready download manager equipped with every advanced tool you need.</p>
          </div>

          <div className="features-grid">
            {[
              { icon: '⚡', title: 'Multi-Connection Engine', desc: 'Splits files into multiple parallel segments to bypass bandwidth throttles, boosting download speeds by up to 5x.' },
              { icon: '🔌', title: 'Browser Integration', desc: 'Intercepts browser downloads automatically via our Manifest V3 extension and routes them to the native desktop app.' },
              { icon: '🎬', title: 'Media Streams Extractor', desc: 'Detects streaming media from video hosting sites using yt-dlp, letting you download in your preferred quality.' },
              { icon: '📅', title: 'Smart Scheduler', desc: 'Queue files to download later or set specific times for downloads to begin and auto-suspend when done.' },
              { icon: '⏸️', title: 'Pause / Resume', desc: 'Reliably pause and resume any download. Built-in crash recovery automatically saves state for interrupted transfers.' },
              { icon: '💾', title: 'Stream-Based Writing', desc: 'Efficient memory usage with Node.js streams — handles multi-gigabyte files without memory bloat.' },
            ].map((feature, i) => (
              <div className="feature-card glass-card fade-in-up" key={i} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="headline-md">{feature.title}</h3>
                <p className="body-md">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="section how-it-works-section" id="how-it-works">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">🚀 Get Started</div>
            <h2 className="headline-lg">How It Works</h2>
            <p>Three simple steps to supercharge your downloads.</p>
          </div>

          <div className="steps-row fade-in-up">
            {[
              { num: '1', title: 'Install the App', desc: 'Download and install the desktop app for your platform. It takes less than a minute.', icon: '📥' },
              { num: '2', title: 'Add Extension', desc: 'Install our browser extension for Chrome, Edge, or Brave to auto-intercept downloads.', icon: '🧩' },
              { num: '3', title: 'Download at Max Speed', desc: 'Browse normally — your downloads are automatically routed through our segmented engine.', icon: '🚀' },
            ].map((step, i) => (
              <div className="step-item" key={i}>
                <div className="step-number">{step.num}</div>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p className="body-md">{step.desc}</p>
                {i < 2 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== APP SHOWCASE ========== */}
      <section className="section showcase-section">
        <div className="bg-glow bg-glow-cyan showcase-glow"></div>
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">🖥️ App Preview</div>
            <h2 className="headline-lg">A Modern Download Experience</h2>
            <p>Built with Electron, powered by Node.js — a native app that feels right at home.</p>
          </div>

          <div className="showcase-wrapper fade-in-up">
            <div className="showcase-window">
              <div className="window-chrome">
                <div className="window-dots">
                  <span className="dot dot-close"></span>
                  <span className="dot dot-minimize"></span>
                  <span className="dot dot-expand"></span>
                </div>
                <span className="window-title">Smart Media Downloader — Dashboard</span>
              </div>
              <div className="showcase-body">
                <div className="showcase-sidebar">
                  <div className="showcase-sidebar-item active">
                    <span>📊</span> Dashboard
                  </div>
                  <div className="showcase-sidebar-item">
                    <span>📁</span> All Downloads
                  </div>
                  <div className="showcase-sidebar-item">
                    <span>🎬</span> Videos
                  </div>
                  <div className="showcase-sidebar-item">
                    <span>📅</span> Scheduled
                  </div>
                  <div className="showcase-sidebar-item">
                    <span>⚙️</span> Settings
                  </div>
                </div>
                <div className="showcase-main">
                  <div className="showcase-stats-row">
                    <div className="showcase-stat-card">
                      <span className="stat-label">Active Downloads</span>
                      <span className="stat-value">3</span>
                    </div>
                    <div className="showcase-stat-card">
                      <span className="stat-label">Total Downloaded</span>
                      <span className="stat-value">48.2 GB</span>
                    </div>
                    <div className="showcase-stat-card">
                      <span className="stat-label">Avg Speed</span>
                      <span className="stat-value">12.4 MB/s</span>
                    </div>
                  </div>
                  <div className="showcase-download-list">
                    <div className="showcase-dl-item">
                      <div className="showcase-dl-info">
                        <span className="showcase-dl-name">4K-Drone-Footage.mp4</span>
                        <span className="showcase-dl-meta">1.8 GB • 8 segments • 14.2 MB/s</span>
                      </div>
                      <div className="showcase-dl-progress">
                        <div className="mock-progress-track large">
                          <div className="mock-progress-fill animated" style={{ width: '67%' }}></div>
                        </div>
                        <span className="showcase-dl-pct">67%</span>
                      </div>
                    </div>
                    <div className="showcase-dl-item">
                      <div className="showcase-dl-info">
                        <span className="showcase-dl-name">React-Course-2026.zip</span>
                        <span className="showcase-dl-meta">3.2 GB • 16 segments • 18.7 MB/s</span>
                      </div>
                      <div className="showcase-dl-progress">
                        <div className="mock-progress-track large">
                          <div className="mock-progress-fill animated secondary" style={{ width: '34%' }}></div>
                        </div>
                        <span className="showcase-dl-pct">34%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Annotations */}
            <div className="annotation annotation-left">
              <span className="annotation-dot"></span>
              <span>Segmented Download Engine</span>
            </div>
            <div className="annotation annotation-right">
              <span className="annotation-dot"></span>
              <span>yt-dlp Video Extractor</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="section-header fade-in-up">
            <div className="section-badge">💬 User Feedback</div>
            <h2 className="headline-lg">What Users Are Saying</h2>
          </div>

          <div className="testimonials-grid fade-in-up">
            {[
              { name: 'Alex Rivera', role: 'Software Engineer', quote: 'Switched from IDM and never looked back. The segmented engine is genuinely faster, and the modern UI is a breath of fresh air.', avatar: 'AR' },
              { name: 'Samira Khan', role: 'Content Creator', quote: 'The yt-dlp integration is a game-changer. I can grab any video in the quality I want without juggling separate tools.', avatar: 'SK' },
              { name: 'Marcus Chen', role: 'System Administrator', quote: 'Finally a download manager that works on Linux. The crash recovery has saved me countless times on large file transfers.', avatar: 'MC' },
            ].map((t, i) => (
              <div className="testimonial-card glass-card fade-in-up" key={i} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="testimonial-quote">"{t.quote}"</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.avatar}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== DOWNLOAD CTA ========== */}
      <section className="section cta-section">
        <div className="bg-glow bg-glow-purple cta-glow-1"></div>
        <div className="bg-glow bg-glow-cyan cta-glow-2"></div>
        <div className="container">
          <div className="cta-card glass-card fade-in-up">
            <h2 className="headline-lg">Start Downloading Smarter Today</h2>
            <p className="body-lg">Get the desktop download engine for your platform and experience the difference.</p>
            <div className="cta-buttons">
              <Link to="/download" className="btn btn-primary btn-large">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Windows (.exe)
              </Link>
              <Link to="/download" className="btn btn-secondary btn-large">macOS (.dmg)</Link>
              <Link to="/download" className="btn btn-secondary btn-large">Linux (AppImage)</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
