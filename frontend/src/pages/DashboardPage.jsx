import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getBuyers } from '../api/buyers.js';
import './DashboardPage.css';

// Currency formatter for Indian Rupees
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function formatINR(val) {
  const num = Number(val);
  return isNaN(num) ? '₹0.00' : currencyFormatter.format(num);
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBuyers: 0,
    totalInvoice: 0,
    totalPaid: 0,
    totalDue: 0,
    recentBuyers: [],
    isTruncatedSample: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch up to 100 records for client aggregation from actual buyer data
      const response = await getBuyers({ page: 1, limit: 100 });
      const buyers = response?.data?.buyers || [];
      const pagination = response?.data?.pagination || {};

      const totalRecords = pagination.totalRecords || 0;

      // Calculate totals accurately across loaded records
      let invoiceSum = 0;
      let paidSum = 0;
      let dueSum = 0;

      buyers.forEach((b) => {
        invoiceSum += Number(b.total_invoice_amount) || 0;
        paidSum += Number(b.total_amount_paid) || 0;
        dueSum += Number(b.total_amount_due) || 0;
      });

      setStats({
        totalBuyers: totalRecords,
        totalInvoice: invoiceSum,
        totalPaid: paidSum,
        totalDue: dueSum,
        recentBuyers: buyers.slice(0, 5),
        isTruncatedSample: totalRecords > 100,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.response?.data?.message || 'Failed to fetch buyer statistics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <main className="dashboard-page" id="main-content">
      <div className="container">
        {/* Top Header / Welcome Banner */}
        <section className="dashboard-header" aria-labelledby="dashboard-welcome-heading">
          <div>
            <p className="dashboard-header__brand-sub">Buyer Management Portal</p>
            <h1 className="dashboard-header__title" id="dashboard-welcome-heading">
              Welcome back, {user?.name || 'Portal User'}
            </h1>
            <div className="dashboard-header__meta">
              <span className="dashboard-header__badge">
                <span className="dashboard-header__badge-dot" aria-hidden="true" />
                Active Session
              </span>
              {user?.email && <span>Email: <strong>{user.email}</strong></span>}
              {user?.mobile && <span>Mobile: <strong>{user.mobile}</strong></span>}
            </div>
          </div>

          <div className="dashboard-header__actions">
            <Link to="/upload" className="btn btn-primary btn-sm" id="dashboard-header-upload-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }} aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Buyers
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline btn-sm"
              id="dashboard-logout-btn"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* Sub Navigation Tabs */}
        <nav className="dashboard-nav-tabs" aria-label="Portal Navigation Tabs">
          <Link to="/dashboard" className="dashboard-nav-tab active" aria-current="page">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </Link>
          <Link to="/buyers" className="dashboard-nav-tab" id="dashboard-tab-buyers">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Buyer List
          </Link>
          <Link to="/upload" className="dashboard-nav-tab" id="dashboard-tab-upload">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Buyers
          </Link>
        </nav>

        {/* Error State Banner */}
        {error && (
          <div className="dashboard-error" role="alert">
            <div>
              <strong>Error loading data: </strong> {error}
            </div>
            <button type="button" onClick={fetchDashboardData}>
              Retry
            </button>
          </div>
        )}

        {/* Metric Overview Cards */}
        {isLoading ? (
          <div className="dashboard-metrics" aria-busy="true" aria-label="Loading dashboard metrics">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : (
          <section className="dashboard-metrics" aria-label="Account Overview Metrics">
            {/* 1. Total Buyers */}
            <article className="metric-card metric-card--buyers">
              <div className="metric-card__header">
                <span className="metric-card__label">Total Buyers</span>
                <span className="metric-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
              </div>
              <p className="metric-card__value">{stats.totalBuyers}</p>
              <p className="metric-card__note">Verified records in database</p>
            </article>

            {/* 2. Total Invoiced */}
            <article className="metric-card metric-card--invoice">
              <div className="metric-card__header">
                <span className="metric-card__label">Invoice Amount</span>
                <span className="metric-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </span>
              </div>
              <p className="metric-card__value">{formatINR(stats.totalInvoice)}</p>
              <p className="metric-card__note">
                {stats.isTruncatedSample ? 'Based on latest 100 records' : 'Total invoiced sum'}
              </p>
            </article>

            {/* 3. Amount Paid */}
            <article className="metric-card metric-card--paid">
              <div className="metric-card__header">
                <span className="metric-card__label">Amount Paid</span>
                <span className="metric-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
              </div>
              <p className="metric-card__value">{formatINR(stats.totalPaid)}</p>
              <p className="metric-card__note">Cleared buyer payments</p>
            </article>

            {/* 4. Amount Due */}
            <article className="metric-card metric-card--due">
              <div className="metric-card__header">
                <span className="metric-card__label">Amount Due</span>
                <span className="metric-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
              </div>
              <p className="metric-card__value">{formatINR(stats.totalDue)}</p>
              <p className="metric-card__note">Outstanding balance to collect</p>
            </article>
          </section>
        )}

        {/* Quick Action Shortcuts */}
        <section className="dashboard-actions-grid" aria-label="Quick Actions">
          <Link to="/upload" className="action-card" id="action-upload-buyers">
            <div className="action-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="action-card__content">
              <h3>Upload Buyer File <span>→</span></h3>
              <p>Import buyer spreadsheets in CSV, XLS, or XLSX format up to 5 MB with atomic row validation.</p>
            </div>
          </Link>

          <Link to="/buyers" className="action-card" id="action-view-buyers">
            <div className="action-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </div>
            <div className="action-card__content">
              <h3>View Buyer Directory <span>→</span></h3>
              <p>Search by name, email, or mobile, inspect invoice balances, and navigate with pagination.</p>
            </div>
          </Link>
        </section>

        {/* Data View: Either Empty State or Recent Buyers Preview */}
        {!isLoading && stats.totalBuyers === 0 && (
          <div className="dashboard-section">
            <div className="dashboard-empty">
              <div className="dashboard-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h2 className="dashboard-empty__title">No buyers added yet</h2>
              <p className="dashboard-empty__desc">
                Your buyer directory is currently empty. Upload your first CSV or Excel spreadsheet
                to automatically compute invoice statistics and manage your clients.
              </p>
              <Link to="/upload" className="btn btn-primary" id="dashboard-empty-upload-btn">
                Upload your first buyer file
              </Link>
            </div>
          </div>
        )}

        {!isLoading && stats.totalBuyers > 0 && (
          <section className="dashboard-section" aria-labelledby="recent-buyers-heading">
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title" id="recent-buyers-heading">
                Recent Buyers (Preview)
              </h2>
              <Link to="/buyers" className="dashboard-section__link">
                View all ({stats.totalBuyers}) buyers →
              </Link>
            </div>
            <div className="table-responsive">
              <table className="data-table" aria-label="Recent Buyers Table">
                <thead>
                  <tr>
                    <th>Buyer Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Invoiced</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBuyers.map((b) => {
                    const dueNum = Number(b.total_amount_due) || 0;
                    const isFullyPaid = dueNum === 0;
                    return (
                      <tr key={b.id}>
                        <td><strong>{b.name}</strong></td>
                        <td>{b.email || '—'}</td>
                        <td>{b.mobile || '—'}</td>
                        <td>{formatINR(b.total_invoice_amount)}</td>
                        <td>{formatINR(b.total_amount_paid)}</td>
                        <td>{formatINR(b.total_amount_due)}</td>
                        <td>
                          <span
                            className={`status-pill status-pill--${isFullyPaid ? 'paid' : 'due'}`}
                          >
                            {isFullyPaid ? 'Cleared' : 'Due'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
