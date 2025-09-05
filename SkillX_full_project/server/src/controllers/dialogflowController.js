import { sessionClient, sessionPath, isDialogflowAvailable } from '../config/dialogflow.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { generateRoadmapWithGemini } from '../utils/geminiRoadmap.js';
import { generateAnswerWithGemini } from '../utils/geminiAnswer.js';

// Mock Dialogflow for testing (when real Dialogflow is not configured)
const mockDialogflow = async (message, userId) => {
  const lowerMessage = message.toLowerCase();
  
  // Simple intent detection
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('start')) {
    return {
      fulfillmentText: "Hello! I'm your AI mentor. I can help you with skill recommendations, learning paths, and finding the perfect skill swap matches. What would you like to know?",
      intent: { displayName: 'welcome' },
      intentDetectionConfidence: 0.9
    };
  }
  
  if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('skills')) {
    return {
      fulfillmentText: "Based on your profile, here are some skills I recommend for you. Let me analyze your current skills and suggest complementary ones.",
      intent: { displayName: 'skill_recommendation' },
      intentDetectionConfidence: 0.8
    };
  }
  
  if (lowerMessage.includes('learning path') || lowerMessage.includes('learn') || lowerMessage.includes('how to') || lowerMessage.includes('roadmap')) {
    // Capture multi-word skill names for variants like:
    // "learn X", "learning path for X", "path for X", "roadmap for X"
    let skill = 'programming';
    const match = message.match(/(?:learning\s+path\s+for|path\s+for|roadmap\s+for|learn(?:\s+about)?|how\s+to\s+learn)\s+([^\n\r\.!?]+)/i);
    if (match && match[1]) {
      skill = match[1].trim();
    }
    
    return {
      fulfillmentText: `Here's a learning path for ${skill}. Let me create a personalized roadmap for you.`,
      intent: { displayName: 'learning_path' },
      intentDetectionConfidence: 0.85,
      parameters: {
        fields: {
          skill: { stringValue: skill }
        }
      }
    };
  }
  
  if (lowerMessage.includes('match') || lowerMessage.includes('find') || lowerMessage.includes('people')) {
    return {
      fulfillmentText: "I'll help you find the perfect skill swap matches. Let me search for users who can teach what you want to learn.",
      intent: { displayName: 'match_suggestion' },
      intentDetectionConfidence: 0.8
    };
  }
  
  if (lowerMessage.includes('profile') || lowerMessage.includes('improve') || lowerMessage.includes('better')) {
    return {
      fulfillmentText: "To improve your profile, try adding more specific skills, updating your bio, and completing skill verification tests. This will help you get better matches!",
      intent: { displayName: 'profile_help' },
      intentDetectionConfidence: 0.7
    };
  }

  if (lowerMessage.includes('progress') || lowerMessage.includes('stats') || lowerMessage.includes('analytics')) {
    return {
      fulfillmentText: "Let me show you your learning progress and analytics. I'll analyze your recent activity and skill development.",
      intent: { displayName: 'progress_analytics' },
      intentDetectionConfidence: 0.8
    };
  }

  if (lowerMessage.includes('demand') || lowerMessage.includes('trending') || lowerMessage.includes('popular')) {
    return {
      fulfillmentText: "I'll analyze current skill demand trends and show you which skills are most in demand right now.",
      intent: { displayName: 'skill_demand' },
      intentDetectionConfidence: 0.8
    };
  }

  if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') || lowerMessage.includes('timeline')) {
    return {
      fulfillmentText: "Let me help you create a personalized learning schedule and timeline for your skill development goals.",
      intent: { displayName: 'learning_schedule' },
      intentDetectionConfidence: 0.8
    };
  }
  
  // Default response
  return {
    fulfillmentText: "I'm here to help you with your learning journey! You can ask me about skill recommendations, learning paths, finding matches, progress analytics, skill demand trends, or improving your profile.",
    intent: { displayName: 'default' },
    intentDetectionConfidence: 0.5
  };
};

// Safe user fetch helper
const safelyLoadUser = async (userId) => {
  try {
    if (!userId) return null;
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const user = await User.findById(userId);
    return user || null;
  } catch {
    return null;
  }
};

