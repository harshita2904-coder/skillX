import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  createTest,
  getAllTests,
  getTest,
  updateTest,
  deleteTest,
  toggleTestStatus,
  getTestStats,
  getAdminDashboard
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin dashboard
router.get('/dashboard', getAdminDashboard);

// Test management
router.post('/tests', createTest);
router.get('/tests', getAllTests);
router.get('/tests/:testId', getTest);
router.put('/tests/:testId', updateTest);
router.delete('/tests/:testId', deleteTest);
router.patch('/tests/:testId/toggle', toggleTestStatus);
router.get('/tests/:testId/stats', getTestStats);

export default router; 