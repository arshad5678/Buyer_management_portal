import { Link } from 'react-router-dom';
import './PlaceholderPage.css';

/**
 * Reusable placeholder page component used by /signup, /login,
 * /dashboard, /upload, and /buyers.
 *
 * Props:
 *   icon        - SVG path content (string, rendered inside <svg>)
 *   badge       - Short label shown above the title
 *   title       - Page heading
 *   description - Body text
 *   cta         - { label, to } for the primary button (optional)
 *   backLabel   - Text for the "back" link (optional)
 *   backTo      - Route for the "back" link (optional, default "/")
 */
export default function PlaceholderPage({
  icon,
  badge,
  title,
  description,
  cta,
  backLabel = 'Back to Home',
  backTo = '/',
}) {
  return (
    <main className="placeholder-page" id="main-content">
      <div className="placeholder-page__inner">
        {icon && (
          <div className="placeholder-page__icon placeholder-page__icon--blue" aria-hidden="true">
            <svg viewBox="0 0 24 24">{icon}</svg>
          </div>
        )}

        {badge && (
          <span className="placeholder-page__badge">{badge}</span>
        )}

        <h1 className="placeholder-page__title">{title}</h1>
        <p className="placeholder-page__desc">{description}</p>

        <div className="placeholder-page__actions">
          {cta && (
            <Link to={cta.to} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              {cta.label}
            </Link>
          )}
          <p className="placeholder-page__back">
            <Link to={backTo}>{backLabel}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
