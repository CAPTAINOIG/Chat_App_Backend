const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

// CORS - Allow all origins in development
const corsOptions = config.nodeEnv === 'development' 
  ? {
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    }
  : {
      origin: config.cors.origin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: config.cors.credentials,
    };

app.use(cors(corsOptions));

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
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/user', userRouter);

// Initialize Socket.io handlers
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`🚀 Server running on http://localhost:${config.port}`);
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

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = { app, server, io };
