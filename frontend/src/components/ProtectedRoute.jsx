import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Route wrapper that enforces authentication.
 * Displays a loading indicator while session validation or token refresh is running.
 * Redirects unauthenticated visitors to /login preserving the requested path in state.
 */
export default function ProtectedRoute({ children }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--gray-200)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'auth-spin 0.7s linear infinite',
          }}
        />
        <span>Verifying your session…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
