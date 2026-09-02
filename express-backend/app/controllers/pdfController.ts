import { Request, Response } from 'express';
import { processPdfAndSummarize } from '../services/summarizer.js';

/**
 * Controller to handle PDF conversion HTTP requests using AWS S3 keys
 */
export async function handlePdfConversion(req: Request, res: Response) {
  try {
    const s3Key = req.body?.s3Key || req.body?.s3key || req.body?.key;
    const email = req.body?.email || req.body?.userEmail || "[EMAIL_ADDRESS]";

    if (!s3Key || typeof s3Key !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing s3Key parameter in request body'
      });
      return;
    }

    const result = await processPdfAndSummarize(s3Key, email);
    res.json(result);
  } catch (error: any) {
    console.error('Error in handlePdfConversion:', error);

    const isNotFound = error?.name === 'NoSuchKey' || error?.name === 'NoSuchBucket' || error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404;
    const statusCode = isNotFound ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error?.message || 'An unexpected error occurred during PDF conversion and summarization.'
    });
  }
}

