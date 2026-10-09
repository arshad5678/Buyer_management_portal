import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel.js';
import { normalizeMobile } from '../middlewares/authValidation.js';

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

    // 4. Generate JWT with 10-minute expiry
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '10m';

    const accessToken = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn }
    );

    // 5. Return success response (never expose password or password_hash)
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
        accessToken
      }
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

