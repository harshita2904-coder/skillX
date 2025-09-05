import Message from '../models/Message.js';
import Match from '../models/Match.js';
import User from '../models/User.js';

export function registerChatHandlers(io, socket) {
  console.log(`User ${socket.userId} connected to chat`);

  // Join a specific match room
  socket.on('join-room', (matchId) => {
    socket.join(matchId);
    console.log(`User ${socket.userId} joined room ${matchId}`);
  });

  // Handle sending messages
  socket.on('send-message', async (messageData) => {
    try {
      const { matchId, content, sender, timestamp } = messageData;

      // Verify user is part of this match
      const match = await Match.findById(matchId);
      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }

      if (match.user1.toString() !== sender && match.user2.toString() !== sender) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Save message to database
      const message = new Message({
        matchId,
        sender,
        text: content
      });

      await message.save();

      // Populate sender info
      await message.populate('sender', 'name');

      // Broadcast message to all users in the room
      io.to(matchId).emit('message', message);

      console.log(`Message sent in room ${matchId} by user ${sender}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { matchId, isTyping } = data;
    socket.to(matchId).emit('user-typing', {
      userId: socket.userId,
      isTyping
    });
  });

  // Handle video call signaling
  socket.on('call-invite', async ({ matchId }) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) return;
      const otherUserId = match.user1.toString() === socket.userId ? match.user2.toString() : match.user1.toString();
      
      // Get the caller's name
      const caller = await User.findById(socket.userId).select('name');
      
      io.to(matchId).emit('call-invited', { matchId, fromUserId: socket.userId });
      
      // Also send direct notification to the other user
      io.sockets.sockets.forEach(s => {
        if (s.userId === otherUserId) {
          s.emit('notification', { type: 'incoming-call', matchId, fromUserId: socket.userId });
        }
      });
    } catch (e) {
      console.error('call-invite error', e);
    }
  });

  // Handle video call started notification
  socket.on('video-call-started', async ({ matchId }) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) return;
      
      // Get the caller's name
      const caller = await User.findById(socket.userId).select('name');
      
      // Send video call started notification to all users in the match
      io.to(matchId).emit('video-call-started', { 
        matchId, 
        fromUserId: socket.userId, 
        fromUserName: caller?.name || 'Unknown User'
      });
      
      console.log(`Video call started by ${caller?.name} for match ${matchId}`);
    } catch (e) {
      console.error('video-call-started error', e);
    }
  });

  socket.on('call-joined', ({ matchId }) => {
    socket.to(matchId).emit('call-joined', {
      matchId,
      fromUserId: socket.userId
    });
  });

  socket.on('video-offer', ({ matchId, offer }) => {
    socket.to(matchId).emit('video-offer', {
      offer,
      fromUserId: socket.userId
    });
  });

  socket.on('video-answer', ({ matchId, answer }) => {
    socket.to(matchId).emit('video-answer', {
      answer,
      fromUserId: socket.userId
    });
  });

  socket.on('ice-candidate', ({ matchId, candidate }) => {
    socket.to(matchId).emit('ice-candidate', {
      candidate,
      fromUserId: socket.userId
    });
  });

  // Handle video call end
  socket.on('video-call-end', ({ matchId }) => {
    io.to(matchId).emit('video-call-ended', { matchId });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected from chat`);
  });
}

// Helper function to get online users in a match
export function getOnlineUsersInMatch(io, matchId) {
  const room = io.sockets.adapter.rooms.get(matchId);
  if (!room) return [];
  
  const onlineUsers = [];
  room.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.user) {
      onlineUsers.push({
        userId: socket.userId,
        name: socket.user.name
      });
    }
  });
  
  return onlineUsers;
}

// Helper function to send notification to user
export function sendNotificationToUser(io, userId, notification) {
  io.sockets.sockets.forEach(socket => {
    if (socket.userId === userId) {
      socket.emit('notification', notification);
    }
  });
}

// Helper function to broadcast to match room
export function broadcastToMatch(io, matchId, event, data) {
  io.to(matchId).emit(event, data);
}
