import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';
const isGeminiConfigured = Boolean(apiKey);

const genAI = isGeminiConfigured ? new GoogleGenerativeAI(apiKey) : null;

const stripCodeFences = (text) => {
  if (!text) return text;
  return text.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
};

const mapRoadmapToLearningPath = (roadmapJson) => {
  if (!roadmapJson || !Array.isArray(roadmapJson.roadmap)) return null;
  return roadmapJson.roadmap.map((stage) => ({
    level: stage.level || 'Stage',
    topics: stage.topics || [],
    duration: stage.durationWeeks ? `${stage.durationWeeks} weeks` : (stage.duration || '2-3 weeks')
  }));
};

export const generateRoadmapWithGemini = async ({ skillName, userContext }) => {
  if (!isGeminiConfigured) return null;
  if (!skillName) return null;

  const prompt = [
    'You are an expert mentor. Create a concise, practical learning roadmap for the given skill.',
    'Tailor it to the user context (existing skills, goals, level if provided).',
    'Output strictly JSON, no markdown. Use this schema exactly:',
    '{',
    '  "roadmap": [',
    '    {',
    '      "level": "Beginner | Intermediate | Advanced",',
    '      "durationWeeks":  number,',
    '      "topics": ["short topic" , "short topic"],',
    '      "projects": ["tiny project idea"],',
    '      "resources": [{"title":"name", "url":"https://..."}]',
    '    }',
    '  ],',
    '  "estimatedTotalWeeks": number,',
    '  "notes": "one short paragraph of guidance"',
    '}',
    '',
    `Skill: ${skillName}`,
    `UserContext: ${userContext || 'Unknown'}`
  ].join('\n');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = stripCodeFences(text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (jsonErr) {
      // Try to extract JSON substring if wrapped with explanations
      const match = text.match(/\{[\s\S]*\}$/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    const learningPath = mapRoadmapToLearningPath(parsed);
    return learningPath || null;
  } catch (err) {
    return null;
  }
};

export { isGeminiConfigured }; 