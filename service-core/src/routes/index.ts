import { Router } from 'express';
import authRoutes from './authRoutes.js';
import reportRoutes from './reportRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);

export default router;
