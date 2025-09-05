import express from 'express';
import { sendMessage, getWelcomeMessage, dialogflowWebhook } from '../controllers/dialogflowController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Test endpoint (no authentication required)
router.get('/test', (req, res) => {
  res.json({
    message: 'Dialogflow routes are working!',
    endpoints: {
      welcome: 'GET /dialogflow/welcome/:userId (requires auth)',
      message: 'POST /dialogflow/message (requires auth)',
      webhook: 'POST /dialogflow/webhook (Dialogflow fulfillment webhook)',
      test: 'GET /dialogflow/test (no auth required)'
    }
  });
});

// Get welcome message from AI mentor (secured)
router.get('/welcome/:userId', authMiddleware, getWelcomeMessage);

// Send message to AI mentor (secured)
router.post('/message', authMiddleware, sendMessage);

// Dialogflow fulfillment webhook (for external channel integrations)
router.post('/webhook', dialogflowWebhook);

export default router; 