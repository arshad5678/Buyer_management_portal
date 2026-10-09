import { Router } from 'express';
import { uploadBuyers } from '../controllers/buyerController.js';
import authenticateToken from '../middlewares/authMiddleware.js';
import uploadBuyerFile from '../middlewares/uploadMiddleware.js';

const router = Router();

// POST /api/buyers/upload - Protected route for uploading CSV/XLS/XLSX files
router.post('/upload', authenticateToken, uploadBuyerFile, uploadBuyers);

export default router;