// Send message to Dialogflow and get response
export const sendMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get user context for personalized responses
    let userContext = '';
    const user = await safelyLoadUser(userId);
    if (user) {
      userContext = `User skills to teach: ${user.skillsTeach?.join(', ') || 'none'}. User skills to learn: ${user.skillsLearn?.join(', ') || 'none'}. User level: ${user.points || 0} points.`;
    }

    let result;
    
    // Try real Dialogflow first, fallback to mock
    try {
      if (!isDialogflowAvailable) {
        throw new Error('Dialogflow not available');
      }
      // Prepare the request for Dialogflow
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
            languageCode: 'en-US',
          },
        },
        queryParams: {
          contexts: [
            {
              name: `projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/${userId || 'default'}/contexts/skillx-context`,
              lifespanCount: 5,
              parameters: {
                fields: {
                  userContext: {
                    stringValue: userContext
                  }
                }
              }
            }
          ]
        }
      };

      // Send request to Dialogflow
      const responses = await sessionClient.detectIntent(request);
      result = responses[0].queryResult;
    } catch (dialogflowError) {
      result = await mockDialogflow(message, userId);
    }

    const detectedIntent = result.intent?.displayName;
    const parameters = result.parameters?.fields || {};

    // Process the response
    const response = {
      text: result.fulfillmentText,
      intent: detectedIntent,
      confidence: result.intentDetectionConfidence,
      parameters,
      action: result.action
    };

    // Structured, app-native enrichments based on intent
    if (detectedIntent === 'skill_recommendation') {
      response.skillRecommendations = await getSkillRecommendations(user?._id);
    } else if (detectedIntent === 'learning_path') {
      // Try Gemini roadmap first, then fallback to static
      const skillName = parameters?.skill?.stringValue;
      const dynamicPath = await generateRoadmapWithGemini({ skillName, userContext });
      response.learningPath = dynamicPath || await generateLearningPath(user?._id, skillName);
    } else if (detectedIntent === 'match_suggestion') {
      response.matchSuggestions = await getMatchSuggestions(user?._id);
    } else if (detectedIntent === 'progress_analytics') {
      response.progressAnalytics = await getProgressAnalytics(user?._id);
    } else if (detectedIntent === 'skill_demand') {
      response.skillDemand = await getSkillDemandAnalysis();
    } else if (detectedIntent === 'learning_schedule') {
      response.learningSchedule = await generateLearningSchedule(user?._id);
    }

    // Gemini-generated natural-language answer for ANY intent (fallback to DF/mock text)
    const geminiText = await generateAnswerWithGemini({
      message,
      intent: detectedIntent,
      parameters,
      userContext
    });
    if (geminiText) {
      response.text = geminiText;
    }

    res.json(response);

  } catch (error) {
    console.error('Dialogflow error:', error);
    res.status(500).json({ 
      message: 'Error processing message',
      error: error.message 
    });
  }
};

