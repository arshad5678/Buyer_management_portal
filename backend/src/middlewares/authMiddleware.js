import jwt from 'jsonwebtoken';
import SessionModel from '../models/sessionModel.js';

// Must match SESSION_IDLE_TIMEOUT in .env
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Verifies a JWT Bearer token and validates the associated database session,
 * including revocation state, absolute expiry, and idle timeout.
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ status: 'fail', message: 'Access denied. No authentication token provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      status: 'fail',
      message: 'Access denied. Malformed authorization header format. Expected Bearer <token>'
    });
  }

  const token = parts[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ status: 'error', message: 'JWT secret configuration is missing' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ status: 'fail', message: 'Invalid token payload' });
    }

    if (decoded.sessionId) {
      const session = await SessionModel.findById(decoded.sessionId);

      if (!session) {
        return res.status(401).json({ status: 'fail', message: 'Session not found or invalid. Please log in again' });
      }

      if (session.revoked_at) {
        return res.status(401).json({ status: 'fail', message: 'Session has been revoked. Please log in again' });
      }

      const now = new Date();

      if (new Date(session.expires_at) < now) {
        await SessionModel.revokeSession(session.id);
        return res.status(401).json({ status: 'fail', message: 'Session has expired. Please log in again' });
      }

      // Enforce idle timeout independent of absolute expiry
      const idleDuration = now.getTime() - new Date(session.last_active_at).getTime();
      if (idleDuration >= IDLE_TIMEOUT_MS) {
        await SessionModel.revokeSession(session.id);
        return res.status(401).json({ status: 'fail', message: 'Session expired due to inactivity. Please log in again' });
      }

      await SessionModel.updateLastActive(session.id);

      req.user = { userId: session.user_id, sessionId: session.id };
    } else {
      req.user = { userId: decoded.userId };
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'fail', message: 'Token has expired. Please log in again' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'fail', message: 'Invalid authentication token' });
    }
    return res.status(401).json({ status: 'fail', message: 'Authentication failed' });
  }
};

export default authenticateToken;
