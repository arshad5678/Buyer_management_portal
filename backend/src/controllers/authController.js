import bcrypt from 'bcryptjs';
import UserModel from '../models/userModel.js';

/**
 * Handle new user registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Check if email already exists
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }

    // Check if mobile already exists
    const existingMobile = await UserModel.findByMobile(mobile);
    if (existingMobile) {
      return res.status(409).json({
        status: 'fail',
        message: 'Mobile number is already registered'
      });
    }

    // Securely hash the password with bcryptjs (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Save the user in MySQL
    const newUser = await UserModel.createUser({
      name,
      email,
      mobile,
      passwordHash
    });

    // Return success response without exposing password or password_hash
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
    // Safety check for MySQL duplicate entry constraint race condition
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email')) {
        return res.status(409).json({
          status: 'fail',
          message: 'Email is already registered'
        });
      }
      if (error.message.includes('mobile')) {
        return res.status(409).json({
          status: 'fail',
          message: 'Mobile number is already registered'
        });
      }
    }

    // Forward unexpected database or server errors to centralized error handler
    next(error);
  }
};
