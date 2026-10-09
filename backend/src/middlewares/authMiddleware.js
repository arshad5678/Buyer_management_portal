import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT access tokens from Authorization header
 * Header format required: "Bearer <accessToken>"
 */
export const authenticateToken = (req, res, next) => {
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

    // Attach authenticated identity from the verified payload
    req.user = {
      userId: decoded.userId
    };

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
