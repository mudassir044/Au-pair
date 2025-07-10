"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Middleware to ensure admin access
const requireAdmin = (0, auth_1.authorize)("ADMIN");
// Get dashboard statistics
router.get("/dashboard", async (req, res) => {
    try {
        const [totalUsers, auPairs, hostFamilies, totalMatches, approvedMatches, pendingMatches, totalBookings, approvedBookings, pendingBookings, totalDocuments, pendingDocuments, verifiedDocuments, totalMessages,] = await Promise.all([
            index_1.prisma.user.count(),
            index_1.prisma.user.count({ where: { role: "AU_PAIR" } }),
            index_1.prisma.user.count({ where: { role: "HOST_FAMILY" } }),
            index_1.prisma.match.count(),
            index_1.prisma.match.count({ where: { status: "APPROVED" } }),
            index_1.prisma.match.count({ where: { status: "PENDING" } }),
            index_1.prisma.booking.count(),
            index_1.prisma.booking.count({ where: { status: "APPROVED" } }),
            index_1.prisma.booking.count({ where: { status: "PENDING" } }),
            index_1.prisma.document.count(),
            index_1.prisma.document.count({ where: { status: "PENDING" } }),
            index_1.prisma.document.count({ where: { status: "VERIFIED" } }),
            index_1.prisma.message.count(),
        ]);
        // Get recent activity
        const recentUsers = await index_1.prisma.user.findMany({
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
        const recentMatches = await index_1.prisma.match.findMany({
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
    }
    catch (error) {
        console.error("Get dashboard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get all users with pagination and filters
router.get("/users", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const role = req.query.role;
        const status = req.query.status;
        const search = req.query.search;
        const whereClause = {};
        if (role && ["AU_PAIR", "HOST_FAMILY", "ADMIN"].includes(role)) {
            whereClause.role = role;
        }
        if (status === "active") {
            whereClause.isActive = true;
        }
        else if (status === "inactive") {
            whereClause.isActive = false;
        }
        if (search) {
            whereClause.email = {
                contains: search,
                mode: "insensitive",
            };
        }
        const users = await index_1.prisma.user.findMany({
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
        const totalCount = await index_1.prisma.user.count({ where: whereClause });
        res.json({
            users,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
            },
        });
    }
    catch (error) {
        console.error("Get admin users error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Update user status
router.put("/users/:userId/status", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive must be a boolean" });
        }
        const user = await index_1.prisma.user.update({
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
    }
    catch (error) {
        console.error("Update user status error:", error);
        if (error.code === "P2025") {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get all matches with filters
router.get("/matches", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const hostId = req.query.hostId;
        const auPairId = req.query.auPairId;
        const whereClause = {};
        if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            whereClause.status = status;
        }
        const matches = await index_1.prisma.match.findMany({
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
        const totalCount = await index_1.prisma.match.count({ where: whereClause });
        res.json({
            matches,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
            },
        });
    }
    catch (error) {
        console.error("Get admin matches error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get all bookings with filters
router.get("/bookings", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const offset = (page - 1) * limit;
        const whereClause = {};
        if (status &&
            ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {
            whereClause.status = status;
        }
        const bookings = await index_1.prisma.booking.findMany({
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
        const totalCount = await index_1.prisma.booking.count({ where: whereClause });
        res.json({
            bookings,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
            },
        });
    }
    catch (error) {
        console.error("Get admin bookings error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Delete user (admin only)
router.delete("/users/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        // Prevent deleting yourself
        if (userId === req.user.id) {
            return res
                .status(400)
                .json({ message: "Cannot delete your own account" });
        }
        await index_1.prisma.user.delete({
            where: { id: userId },
        });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("Delete user error:", error);
        if (error.code === "P2025") {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
});
// Create admin user
router.post("/users/create-admin", async (req, res) => {
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
        const existingUser = await index_1.prisma.user.findUnique({
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
        const user = await index_1.prisma.user.create({
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
    }
    catch (error) {
        console.error("Create admin user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get all messages with filters
router.get("/messages", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const whereClause = {};
        // Add filters
        const messages = await index_1.prisma.message.findMany({
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
        const totalCount = await index_1.prisma.message.count({ where: whereClause });
        res.json({
            messages,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
            },
        });
    }
    catch (error) {
        console.error("Get admin messages error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Send email to user
router.post("/users/:userId/send-email", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { subject, htmlContent } = req.body;
        if (!subject || !htmlContent) {
            return res
                .status(400)
                .json({ message: "Subject and HTML content are required" });
        }
        const user = await index_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Send email error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get all users with plan details
router.get("/plans", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const planType = req.query.planType;
        const expired = req.query.expired;
        const offset = (page - 1) * limit;
        const whereClause = {};
        // Filter by plan type
        if (planType &&
            ["FREE", "STANDARD", "PREMIUM", "VERIFIED"].includes(planType)) {
            whereClause.planType = planType;
        }
        // Filter by expired status
        if (expired === "true") {
            whereClause.planExpiry = {
                lt: new Date(),
            };
        }
        else if (expired === "false") {
            whereClause.OR = [
                { planExpiry: null },
                { planExpiry: { gte: new Date() } },
            ];
        }
        const users = await index_1.prisma.user.findMany({
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
        const totalCount = await index_1.prisma.user.count({ where: whereClause });
        // Add computed fields
        const usersWithPlanStatus = users.map((user) => {
            const isExpired = user.planExpiry && new Date() > user.planExpiry;
            const daysRemaining = user.planExpiry
                ? Math.max(0, Math.ceil((user.planExpiry.getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)))
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
        const planStats = await index_1.prisma.user.groupBy({
            by: ["planType"],
            _count: {
                planType: true,
            },
        });
        const expiredCount = await index_1.prisma.user.count({
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
    }
    catch (error) {
        console.error("Get admin plans error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Update user plan (admin only)
router.put("/plans/:userId", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { planType, planRole, addOns, daysToAdd } = req.body;
        // Validation
        if (planType &&
            !["FREE", "STANDARD", "PREMIUM", "VERIFIED"].includes(planType)) {
            return res.status(400).json({ message: "Invalid plan type" });
        }
        if (planRole && !["FAMILY", "AU_PAIR"].includes(planRole)) {
            return res.status(400).json({ message: "Invalid plan role" });
        }
        // Get current user
        const currentUser = await index_1.prisma.user.findUnique({
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
            const baseDate = newExpiry && newExpiry > new Date() ? newExpiry : new Date();
            newExpiry = new Date(baseDate);
            newExpiry.setDate(newExpiry.getDate() + daysToAdd);
        }
        // Build update data
        const updateData = {};
        if (planType !== undefined)
            updateData.planType = planType;
        if (planRole !== undefined)
            updateData.planRole = planRole;
        if (addOns !== undefined)
            updateData.addOns = JSON.stringify(addOns);
        if (newExpiry !== undefined)
            updateData.planExpiry = newExpiry;
        const updatedUser = await index_1.prisma.user.update({
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
        console.log(`Admin updated plan for user ${userId}: ${JSON.stringify(updateData)}`);
        res.json({
            message: "User plan updated successfully",
            user: {
                ...updatedUser,
                addOns: JSON.parse(updatedUser.addOns),
            },
        });
    }
    catch (error) {
        console.error("Update user plan error:", error);
        if (error.code === "P2025") {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get plan usage analytics
router.get("/plans/analytics", auth_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const timeRange = req.query.range || "30"; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        // Plan upgrades over time
        const planUpgrades = await index_1.prisma.user.findMany({
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
                return (total +
                    (revenueByPlan[upgrade.planType]?.[upgrade.planRole] || 0));
            }
            return total;
        }, 0);
        // Churn analysis
        const expiredPlans = await index_1.prisma.user.count({
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
            upgradesByPlan: planUpgrades.reduce((acc, upgrade) => {
                const key = `${upgrade.planType}_${upgrade.planRole}`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
        });
    }
    catch (error) {
        console.error("Get plan analytics error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map