// Get skill recommendations based on user profile
const getSkillRecommendations = async (userId) => {
  try {
    const user = await safelyLoadUser(userId);
    if (!user) return [];

    // Popular skills that complement user's current skills
    const popularSkills = [
      'JavaScript', 'Python', 'React', 'Node.js', 'Data Science',
      'Machine Learning', 'UI/UX Design', 'Digital Marketing',
      'Content Writing', 'Video Editing', 'Photography',
      'Language Teaching', 'Cooking', 'Music Production'
    ];

    // Filter out skills user already has
    const userSkills = [...(user.skillsTeach || []), ...(user.skillsLearn || [])];
    const recommendedSkills = popularSkills.filter(skill => 
      !userSkills.some(userSkill => 
        userSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );

    return recommendedSkills.slice(0, 5);
  } catch (error) {
    console.error('Error getting skill recommendations:', error);
    return [];
  }
};

// Generate learning path for a specific skill
const generateLearningPath = async (userId, skillName) => {
  if (!skillName) return null;

  const learningPaths = {
    'javascript': [
      { level: 'Beginner', topics: ['Variables', 'Functions', 'Arrays', 'Objects'], duration: '2-3 weeks' },
      { level: 'Intermediate', topics: ['ES6+', 'Async/Await', 'DOM Manipulation', 'API Calls'], duration: '4-6 weeks' },
      { level: 'Advanced', topics: ['React', 'Node.js', 'Testing', 'Performance'], duration: '8-12 weeks' }
    ],
    'python': [
      { level: 'Beginner', topics: ['Variables', 'Functions', 'Lists', 'Dictionaries'], duration: '2-3 weeks' },
      { level: 'Intermediate', topics: ['OOP', 'File Handling', 'Libraries', 'Data Structures'], duration: '4-6 weeks' },
      { level: 'Advanced', topics: ['Django', 'Data Science', 'Machine Learning', 'Automation'], duration: '8-12 weeks' }
    ],
    'react': [
      { level: 'Beginner', topics: ['Components', 'Props', 'State', 'JSX'], duration: '3-4 weeks' },
      { level: 'Intermediate', topics: ['Hooks', 'Context', 'Routing', 'API Integration'], duration: '4-6 weeks' },
      { level: 'Advanced', topics: ['Redux', 'Testing', 'Performance', 'Advanced Patterns'], duration: '6-8 weeks' }
    ],
    'data science': [
      { level: 'Beginner', topics: ['Python Basics', 'Pandas', 'NumPy', 'Data Visualization'], duration: '4-6 weeks' },
      { level: 'Intermediate', topics: ['Statistics', 'Machine Learning', 'SQL', 'Data Cleaning'], duration: '6-8 weeks' },
      { level: 'Advanced', topics: ['Deep Learning', 'Big Data', 'MLOps', 'Deployment'], duration: '10-16 weeks' }
    ]
  };

  const skillKey = skillName.toLowerCase();
  return learningPaths[skillKey] || [
    { level: 'Beginner', topics: ['Basic Concepts', 'Fundamentals'], duration: '2-3 weeks' },
    { level: 'Intermediate', topics: ['Advanced Concepts', 'Practical Applications'], duration: '4-6 weeks' },
    { level: 'Advanced', topics: ['Expert Level', 'Specialization'], duration: '6-8 weeks' }
  ];
};

// Get match suggestions for the user
const getMatchSuggestions = async (userId) => {
  try {
    const user = await safelyLoadUser(userId);
    if (!user) return [];

    // Find users who can teach what this user wants to learn
    const potentialMatches = await User.find({
      _id: { $ne: userId },
      skillsTeach: { $in: user.skillsLearn || [] }
    }).limit(3);

    return potentialMatches.map(match => ({
      id: match._id,
      name: match.name,
      skillsTeach: match.skillsTeach,
      rating: match.rating,
      compatibility: calculateCompatibility(user, match)
    }));
  } catch (error) {
    console.error('Error getting match suggestions:', error);
    return [];
  }
};

// Get progress analytics for the user
const getProgressAnalytics = async (userId) => {
  try {
    const user = await safelyLoadUser(userId);
    if (!user) return null;

    // Calculate various metrics
    const totalSkills = (user.skillsTeach?.length || 0) + (user.skillsLearn?.length || 0);
    const skillDiversity = calculateSkillDiversity(user);
    const learningVelocity = calculateLearningVelocity(user);
    const profileCompleteness = calculateProfileCompleteness(user);

    return {
      totalSkills,
      skillDiversity,
      learningVelocity,
      profileCompleteness,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalPoints: user.points || 0,
      badges: user.badges || [],
      recommendations: generateProgressRecommendations(user)
    };
  } catch (error) {
    console.error('Error getting progress analytics:', error);
    return null;
  }
};

// Get skill demand analysis
const getSkillDemandAnalysis = async () => {
  // Mock data - in real implementation, this would come from job market APIs
  const skillDemand = {
    highDemand: [
      { skill: 'Data Science', demand: 95, growth: '+15%' },
      { skill: 'Machine Learning', demand: 92, growth: '+20%' },
      { skill: 'React', demand: 88, growth: '+12%' },
      { skill: 'Python', demand: 85, growth: '+10%' },
      { skill: 'Cloud Computing', demand: 82, growth: '+18%' }
    ],
    emergingSkills: [
      { skill: 'AI/ML', trend: 'Rapidly Growing' },
      { skill: 'Blockchain', trend: 'Emerging' },
      { skill: 'Cybersecurity', trend: 'High Priority' },
      { skill: 'DevOps', trend: 'Steady Growth' },
      { skill: 'UI/UX Design', trend: 'Increasing Demand' }
    ],
    marketInsights: [
      'Data Science and AI skills are in highest demand',
      'Full-stack development skills are highly valued',
      'Soft skills like communication are increasingly important',
      'Remote work has increased demand for digital skills',
      'Continuous learning is essential for career growth'
    ]
  };

  return skillDemand;
};

// Generate personalized learning schedule
const generateLearningSchedule = async (userId) => {
  try {
    const user = await safelyLoadUser(userId);
    if (!user) return null;

    const schedule = {
      weeklyPlan: [
        { day: 'Monday', focus: 'Core Skills', time: '2 hours' },
        { day: 'Tuesday', focus: 'Practice & Projects', time: '1.5 hours' },
        { day: 'Wednesday', focus: 'Skill Swap Sessions', time: '1 hour' },
        { day: 'Thursday', focus: 'New Skills Exploration', time: '1.5 hours' },
        { day: 'Friday', focus: 'Review & Assessment', time: '1 hour' },
        { day: 'Weekend', focus: 'Portfolio Building', time: '3 hours' }
      ],
      monthlyGoals: [
        'Complete 2 skill verification tests',
        'Participate in 4 skill swap sessions',
        'Add 3 new skills to your profile',
        'Achieve 100 points milestone'
      ],
      recommendedActivities: [
        'Take skill verification tests to validate your progress',
        'Schedule regular skill swap sessions with matches',
        'Update your profile with new achievements',
        'Explore trending skills in your field'
      ]
    };

    return schedule;
  } catch (error) {
    console.error('Error generating learning schedule:', error);
    return null;
  }
};

// Calculate compatibility between two users
const calculateCompatibility = (user1, user2) => {
  const teachMatch = user1.skillsLearn?.filter(skill => 
    user2.skillsTeach?.includes(skill)
  ).length || 0;
  
  const learnMatch = user2.skillsLearn?.filter(skill => 
    user1.skillsTeach?.includes(skill)
  ).length || 0;

  const totalSkills = (user1.skillsLearn?.length || 0) + (user2.skillsLearn?.length || 0);
  return totalSkills > 0 ? Math.round((teachMatch + learnMatch) / totalSkills * 100) : 0;
};

// Calculate skill diversity score
const calculateSkillDiversity = (user) => {
  const allSkills = [...(user.skillsTeach || []), ...(user.skillsLearn || [])];
  const uniqueSkills = new Set(allSkills);
  return Math.round((uniqueSkills.size / Math.max(allSkills.length, 1)) * 100);
};

// Calculate learning velocity
const calculateLearningVelocity = (user) => {
  // Mock calculation based on points and streaks
  const baseScore = user.points || 0;
  const streakBonus = (user.currentStreak || 0) * 10;
  return Math.min(100, Math.round((baseScore + streakBonus) / 10));
};

// Calculate profile completeness
const calculateProfileCompleteness = (user) => {
  let score = 0;
  if (user.skillsTeach?.length > 0) score += 25;
  if (user.skillsLearn?.length > 0) score += 25;
  if (user.bio) score += 20;
  if (user.location) score += 15;
  if (user.avatarUrl) score += 15;
  return score;
};

// Generate progress recommendations
const generateProgressRecommendations = (user) => {
  const recommendations = [];
  
  if (!user.bio) {
    recommendations.push('Add a bio to make your profile more attractive to potential matches');
  }
  
  if ((user.skillsTeach?.length || 0) < 3) {
    recommendations.push('Add more skills you can teach to increase your match potential');
  }
  
  if ((user.skillsLearn?.length || 0) < 3) {
    recommendations.push('Add more skills you want to learn to find better matches');
  }
  
  if ((user.points || 0) < 50) {
    recommendations.push('Complete skill verification tests to earn more points and badges');
  }
  
  if ((user.currentStreak || 0) < 3) {
    recommendations.push('Maintain a daily learning streak to boost your profile visibility');
  }
  
  return recommendations;
};

// Get chatbot welcome message
export const getWelcomeMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let welcomeMessage = "Hello! I'm your AI mentor. I can help you with skill recommendations, learning paths, and finding the perfect skill swap matches. What would you like to know?";

    const user = await safelyLoadUser(userId);
    if (user) {
      welcomeMessage = `Welcome back ${user.name}! I can help you with skill recommendations, learning paths, and finding matches. What would you like to know?`;
    }

    res.json({
      text: welcomeMessage,
      suggestions: [
        "Recommend skills for me",
        "Create a learning path",
        "Find skill swap matches",
        "Show my progress analytics",
        "Check skill demand trends",
        "Create learning schedule"
      ]
    });

  } catch (error) {
    console.error('Error getting welcome message:', error);
    res.json({ message: 'Error getting welcome message' });
  }
};

