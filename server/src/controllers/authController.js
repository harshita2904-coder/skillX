import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const signup = async (req, res) => {
  try {
    const { name, email, password, bio, location, skillsTeach, skillsLearn } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash,
      bio,
      location,
      skillsTeach: skillsTeach || [],
      skillsLearn: skillsLearn || [],
      badges: ['New Member'],
      rating: 0,
      points: 0
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  console.log('Login function called');
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  console.log('Request body:', req.body);
  
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update login tracking and calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0);
    }

    // Check if this is a new day login
    if (!lastLogin || lastLogin.getTime() !== today.getTime()) {
      // Add today to login dates if not already there
      const todayStr = today.toISOString().split('T')[0];
      const loginDatesStr = user.loginDates.map(date => date.toISOString().split('T')[0]);
      
      if (!loginDatesStr.includes(todayStr)) {
        user.loginDates.push(today);
      }

      // Calculate streak
      const sortedDates = user.loginDates
        .map(date => new Date(date))
        .sort((a, b) => b.getTime() - a.getTime()); // Sort descending

      let currentStreak = 0;
      let consecutiveDays = 0;
      const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day

      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          consecutiveDays = 1;
        } else {
          const diffDays = Math.floor((sortedDates[i-1].getTime() - sortedDates[i].getTime()) / oneDay);
          if (diffDays === 1) {
            consecutiveDays++;
          } else {
            break;
          }
        }
      }

      currentStreak = consecutiveDays;
      
      // Update longest streak if current is longer
      if (currentStreak > user.longestStreak) {
        user.longestStreak = currentStreak;
      }

      user.currentStreak = currentStreak;
    }

    user.lastLoginDate = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, bio, location, skillsTeach, skillsLearn } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        name,
        bio,
        location,
        skillsTeach,
        skillsLearn
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
