"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ message: 'Access denied. No token provided.' });
            return;
        }
        if (!process.env.JWT_ACCESS_SECRET) {
            console.error('JWT_ACCESS_SECRET not configured');
            res.status(500).json({ message: 'Server configuration error' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, isActive: true }
        });
        if (!user || !user.isActive) {
            res.status(401).json({ message: 'Invalid token or user deactivated.' });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Invalid token.' });
    }
};
exports.authMiddleware = authMiddleware;
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Access denied. Please authenticate.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
            return;
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
//# sourceMappingURL=auth.js.map