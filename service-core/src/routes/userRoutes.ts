import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.get('/', authenticate, authorize('admin'), userController.listStaff);
router.post('/', authenticate, authorize('admin'), userController.createStaff);
router.patch('/:id/active', authenticate, authorize('admin'), userController.setActive);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteStaff);

export default router;
