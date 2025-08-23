import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  avatarUrl: String,
  bio: String,
  location: String,
  timezone: String,
  skillsTeach: [{ type: String }],
  skillsLearn: [{ type: String }],
  badges: [{ type: String, default: [] }],
  rating: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastLoginDate: { type: Date },
  loginDates: [{ type: Date }]
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
