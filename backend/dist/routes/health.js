"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../utils/supabase");
const email_1 = require("../utils/email");
const router = express_1.default.Router();
// Health check endpoint
router.get("/", async (req, res) => {
    try {
        const health = {
            status: "unknown",
            uptime: process.uptime(),
            timestamp: Date.now(),
            services: {
                database: { status: "unknown", error: undefined },
                email: { status: "unknown", error: undefined },
            },
        };
        // Check database connection
        try {
            const { data, error } = await supabase_1.supabase
                .from("users")
                .select("count")
                .limit(1);
            health.services.database.status = error ? "error" : "ok";
            if (error)
                health.services.database.error = error.message;
        }
        catch (dbError) {
            health.services.database.status = "error";
            health.services.database.error = dbError.message;
        }
        // Check email service
        try {
            const emailConnected = await (0, email_1.verifyEmailConnection)();
            health.services.email.status = emailConnected ? "ok" : "error";
        }
        catch (emailError) {
            health.services.email.status = "error";
            health.services.email.error = emailError.message;
        }
        // Determine overall status
        const allOk = Object.values(health.services).every((service) => service.status === "ok");
        health.status = allOk ? "ok" : "degraded";
        const httpStatus = allOk ? 200 : 503;
        return res.status(httpStatus).json(health);
    }
    catch (error) {
        console.error("❌ Health check error:", error);
        return res.status(500).json({
            status: "error",
            error: error.message,
            timestamp: Date.now(),
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map