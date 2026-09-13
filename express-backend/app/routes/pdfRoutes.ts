import express from 'express';
import { handlePdfConversion } from '../controllers/pdfController.js';
import { streamPdfSummary } from '../controllers/sseController.js';

const router = express.Router();

// POST /api/pdf/convert
router.post('/convert', handlePdfConversion);
router.get('/stream/:pdfId', streamPdfSummary)
export default router;

