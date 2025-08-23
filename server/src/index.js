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
// Base allowed origins for local dev and known client
const baseAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://skill-x-client.vercel.app'
];

// Extend with environment-provided origins (comma-separated)
const envAllowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.RAILWAY_STATIC_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [])
];

// Final list with falsy removed and duplicates eliminated
const allowedOrigins = Array.from(new Set([...baseAllowedOrigins, ...envAllowedOrigins].filter(Boolean)));

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

// Explicit OPTIONS handler for all routes
app.options('*', (req, res) => {
  console.log('=== PREFLIGHT REQUEST ===');
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.headers['access-control-request-method']);
  console.log('Headers:', req.headers['access-control-request-headers']);
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('Set Access-Control-Allow-Origin to:', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, X-Forwarded-For, X-Forwarded-Proto');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  console.log('Preflight response sent');
  res.sendStatus(204);
});

// Add debugging middleware for CORS issues
app.use((req, res, next) => {
  console.log('=== REQUEST DEBUG ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  console.log('User-Agent:', req.headers['user-agent']);
  console.log('====================');
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

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Server is ready to accept connections');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
