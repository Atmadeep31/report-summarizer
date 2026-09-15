import express from 'express';
import { handlePdfConversion, handlePresignedUploadUrl } from '../controllers/pdfController.js';
import { streamPdfSummary } from '../controllers/sseController.js';

const router = express.Router();

// POST /api/pdf/convert
router.post('/convert', handlePdfConversion);
// POST /api/pdf/generate-presigned-url
router.post('/generate-presigned-url', handlePresignedUploadUrl)
// GET /api/pdf/stream/:pdfId
router.get('/stream/:pdfId', streamPdfSummary)
export default router;

