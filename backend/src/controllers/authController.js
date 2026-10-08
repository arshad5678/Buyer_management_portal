import bcrypt from 'bcryptjs';
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
