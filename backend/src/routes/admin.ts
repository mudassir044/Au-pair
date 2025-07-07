import express, { Request, Response } from "express";
import { prisma } from "../index";
import { AuthRequest, authenticate, authorize } from "../middleware/auth";

const router = express.Router();

// Middleware to ensure admin access
const requireAdmin = authorize("ADMIN");

// Get dashboard statistics
router.get("/dashboard", async (req: AuthRequest, res) => {
  try {
    const [
      totalUsers,
      auPairs,
      hostFamilies,
      totalMatches,
      approvedMatches,
      pendingMatches,
      totalBookings,
      approvedBookings,
      pendingBookings,
      totalDocuments,
      pendingDocuments,
      verifiedDocuments,
      totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "AU_PAIR" } }),
      prisma.user.count({ where: { role: "HOST_FAMILY" } }),
      prisma.match.count(),
      prisma.match.count({ where: { status: "APPROVED" } }),
      prisma.match.count({ where: { status: "PENDING" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "APPROVED" } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.document.count(),
      prisma.document.count({ where: { status: "PENDING" } }),
      prisma.document.count({ where: { status: "VERIFIED" } }),
      prisma.message.count(),
    ]);

    // Get recent activity
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true,
        auPairProfile: {
          select: { firstName: true, lastName: true },
        },
        hostFamilyProfile: {
          select: { familyName: true, contactPersonName: true },
        },
      },
    });

    const recentMatches = await prisma.match.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            hostFamilyProfile: {
              select: { familyName: true, contactPersonName: true },
            },
          },
        },
        auPair: {
          select: {
            id: true,
            email: true,
            auPairProfile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const stats = {
      users: {
        total: totalUsers,
        auPairs,
        hostFamilies,
        activeUsers: totalUsers, // Simplified - could filter by isActive
      },
      matches: {
        total: totalMatches,
        approved: approvedMatches,
        pending: pendingMatches,
        rejected: totalMatches - approvedMatches - pendingMatches,
      },
      bookings: {
        total: totalBookings,
        approved: approvedBookings,
        pending: pendingBookings,
      },
      documents: {
        total: totalDocuments,
        pending: pendingDocuments,
        verified: verifiedDocuments,
        rejected: totalDocuments - pendingDocuments - verifiedDocuments,
      },
      messages: {
        total: totalMessages,
      },
    };

    res.json({
      stats,
      recentActivity: {
        users: recentUsers,
        matches: recentMatches,
      },
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all users with pagination and filters
router.get("/users", async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const whereClause: any = {};

    if (role && ["AU_PAIR", "HOST_FAMILY", "ADMIN"].includes(role)) {
      whereClause.role = role;
    }

    if (status === "active") {
      whereClause.isActive = true;
    } else if (status === "inactive") {
      whereClause.isActive = false;
    }

    if (search) {
      whereClause.email = {
        contains: search,
        mode: "insensitive",
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        auPairProfile: {
          select: { firstName: true, lastName: true, profilePhotoUrl: true },
        },
        hostFamilyProfile: {
          select: {
            familyName: true,
            contactPersonName: true,
            profilePhotoUrl: true,
          },
        },
        _count: {
          select: {
            documents: true,
            sentMessages: true,
            hostMatches: true,
            auPairMatches: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.user.count({ where: whereClause });

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user status
router.put(
  "/users/:userId/status",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          email: true,
          isActive: true,
          role: true,
        },
      });

      res.json({ message: "User status updated successfully", user });
    } catch (error: any) {
      console.error("Update user status error:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Get all matches with filters
router.get(
  "/matches",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const hostId = req.query.hostId as string;
      const auPairId = req.query.auPairId as string;

      const whereClause: any = {};
      if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        whereClause.status = status;
      }

      const matches = await prisma.match.findMany({
        where: whereClause,
        include: {
          host: {
            select: {
              id: true,
              email: true,
              hostFamilyProfile: {
                select: {
                  familyName: true,
                  contactPersonName: true,
                  profilePhotoUrl: true,
                },
              },
            },
          },
          auPair: {
            select: {
              id: true,
              email: true,
              auPairProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  profilePhotoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });

      const totalCount = await prisma.match.count({ where: whereClause });

      res.json({
        matches,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Get admin matches error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Get all bookings with filters
router.get("/bookings", async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (
      status &&
      ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(
        status,
      )
    ) {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        host: {
          select: {
            id: true,
            email: true,
            hostFamilyProfile: {
              select: { familyName: true, contactPersonName: true },
            },
          },
        },
        auPair: {
          select: {
            id: true,
            email: true,
            auPairProfile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.booking.count({ where: whereClause });

    res.json({
      bookings,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete user (admin only)
router.delete("/users/:userId", async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (userId === req.user!.id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create admin user
router.post("/users/create-admin", async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "ADMIN",
        isEmailVerified: true, // Auto-verify admin accounts
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({ message: "Admin user created successfully", user });
  } catch (error) {
    console.error("Create admin user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all messages with filters
router.get(
  "/messages",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const whereClause: any = {};
      // Add filters

      const messages = await prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      const totalCount = await prisma.message.count({ where: whereClause });

      res.json({
        messages,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Get admin messages error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Send email to user
router.post(
  "/users/:userId/send-email",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { subject, htmlContent } = req.body;

      if (!subject || !htmlContent) {
        return res
          .status(400)
          .json({ message: "Subject and HTML content are required" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // TODO: Implement email sending logic here using a service like SendGrid or Nodemailer
      // For now, just log the email details
      console.log(`Sending email to: ${user.email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${htmlContent}`);

      res.json({ message: "Email sent successfully (not really, just a log)" });
    } catch (error) {
      console.error("Send email error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Get all users with plan details
router.get(
  "/plans",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const planType = req.query.planType as string;
      const expired = req.query.expired as string;
      const offset = (page - 1) * limit;

      const whereClause: any = {};

      // Filter by plan type
      if (
        planType &&
        ["FREE", "STANDARD", "PREMIUM", "VERIFIED"].includes(planType)
      ) {
        whereClause.planType = planType;
      }

      // Filter by expired status
      if (expired === "true") {
        whereClause.planExpiry = {
          lt: new Date(),
        };
      } else if (expired === "false") {
        whereClause.OR = [
          { planExpiry: null },
          { planExpiry: { gte: new Date() } },
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          role: true,
          planType: true,
          planRole: true,
          planExpiry: true,
          addOns: true,
          isActive: true,
          createdAt: true,
          auPairProfile: {
            select: { firstName: true, lastName: true },
          },
          hostFamilyProfile: {
            select: { familyName: true, contactPersonName: true },
          },
          _count: {
            select: {
              sentMessages: true,
              hostMatches: true,
              auPairMatches: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });

      const totalCount = await prisma.user.count({ where: whereClause });

      // Add computed fields
      const usersWithPlanStatus = users.map((user) => {
        const isExpired = user.planExpiry && new Date() > user.planExpiry;
        const daysRemaining = user.planExpiry
          ? Math.max(
              0,
              Math.ceil(
                (user.planExpiry.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : null;

        return {
          ...user,
          addOns: JSON.parse(user.addOns),
          planStatus: {
            isExpired,
            daysRemaining,
            effectivePlan: isExpired ? "FREE" : user.planType,
          },
        };
      });

      // Get plan statistics
      const planStats = await prisma.user.groupBy({
        by: ["planType"],
        _count: {
          planType: true,
        },
      });

      const expiredCount = await prisma.user.count({
        where: {
          planExpiry: {
            lt: new Date(),
          },
        },
      });

      res.json({
        users: usersWithPlanStatus,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        statistics: {
          planDistribution: planStats,
          expiredPlans: expiredCount,
          totalUsers: totalCount,
        },
      });
    } catch (error) {
      console.error("Get admin plans error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Update user plan (admin only)
router.put(
  "/plans/:userId",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { planType, planRole, addOns, daysToAdd } = req.body;

      // Validation
      if (
        planType &&
        !["FREE", "STANDARD", "PREMIUM", "VERIFIED"].includes(planType)
      ) {
        return res.status(400).json({ message: "Invalid plan type" });
      }

      if (planRole && !["FAMILY", "AU_PAIR"].includes(planRole)) {
        return res.status(400).json({ message: "Invalid plan role" });
      }

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          planType: true,
          planExpiry: true,
          role: true,
        },
      });

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate new expiry if daysToAdd is provided
      let newExpiry = currentUser.planExpiry;
      if (daysToAdd && typeof daysToAdd === "number") {
        const baseDate =
          newExpiry && newExpiry > new Date() ? newExpiry : new Date();
        newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + daysToAdd);
      }

      // Build update data
      const updateData: any = {};
      if (planType !== undefined) updateData.planType = planType;
      if (planRole !== undefined) updateData.planRole = planRole;
      if (addOns !== undefined) updateData.addOns = JSON.stringify(addOns);
      if (newExpiry !== undefined) updateData.planExpiry = newExpiry;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          planType: true,
          planRole: true,
          planExpiry: true,
          addOns: true,
          updatedAt: true,
        },
      });

      console.log(
        `Admin updated plan for user ${userId}: ${JSON.stringify(updateData)}`,
      );

      res.json({
        message: "User plan updated successfully",
        user: {
          ...updatedUser,
          addOns: JSON.parse(updatedUser.addOns),
        },
      });
    } catch (error: any) {
      console.error("Update user plan error:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Get plan usage analytics
router.get(
  "/plans/analytics",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const timeRange = (req.query.range as string) || "30"; // days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Plan upgrades over time
      const planUpgrades = await prisma.user.findMany({
        where: {
          updatedAt: { gte: startDate },
          planType: { not: "FREE" },
        },
        select: {
          planType: true,
          planRole: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      // Revenue calculation (placeholder - would need actual pricing integration)
      const revenueByPlan = {
        STANDARD: { FAMILY: 29, AU_PAIR: 19 },
        PREMIUM: { FAMILY: 49, AU_PAIR: 39 },
        VERIFIED: { FAMILY: 299, AU_PAIR: 199 },
      };

      const estimatedRevenue = planUpgrades.reduce((total, upgrade) => {
        if (upgrade.planType !== "FREE" && upgrade.planRole) {
          return (
            total +
            (revenueByPlan[upgrade.planType as keyof typeof revenueByPlan]?.[
              upgrade.planRole as keyof typeof revenueByPlan.STANDARD
            ] || 0)
          );
        }
        return total;
      }, 0);

      // Churn analysis
      const expiredPlans = await prisma.user.count({
        where: {
          planExpiry: {
            gte: startDate,
            lt: new Date(),
          },
        },
      });

      res.json({
        timeRange: `${timeRange} days`,
        upgrades: planUpgrades.length,
        estimatedRevenue,
        expiredPlans,
        planUpgrades: planUpgrades,
        upgradesByPlan: planUpgrades.reduce((acc: any, upgrade) => {
          const key = `${upgrade.planType}_${upgrade.planRole}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      });
    } catch (error) {
      console.error("Get plan analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
