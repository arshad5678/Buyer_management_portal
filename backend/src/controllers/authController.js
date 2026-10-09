import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel.js';
import SessionModel from '../models/sessionModel.js';
import { normalizeMobile } from '../middlewares/authValidation.js';

// 10-minute idle session timeout in milliseconds
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

// Cookie options for secure HttpOnly refresh token cookie
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days absolute lifetime
    path: '/'
  };
};

const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  };
};

/**
 * Handle new user registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Normalize inputs to ensure consistent comparisons and storage
    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedMobile = normalizeMobile(mobile);
    const trimmedName = (name || '').trim();

    // 1. Check whether email already exists
    const existingEmail = await UserModel.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }

    // 2. Check whether mobile already exists
    const existingMobile = await UserModel.findByMobile(normalizedMobile);
    if (existingMobile) {
      return res.status(409).json({
        status: 'fail',
        message: 'Mobile number is already registered'
      });
    }

    // 3. Securely hash password with bcryptjs (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert sanitized record into database
    const newUser = await UserModel.createUser({
      name: trimmedName,
      email: normalizedEmail,
      mobile: normalizedMobile,
      passwordHash
    });

    // 5. Return success response (never return password or password_hash)
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile
      }
    });
  } catch (error) {
    // Database-level race condition handling for duplicate entries
    if (error.code === 'ER_DUP_ENTRY') {
      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('email')) {
        return res.status(409).json({
          status: 'fail',
          message: 'Email is already registered'
        });
      }
      if (errMsg.includes('mobile')) {
        return res.status(409).json({
          status: 'fail',
          message: 'Mobile number is already registered'
        });
      }
      return res.status(409).json({
        status: 'fail',
        message: 'A user with this email or mobile number already exists'
      });
    }

    // Forward any other unexpected errors to centralized error handler
    next(error);
  }
};

/**
 * Handle user login using email OR mobile + password
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const trimmedIdentifier = (identifier || '').trim();
    let user = null;

    // 1. Determine whether identifier is an email or mobile number
    if (trimmedIdentifier.includes('@')) {
      const normalizedEmail = trimmedIdentifier.toLowerCase();
      user = await UserModel.findByEmail(normalizedEmail);
    } else {
      const normalizedMobile = normalizeMobile(trimmedIdentifier);
      user = await UserModel.findByMobile(normalizedMobile);
    }

    // 2. Return HTTP 401 if user does not exist (prevents user enumeration)
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email/mobile or password'
      });
    }

    // 3. Compare supplied password with users.password_hash using bcrypt.compare
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email/mobile or password'
      });
    }

    // 4. Generate cryptographically random refresh token & hash it
    const rawRefreshToken = SessionModel.generateToken();
    const refreshTokenHash = SessionModel.hashToken(rawRefreshToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day absolute lifetime

    // 5. Create database session record
    const session = await SessionModel.createSession({
      userId: user.id,
      refreshTokenHash,
      expiresAt: sessionExpiresAt
    });

    // 6. Generate JWT with 10-minute expiry containing { userId, sessionId }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '10m';

    const accessToken = jwt.sign(
      { userId: user.id, sessionId: session.id },
      jwtSecret,
      { expiresIn }
    );

    // 7. Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', rawRefreshToken, getCookieOptions());

    // 8. Return success response (never expose password or password_hash)
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile
        },
        accessToken,
        refreshToken: rawRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle refresh token rotation and issue a fresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res, next) => {
  try {
    // Read refresh token from either HttpOnly cookie or request body
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({
        status: 'fail',
        message: 'Refresh token is required'
      });
    }

    const tokenHash = SessionModel.hashToken(rawToken);
    const session = await SessionModel.findByTokenHash(tokenHash);

    // Check if session exists
    if (!session) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if session was already revoked (Reuse Detection!)
    if (session.revoked_at) {
      // Security measure: Revoke all sessions for this user due to potential token theft
      await SessionModel.revokeAllUserSessions(session.user_id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return res.status(401).json({
        status: 'fail',
        message: 'Security alert: Refresh token reuse detected. All sessions revoked. Please log in again'
      });
    }

    const now = new Date();

    // Check absolute expiration
    if (new Date(session.expires_at) < now) {
      await SessionModel.revokeSession(session.id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return res.status(401).json({
        status: 'fail',
        message: 'Session has expired. Please log in again'
      });
    }

    // Check 10-minute idle session timeout
    const lastActive = new Date(session.last_active_at);
    const idleDuration = now.getTime() - lastActive.getTime();

    if (idleDuration >= IDLE_TIMEOUT_MS) {
      await SessionModel.revokeSession(session.id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return res.status(401).json({
        status: 'fail',
        message: 'Session expired due to inactivity. Please log in again'
      });
    }

    // Rotate refresh token: generate new token and hash
    const newRawToken = SessionModel.generateToken();
    const newTokenHash = SessionModel.hashToken(newRawToken);

    // Atomically rotate token
    const rotated = await SessionModel.rotateToken(session.id, tokenHash, newTokenHash);

    if (!rotated) {
      return res.status(401).json({
        status: 'fail',
        message: 'Concurrent refresh conflict detected'
      });
    }

    // Generate fresh access token
    const jwtSecret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '10m';

    const newAccessToken = jwt.sign(
      { userId: session.user_id, sessionId: session.id },
      jwtSecret,
      { expiresIn }
    );

    // Update HttpOnly cookie with new rotated refresh token
    res.cookie('refreshToken', newRawToken, getCookieOptions());

    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRawToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user logout: revokes current database session and clears cookie
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    // 1. If authenticated via authMiddleware, revoke session by ID
    if (req.user?.sessionId) {
      await SessionModel.revokeSession(req.user.sessionId);
    }

    // 2. Also check if a refresh token was supplied (cookie or body) and revoke it
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      const tokenHash = SessionModel.hashToken(rawToken);
      await SessionModel.revokeByTokenHash(tokenHash);
    }

    // 3. Clear HttpOnly refresh token cookie
    res.clearCookie('refreshToken', getClearCookieOptions());

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of currently authenticated user
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authenticated user no longer exists'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });
  } catch (error) {
    next(error);
  }
};
