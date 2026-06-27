import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="gradient-divider"></div>
      <div className="footer-content container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="logo-icon">⚡</span>
              <span>SmartDownloader</span>
            </Link>
            <p className="footer-tagline">
              High-speed segmented download engine. Free, open-source, and built for power users.
            </p>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link to="/">Features</Link></li>
              <li><Link to="/download">Download</Link></li>
              <li><Link to="/docs">Documentation</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><Link to="/docs">Quick Start</Link></li>
              <li><Link to="/docs">FAQ</Link></li>
              <li><a href="https://github.com/Farhan-176/Smart-Media-Downloader" target="_blank" rel="noopener noreferrer">Source Code</a></li>
              <li><a href="https://github.com/Farhan-176/Smart-Media-Downloader/releases" target="_blank" rel="noopener noreferrer">Changelog</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Community</h4>
            <ul>
              <li><a href="https://github.com/Farhan-176/Smart-Media-Downloader/issues" target="_blank" rel="noopener noreferrer">Report a Bug</a></li>
              <li><a href="https://github.com/Farhan-176/Smart-Media-Downloader" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://github.com/Farhan-176/Smart-Media-Downloader/discussions" target="_blank" rel="noopener noreferrer">Discussions</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Smart Media Downloader. Open source under MIT License.</p>
        </div>
      </div>
    </footer>
  )
}
