"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../utils/supabase");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Authentication token required" });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        // Check if user exists and is active
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select("id, email, role, isActive")
            .eq("id", decoded.userId)
            .single();
        if (error || !user || !user.isActive) {
            return res.status(401).json({ message: "User not found or inactive" });
        }
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        console.error("❌ Authentication error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required." });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Insufficient permissions." });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map