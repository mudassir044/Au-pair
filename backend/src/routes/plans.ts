import express, { Request, Response } from "express";
import { prisma } from "../index";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = express.Router();

// Plan pricing and duration configuration
const PLAN_CONFIG = {
  FREE: { duration: 0, addOnsAllowed: false },
  STANDARD: { duration: { FAMILY: 7, AU_PAIR: 30 }, addOnsAllowed: false },
  PREMIUM: { duration: { FAMILY: 7, AU_PAIR: 30 }, addOnsAllowed: true },
  VERIFIED: { duration: { FAMILY: 365, AU_PAIR: 365 }, addOnsAllowed: true },
};

const ALLOWED_ADDONS = ["boost", "early", "concierge"];

// Rate limiting
const upgradeCounts = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 5; // Max 5 upgrade attempts per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = upgradeCounts.get(userId);

  if (!userLimit || now - userLimit.lastReset > RATE_WINDOW) {
    upgradeCounts.set(userId, { count: 1, lastReset: now });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// POST /api/plans/upgrade - Upgrade user plan
router.post(
  "/upgrade",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { planType, role, addOns = [] } = req.body;

      // Rate limiting check
      if (!checkRateLimit(userId)) {
        console.log(`Rate limit exceeded for user ${userId} on plan upgrade`);
        return res.status(429).json({
          message: "Too many upgrade attempts. Please try again later.",
        });
      }

      // Validation
      if (
        !planType ||
        !["STANDARD", "PREMIUM", "VERIFIED"].includes(planType)
      ) {
        return res.status(400).json({
          message: "Invalid plan type. Must be STANDARD, PREMIUM, or VERIFIED.",
        });
      }

      if (!role || !["FAMILY", "AU_PAIR"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role. Must be FAMILY or AU_PAIR.",
        });
      }

      // Validate add-ons
      if (addOns.length > 0) {
        const invalidAddOns = addOns.filter(
          (addon: string) => !ALLOWED_ADDONS.includes(addon),
        );
        if (invalidAddOns.length > 0) {
          return res.status(400).json({
            message: `Invalid add-ons: ${invalidAddOns.join(", ")}. Allowed: ${ALLOWED_ADDONS.join(", ")}`,
          });
        }

        // Check if plan allows add-ons
        if (!PLAN_CONFIG[planType as keyof typeof PLAN_CONFIG].addOnsAllowed) {
          return res.status(400).json({
            message: `Add-ons are only allowed for PREMIUM and VERIFIED plans.`,
          });
        }
      }

      // Calculate plan expiry
      let planExpiry: Date | null = null;
      const config = PLAN_CONFIG[planType as keyof typeof PLAN_CONFIG];

      if (config.duration && typeof config.duration === "object") {
        const durationDays =
          config.duration[role as keyof typeof config.duration];
        planExpiry = new Date();
        planExpiry.setDate(planExpiry.getDate() + durationDays);
      }

      // Get current user data
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          planType: true,
          planRole: true,
          planExpiry: true,
          addOns: true,
        },
      });

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user plan
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          planType: planType,
          planRole: role,
          planExpiry: planExpiry,
          addOns: addOns,
          updatedAt: new Date(),
        },
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

      // Log the upgrade
      console.log(
        `Plan upgrade: User ${userId} upgraded to ${planType} (${role}) with addOns: [${addOns.join(", ")}], expires: ${planExpiry}`,
      );

      res.json({
        message: "Plan upgraded successfully",
        user: updatedUser,
        planDetails: {
          type: planType,
          role: role,
          expiry: planExpiry,
          addOns: addOns,
          durationDays:
            config.duration && typeof config.duration === "object"
              ? config.duration[role as keyof typeof config.duration]
              : null,
        },
      });
    } catch (error: any) {
      console.error("Plan upgrade error:", error);

      if (error.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(500).json({
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);

// GET /api/plans/current - Get current user plan
router.get(
  "/current",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          planType: true,
          planRole: true,
          planExpiry: true,
          addOns: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if plan is expired
      const isExpired = user.planExpiry && new Date() > user.planExpiry;

      res.json({
        plan: {
          type: user.planType,
          role: user.planRole,
          expiry: user.planExpiry,
          addOns: user.addOns,
          isExpired: isExpired,
          daysRemaining: user.planExpiry
            ? Math.max(
                0,
                Math.ceil(
                  (user.planExpiry.getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                ),
              )
            : null,
        },
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          memberSince: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Get current plan error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// GET /api/plans/available - Get available plans and pricing
router.get("/available", async (req: Request, res: Response) => {
  try {
    const plans = {
      FREE: {
        name: "Free",
        description: "Basic features to get started",
        duration: "Unlimited",
        features: [
          "Limited profile views",
          "Basic matching",
          "Limited messages",
        ],
        addOnsAllowed: false,
        price: 0,
      },
      STANDARD: {
        name: "Standard",
        description: "Enhanced features for active users",
        duration: { FAMILY: "7 days", AU_PAIR: "30 days" },
        features: [
          "Extended profile views",
          "Priority matching",
          "Unlimited messages",
        ],
        addOnsAllowed: false,
        price: { FAMILY: 29, AU_PAIR: 19 },
      },
      PREMIUM: {
        name: "Premium",
        description: "Full access with premium features",
        duration: { FAMILY: "7 days", AU_PAIR: "30 days" },
        features: [
          "Unlimited profile views",
          "Premium matching",
          "Video calls",
          "Add-ons available",
        ],
        addOnsAllowed: true,
        price: { FAMILY: 49, AU_PAIR: 39 },
      },
      VERIFIED: {
        name: "Verified",
        description: "Annual plan with verification badge",
        duration: { FAMILY: "365 days", AU_PAIR: "365 days" },
        features: [
          "All premium features",
          "Verification badge",
          "Priority support",
        ],
        addOnsAllowed: true,
        price: { FAMILY: 299, AU_PAIR: 199 },
      },
    };

    const addOns = {
      boost: {
        name: "Profile Boost",
        description: "Increase your profile visibility by 5x",
        price: 9.99,
      },
      early: {
        name: "Early Access",
        description: "Get early access to new matches",
        price: 4.99,
      },
      concierge: {
        name: "Concierge Service",
        description: "Personal assistance with matching",
        price: 19.99,
      },
    };

    res.json({ plans, addOns });
  } catch (error) {
    console.error("Get available plans error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
