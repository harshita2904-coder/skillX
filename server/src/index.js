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
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://skill-x-client.vercel.app',
  'https://skillx-production-5d56.up.railway.app',
  process.env.CLIENT_ORIGIN
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // For debugging, allow all origins temporarily
    console.log('CORS check for origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    // Always allow for now to debug the issue
    callback(null, true);
    
    // Uncomment the following for production security
    // if (allowedOrigins.indexOf(origin) !== -1) {
    //   callback(null, true);
    // } else {
    //   console.log('CORS blocked origin:', origin);
    //   callback(new Error('Not allowed by CORS'));
    // }
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
app.options('*', cors(corsOptions));

// Add debugging middleware for CORS issues
app.use((req, res, next) => {
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  next();
});

// Ensure CORS headers are set on all responses - AFTER cors package
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('Setting CORS headers for origin:', origin);
  
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('Set Access-Control-Allow-Origin to:', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, X-Forwarded-For, X-Forwarded-Proto');
  
  console.log('CORS headers set for request to:', req.url);
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
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
    timestamp: new Date().toISOString()
  });
});

// Explicit preflight handler for all routes
app.options('*', (req, res) => {
  console.log('Preflight request received for:', req.url);
  console.log('Origin:', req.headers.origin);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, X-Forwarded-For, X-Forwarded-Proto');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  console.log('Preflight response headers set');
  res.sendStatus(204);
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

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
