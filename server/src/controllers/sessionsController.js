import Session from '../models/Session.js';

export const startSession = async (req, res) => {
  const { matchId } = req.body;
  const videoRoom = `room-${matchId}`;
  const s = await Session.create({ matchId, videoRoom });
  res.json(s);
};

export const endSession = async (req, res) => {
  const { sessionId, duration, feedback } = req.body;
  const s = await Session.findByIdAndUpdate(sessionId, { duration, feedback }, { new: true });
  res.json(s);
};
