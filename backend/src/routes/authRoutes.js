import { Router } from 'express';
import { register } from '../controllers/authController.js';
import { validateRegister } from '../middlewares/authValidation.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validateRegister, register);

export default router;
