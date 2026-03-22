import { Router } from 'express';
import authRoutes from './authRoutes.js';

//ADDED:
import reportRoutes from './reportRoutes.js';
///////

const router = Router();

router.use('/auth', authRoutes);

//ADDED:
router.use('/reports', reportRoutes);
///////

export default router;
