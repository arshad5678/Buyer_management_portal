import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { uploadBuyers } from '../api/buyers.js';
import './UploadPage.css';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function UploadPage() {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { success: true, data } | { success: false, message, errors }
  const [clientError, setClientError] = useState('');

  // Validate file selection against extension and 5 MB limit
  const validateFile = (file) => {
    if (!file) return false;

    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setClientError('Unsupported file type. Only CSV, XLS, and XLSX spreadsheets are supported.');
      setSelectedFile(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(`File size exceeds 5 MB limit (${formatFileSize(file.size)}). Please choose a smaller file.`);
      setSelectedFile(null);
      return false;
    }

    setClientError('');
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setClientError('');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadResult(null);
    setClientError('');

    try {
      const response = await uploadBuyers(selectedFile);
      setUploadResult({
        success: true,
        message: response.message || 'Buyer data imported successfully',
        data: response.data,
      });
      // Clear file selection after successful import
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('File upload error:', err);
      const serverMessage = err?.response?.data?.message || 'Failed to upload and import buyer file.';
      const rowErrors = err?.response?.data?.errors || [];

      setUploadResult({
        success: false,
        message: serverMessage,
        errors: Array.isArray(rowErrors) ? rowErrors : [],
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="upload-page" id="main-content">
      <div className="container">
        {/* Header */}
        <section className="upload-header" aria-labelledby="upload-heading">
          <div>
            <p className="upload-header__brand-sub">Buyer Management Portal</p>
            <h1 className="upload-header__title" id="upload-heading">
              Upload Buyers
            </h1>
            <p className="upload-header__desc">
              Import multiple buyer records simultaneously by uploading a spreadsheet.
              Data is atomically validated before persisting to your account.
            </p>
          </div>

          <div>
            <Link to="/dashboard" className="btn btn-outline btn-sm" id="upload-back-btn">
              ← Back to Dashboard
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
          <Link to="/buyers" className="dashboard-nav-tab" id="upload-tab-buyers">
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
          <Link to="/upload" className="dashboard-nav-tab active" aria-current="page">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Buyers
          </Link>
        </nav>

        {/* Main Content Grid */}
        <div className="upload-grid">
          {/* Left Column: Upload Form & Dropzone */}
          <div className="upload-card">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              id="file-upload-input"
              name="file"
              accept=".csv, .xls, .xlsx, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {/* Drag and Drop Zone */}
            <div
              className={`dropzone${isDragging ? ' drag-active' : ''}${isUploading ? ' disabled' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Upload file area. Drag and drop file or press to browse."
            >
              <div className="dropzone__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <h2 className="dropzone__title">
                Drag and drop your spreadsheet here
              </h2>
              <p className="dropzone__subtitle">
                or click anywhere in this box to browse from your device
              </p>

              <div className="dropzone__badge-group">
                <span className="dropzone__badge">.CSV</span>
                <span className="dropzone__badge">.XLS</span>
                <span className="dropzone__badge">.XLSX</span>
              </div>

              <p className="dropzone__limit">Maximum file size: 5 MB</p>
            </div>

            {/* Client-side Error Message */}
            {clientError && (
              <div className="upload-result upload-result--error" role="alert" style={{ marginTop: 'var(--space-4)' }}>
                <div className="upload-result__header">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <h3 className="upload-result__title">File selection error</h3>
                    <p className="upload-result__msg">{clientError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Selected File Details */}
            {selectedFile && (
              <div className="selected-file" aria-live="polite">
                <div className="selected-file__info">
                  <div className="selected-file__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="selected-file__meta">
                    <p className="selected-file__name" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="selected-file__size">
                      {formatFileSize(selectedFile.size)} · Ready to upload
                    </p>
                  </div>
                </div>

                <div className="selected-file__actions">
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                    aria-label="Remove selected file"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {selectedFile && (
              <div className="upload-submit-wrap">
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  className="btn-upload"
                  id="submit-buyer-upload-btn"
                  disabled={isUploading}
                  aria-busy={isUploading}
                >
                  {isUploading && (
                    <span className="auth-spinner" aria-hidden="true" />
                  )}
                  {isUploading ? 'Uploading and validating…' : 'Upload & Import Buyers'}
                </button>
              </div>
            )}

            {/* Server Success Result */}
            {uploadResult?.success && (
              <div className="upload-result upload-result--success" role="status" aria-live="polite">
                <div className="upload-result__header">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <h3 className="upload-result__title">Import Completed!</h3>
                    <p className="upload-result__msg">
                      {uploadResult.message}. Successfully inserted{' '}
                      <strong>{uploadResult.data?.insertedRows || uploadResult.data?.totalRows}</strong> buyer records.
                    </p>
                  </div>
                </div>

                <div className="upload-result__actions">
                  <Link to="/buyers" className="btn btn-primary btn-sm" id="upload-success-view-buyers">
                    View Buyer List
                  </Link>
                  <Link to="/dashboard" className="btn btn-outline btn-sm">
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setUploadResult(null);
                      setSelectedFile(null);
                    }}
                  >
                    Upload Another File
                  </button>
                </div>
              </div>
            )}

            {/* Server Error Result */}
            {uploadResult && !uploadResult.success && (
              <div className="upload-result upload-result--error" role="alert">
                <div className="upload-result__header">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <h3 className="upload-result__title">Import Failed</h3>
                    <p className="upload-result__msg">{uploadResult.message}</p>
                  </div>
                </div>

                {/* Detailed Row-Level Errors Table */}
                {uploadResult.errors?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '6px' }}>
                      Row-level validation errors ({uploadResult.errors.length} issues found):
                    </p>
                    <div className="error-table-wrap">
                      <table className="error-table" aria-label="Upload row errors">
                        <thead>
                          <tr>
                            <th style={{ width: '70px' }}>Row</th>
                            <th style={{ width: '120px' }}>Field</th>
                            <th>Issue Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.errors.map((err, idx) => (
                            <tr key={idx}>
                              <td><strong>Row {err.row || '—'}</strong></td>
                              <td><code>{err.field || 'general'}</code></td>
                              <td>{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="upload-result__actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setUploadResult(null)}
                  >
                    Dismiss Error
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: File Guidelines & Column Mappings */}
          <aside className="info-card" aria-labelledby="instructions-heading">
            <h2 className="info-card__title" id="instructions-heading">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Upload Guidelines
            </h2>

            <div className="info-list">
              <div className="info-item">
                <span className="info-item__bullet" />
                <div className="info-item__text">
                  <strong>Supported Extensions:</strong> <code>.csv</code>, <code>.xls</code>, <code>.xlsx</code> up to <strong>5 MB</strong> in size.
                </div>
              </div>

              <div className="info-item">
                <span className="info-item__bullet" />
                <div className="info-item__text">
                  <strong>Atomic Transaction:</strong> If any single row has invalid data, the entire batch is rejected so your database remains consistent.
                </div>
              </div>

              <div className="info-item">
                <span className="info-item__bullet" />
                <div className="info-item__text">
                  <strong>Monetary Consistency:</strong> The formula <code>Total Invoice = Total Paid + Total Due</code> must balance for each buyer row.
                </div>
              </div>

              <div className="info-item">
                <span className="info-item__bullet" />
                <div className="info-item__text">
                  <strong>Header Flexibility:</strong> Column names are case-insensitive and allow variations (e.g. <code>Customer Name</code> or <code>Buyer Name</code>).
                </div>
              </div>
            </div>

            <div className="info-table-hint">
              <p className="info-table-hint__title">Expected Spreadsheet Headers</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--font-size-xs)' }}>
                <div><strong>Name:</strong> <code>Required</code> (max 150 chars)</div>
                <div><strong>Email:</strong> <code>Optional</code> (valid email format)</div>
                <div><strong>Mobile:</strong> <code>Optional</code> (10-digit Indian number)</div>
                <div><strong>Address:</strong> <code>Optional</code> (free text)</div>
                <div><strong>Total Invoice Amount:</strong> <code>Optional</code> (numeric, &ge; 0)</div>
                <div><strong>Total Amount Paid:</strong> <code>Optional</code> (numeric, &ge; 0)</div>
                <div><strong>Total Amount Due:</strong> <code>Optional</code> (numeric, &ge; 0)</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