// Dialogflow fulfillment webhook (ES v2)
export const dialogflowWebhook = async (req, res) => {
  try {
    const body = req.body || {};
    const queryResult = body.queryResult || {};
    const originalText = queryResult.queryText || '';
    const detectedIntent = queryResult.intent?.displayName || 'unknown';
    const parameters = queryResult.parameters?.fields || {};

    // Extract userId and userContext if provided via contexts or original request
    const outputContexts = Array.isArray(queryResult.outputContexts) ? queryResult.outputContexts : [];
    const contextParams = outputContexts.reduce((acc, ctx) => {
      const fields = ctx.parameters?.fields || {};
      Object.keys(fields).forEach((k) => {
        acc[k] = fields[k];
      });
      return acc;
    }, {});

    const maybeUserId = contextParams.userId?.stringValue
      || body.originalDetectIntentRequest?.payload?.userId
      || null;

    const user = await safelyLoadUser(maybeUserId);
    const userContext = user
      ? `User skills to teach: ${user.skillsTeach?.join(', ') || 'none'}. User skills to learn: ${user.skillsLearn?.join(', ') || 'none'}. User level: ${user.points || 0} points.`
      : (contextParams.userContext?.stringValue || '');

    // Build structured enrichments similar to sendMessage
    const enrichments = {};
    if (detectedIntent === 'skill_recommendation') {
      enrichments.skillRecommendations = await getSkillRecommendations(user?._id);
    } else if (detectedIntent === 'learning_path') {
      const skillName = (parameters?.skill?.stringValue) || (contextParams.skill?.stringValue) || '';
      const dynamicPath = await generateRoadmapWithGemini({ skillName, userContext });
      enrichments.learningPath = dynamicPath || await generateLearningPath(user?._id, skillName);
    } else if (detectedIntent === 'match_suggestion') {
      enrichments.matchSuggestions = await getMatchSuggestions(user?._id);
    } else if (detectedIntent === 'progress_analytics') {
      enrichments.progressAnalytics = await getProgressAnalytics(user?._id);
    } else if (detectedIntent === 'skill_demand') {
      enrichments.skillDemand = await getSkillDemandAnalysis();
    } else if (detectedIntent === 'learning_schedule') {
      enrichments.learningSchedule = await generateLearningSchedule(user?._id);
    }

    // Compose Gemini dynamic text answer
    const geminiText = await generateAnswerWithGemini({
      message: originalText,
      intent: detectedIntent,
      parameters,
      userContext
    });

    const fallbackText = queryResult.fulfillmentText
      || "I'm here to help you with skill recommendations, learning paths, matches, and more.";

    const answerText = geminiText || fallbackText;

    // Return Dialogflow ES v2 webhook response
    return res.json({
      fulfillmentText: answerText,
      payload: {
        skillx: {
          intent: detectedIntent,
          parameters,
          userId: user?._id || null,
          ...enrichments
        }
      }
    });
  } catch (error) {
    console.error('Dialogflow webhook error:', error);
    return res.json({
      fulfillmentText: "Sorry, something went wrong generating the answer.",
      payload: { error: true }
    });
  }
}; 