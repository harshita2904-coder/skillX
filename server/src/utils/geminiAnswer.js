import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';
const isGeminiConfigured = Boolean(apiKey);
const genAI = isGeminiConfigured ? new GoogleGenerativeAI(apiKey) : null;

const sanitize = (text) => {
	if (!text) return text;
	return text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
};

export const generateAnswerWithGemini = async ({ message, intent, parameters, userContext }) => {
	if (!isGeminiConfigured) return null;
	if (!message) return null;

	const paramPreview = parameters ? JSON.stringify(parameters) : '{}';
	const system = [
		"You are 'SkillX AI Mentor', a concise, practical mentor for a skill swap platform.",
		'Match the user tone, keep replies brief but helpful (2-6 sentences).',
		'When giving steps or lists, keep them short and actionable.',
		"If the user asks for a plan or roadmap, summarize at high level and the app will attach structured details.",
		'Avoid markdown code fences in the final output.'
	].join('\n');

	const prompt = [
		system,
		'---',
		`UserContext: ${userContext || 'Unknown'}`,
		`DetectedIntent: ${intent || 'unknown'}`,
		`Parameters: ${paramPreview}`,
		'---',
		`UserMessage: ${message}`,
		'Compose a helpful answer now.'
	].join('\n');

	try {
		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
		const result = await model.generateContent(prompt);
		const text = sanitize(result.response.text());
		return text || null;
	} catch (err) {
		return null;
	}
};

export { isGeminiConfigured }; 