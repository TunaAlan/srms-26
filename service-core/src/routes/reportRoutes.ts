import { Router } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize } from '../middleware/auth.js';
import * as reportController from '../controllers/reportController.js';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  },
});

const router = Router();

// Serve uploaded images statically
router.use('/images', express.static('uploads'));

// User: submit a report
router.post('/', authenticate, upload.single('image'), reportController.createReport);

// User: list own reports
router.get('/my', authenticate, reportController.getMyReports);

// Admin / department: list all reports (with optional filters)
router.get('/', authenticate, authorize('admin', 'department'), reportController.getAllReports);

// Any authenticated user: single report detail (controller enforces ownership for regular users)
router.get('/:id', authenticate, reportController.getReportById);

// Staff: review decision (approve / reject / redirect)
router.patch('/:id/review', authenticate, authorize('admin', 'department'), reportController.reviewReport);

export default router;
