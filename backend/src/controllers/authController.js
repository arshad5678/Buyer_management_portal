import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel.js';
import SessionModel from '../models/sessionModel.js';
import { normalizeMobile } from '../middlewares/authValidation.js';

// Idle session timeout must match SESSION_IDLE_TIMEOUT in .env
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

// Separate helpers for set vs clear to avoid maxAge leaking into clearCookie
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-site: frontend (Vercel) and backend (Render) are on different origins.
    // SameSite=None;Secure is required for the refresh cookie to be sent cross-site.
    // In development, Lax is sufficient since the Vite proxy makes requests same-origin.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day absolute lifetime
    path: '/'
  };
};

const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  };
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedMobile = normalizeMobile(mobile);
    const trimmedName = (name || '').trim();

    const existingEmail = await UserModel.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({ status: 'fail', message: 'Email is already registered' });
    }

    const existingMobile = await UserModel.findByMobile(normalizedMobile);
    if (existingMobile) {
      return res.status(409).json({ status: 'fail', message: 'Mobile number is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await UserModel.createUser({
      name: trimmedName,
      email: normalizedEmail,
      mobile: normalizedMobile,
      passwordHash
    });

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
    // Handle DB-level race condition after the pre-check passed
    if (error.code === 'ER_DUP_ENTRY') {
      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('email')) {
        return res.status(409).json({ status: 'fail', message: 'Email is already registered' });
      }
      if (errMsg.includes('mobile')) {
        return res.status(409).json({ status: 'fail', message: 'Mobile number is already registered' });
      }
      return res.status(409).json({ status: 'fail', message: 'A user with this email or mobile number already exists' });
    }
    next(error);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const trimmedIdentifier = (identifier || '').trim();
    let user = null;

    if (trimmedIdentifier.includes('@')) {
      user = await UserModel.findByEmail(trimmedIdentifier.toLowerCase());
    } else {
      user = await UserModel.findByMobile(normalizeMobile(trimmedIdentifier));
    }

    // Generic message prevents user enumeration
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email/mobile or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email/mobile or password' });
    }

    const rawRefreshToken = SessionModel.generateToken();
    const refreshTokenHash = SessionModel.hashToken(rawRefreshToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await SessionModel.createSession({
      userId: user.id,
      refreshTokenHash,
      expiresAt: sessionExpiresAt
    });

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

    res.cookie('refreshToken', rawRefreshToken, getCookieOptions());

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

// POST /api/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({ status: 'fail', message: 'Refresh token is required' });
    }

    const tokenHash = SessionModel.hashToken(rawToken);
    const session = await SessionModel.findByTokenHash(tokenHash);

    if (!session) {
      return res.status(401).json({ status: 'fail', message: 'Invalid or expired refresh token' });
    }

    // Refresh token reuse: revoke all sessions for this user as a security precaution
    if (session.revoked_at) {
      await SessionModel.revokeAllUserSessions(session.user_id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return res.status(401).json({
        status: 'fail',
        message: 'Security alert: Refresh token reuse detected. All sessions revoked. Please log in again'
      });
    }

    const now = new Date();

    if (new Date(session.expires_at) < now) {
      await SessionModel.revokeSession(session.id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return res.status(401).json({ status: 'fail', message: 'Session has expired. Please log in again' });
    }

    // Enforce idle timeout independent of absolute expiry
    const idleDuration = now.getTime() - new Date(session.last_active_at).getTime();
    if (idleDuration >= IDLE_TIMEOUT_MS) {
      await SessionModel.revokeSession(session.id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return res.status(401).json({ status: 'fail', message: 'Session expired due to inactivity. Please log in again' });
    }

    // Atomic swap: old hash must still match, preventing concurrent refresh races
    const newRawToken = SessionModel.generateToken();
    const newTokenHash = SessionModel.hashToken(newRawToken);
    const rotated = await SessionModel.rotateToken(session.id, tokenHash, newTokenHash);

    if (!rotated) {
      return res.status(401).json({ status: 'fail', message: 'Concurrent refresh conflict detected' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '10m';

    const newAccessToken = jwt.sign(
      { userId: session.user_id, sessionId: session.id },
      jwtSecret,
      { expiresIn }
    );

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

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    if (req.user?.sessionId) {
      await SessionModel.revokeSession(req.user.sessionId);
    }

    // Also revoke by cookie token in case the access token was not provided
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      const tokenHash = SessionModel.hashToken(rawToken);
      await SessionModel.revokeByTokenHash(tokenHash);
    }

    res.clearCookie('refreshToken', getClearCookieOptions());

    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.userId);

    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Authenticated user no longer exists' });
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
