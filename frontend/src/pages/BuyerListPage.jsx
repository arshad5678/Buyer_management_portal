import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getBuyers } from '../api/buyers.js';
import './BuyerListPage.css';

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

export default function BuyerListPage() {
  const [buyers, setBuyers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 0,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearch(searchInput.trim());
      setPage(1); // Reset to page 1 on new search query
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch buyers from backend API
  const fetchBuyerList = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getBuyers({
        page,
        limit,
        search: activeSearch,
      });

      const data = response?.data || {};
      setBuyers(data.buyers || []);
      setPagination(data.pagination || {
        page: 1,
        limit,
        totalRecords: 0,
        totalPages: 0,
      });
    } catch (err) {
      console.error('Error fetching buyers:', err);
      setError(err?.response?.data?.message || 'Failed to fetch buyer records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, activeSearch]);

  useEffect(() => {
    fetchBuyerList();
  }, [fetchBuyerList]);

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setPage(1); // Reset to page 1 on page size change
  };

  const { totalRecords, totalPages } = pagination;

  // Compute pagination range display: e.g. "Showing 1–10 of 25"
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalRecords);

  return (
    <main className="buyer-list-page" id="main-content">
      <div className="container">
        {/* Header */}
        <section className="buyer-list-header" aria-labelledby="buyer-directory-heading">
          <div>
            <p className="buyer-list-header__brand-sub">Buyer Management Portal</p>
            <h1 className="buyer-list-header__title" id="buyer-directory-heading">
              Buyer Directory
            </h1>
            <p className="buyer-list-header__desc">
              Search, filter, and review all imported buyer records with real-time
              invoice amounts, payments, and outstanding balances.
            </p>
          </div>

          <div className="buyer-list-header__actions">
            <Link to="/upload" className="btn btn-primary btn-sm" id="buyer-list-upload-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }} aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Buyers
            </Link>
            <Link to="/dashboard" className="btn btn-outline btn-sm">
              ← Dashboard
            </Link>
          </div>
        </section>

        {/* Portal Navigation Tabs */}
        <nav className="dashboard-nav-tabs" aria-label="Portal Navigation Tabs">
          <Link to="/dashboard" className="dashboard-nav-tab">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </Link>
          <Link to="/buyers" className="dashboard-nav-tab active" aria-current="page">
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
          <Link to="/upload" className="dashboard-nav-tab">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Buyers
          </Link>
        </nav>

        {/* Error Banner */}
        {error && (
          <div className="buyer-error-banner" role="alert">
            <div>
              <strong>Error loading directory:</strong> {error}
            </div>
            <button type="button" onClick={fetchBuyerList}>
              Retry
            </button>
          </div>
        )}

        {/* Toolbar: Search input, Records count, Page-size selector */}
        <section className="buyer-toolbar" aria-label="Buyer Directory Filters">
          <div className="buyer-toolbar__search-wrap">
            <svg className="buyer-toolbar__search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="buyer-search-input"
              className="buyer-toolbar__input"
              placeholder="Search by buyer name, email, or mobile…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search buyer directory"
            />
            {searchInput && (
              <button
                type="button"
                className="buyer-toolbar__clear-btn"
                onClick={handleClearSearch}
                aria-label="Clear search query"
              >
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="buyer-toolbar__meta">
            <div className="buyer-toolbar__count">
              {totalRecords > 0 ? (
                <>
                  Showing <strong>{startRecord}–{endRecord}</strong> of <strong>{totalRecords}</strong> buyers
                </>
              ) : (
                '0 buyers found'
              )}
            </div>

            <div className="buyer-toolbar__limit-wrap">
              <label htmlFor="per-page-select">Per page:</label>
              <select
                id="per-page-select"
                className="buyer-toolbar__select"
                value={limit}
                onChange={handleLimitChange}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </section>

        {/* Table Card */}
        <div className="buyer-table-card">
          {isLoading ? (
            <div className="buyer-table-container" aria-busy="true" aria-label="Loading buyer directory">
              <table className="buyer-table">
                <thead>
                  <tr>
                    <th>Buyer Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th>Invoiced</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} style={{ padding: '8px 24px' }}>
                        <div className="skeleton-row" style={{ borderRadius: 'var(--radius-sm)' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : totalRecords === 0 ? (
            /* Empty States */
            activeSearch ? (
              /* Case A: Search returned 0 matches */
              <div className="buyer-empty-state" role="status">
                <div className="buyer-empty-state__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
                <h2 className="buyer-empty-state__title">No matching buyers found</h2>
                <p className="buyer-empty-state__desc">
                  No records matched your search query <strong>&quot;{activeSearch}&quot;</strong>.
                  Try searching with a different name, email, or mobile number.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleClearSearch}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              /* Case B: Account has zero buyers in total */
              <div className="buyer-empty-state" role="status">
                <div className="buyer-empty-state__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <h2 className="buyer-empty-state__title">Your directory is empty</h2>
                <p className="buyer-empty-state__desc">
                  You haven&apos;t added any buyers yet. Upload a CSV or Excel spreadsheet
                  to populate your directory and track invoice balances automatically.
                </p>
                <Link to="/upload" className="btn btn-primary" id="empty-directory-upload-btn">
                  Upload your first buyer file
                </Link>
              </div>
            )
          ) : (
            /* Data Table */
            <div className="buyer-table-container">
              <table className="buyer-table" aria-label="Buyer Records Table">
                <thead>
                  <tr>
                    <th>Buyer Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th>Invoiced</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b) => {
                    const dueNum = Number(b.total_amount_due) || 0;
                    const isFullyPaid = dueNum <= 0;

                    return (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.name}</strong>
                        </td>
                        <td>{b.email || '—'}</td>
                        <td>{b.mobile || '—'}</td>
                        <td>
                          <div className="buyer-table__address" title={b.address || ''}>
                            {b.address || '—'}
                          </div>
                        </td>
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
          )}

          {/* Pagination Footer */}
          {!isLoading && totalRecords > 0 && (
            <footer className="buyer-pagination" aria-label="Buyer Directory Pagination">
              <div className="buyer-pagination__info">
                Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> ({totalRecords} total records)
              </div>

              <div className="buyer-pagination__controls">
                <button
                  type="button"
                  className="btn-page"
                  id="buyer-pagination-prev"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  aria-label="Go to previous page"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>

                <span className="buyer-pagination__current" aria-current="page">
                  {page} / {totalPages || 1}
                </span>

                <button
                  type="button"
                  className="btn-page"
                  id="buyer-pagination-next"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || totalPages === 0 || isLoading}
                  aria-label="Go to next page"
                >
                  Next
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </footer>
          )}
        </div>
      </div>
    </main>
  );
}
