import express from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user's availability
router.get('/availability', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const availability = await prisma.availability.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    res.json({ availability });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set availability
router.post('/availability', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { date, startTime, endTime, timezone } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, start time, and end time are required' });
    }

    // Check if availability already exists for this date
    const existingAvailability = await prisma.availability.findFirst({
      where: {
        userId,
        date: new Date(date)
      }
    });

    if (existingAvailability) {
      // Update existing
      const updated = await prisma.availability.update({
        where: { id: existingAvailability.id },
        data: {
          startTime,
          endTime,
          timezone: timezone || 'UTC'
        }
      });
      res.json({ message: 'Availability updated', availability: updated });
    } else {
      // Create new
      const availability = await prisma.availability.create({
        data: {
          userId,
          date: new Date(date),
          startTime,
          endTime,
          timezone: timezone || 'UTC'
        }
      });
      res.json({ message: 'Availability created', availability });
    }
  } catch (error) {
    console.error('Set availability error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get bookings
router.get('/bookings', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        auPair: {
          select: {
            id: true,
            email: true,
            role: true,
            auPairProfile: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        host: {
          select: {
            id: true,
            email: true,
            role: true,
            hostFamilyProfile: {
              select: { familyName: true, contactPersonName: true }
            }
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create booking request
router.post('/bookings', async (req: AuthRequest, res) => {
  try {
    const requesterId = req.user!.id;
    const { receiverId, scheduledDate, scheduledTime, duration, notes, bookingType } = req.body;

    if (!receiverId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ message: 'Receiver, date, and time are required' });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isActive: true }
    });

    if (!receiver || !receiver.isActive) {
      return res.status(404).json({ message: 'Receiver not found or inactive' });
    }

    // Check if users have an approved match
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { hostId: requesterId, auPairId: receiverId, status: 'APPROVED' },
          { hostId: receiverId, auPairId: requesterId, status: 'APPROVED' }
        ]
      }
    });

    if (!match) {
      return res.status(403).json({ message: 'You can only book with approved matches' });
    }

    const booking = await prisma.booking.create({
      data: {
        auPairId: req.user!.role === 'AU_PAIR' ? requesterId : receiverId,
        hostId: req.user!.role === 'HOST_FAMILY' ? requesterId : receiverId,
        requesterId,
        receiverId,
        scheduledDate: new Date(scheduledDate),
        startDate: new Date(scheduledDate),
        endDate: new Date(scheduledDate),
        totalHours: duration || 1,
        notes,
        status: 'PENDING'
      },
      include: {
        auPair: {
          select: {
            id: true,
            email: true,
            auPairProfile: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        host: {
          select: {
            id: true,
            email: true,
            role: true,
            hostFamilyProfile: {
              select: { familyName: true, contactPersonName: true }
            }
          }
        }
      }
    });

    res.status(201).json({ message: 'Booking request created', booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update booking status
router.put('/bookings/:bookingId', async (req: AuthRequest, res) => {
  try {
    const { bookingId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user!.id;

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only receiver can approve/reject, only requester can cancel
    if (status === 'CANCELLED' && booking.requesterId !== userId) {
      return res.status(403).json({ message: 'Only requester can cancel' });
    }
    if ((status === 'APPROVED' || status === 'REJECTED') && booking.receiverId !== userId) {
      return res.status(403).json({ message: 'Only receiver can approve/reject' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        notes: notes || booking.notes
      },
      include: {
        auPair: {
          select: {
            id: true,
            email: true,
            auPairProfile: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        host: {
          select: {
            id: true,
            email: true,
            role: true,
            hostFamilyProfile: {
              select: { familyName: true, contactPersonName: true }
            }
          }
        }
      }
    });

    res.json({ message: 'Booking status updated', booking: updatedBooking });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;