import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Session from '../models/Session.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { name, bio, location, skillsTeach, skillsLearn } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        name,
        bio,
        location,
        skillsTeach,
        skillsLearn
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId;

    // Get total matches
    const totalMatches = await Match.countDocuments({
      $or: [
        { user1: userId },
        { user2: userId }
      ]
    });

    // Get completed sessions
    const completedSessions = await Session.countDocuments({
      $or: [
        { user1: userId },
        { user2: userId }
      ],
      status: 'completed'
    });

    // Get user points, rating, and streak
    const user = await User.findById(userId).select('points rating currentStreak longestStreak');
    
    res.json({
      totalMatches,
      completedSessions,
      totalPoints: user?.points || 0,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's matches
router.get('/matches', async (req, res) => {
  try {
    const userId = req.userId;

    const matches = await Match.find({
      $or: [
        { user1: userId },
        { user2: userId }
      ]
    })
    .populate('user1', 'name email avatarUrl')
    .populate('user2', 'name email avatarUrl')
    .sort({ createdAt: -1 });

    res.json(matches);
  } catch (error) {
    console.error('Get user matches error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
