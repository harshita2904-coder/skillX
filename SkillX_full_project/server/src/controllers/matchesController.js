import Match from '../models/Match.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { findMatchesForUser } from '../utils/matcher.js';

export const getMatches = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Load existing matches (both directions)
    const existingMatches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).populate('user1', '-passwordHash').populate('user2', '-passwordHash');

    const toMatchItem = (matchDoc) => {
      const otherUser = matchDoc.user1._id.toString() === userId ? matchDoc.user2 : matchDoc.user1;
      return {
        _id: matchDoc._id,
        user: otherUser,
        compatibility: matchDoc.compatibility,
        status: matchDoc.status
      };
    };

    const accepted = existingMatches.filter(m => m.status === 'accepted').map(toMatchItem);
    const pending = existingMatches.filter(m => m.status === 'pending').map(toMatchItem);

    // Suggestions: ranked candidates not already matched with
    const ranked = await findMatchesForUser(userId); // [{ user, compatibility }]
    const alreadyMatchedUserIds = new Set(existingMatches.map(m =>
      (m.user1._id.toString() === userId ? m.user2._id.toString() : m.user1._id.toString())
    ));

    const suggestions = ranked
      .filter(r => !alreadyMatchedUserIds.has(r.user._id.toString()))
      .slice(0, 10)
      .map(r => ({ user: r.user, compatibility: r.compatibility }));

    // Split pending into incoming (requestedBy != you) and outgoing (requestedBy == you)
    const incoming = pending.filter(p => p.user && existingMatches.find(m => m._id.toString() === p._id.toString())?.requestedBy?.toString() !== userId);
    const outgoing = pending.filter(p => p.user && existingMatches.find(m => m._id.toString() === p._id.toString())?.requestedBy?.toString() === userId);

    res.json({ accepted, pending: incoming, outgoing, suggestions });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId;

    const match = await Match.findById(matchId)
      .populate('user1', '-passwordHash')
      .populate('user2', '-passwordHash');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Check if user is part of this match
    if (match.user1._id.toString() !== userId && match.user2._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(match);
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const acceptMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Check if user is part of this match
    if (match.user1.toString() !== userId && match.user2.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only the other user (not the requester) can accept
    if (match.requestedBy && match.requestedBy.toString() === userId) {
      return res.status(400).json({ message: 'You cannot accept your own match request. Waiting for the other user.' });
    }

    // Update match status
    match.status = 'accepted';
    match.acceptedAt = new Date();
    await match.save();

    // Add badges to both users
    const user1 = await User.findById(match.user1);
    const user2 = await User.findById(match.user2);

    if (user1 && !user1.badges.includes('First Swap')) {
      user1.badges.push('First Swap');
      user1.points += 10;
      await user1.save();
    }

    if (user2 && !user2.badges.includes('First Swap')) {
      user2.badges.push('First Swap');
      user2.points += 10;
      await user2.save();
    }

    res.json({ message: 'Match accepted successfully', match });
  } catch (error) {
    console.error('Accept match error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMatchMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId;

    // Verify user is part of this match
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.user1.toString() !== userId && match.user2.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get messages for this match
    const messages = await Message.find({ matchId })
      .populate('sender', 'name')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get match messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    // Verify user is part of this match
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.user1.toString() !== userId && match.user2.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create new message
    const message = new Message({
      matchId,
      sender: userId,
      content,
      timestamp: new Date()
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'name');

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const requestMatch = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.userId;

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot match with yourself' });
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    let match = await Match.findOne({
      $or: [
        { user1: userId, user2: targetUserId },
        { user1: targetUserId, user2: userId }
      ]
    });

    if (!match) {
      match = new Match({ user1: userId, user2: targetUserId, status: 'pending', compatibility: 0, requestedBy: userId });
      await match.save();
    } else if (!match.requestedBy) {
      match.requestedBy = userId;
      await match.save();
    }

    res.status(201).json({ message: 'Match request created', matchId: match._id });
  } catch (error) {
    console.error('Request match error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
