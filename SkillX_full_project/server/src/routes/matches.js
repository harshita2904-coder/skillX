import express from 'express';
import { 
  getMatches, 
  getMatch, 
  acceptMatch, 
  getMatchMessages, 
  sendMessage,
  requestMatch
} from '../controllers/matchesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Match management
router.get('/', getMatches);
router.get('/:matchId', getMatch);
router.post('/accept/:matchId', acceptMatch);
router.post('/request/:targetUserId', requestMatch);

// Messaging
router.get('/:matchId/messages', getMatchMessages);
router.post('/:matchId/messages', sendMessage);

export default router;
