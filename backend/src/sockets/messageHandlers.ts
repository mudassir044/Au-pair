import { Server, Socket } from 'socket.io';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupMessageHandlers = (io: Server): void => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      if (!process.env.JWT_ACCESS_SECRET) {
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected to socket`);

    // Join user to their personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle sending messages
    socket.on('send_message', async (data: { receiverId: string; content: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { receiverId, content } = data;

        if (!receiverId || !content?.trim()) {
          socket.emit('error', { message: 'Receiver ID and content are required' });
          return;
        }

        // Verify receiver exists
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { id: true, isActive: true }
        });

        if (!receiver || !receiver.isActive) {
          socket.emit('error', { message: 'Receiver not found or inactive' });
          return;
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            senderId: socket.userId,
            receiverId,
            content: content.trim()
          },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                auPairProfile: {
                  select: { firstName: true, lastName: true }
                },
                hostFamilyProfile: {
                  select: { familyName: true, contactPersonName: true }
                }
              }
            }
          }
        });

        // Emit to sender (confirmation)
        socket.emit('message_sent', {
          id: message.id,
          content: message.content,
          receiverId: message.receiverId,
          createdAt: message.createdAt
        });

        // Emit to receiver (if online)
        socket.to(`user:${receiverId}`).emit('new_message', {
          id: message.id,
          senderId: message.senderId,
          senderName: message.sender.auPairProfile 
            ? `${message.sender.auPairProfile.firstName} ${message.sender.auPairProfile.lastName}`
            : message.sender.hostFamilyProfile?.contactPersonName || message.sender.email,
          content: message.content,
          createdAt: message.createdAt
        });

        console.log(`Message sent from ${socket.userId} to ${receiverId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle marking messages as read
    socket.on('mark_messages_read', async (data: { senderId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { senderId } = data;

        await prisma.message.updateMany({
          where: {
            senderId,
            receiverId: socket.userId,
            isRead: false
          },
          data: {
            isRead: true
          }
        });

        socket.emit('messages_marked_read', { senderId });

      } catch (error) {
        console.error('Mark messages read error:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  console.log('🔌 Socket.io message handlers initialized');
};