import jwt from 'jsonwebtoken';
import SessionModel from '../models/sessionModel.js';

// 10-minute idle session timeout in milliseconds
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Middleware to verify JWT access tokens from Authorization header and validate active session state
 * Header format required: "Bearer <accessToken>"
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: 'fail',
      message: 'Access denied. No authentication token provided'
    });
  }

  // Ensure header strictly starts with "Bearer "
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
    return res.status(500).json({
      status: 'error',
      message: 'JWT secret configuration is missing'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token payload'
      });
    }

    // If session ID is present, perform database-backed session validation
    if (decoded.sessionId) {
      const session = await SessionModel.findById(decoded.sessionId);

      if (!session) {
        return res.status(401).json({
          status: 'fail',
          message: 'Session not found or invalid. Please log in again'
        });
      }

      // Check whether session has been revoked (e.g. via logout)
      if (session.revoked_at) {
        return res.status(401).json({
          status: 'fail',
          message: 'Session has been revoked. Please log in again'
        });
      }

      const now = new Date();

      // Check absolute expiration
      if (new Date(session.expires_at) < now) {
        await SessionModel.revokeSession(session.id);
        return res.status(401).json({
          status: 'fail',
          message: 'Session has expired. Please log in again'
        });
      }

      // Check 10-minute idle session timeout
      const lastActive = new Date(session.last_active_at);
      const idleDuration = now.getTime() - lastActive.getTime();

      if (idleDuration >= IDLE_TIMEOUT_MS) {
        // Revoke the session due to inactivity
        await SessionModel.revokeSession(session.id);
        return res.status(401).json({
          status: 'fail',
          message: 'Session expired due to inactivity. Please log in again'
        });
      }

      // Update last_active_at only after successful verification
      await SessionModel.updateLastActive(session.id);

      req.user = {
        userId: session.user_id,
        sessionId: session.id
      };
    } else {
      // Fallback for tokens without sessionId
      req.user = {
        userId: decoded.userId
      };
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Token has expired. Please log in again'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid authentication token'
      });
    }

    return res.status(401).json({
      status: 'fail',
      message: 'Authentication failed'
    });
  }
};

export default authenticateToken;
