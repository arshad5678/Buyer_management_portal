import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { registerUser } from '../api/auth.js';
import './AuthPages.css';

/* ── Small reusable components ────────────────────────────────────── */

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <span className="auth-error" id={id} role="alert">
      {message}
    </span>
  );
}

function Banner({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`auth-banner auth-banner--${type}`} role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {isError ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        ) : (
          <polyline points="20 6 9 17 4 12" />
        )}
      </svg>
      {message}
    </div>
  );
}

/* ── Validation helpers (mirror backend rules exactly) ────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts 10-digit Indian mobile starting with 6-9, optionally prefixed with +91 / 91 / 0
const MOBILE_NORMALIZE_RE = /^(?:\+91|91|0)?([6-9]\d{9})$/;
// Password: ≥8 chars, upper, lower, digit, special
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]:;"'<>,.?/\\|`~])/;

function validateSignup({ name, email, mobile, password, confirmPassword }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = 'Full name is required';
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.name = 'Name must be between 2 and 100 characters';
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  const mobileMatch = MOBILE_NORMALIZE_RE.exec(mobile.trim().replace(/[\s-]/g, ''));
  if (!mobile.trim()) {
    errors.mobile = 'Mobile number is required';
  } else if (!mobileMatch) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  } else if (!PASSWORD_RE.test(password)) {
    errors.password =
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/* ── SignUp page ──────────────────────────────────────────────────── */

export default function SignUpPage() {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();

  const [fields, setFields] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isInitializing && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isInitializing, navigate]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [serverError, setServerError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear the field error as the user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const errors = validateSignup(fields);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus the first errored field
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(`signup-${firstErrorField}`)?.focus();
      return;
    }

    setStatus('loading');

    // Normalise mobile: strip prefix, keep 10 digits
    const mobileMatch = MOBILE_NORMALIZE_RE.exec(
      fields.mobile.trim().replace(/[\s-]/g, '')
    );
    const normalisedMobile = mobileMatch ? mobileMatch[1] : fields.mobile.trim();

    try {
      await registerUser({
        name: fields.name.trim(),
        email: fields.email.trim().toLowerCase(),
        mobile: normalisedMobile,
        password: fields.password,
        // confirmPassword is never sent to the backend
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      const msg =
        err?.response?.data?.message ||
        'Registration failed. Please try again.';
      setServerError(msg);

      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const backendFieldErrors = {};
        err.response.data.errors.forEach((e) => {
          if (e.field) backendFieldErrors[e.field] = e.message;
        });
        setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
      } else if (msg.toLowerCase().includes('email')) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      } else if (msg.toLowerCase().includes('mobile')) {
        setFieldErrors((prev) => ({ ...prev, mobile: msg }));
      }
    }
  }

  /* ── Success view ── */
  if (status === 'success') {
    return (
      <main className="auth-page" id="main-content">
        <div className="auth-card">
          <div className="auth-success">
            <div className="auth-success__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="auth-success__title">Account created!</h1>
            <p className="auth-success__body">
              Welcome to BuyerPortal. Your account has been registered
              successfully. You can now sign in to start managing your buyers.
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" id="goto-login-btn" style={{ width: '100%', justifyContent: 'center' }}>
              Sign In to your account
            </Link>
            <div className="auth-card__footer" style={{ marginTop: 'var(--space-4)' }}>
              <Link to="/">← Back to Home</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Form view ── */
  return (
    <main className="auth-page" id="main-content">
      <div className="auth-card">
        {/* Icon */}
        <div className="auth-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <h1 className="auth-card__title">Create your account</h1>
        <p className="auth-card__subtitle">
          Already have an account?{' '}
          <Link to="/login" id="signup-to-login-link">Sign in</Link>
        </p>

        {/* Global error banner */}
        <Banner type="error" message={serverError} />

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Registration form"
        >
          {/* Full name */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-name">
              Full name <abbr title="required">*</abbr>
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              className={`auth-input${fieldErrors.name ? ' error' : ''}`}
              placeholder="Arshad Basha"
              value={fields.name}
              onChange={handleChange}
              aria-required="true"
              aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
              aria-invalid={!!fieldErrors.name}
            />
            <FieldError message={fieldErrors.name} id="signup-name-error" />
          </div>

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-email">
              Email address <abbr title="required">*</abbr>
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              className={`auth-input${fieldErrors.email ? ' error' : ''}`}
              placeholder="arshad@example.com"
              value={fields.email}
              onChange={handleChange}
              aria-required="true"
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
            />
            <FieldError message={fieldErrors.email} id="signup-email-error" />
          </div>

          {/* Mobile */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-mobile">
              Mobile number <abbr title="required">*</abbr>
            </label>
            <input
              id="signup-mobile"
              name="mobile"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              className={`auth-input${fieldErrors.mobile ? ' error' : ''}`}
              placeholder="9876543210"
              value={fields.mobile}
              onChange={handleChange}
              aria-required="true"
              aria-describedby={fieldErrors.mobile ? 'signup-mobile-error' : 'signup-mobile-hint'}
              aria-invalid={!!fieldErrors.mobile}
            />
            {!fieldErrors.mobile && (
              <span id="signup-mobile-hint" className="auth-error" style={{ color: 'var(--color-text-muted)' }}>
                Indian mobile number, 10 digits (6–9 start)
              </span>
            )}
            <FieldError message={fieldErrors.mobile} id="signup-mobile-error" />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-password">
              Password <abbr title="required">*</abbr>
            </label>
            <div className="auth-input-wrap">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`auth-input auth-input--with-toggle${fieldErrors.password ? ' error' : ''}`}
                placeholder="Min 8 chars, upper, lower, digit, symbol"
                value={fields.password}
                onChange={handleChange}
                aria-required="true"
                aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                className="auth-toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={0}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            <FieldError message={fieldErrors.password} id="signup-password-error" />
          </div>

          {/* Confirm password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-confirmPassword">
              Confirm password <abbr title="required">*</abbr>
            </label>
            <div className="auth-input-wrap">
              <input
                id="signup-confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`auth-input auth-input--with-toggle${fieldErrors.confirmPassword ? ' error' : ''}`}
                placeholder="Re-enter your password"
                value={fields.confirmPassword}
                onChange={handleChange}
                aria-required="true"
                aria-describedby={fieldErrors.confirmPassword ? 'signup-confirm-error' : undefined}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <button
                type="button"
                className="auth-toggle-btn"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={0}
              >
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            <FieldError message={fieldErrors.confirmPassword} id="signup-confirm-error" />
          </div>

          {/* Submit */}
          <button
            id="signup-submit-btn"
            type="submit"
            className="auth-submit"
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' && (
              <span className="auth-spinner" aria-hidden="true" />
            )}
            {status === 'loading' ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-card__footer">
          <Link to="/">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
