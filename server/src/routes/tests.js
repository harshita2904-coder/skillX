import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import TestSubmission from '../models/TestSubmission.js';
import Test from '../models/Test.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all available tests
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Get active tests from database
    const tests = await Test.find({ isActive: true }).sort({ createdAt: -1 });

    // Get user's completed tests
    const completedTests = await TestSubmission.find({ user: userId }).select('skill score');

    // Add completion status to tests
    const testsWithStatus = tests.map(test => {
      const completed = completedTests.find(ct => ct.skill === test.skill);
      return {
        ...test.toObject(),
        completed: !!completed,
        score: completed ? completed.score : null
      };
    });

    res.json(testsWithStatus);
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific test
router.get('/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Run code (for testing without submission)
router.post('/run', async (req, res) => {
  try {
    const { testId, code } = req.body;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Simple code execution (in a real app, you'd use a sandboxed environment)
    let output = '';
    try {
      if (test.language === 'javascript') {
        // Basic JavaScript execution (be careful with this in production)
        const func = new Function('arr', code + '\nreturn filterEvenNumbers(arr);');
        const result1 = func([1, 2, 3, 4, 5, 6]);
        const result2 = func([10, 15, 20, 25]);
        output = `Test 1: ${JSON.stringify(result1)}\nTest 2: ${JSON.stringify(result2)}`;
      } else if (test.language === 'python') {
        output = 'Python execution not implemented in this demo';
      } else {
        output = 'Language not supported';
      }
    } catch (error) {
      output = `Error: ${error.message}`;
    }

    res.json({ output });
  } catch (error) {
    console.error('Run code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit test
router.post('/submit', async (req, res) => {
  try {
    const { testId, code } = req.body;
    const userId = req.userId;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check if user already submitted this test - allow retakes
    const existingSubmission = await TestSubmission.findOne({ user: userId, skill: test.skill });
    if (existingSubmission) {
      // Update existing submission instead of blocking
      console.log(`User ${userId} retaking test for skill: ${test.skill}`);
    }

    // Calculate score based on percentage of test cases passed
    let passedTests = 0;
    let totalTests = 0;
    let feedback = '';

    try {
      if (test.language === 'javascript') {
        // Check if the function is defined
        if (!code.includes('function filterEvenNumbers') && !code.includes('filterEvenNumbers')) {
          passedTests = 0;
          totalTests = 2; // We have 2 test cases
          feedback = 'Function filterEvenNumbers is not defined.';
        } else {
          const func = new Function('arr', code + '\nreturn filterEvenNumbers(arr);');
          
          // Test case 1: [1, 2, 3, 4, 5, 6] should return [2, 4, 6]
          try {
            const result1 = func([1, 2, 3, 4, 5, 6]);
            if (JSON.stringify(result1) === '[2,4,6]') {
              passedTests++;
              console.log('✅ Test case 1 passed: [1,2,3,4,5,6] → [2,4,6]');
            } else {
              console.log('❌ Test case 1 failed: Expected [2,4,6], got', result1);
            }
          } catch (error) {
            console.log('❌ Test case 1 failed:', error.message);
          }
          
          // Test case 2: [10, 15, 20, 25] should return [10, 20]
          try {
            const result2 = func([10, 15, 20, 25]);
            if (JSON.stringify(result2) === '[10,20]') {
              passedTests++;
              console.log('✅ Test case 2 passed: [10,15,20,25] → [10,20]');
            } else {
              console.log('❌ Test case 2 failed: Expected [10,20], got', result2);
            }
          } catch (error) {
            console.log('❌ Test case 2 failed:', error.message);
          }
          
          totalTests = 2;
          
          if (passedTests === totalTests) {
            feedback = 'Excellent! All test cases passed.';
          } else if (passedTests > 0) {
            feedback = `Good effort! ${passedTests} out of ${totalTests} test cases passed.`;
          } else {
            feedback = 'None of the test cases passed. Check your logic.';
          }
        }
      } else if (test.language === 'python') {
        // For Python, we'll do basic syntax checking
        if (code.includes('def ') && code.includes(':')) {
          // Basic syntax check - has function definition
          passedTests = 1;
          totalTests = 2;
          feedback = 'Basic syntax looks correct, but Python execution not fully implemented in demo.';
        } else {
          passedTests = 0;
          totalTests = 2;
          feedback = 'Invalid Python syntax. Missing function definition.';
        }
      } else {
        passedTests = 0;
        totalTests = 2;
        feedback = 'Language not supported in this demo.';
      }
    } catch (error) {
      passedTests = 0;
      totalTests = 2;
      feedback = `Code error: ${error.message}`;
    }

    // Calculate score as percentage of passed tests
    const score = Math.round((passedTests / totalTests) * test.points);

    // Save or update submission
    if (existingSubmission) {
      // Update existing submission
      existingSubmission.code = code;
      existingSubmission.score = score;
      await existingSubmission.save();
    } else {
      // Create new submission
      const submission = new TestSubmission({
        user: userId,
        skill: test.skill,
        code,
        score
      });
      await submission.save();
    }

    res.json({
      message: existingSubmission ? 'Test updated successfully' : 'Test submitted successfully',
      score,
      totalPoints: test.points,
      passedTests,
      totalTests,
      percentage: Math.round((passedTests / totalTests) * 100),
      feedback,
      isRetake: !!existingSubmission
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
