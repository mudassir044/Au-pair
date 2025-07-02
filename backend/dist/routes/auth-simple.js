"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const jwt_1 = require("../utils/jwt");
const router = express_1.default.Router();
// Simple register endpoint
router.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        // Basic validation
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'Email, password, and role are required' });
        }
        if (!['AU_PAIR', 'HOST_FAMILY'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be AU_PAIR or HOST_FAMILY' });
        }
        // Check if user exists
        const existingUser = await index_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await index_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                isEmailVerified: true // Skip email verification for now
            }
        });
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user.id);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Simple login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        // Find user
        const user = await index_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user.id);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth-simple.js.map