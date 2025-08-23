import mongoose from 'mongoose';

const TestSubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  code: String,
  score: Number
}, { timestamps: true });

export default mongoose.model('TestSubmission', TestSubmissionSchema);
