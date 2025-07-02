"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all users (simple endpoint)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const users = await index_1.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get current user
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await index_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                isEmailVerified: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users-simple.js.map