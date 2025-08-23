import mongoose from 'mongoose';

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  description: String
});

const TestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  skill: { type: String, required: true },
  description: { type: String, required: true },
  starterCode: { type: String, required: true },
  language: { type: String, required: true },
  points: { type: Number, required: true },
  testCases: [TestCaseSchema],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Test', TestSchema); 