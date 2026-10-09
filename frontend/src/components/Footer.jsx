import { Link } from 'react-router-dom';
import './Footer.css';

const year = new Date().getFullYear();

/**
 * Site-wide footer with brand info and navigation columns.
 */
export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label="BuyerPortal home">
              <span className="footer__logo-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </span>
              <span className="footer__logo-text">BuyerPortal</span>
            </Link>
            <p className="footer__tagline">
              Centralise your buyer records, import files in seconds, and gain
              clarity on invoices and outstanding balances.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="footer__col-title">Product</p>
            <ul className="footer__col-links" role="list">
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/upload">Upload Buyers</Link></li>
              <li><Link to="/buyers">Buyer List</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="footer__col-title">Account</p>
            <ul className="footer__col-links" role="list">
              <li><Link to="/signup">Sign Up</Link></li>
              <li><Link to="/login">Sign In</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="footer__col-title">Support</p>
            <ul className="footer__col-links" role="list">
              <li><a href="mailto:support@buyerportal.example.com">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">
            &copy; {year} BuyerPortal. All rights reserved.
          </p>
          <nav className="footer__bottom-links" aria-label="Legal navigation">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
