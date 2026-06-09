const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const config = require('./config');
const connectDB = require('./connection/mongoose.connection');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const SocketHandler = require('./socket/socketHandler');

// Routes
const userRouter = require('./routes/user.route');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.nodeEnv === 'development' ? true : config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));


app.use(cors({
  origin: config.nodeEnv === 'development' ? true : config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting (disabled in development)
if (config.nodeEnv === 'production') {
  app.use('/api/', apiLimiter);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint for Render health checks
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Chat Backend API is running',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      api: '/api/user',
    },
  });
});

// API routes
app.use('/api/user', userRouter);

// Initialize Socket.io handlers
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

// Make io and socketHandler available to routes
app.set('io', io);
app.set('socketHandler', socketHandler);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const HOST = config.nodeEnv === 'production' ? '0.0.0.0' : 'localhost';
server.listen(config.port, HOST, () => {
  logger.info(`Server running on ${HOST}:${config.port} in ${config.nodeEnv} mode`);
  console.log(`🚀 Server running on http://${HOST}:${config.port}`);
  console.log(`📡 Socket.io ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
  console.error('Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('Uncaught Exception:', error);
  // Give the process time to log before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle warnings
process.on('warning', (warning) => {
  logger.warn('Node.js Warning:', warning);
});

module.exports = { app, server, io };
