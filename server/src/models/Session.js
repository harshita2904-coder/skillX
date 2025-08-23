import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
  videoRoom: { type: String },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  duration: { type: Number, default: 0 },
  feedback: {
    type: Map,
    of: String
  }
}, { timestamps: true });

export default mongoose.model('Session', SessionSchema);
