import User from '../models/User.js';

export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
};

export const updateUser = async (req, res) => {
  const updates = req.body;
  delete updates.passwordHash;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
  res.json(user);
};
