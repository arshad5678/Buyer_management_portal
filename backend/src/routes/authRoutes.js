import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middlewares/authValidation.js';
import authenticateToken from '../middlewares/authMiddleware.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validateRegister, register);

// POST /api/auth/login
router.post('/login', validateLogin, login);

// GET /api/auth/me (Protected Route)
router.get('/me', authenticateToken, getMe);

export default router;
