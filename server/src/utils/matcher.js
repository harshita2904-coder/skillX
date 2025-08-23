// Simple Jaccard similarity matcher as a placeholder for TF-IDF + cosine.
import User from '../models/User.js';

const jaccard = (a, b) => {
  const A = new Set(a.map(s => s.toLowerCase()));
  const B = new Set(b.map(s => s.toLowerCase()));
  const inter = new Set([...A].filter(x => B.has(x))).size;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
};

export const findMatchesForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];
  const candidates = await User.find({ _id: { $ne: userId } });
  const results = candidates.map(c => {
    const teachMatch = jaccard(user.skillsLearn || [], c.skillsTeach || []);
    const learnMatch = jaccard(user.skillsTeach || [], c.skillsLearn || []);
    const score = Math.round(100 * (0.6 * teachMatch + 0.4 * learnMatch));
    return { user: c, compatibility: score };
  }).sort((a, b) => b.compatibility - a.compatibility);
  return results.slice(0, 10);
};
