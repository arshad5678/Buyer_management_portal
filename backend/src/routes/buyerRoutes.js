import { Router } from 'express';
import { uploadBuyers, getBuyers } from '../controllers/buyerController.js';
import authenticateToken from '../middlewares/authMiddleware.js';
import uploadBuyerFile from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/upload', authenticateToken, uploadBuyerFile, uploadBuyers);
router.get('/', authenticateToken, getBuyers);

export default router;
