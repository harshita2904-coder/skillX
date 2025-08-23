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
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://skill-x-client.vercel.app',
  process.env.CLIENT_ORIGIN
].filter(Boolean); // Remove any undefined values

const io = new SocketIOServer(server, {
  cors: { 
    origin: allowedOrigins, 
    methods: ['GET','POST'],
    credentials: true
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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    console.log('CORS check for origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'X-Forwarded-For', 'X-Forwarded-Proto'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204,
  preflightContinue: false
};

// Apply CORS FIRST, before any other middleware
app.use(cors(corsOptions));

// Add debugging middleware for CORS issues
app.use((req, res, next) => {
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
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

// Test CORS endpoint
app.get('/test-cors', (req, res) => {
  console.log('Test CORS endpoint called');
  console.log('Origin:', req.headers.origin);
  res.json({ 
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: allowedOrigins,
      origin: req.headers.origin
    }
  });
});



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

// Log environment information for debugging
console.log('Environment Information:');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLIENT_ORIGIN:', process.env.CLIENT_ORIGIN);
console.log('Allowed Origins:', allowedOrigins);
console.log('MongoDB URI:', MONGO_URI ? 'Set' : 'Not set');

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
