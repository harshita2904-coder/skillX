import TestSubmission from '../models/TestSubmission.js';

export const startTest = async (req, res) => {
  res.json({ started: true, ts: Date.now() });
};

export const submitTest = async (req, res) => {
  const { skill, code, score } = req.body;
  const userId = req.user?.id;
  const sub = await TestSubmission.create({ user: userId, skill, code, score });
  res.json(sub);
};
