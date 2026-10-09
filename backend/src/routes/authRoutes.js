import { Router } from 'express';
import { register, login, refreshToken, logout, getMe } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middlewares/authValidation.js';
import authenticateToken from '../middlewares/authMiddleware.js';

const router = Router();

// POST /api/auth/register - Register new user
router.post('/register', validateRegister, register);

// POST /api/auth/login - Login user and issue access + refresh tokens
router.post('/login', validateLogin, login);

// POST /api/auth/refresh - Rotate refresh token and issue fresh access token
router.post('/refresh', refreshToken);

// POST /api/auth/logout - Revoke session and clear refresh token
router.post('/logout', (req, res, next) => {
  if (req.headers.authorization) {
    return authenticateToken(req, res, next);
  }
  next();
}, logout);

// GET /api/auth/me - Protected Route: Authenticated user profile
router.get('/me', authenticateToken, getMe);

export default router;
