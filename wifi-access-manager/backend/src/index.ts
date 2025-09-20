import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

import authRoutes from './routes/auth';
import accessPointRoutes from './routes/accessPoints';
import speedTestRoutes from './routes/speedTest';
import wigleRoutes from './routes/wigle';
import organizationRoutes from './routes/organizations';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './db/connection';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'wifi-access-manager' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/access-points', accessPointRoutes);
app.use('/api/speed-test', speedTestRoutes);
app.use('/api/wigle', wigleRoutes);
app.use('/api/organizations', organizationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info('New WebSocket connection');

  socket.on('join-organization', (organizationId) => {
    socket.join(`org-${organizationId}`);
  });

  socket.on('leave-organization', (organizationId) => {
    socket.leave(`org-${organizationId}`);
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket connection closed');
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };