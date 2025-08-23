# Dialogflow Integration Setup Guide

This guide will help you set up Dialogflow integration for the SkillX AI Mentor chatbot.

## Prerequisites

1. Google Cloud Platform account
2. Dialogflow API enabled
3. Service account with Dialogflow permissions

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Dialogflow API:
   - Go to "APIs & Services" > "Library"
   - Search for "Dialogflow API"
   - Click "Enable"

## Step 2: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `skillx-dialogflow`
4. Description: `Service account for SkillX Dialogflow integration`
5. Click "Create and Continue"
6. Grant the following roles:
   - Dialogflow API Admin
   - Dialogflow Console Agent Editor
7. Click "Done"

## Step 3: Download Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the key file
6. Rename it to `google-credentials.json`
7. Place it in the `server/` directory

## Step 4: Create Dialogflow Agent

1. Go to [Dialogflow Console](https://dialogflow.cloud.google.com/)
2. Create a new agent:
   - Name: `SkillX AI Mentor`
   - Default language: English
   - Default time zone: Your timezone
3. Click "Create"

## Step 5: Configure Intents

Create the following intents in your Dialogflow agent:

### 1. Welcome Intent
- **Intent Name**: `welcome`
- **Training Phrases**:
  - "Hello"
  - "Hi"
  - "Start"
  - "Help"
- **Responses**:
  - "Hello! I'm your AI mentor. I can help you with skill recommendations, learning paths, and finding the perfect skill swap matches. What would you like to know?"

### 2. Skill Recommendation Intent
- **Intent Name**: `skill_recommendation`
- **Training Phrases**:
  - "Recommend skills for me"
  - "What skills should I learn"
  - "Suggest skills"
  - "I want to learn new skills"
  - "What skills are in demand"
- **Responses**:
  - "Based on your profile, here are some skills I recommend for you: [skill recommendations will be added dynamically]"

### 3. Learning Path Intent
- **Intent Name**: `learning_path`
- **Training Phrases**:
  - "Create a learning path for [skill]"
  - "How do I learn [skill]"
  - "Learning path for [skill]"
  - "I want to learn [skill]"
- **Parameters**:
  - Entity: `skill` (type: @sys.any)
- **Responses**:
  - "Here's a learning path for [skill]: [learning path will be added dynamically]"

### 4. Match Suggestion Intent
- **Intent Name**: `match_suggestion`
- **Training Phrases**:
  - "Find skill swap matches"
  - "Show me potential matches"
  - "Who can I swap skills with"
  - "Find people to learn from"
- **Responses**:
  - "Here are some potential skill swap matches for you: [match suggestions will be added dynamically]"

### 5. Profile Help Intent
- **Intent Name**: `profile_help`
- **Training Phrases**:
  - "Help me improve my profile"
  - "How can I make my profile better"
  - "Profile tips"
  - "Optimize my profile"
- **Responses**:
  - "To improve your profile, try adding more specific skills, updating your bio, and completing skill verification tests. This will help you get better matches!"

## Step 6: Configure Environment Variables

1. Copy `env.example` to `.env` in the server directory
2. Update the following variables:
   ```env
   DIALOGFLOW_PROJECT_ID=your-actual-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   GOOGLE_GENAI_API_KEY=your-gemini-api-key
   ```

## Step 7: Test the Integration

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the client:
   ```bash
   cd client
   npm run dev
   ```

3. Login to the application
4. Click the "AI Mentor" button on the dashboard
5. Test the chatbot with various queries

## Step 8: Webhook Fulfillment (Flows + Integrations)

- Your webhook endpoint is:
  - `POST https://skillx-production-5d56.up.railway.app/dialogflow/webhook`
- Enable fulfillment for an intent in Dialogflow and set the webhook URL in Dialogflow Console > Fulfillment.
- The webhook returns both `fulfillmentText` and a `payload.skillx` object that includes structured data like `skillRecommendations`, `learningPath`, `matchSuggestions`, etc., so you can drive rich responses in channels that support custom payloads.
- To associate answers with a logged-in user, pass `userId` into context parameters or `originalDetectIntentRequest.payload.userId` from your integration.

## Hybrid Architecture (What runs where)

- **Dialogflow (flows + integrations)**: handles intent detection, channels (Telegram, WhatsApp, etc.), and routing via your Dialogflow agent.
- **Gemini (dynamic answers)**: the server crafts concise, context-aware answers using Gemini for any intent and enriches with app-native structured data.
- **App endpoints**:
  - In-app chat: `POST /dialogflow/message` (secured)
  - Welcome: `GET /dialogflow/welcome/:userId` (secured)
  - External integrations via Dialogflow: `POST /dialogflow/webhook`

## Troubleshooting

### Common Issues:

1. **Authentication Error**:
   - Ensure `google-credentials.json` is in the server directory
   - Check that the service account has proper permissions

2. **Project ID Error**:
   - Verify the project ID in your `.env` file
   - Ensure the Dialogflow agent is in the correct project

3. **API Not Enabled**:
   - Make sure Dialogflow API is enabled in Google Cloud Console

4. **CORS Issues**:
   - Check that the client origin is properly configured

## Advanced Features

### 1. Context Management
The chatbot maintains context about user skills and preferences to provide personalized responses.

### 2. Dynamic Responses
Responses include:
- Skill recommendations based on user profile
- Learning paths for specific skills
- Match suggestions with compatibility scores

### 3. Integration Points
The chatbot integrates with:
- User profiles and skills
- Matchmaking system
- Skill verification tests
- Learning progress tracking

## Security Considerations

1. **Service Account Security**:
   - Keep `google-credentials.json` secure
   - Don't commit it to version control
   - Use environment variables in production

2. **API Rate Limits**:
   - Monitor Dialogflow API usage
   - Implement rate limiting if needed

3. **Data Privacy**:
   - Only send necessary user data to Dialogflow
   - Implement data retention policies

## Production Deployment

For production deployment:

1. **Use Google Cloud Secret Manager** for credentials
2. **Set up proper environment variables**
3. **Configure CORS for your domain**
4. **Monitor API usage and costs**
5. **Set up logging and error tracking**

## Support

If you encounter issues:
1. Check the Google Cloud Console logs
2. Verify Dialogflow agent configuration
3. Test API calls directly
4. Review the server logs for errors 