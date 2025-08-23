#!/usr/bin/env node

/**
 * Test Script for SkillX AI Mentor
 * This script tests the AI mentor functionality
 */

const BASE_URL = 'https://skillx-production-5d56.up.railway.app';

// Test messages
const testMessages = [
  'Hello',
  'Recommend skills for me',
  'Create a learning path for JavaScript',
  'Find skill swap matches',
  'Show my progress analytics',
  'What skills are in demand',
  'Create a learning schedule',
  'Help me improve my profile'
];

async function testAIMentor() {
  console.log('🧪 Testing SkillX AI Mentor...\n');

  // Test welcome message
  try {
    console.log('📋 Testing welcome message...');
    const welcomeResponse = await fetch(`${BASE_URL}/dialogflow/welcome/test-user`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (welcomeResponse.ok) {
      const welcomeData = await welcomeResponse.json();
      console.log('✅ Welcome message working');
      console.log(`Message: ${welcomeData.text}`);
      console.log(`Suggestions: ${welcomeData.suggestions.length} available\n`);
    } else {
      console.log('❌ Welcome message failed');
      console.log(`Status: ${welcomeResponse.status}\n`);
    }
  } catch (error) {
    console.log('❌ Welcome message error:', error.message, '\n');
  }

  // Test individual messages
  for (const message of testMessages) {
    try {
      console.log(`💬 Testing: "${message}"`);
      
      const response = await fetch(`${BASE_URL}/dialogflow/message`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          userId: 'test-user-id'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Response: ${data.text.substring(0, 50)}...`);
        
        if (data.intent) {
          console.log(`   Intent: ${data.intent}`);
        }
        
        if (data.skillRecommendations) {
          console.log(`   Skills: ${data.skillRecommendations.length} recommended`);
        }
        
        if (data.learningPath) {
          console.log(`   Learning Path: ${data.learningPath.length} levels`);
        }
        
        if (data.matchSuggestions) {
          console.log(`   Matches: ${data.matchSuggestions.length} suggested`);
        }
        
        if (data.progressAnalytics) {
          console.log(`   Analytics: Progress data available`);
        }
        
        if (data.skillDemand) {
          console.log(`   Demand: Market trends available`);
        }
        
        if (data.learningSchedule) {
          console.log(`   Schedule: Learning plan created`);
        }
        
      } else {
        console.log(`❌ Failed: ${response.status}`);
      }
      
      console.log('');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  console.log('🎉 AI Mentor testing completed!');
  console.log('\n📝 To test in the browser:');
  console.log('1. Make sure both server and client are running');
  console.log('2. Go to http://localhost:5173');
  console.log('3. Login to your account');
  console.log('4. Click the "AI Mentor" button on the dashboard');
  console.log('5. Try the test messages above');
}

// Run the test
testAIMentor().catch(console.error); 