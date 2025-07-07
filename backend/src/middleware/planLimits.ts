import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma } from "../index";

// Plan limits configuration
const PLAN_LIMITS = {
  FREE: {
    FAMILY: {
      profileViews: 10,
      messagesPerDay: 5,
      contactRequests: 3,
    },
    AU_PAIR: {
      profileViews: 15,
      messagesPerDay: 5,
      contactRequests: 5,
    },
  },
  STANDARD: {
    FAMILY: {
      profileViews: 50,
      messagesPerDay: 25,
      contactRequests: 15,
    },
    AU_PAIR: {
      profileViews: 75,
      messagesPerDay: 25,
      contactRequests: 20,
    },
  },
  PREMIUM: {
    FAMILY: {
      profileViews: -1, // unlimited
      messagesPerDay: -1,
      contactRequests: -1,
    },
    AU_PAIR: {
      profileViews: -1,
      messagesPerDay: -1,
      contactRequests: -1,
    },
  },
  VERIFIED: {
    FAMILY: {
      profileViews: -1,
      messagesPerDay: -1,
      contactRequests: -1,
    },
    AU_PAIR: {
      profileViews: -1,
      messagesPerDay: -1,
      contactRequests: -1,
    },
  },
};

interface PlanCheckOptions {
  action: "profileView" | "message" | "contactRequest";
  targetUserId?: string;
}

// Helper function to get user's current plan status
async function getUserPlanStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planType: true,
      planRole: true,
      planExpiry: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if plan is expired
  const isExpired = user.planExpiry && new Date() > user.planExpiry;

  // If expired, downgrade to FREE
  const effectivePlanType = isExpired ? "FREE" : user.planType;

  // Determine plan role based on user role if not set
  let planRole = user.planRole;
  if (!planRole) {
    planRole = user.role === "HOST_FAMILY" ? "FAMILY" : "AU_PAIR";
  }

  return {
    planType: effectivePlanType,
    planRole: planRole,
    isExpired,
    user,
  };
}

// Helper function to get current usage counts
async function getCurrentUsage(userId: string, action: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (action) {
    case "message":
      return await prisma.message.count({
        where: {
          senderId: userId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

    case "contactRequest":
      return await prisma.match.count({
        where: {
          OR: [{ hostId: userId }, { auPairId: userId }],
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

    case "profileView":
      // This would require implementing a profile views tracking system
      // For now, return 0 as a placeholder
      return 0;

    default:
      return 0;
  }
}

export const checkPlanLimits = (options: PlanCheckOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { action, targetUserId } = options;

      // Get user's plan status
      const planStatus = await getUserPlanStatus(userId);
      const { planType, planRole, isExpired } = planStatus;

      // If plan is expired, log and potentially notify user
      if (isExpired) {
        console.log(`User ${userId} plan expired, using FREE limits`);
      }

      // Get plan limits for the user
      const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS];
      if (!limits) {
        console.error(`Unknown plan type: ${planType}`);
        return res.status(500).json({ message: "Invalid plan configuration" });
      }

      const userLimits = limits[planRole as keyof typeof limits];
      if (!userLimits) {
        console.error(`Unknown plan role: ${planRole} for plan: ${planType}`);
        return res
          .status(500)
          .json({ message: "Invalid plan role configuration" });
      }

      // Check specific limits based on action
      let limitKey: keyof typeof userLimits;
      let currentUsage: number;

      switch (action) {
        case "profileView":
          limitKey = "profileViews";
          currentUsage = await getCurrentUsage(userId, "profileView");
          break;
        case "message":
          limitKey = "messagesPerDay";
          currentUsage = await getCurrentUsage(userId, "message");
          break;
        case "contactRequest":
          limitKey = "contactRequests";
          currentUsage = await getCurrentUsage(userId, "contactRequest");
          break;
        default:
          return res.status(400).json({ message: "Invalid action type" });
      }

      const limit = userLimits[limitKey];

      // -1 means unlimited
      if (limit !== -1 && currentUsage >= limit) {
        console.log(
          `User ${userId} exceeded ${action} limit: ${currentUsage}/${limit} (plan: ${planType}, role: ${planRole})`,
        );

        return res.status(429).json({
          message: `You have reached your ${action} limit for today.`,
          limit: limit,
          current: currentUsage,
          planType: planType,
          upgradeRequired: planType === "FREE",
          suggestion:
            planType === "FREE"
              ? "Upgrade to a paid plan for higher limits"
              : "Consider upgrading to Premium for unlimited access",
        });
      }

      // Store plan info in request for potential use in route handlers
      req.planInfo = {
        planType,
        planRole,
        isExpired,
        limits: userLimits,
        currentUsage: {
          [action]: currentUsage,
        },
      };

      console.log(
        `Plan check passed for user ${userId}: ${action} (${currentUsage}/${limit === -1 ? "∞" : limit})`,
      );
      next();
    } catch (error) {
      console.error("Plan limits check error:", error);
      res.status(500).json({ message: "Error checking plan limits" });
    }
  };
};

// Export helper function for manual plan checks
export async function checkUserPlanAccess(
  userId: string,
  action: string,
): Promise<{
  allowed: boolean;
  reason?: string;
  planInfo?: any;
}> {
  try {
    const planStatus = await getUserPlanStatus(userId);
    const { planType, planRole, isExpired } = planStatus;

    const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS];
    const userLimits = limits[planRole as keyof typeof limits];

    let limitKey: keyof typeof userLimits;
    switch (action) {
      case "profileView":
        limitKey = "profileViews";
        break;
      case "message":
        limitKey = "messagesPerDay";
        break;
      case "contactRequest":
        limitKey = "contactRequests";
        break;
      default:
        return { allowed: false, reason: "Invalid action type" };
    }

    const limit = userLimits[limitKey];
    const currentUsage = await getCurrentUsage(userId, action);

    return {
      allowed: limit === -1 || currentUsage < limit,
      reason:
        limit !== -1 && currentUsage >= limit
          ? `Limit exceeded: ${currentUsage}/${limit}`
          : undefined,
      planInfo: {
        planType,
        planRole,
        isExpired,
        limit,
        currentUsage,
      },
    };
  } catch (error) {
    console.error("Manual plan check error:", error);
    return { allowed: false, reason: "Error checking plan access" };
  }
}

// Extend AuthRequest interface to include plan info
declare global {
  namespace Express {
    interface Request {
      planInfo?: {
        planType: string;
        planRole: string;
        isExpired: boolean;
        limits: any;
        currentUsage: any;
      };
    }
  }
}
