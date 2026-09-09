import 'dotenv/config';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pdfRoutes from './app/routes/pdfRoutes.js';

// import workers
import './app/worker/sectionSummaryWorker.js';
import './app/worker/finalSummaryWorker.js';


const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Basic health route
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'report summary Express Backend'
  });
});

// Register PDF conversion API routes
app.use('/api/pdf', pdfRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start listening on port
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

