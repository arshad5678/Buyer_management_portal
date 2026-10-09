import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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
  return (
    <div className={`auth-banner auth-banner--${type}`} role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

/* ── Login page ───────────────────────────────────────────────────── */

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isInitializing } = useAuth();

  const [fields, setFields] = useState({ identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [serverError, setServerError] = useState('');

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (!isInitializing && user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, isInitializing, navigate, location.state]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  }

  function validate() {
    const errors = {};
    if (!fields.identifier.trim()) {
      errors.identifier = 'Email or mobile number is required';
    }
    if (!fields.password) {
      errors.password = 'Password is required';
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      document.getElementById(`login-${Object.keys(errors)[0]}`)?.focus();
      return;
    }

    setStatus('loading');

    try {
      await login({
        identifier: fields.identifier.trim(),
        password: fields.password,
      });

      // Redirect to requested page or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setStatus('error');
      const msg =
        err?.response?.data?.message ||
        'Login failed. Please check your credentials and try again.';
      setServerError(msg);
    }
  }

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-card">
        {/* Icon */}
        <div className="auth-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="auth-card__title">Sign in to BuyerPortal</h1>
        <p className="auth-card__subtitle">
          Don&apos;t have an account?{' '}
          <Link to="/signup" id="login-to-signup-link">Create one</Link>
        </p>

        {/* Global error banner */}
        <Banner type="error" message={serverError} />

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Login form"
        >
          {/* Identifier */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-identifier">
              Email or mobile <abbr title="required">*</abbr>
            </label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              inputMode="email"
              className={`auth-input${fieldErrors.identifier ? ' error' : ''}`}
              placeholder="arshad@example.com or 9876543210"
              value={fields.identifier}
              onChange={handleChange}
              aria-required="true"
              aria-describedby={fieldErrors.identifier ? 'login-identifier-error' : undefined}
              aria-invalid={!!fieldErrors.identifier}
            />
            <FieldError message={fieldErrors.identifier} id="login-identifier-error" />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">
              Password <abbr title="required">*</abbr>
            </label>
            <div className="auth-input-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`auth-input auth-input--with-toggle${fieldErrors.password ? ' error' : ''}`}
                placeholder="Your password"
                value={fields.password}
                onChange={handleChange}
                aria-required="true"
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
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
            <FieldError message={fieldErrors.password} id="login-password-error" />
          </div>

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            className="auth-submit"
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' && (
              <span className="auth-spinner" aria-hidden="true" />
            )}
            {status === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-card__footer">
          <Link to="/">← Back to Home</Link>
          <span className="separator">·</span>
          <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </main>
  );
}
