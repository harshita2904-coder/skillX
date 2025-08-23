import express from 'express';
import { signup, login, getCurrentUser, updateProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// CORS middleware specifically for auth routes
router.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('Auth route CORS - Origin:', origin);
  
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('Auth route - Set Access-Control-Allow-Origin to:', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, X-Forwarded-For, X-Forwarded-Proto');
  
  console.log('Auth route CORS headers set for:', req.method, req.path);
  next();
});

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getCurrentUser);
router.put('/profile', authMiddleware, updateProfile);

export default router;
