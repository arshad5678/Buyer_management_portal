import { Link } from 'react-router-dom';
import './LandingPage.css';

/* ── SVG icon helpers ──────────────────────────────────────────────── */
function Icon({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Feature data ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    id: 'upload',
    title: 'Bulk File Upload',
    desc: 'Import hundreds of buyer records in seconds from your existing spreadsheets.',
    icon: (
      <Icon>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </Icon>
    ),
    items: ['CSV files', 'XLS & XLSX spreadsheets', 'Up to 5 MB per upload'],
  },
  {
    id: 'search',
    title: 'Instant Search',
    desc: 'Find any buyer by name, email, or mobile number across your entire database.',
    icon: (
      <Icon>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </Icon>
    ),
    items: ['Search by name, email, mobile', 'Case-insensitive matching', 'Real-time filtered results'],
  },
  {
    id: 'pagination',
    title: 'Smart Pagination',
    desc: 'Navigate thousands of records efficiently with configurable page sizes.',
    icon: (
      <Icon>
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </Icon>
    ),
    items: ['Configurable page size', 'Total record counts', 'Combine with search'],
  },
  {
    id: 'invoices',
    title: 'Invoice Tracking',
    desc: 'Keep a clear picture of total invoiced, paid, and outstanding amounts per buyer.',
    icon: (
      <Icon>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </Icon>
    ),
    items: ['Total invoice amount', 'Amount paid', 'Amount due'],
  },
  {
    id: 'secure',
    title: 'Secure & Private',
    desc: 'Your data is isolated per account. Only you can see your own buyer records.',
    icon: (
      <Icon>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </Icon>
    ),
    items: ['Per-user data isolation', 'JWT authentication', 'Hashed passwords & tokens'],
  },
  {
    id: 'validation',
    title: 'Data Validation',
    desc: 'Every imported row is validated and rejected with clear error messages on failure.',
    icon: (
      <Icon>
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </Icon>
    ),
    items: ['Required field checks', 'Email & mobile validation', 'Invoice mismatch detection'],
  },
];

/* ── Mock buyers for hero table ─────────────────────────────────────── */
const DEMO_BUYERS = [
  { name: 'Arshad Basha',   email: 'arshad@acme.com',  mobile: '98765 43210', invoice: '₹1,000', paid: '₹600',   due: '₹400',  status: 'due' },
  { name: 'Priya Sharma',   email: 'priya@beta.co',    mobile: '98765 43211', invoice: '₹2,500', paid: '₹2,500', due: '₹0',    status: 'paid' },
  { name: 'Rahul Gupta',    email: 'rahul@delta.in',   mobile: '98765 43212', invoice: '₹5,000', paid: '₹3,000', due: '₹2,000',status: 'due' },
  { name: 'Sneha Reddy',    email: 'sneha@echo.io',    mobile: '98765 43213', invoice: '₹1,500', paid: '₹1,500', due: '₹0',    status: 'paid' },
];

/* ─────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <main id="main-content">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container">
          <div className="hero__badge" aria-label="New release">
            <span className="hero__badge-dot" aria-hidden="true" />
            Buyer Management, Simplified
          </div>

          <h1 className="hero__title" id="hero-heading">
            Manage your buyers.<br />
            <span>Track every invoice.</span>
          </h1>

          <p className="hero__subtitle">
            Import buyer records from CSV or Excel, search instantly, and keep
            clear visibility over invoiced, paid, and outstanding amounts —
            all in one secure portal.
          </p>

          <div className="hero__actions">
            <Link
              to="/signup"
              className="btn btn-primary btn-lg"
              id="hero-signup-btn"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="btn btn-outline btn-lg"
              id="hero-signin-btn"
            >
              Sign In
            </Link>
          </div>

          {/* Mock browser window */}
          <div className="hero__visual" aria-hidden="true">
            <div className="hero__window" role="presentation">
              <div className="hero__window-bar">
                <span className="hero__window-dot" />
                <span className="hero__window-dot" />
                <span className="hero__window-dot" />
                <span className="hero__window-url" />
              </div>
              <div className="hero__table-wrap">
                <table className="hero__table">
                  <thead>
                    <tr>
                      <th>Buyer Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Invoice</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_BUYERS.map((b) => (
                      <tr key={b.email}>
                        <td>{b.name}</td>
                        <td>{b.email}</td>
                        <td>{b.mobile}</td>
                        <td>{b.invoice}</td>
                        <td>{b.paid}</td>
                        <td>{b.due}</td>
                        <td>
                          <span className={`hero__table-badge hero__table-badge--${b.status}`}>
                            {b.status === 'paid' ? 'Cleared' : 'Due'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────── */}
      <section className="stats" aria-label="Key metrics">
        <div className="container">
          <div className="stats__grid">
            <div className="stats__item">
              <p className="stats__number">CSV</p>
              <p className="stats__label">Import from CSV files</p>
            </div>
            <div className="stats__item">
              <p className="stats__number">XLS</p>
              <p className="stats__label">Import from Excel spreadsheets</p>
            </div>
            <div className="stats__item">
              <p className="stats__number">5 MB</p>
              <p className="stats__label">Max file size per upload</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="features section" aria-labelledby="features-heading">
        <div className="container">
          <div className="features__header">
            <p className="features__eyebrow">Features</p>
            <h2 className="features__title" id="features-heading">
              Everything you need to manage buyers
            </h2>
            <p className="features__subtitle">
              From bulk file imports to granular search and pagination, the
              portal handles the heavy lifting for you.
            </p>
          </div>

          <div className="features__grid" role="list">
            {FEATURES.map((f) => (
              <article
                key={f.id}
                className="feature-card"
                role="listitem"
                aria-labelledby={`feature-${f.id}`}
              >
                <div className="feature-card__icon" aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="feature-card__title" id={`feature-${f.id}`}>
                  {f.title}
                </h3>
                <p className="feature-card__desc">{f.desc}</p>
                <ul className="feature-card__list" role="list">
                  {f.items.map((item) => (
                    <li key={item} className="feature-card__list-item">
                      <span className="feature-card__check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="how section-sm" aria-labelledby="how-heading">
        <div className="container">
          <div className="how__header">
            <p className="features__eyebrow">How it works</p>
            <h2 className="features__title" id="how-heading">
              Up and running in minutes
            </h2>
          </div>

          <div className="how__steps">
            {[
              {
                n: '1',
                title: 'Create your account',
                desc: 'Register with your email and a secure password. Your data is isolated and private.',
              },
              {
                n: '2',
                title: 'Upload your buyer file',
                desc: 'Drag and drop a CSV or Excel file. The portal validates every row before import.',
              },
              {
                n: '3',
                title: 'Search and manage',
                desc: 'Use the buyer list to search, paginate, and track invoices across all your records.',
              },
            ].map((step) => (
              <div key={step.n} className="how-step">
                <div className="how-step__num" aria-hidden="true">{step.n}</div>
                <h3 className="how-step__title">{step.title}</h3>
                <p className="how-step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="cta section" aria-labelledby="cta-heading">
        <div className="container">
          <div className="cta__inner">
            <div className="cta__content">
              <h2 className="cta__title" id="cta-heading">
                Ready to take control of your buyer data?
              </h2>
              <p className="cta__subtitle">
                Sign up today — no credit card required — and import your first
                buyer file in under two minutes.
              </p>
              <div className="cta__actions">
                <Link
                  to="/signup"
                  className="btn btn-white btn-lg"
                  id="cta-signup-btn"
                >
                  Start for free
                </Link>
                <Link
                  to="/login"
                  className="btn btn-white-outline btn-lg"
                  id="cta-signin-btn"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
