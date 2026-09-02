import express from 'express';
import { handlePdfConversion } from '../controllers/pdfController.js';

const router = express.Router();

// POST /api/pdf/convert
router.post('/convert', handlePdfConversion);

export default router;

