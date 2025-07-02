import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import profilesRoutes from './routes/profiles';
import matchesRoutes from './routes/matches';
import messagesRoutes from './routes/messages';
import documentsRoutes from './routes/documents';
import bookingsRoutes from './routes/bookings';
import calendarRoutes from './routes/calendar';
import adminRoutes from './routes/admin';

// Import socket handlers
import { setupMessageHandlers } from './sockets/messageHandlers';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Prisma
export const prisma = new PrismaClient();

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || '*'
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup Socket.io message handlers
setupMessageHandlers(io);

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || '*'
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
  });
});