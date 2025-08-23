import Test from '../models/Test.js';
import TestSubmission from '../models/TestSubmission.js';
import User from '../models/User.js';

// Create a new test
export const createTest = async (req, res) => {
  try {
    const { title, skill, description, starterCode, language, points, testCases, difficulty } = req.body;
    const createdBy = req.userId;

    const test = new Test({
      title,
      skill,
      description,
      starterCode,
      language,
      points,
      testCases,
      difficulty,
      createdBy
    });

    await test.save();

    res.status(201).json({
      message: 'Test created successfully',
      test
    });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all tests (admin view)
export const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(tests);
  } catch (error) {
    console.error('Get all tests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get a specific test
export const getTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId).populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a test
export const updateTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const updateData = req.body;

    const test = await Test.findByIdAndUpdate(
      testId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({
      message: 'Test updated successfully',
      test
    });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a test
export const deleteTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findByIdAndDelete(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Toggle test active status
export const toggleTestStatus = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    test.isActive = !test.isActive;
    await test.save();

    res.json({
      message: `Test ${test.isActive ? 'activated' : 'deactivated'} successfully`,
      test
    });
  } catch (error) {
    console.error('Toggle test status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get test statistics
export const getTestStats = async (req, res) => {
  try {
    const { testId } = req.params;

    // Get test details
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Get submission statistics
    const submissions = await TestSubmission.find({ skill: test.skill });
    
    const stats = {
      totalSubmissions: submissions.length,
      averageScore: submissions.length > 0 
        ? (submissions.reduce((sum, sub) => sum + sub.score, 0) / submissions.length).toFixed(2)
        : 0,
      perfectScores: submissions.filter(sub => sub.score === test.points).length,
      zeroScores: submissions.filter(sub => sub.score === 0).length,
      recentSubmissions: submissions.slice(-10).reverse()
    };

    res.json(stats);
  } catch (error) {
    console.error('Get test stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get admin dashboard stats
export const getAdminDashboard = async (req, res) => {
  try {
    const totalTests = await Test.countDocuments();
    const activeTests = await Test.countDocuments({ isActive: true });
    const totalSubmissions = await TestSubmission.countDocuments();
    const totalUsers = await User.countDocuments();

    const recentTests = await Test.find({})
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentSubmissions = await TestSubmission.find({})
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalTests,
      activeTests,
      totalSubmissions,
      totalUsers,
      recentTests,
      recentSubmissions
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 