import express from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's matches count
    const totalMatches = await prisma.match.count({
      where: {
        OR: [
          { hostId: userId },
          { auPairId: userId }
        ]
      }
    });

    const pendingMatches = await prisma.match.count({
      where: {
        OR: [
          { hostId: userId },
          { auPairId: userId }
        ],
        status: 'PENDING'
      }
    });

    const approvedMatches = await prisma.match.count({
      where: {
        OR: [
          { hostId: userId },
          { auPairId: userId }
        ],
        status: 'APPROVED'
      }
    });

    // Get user's bookings count
    const totalBookings = await prisma.booking.count({
      where: {
        OR: [
          { hostId: userId },
          { auPairId: userId }
        ]
      }
    });

    const upcomingBookings = await prisma.booking.count({
      where: {
        OR: [
          { hostId: userId },
          { auPairId: userId }
        ],
        scheduledDate: {
          gte: new Date()
        },
        status: {
          in: ['PENDING', 'APPROVED']
        }
      }
    });

    // Get unread messages count
    const unreadMessages = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    // Calculate profile completion percentage
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        auPairProfile: true,
        hostFamilyProfile: true
      }
    });

    let profileCompletion = 50; // Base completion for having an account

    if (user?.auPairProfile) {
      const profile = user.auPairProfile;
      let completedFields = 0;
      const totalFields = 10;

      if (profile.firstName) completedFields++;
      if (profile.lastName) completedFields++;
      if (profile.bio) completedFields++;
      //if (profile.location) completedFields++;
      if (profile.dateOfBirth) completedFields++;
      if (profile.profilePhotoUrl) completedFields++;
      if (profile.languages && profile.languages.length > 0) completedFields++;
      if (profile.skills && profile.skills.length > 0) completedFields++;
      if (profile.experience) completedFields++;
      if (profile.education) completedFields++;

      profileCompletion = Math.round((completedFields / totalFields) * 100);
    } else if (user?.hostFamilyProfile) {
      const profile = user.hostFamilyProfile;
      let completedFields = 0;
      const totalFields = 8;

      if (profile.familyName) completedFields++;
      if (profile.contactPersonName) completedFields++;
      if (profile.bio) completedFields++;
      if (profile.location) completedFields++;
      if (profile.profilePhotoUrl) completedFields++;
      if (profile.childrenAges && profile.childrenAges.length > 0) completedFields++;
      if (profile.requirements) completedFields++;
      if (profile.preferredLanguages && profile.preferredLanguages.length > 0) completedFields++;

      profileCompletion = Math.round((completedFields / totalFields) * 100);
    }

    const stats = {
      total_matches: totalMatches,
      pending_matches: pendingMatches,
      approved_matches: approvedMatches,
      total_bookings: totalBookings,
      upcoming_bookings: upcomingBookings,
      unread_messages: unreadMessages,
      profile_completion: profileCompletion
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

export default router;