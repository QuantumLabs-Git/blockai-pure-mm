require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const redis = require('redis');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');

// Import routers
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const warmupRouter = require('./routes/warmup');
const walletRouter = require('./routes/wallet');
const tradingRouter = require('./routes/trading');
const tokenRouter = require('./routes/token');
const projectRouter = require('./routes/project');

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Create Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins in development, same as Express CORS
      callback(null, true);
    },
    credentials: true
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blockai-mm')
  .then(() => {
    logger.info('Connected to MongoDB');
  }).catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Connect to Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redisClient.connect().then(() => {
  logger.info('Connected to Redis');
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in development
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Allow both HTTP and HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cross-site requests
  }
}));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', authMiddleware, projectRouter);
app.use('/api/wallet', authMiddleware, walletRouter);
app.use('/api/warmup', authMiddleware, warmupRouter);
app.use('/api/mexc', authMiddleware, require('./routes/mexc'));
app.use('/api/trading', authMiddleware, tradingRouter);
app.use('/api/token', authMiddleware, tokenRouter);
app.use('/api/multisender', authMiddleware, require('./routes/multisender'));
app.use('/api/mexc-distribution', authMiddleware, require('./routes/mexc-distribution'));
app.use('/api/launch', authMiddleware, require('./routes/launch'));
app.use('/api', authMiddleware, apiRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Socket.io connection handling
io.use((socket, next) => {
  // Implement socket authentication
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  // Verify token and attach user to socket
  next();
});

io.on('connection', (socket) => {
  logger.info('New socket connection:', socket.id);
  
  // Handle warmup log streaming
  socket.on('subscribe:warmup', (instanceId) => {
    socket.join(`warmup:${instanceId}`);
  });
  
  socket.on('unsubscribe:warmup', (instanceId) => {
    socket.leave(`warmup:${instanceId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = { app, io, redisClient };