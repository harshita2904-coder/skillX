import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import sessionRoutes from './routes/sessions.js';
import testRoutes from './routes/tests.js';
import uploadRoutes from './routes/uploads.js';
import adminRoutes from './routes/admin.js';
import dialogflowRoutes from './routes/dialogflow.js';

import { authMiddlewareSocket } from './middleware/auth.js';
import { registerChatHandlers } from './utils/socketChat.js';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { 
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175','https://skill-x-client.vercel.app'], 
    methods: ['GET','POST'] 
  }
});

// Disable ETag to avoid 304 Not Modified for API responses
app.set('etag', false);
// Global no-cache headers for API
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Basic middlewares
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://skill-x-client.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204,
  preflightContinue: false
};

// Ensure CORS headers are always set and preflight is handled
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Mongo connect
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillx';
mongoose.connect(MONGO_URI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB error', err);
});

// Routes
app.get('/', (req, res) => res.json({ ok: true, service: 'SkillX API' }));
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/matches', matchRoutes);
app.use('/sessions', sessionRoutes);
app.use('/tests', testRoutes);
app.use('/uploads', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/dialogflow', dialogflowRoutes);

// Socket.io
io.use(authMiddlewareSocket);
io.on('connection', (socket) => {
  registerChatHandlers(io, socket);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
