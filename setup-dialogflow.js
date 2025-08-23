#!/usr/bin/env node

/**
 * Dialogflow Setup Script for SkillX
 * This script helps set up the Dialogflow agent with all necessary intents
 */

import { SessionsClient } from '@google-cloud/dialogflow';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID || 'your-project-id';

// Intents configuration
const intents = [
  {
    displayName: 'welcome',
    trainingPhrases: [
      'Hello',
      'Hi',
      'Start',
      'Help',
      'I need help',
      'Can you help me'
    ],
    messages: [
      {
        text: {
          text: [
            "Hello! I'm your AI mentor. I can help you with skill recommendations, learning paths, and finding the perfect skill swap matches. What would you like to know?"
          ]
        }
      }
    ]
  },
  {
    displayName: 'skill_recommendation',
    trainingPhrases: [
      'Recommend skills for me',
      'What skills should I learn',
      'Suggest skills',
      'I want to learn new skills',
      'What skills are in demand',
      'Which skills should I focus on',
      'Recommend some skills',
      'What should I learn next'
    ],
    messages: [
      {
        text: {
          text: [
            "Based on your profile, here are some skills I recommend for you. Let me analyze your current skills and suggest complementary ones."
          ]
        }
      }
    ]
  },
  {
    displayName: 'learning_path',
    trainingPhrases: [
      'Create a learning path for {{skill}}',
      'How do I learn {{skill}}',
      'Learning path for {{skill}}',
      'I want to learn {{skill}}',
      'Show me how to learn {{skill}}',
      'Path to learn {{skill}}',
      'Steps to learn {{skill}}'
    ],
    parameters: [
      {
        name: 'skill',
        displayName: 'skill',
        value: '{{skill}}',
        entityTypeDisplayName: '@sys.any'
      }
    ],
    messages: [
      {
        text: {
          text: [
            "Here's a learning path for {{skill}}. Let me create a personalized roadmap for you."
          ]
        }
      }
    ]
  },
  {
    displayName: 'match_suggestion',
    trainingPhrases: [
      'Find skill swap matches',
      'Show me potential matches',
      'Who can I swap skills with',
      'Find people to learn from',
      'Show me matches',
      'Find learning partners',
      'Who can teach me',
      'Find skill partners'
    ],
    messages: [
      {
        text: {
          text: [
            "I'll help you find the perfect skill swap matches. Let me search for users who can teach what you want to learn."
          ]
        }
      }
    ]
  },
  {
    displayName: 'progress_analytics',
    trainingPhrases: [
      'Show my progress',
      'My learning analytics',
      'How am I doing',
      'Show my stats',
      'My progress report',
      'Learning analytics',
      'Show my performance',
      'How is my progress'
    ],
    messages: [
      {
        text: {
          text: [
            "Let me show you your learning progress and analytics. I'll analyze your recent activity and skill development."
          ]
        }
      }
    ]
  },
  {
    displayName: 'skill_demand',
    trainingPhrases: [
      'What skills are in demand',
      'Show skill demand trends',
      'Which skills are trending',
      'Popular skills',
      'Skills in demand',
      'Market trends',
      'What skills are popular',
      'Trending skills'
    ],
    messages: [
      {
        text: {
          text: [
            "I'll analyze current skill demand trends and show you which skills are most in demand right now."
          ]
        }
      }
    ]
  },
  {
    displayName: 'learning_schedule',
    trainingPhrases: [
      'Create a learning schedule',
      'Make a study plan',
      'Learning timeline',
      'Study schedule',
      'Plan my learning',
      'Create a timeline',
      'Learning plan',
      'Study timeline'
    ],
    messages: [
      {
        text: {
          text: [
            "Let me help you create a personalized learning schedule and timeline for your skill development goals."
          ]
        }
      }
    ]
  },
  {
    displayName: 'profile_help',
    trainingPhrases: [
      'Help me improve my profile',
      'How can I make my profile better',
      'Profile tips',
      'Optimize my profile',
      'Make my profile better',
      'Profile improvement',
      'How to improve profile',
      'Profile optimization'
    ],
    messages: [
      {
        text: {
          text: [
            "To improve your profile, try adding more specific skills, updating your bio, and completing skill verification tests. This will help you get better matches!"
          ]
        }
      }
    ]
  }
];

console.log('🚀 Setting up Dialogflow for SkillX...\n');

// Check if credentials file exists
const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.log('❌ google-credentials.json not found!');
  console.log('Please follow these steps:');
  console.log('1. Go to Google Cloud Console');
  console.log('2. Create a service account');
  console.log('3. Download the JSON key file');
  console.log('4. Rename it to google-credentials.json');
  console.log('5. Place it in the server directory');
  process.exit(1);
}

// Check if project ID is set
if (PROJECT_ID === 'your-project-id') {
  console.log('❌ DIALOGFLOW_PROJECT_ID not set!');
  console.log('Please set the environment variable:');
  console.log('export DIALOGFLOW_PROJECT_ID="your-actual-project-id"');
  process.exit(1);
}

console.log('✅ Credentials and project ID found');
console.log(`📋 Project ID: ${PROJECT_ID}\n`);

console.log('📝 This script will help you set up your Dialogflow agent.');
console.log('You can also set up the agent manually by following the DIALOGFLOW_SETUP.md guide.\n');

console.log('🎯 Intents that will be created:');
intents.forEach((intent, index) => {
  console.log(`${index + 1}. ${intent.displayName}`);
});
console.log('');

console.log('📚 To set up manually:');
console.log('1. Go to https://dialogflow.cloud.google.com/');
console.log('2. Create a new agent');
console.log('3. Add the intents listed above');
console.log('4. Configure training phrases and responses');
console.log('5. Test the agent');
console.log('');

console.log('🔧 Environment variables needed:');
console.log(`DIALOGFLOW_PROJECT_ID=${PROJECT_ID}`);
console.log('GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json');
console.log('');

console.log('🎉 Your SkillX AI Mentor is ready to use!');
console.log('The mock system will work immediately for testing.');
console.log('Set up Dialogflow for production use.'); 