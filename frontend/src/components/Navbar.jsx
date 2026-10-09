import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Navbar.css';

/**
 * Responsive top navigation bar.
 * Desktop: logo + nav links + auth buttons / user profile & logout
 * Mobile:  logo + hamburger → slide-down drawer
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/',          label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/buyers',    label: 'Buyers' },
    { to: '/upload',    label: 'Upload' },
  ];

  return (
    <header className="navbar" role="banner">
      <div className="container">
        <nav className="navbar__inner" aria-label="Main navigation">
          {/* Logo */}
          <Link to="/" className="navbar__logo" onClick={closeMenu} aria-label="Buyer Management Portal home">
            <span className="navbar__logo-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            </span>
            <span className="navbar__logo-text">BuyerPortal</span>
          </Link>

          {/* Desktop links */}
          <ul className="navbar__links" role="list">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `navbar__link${isActive ? ' active' : ''}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Desktop auth */}
          <div className="navbar__auth">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-700)',
                    maxWidth: '140px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={user.email}
                >
                  {user.name || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                  id="nav-logout-btn"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" id="nav-signin-btn">
                  Sign In
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm" id="nav-signup-btn">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`navbar__menu-btn${menuOpen ? ' open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            onClick={() => setMenuOpen((o) => !o)}
            id="hamburger-btn"
          >
            <span />
            <span />
            <span />
          </button>
        </nav>

        {/* Mobile drawer */}
        <div
          id="mobile-drawer"
          className={`navbar__drawer${menuOpen ? ' open' : ''}`}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <ul role="list">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `navbar__link${isActive ? ' active' : ''}`
                  }
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="navbar__drawer-auth">
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Signed in as <strong>{user.name || user.email}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-outline"
                  id="mobile-logout-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost" onClick={closeMenu} id="mobile-signin-btn">
                  Sign In
                </Link>
                <Link to="/signup" className="btn btn-primary" onClick={closeMenu} id="mobile-signup-btn">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
