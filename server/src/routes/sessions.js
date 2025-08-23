import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Session from '../models/Session.js';
import Match from '../models/Match.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get active session for a match
router.get('/active/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const session = await Session.findOne({ matchId, status: 'active' });
    if (!session) return res.status(404).json({ message: 'No active session' });
    return res.json(session);
  } catch (e) {
    console.error('Get active session error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start a new session
router.post('/start', async (req, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.userId;

    // Verify match exists and user is part of it
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.user1.toString() !== userId && match.user2.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if session already exists
    const existingSession = await Session.findOne({ matchId, status: 'active' });
    if (existingSession) {
      return res.status(400).json({ message: 'A video session is already active for this match', session: existingSession });
    }

    // Create new session
    const session = new Session({
      matchId,
      user1: match.user1,
      user2: match.user2,
      startTime: new Date(),
      status: 'active'
    });

    await session.save();

    res.status(201).json({ message: 'Session started successfully', session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// End a session
router.post('/end', async (req, res) => {
  try {
    const { sessionId, feedback } = req.body;
    const userId = req.userId;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.user1.toString() !== userId && session.user2.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update session
    session.endTime = new Date();
    session.duration = Math.floor((session.endTime - session.startTime) / 1000 / 60);
    session.status = 'completed';
    
    if (feedback) {
      session.feedback = session.feedback || {};
      session.feedback[userId] = feedback;
    }

    await session.save();

    res.json({ message: 'Session ended successfully', session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's sessions
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const sessions = await Session.find({
      $or: [{ user1: userId }, { user2: userId }]
    })
      .populate('user1', 'name')
      .populate('user2', 'name')
      .populate('matchId')
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get session details
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await Session.findById(sessionId)
      .populate('user1', 'name')
      .populate('user2', 'name')
      .populate('matchId');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.user1._id.toString() !== userId && session.user2._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
