import { Router } from 'express';
import { register, login, refreshToken, logout, getMe } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middlewares/authValidation.js';
import authenticateToken from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refreshToken);

// Logout accepts an optional access token to revoke the session by ID,
// but also works with just the HttpOnly refresh cookie.
router.post('/logout', (req, res, next) => {
  if (req.headers.authorization) {
    return authenticateToken(req, res, next);
  }
  next();
}, logout);

router.get('/me', authenticateToken, getMe);

export default router;
