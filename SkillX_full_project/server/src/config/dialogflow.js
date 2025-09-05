import { SessionsClient } from '@google-cloud/dialogflow';
import fs from 'fs';
import path from 'path';

// Dialogflow configuration
const projectId = process.env.DIALOGFLOW_PROJECT_ID || '';
const sessionId = 'skillx-session';

// Resolve credentials path and check existence
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
const resolvedCredentialsPath = path.resolve(credentialsPath);
const hasCredentials = fs.existsSync(resolvedCredentialsPath);

let sessionClient = null;
let sessionPath = null;

try {
	if (projectId && hasCredentials) {
		sessionClient = new SessionsClient({ keyFilename: resolvedCredentialsPath });
		sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
	}
} catch (err) {
	// If initialization fails, leave sessionClient null so callers can fall back to mock
	sessionClient = null;
	sessionPath = null;
}

const isDialogflowAvailable = Boolean(sessionClient && sessionPath && projectId);

export { sessionClient, sessionPath, projectId, isDialogflowAvailable }; 