"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_1 = require("./utils/supabase");
const email_1 = require("./utils/email");
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const profiles_1 = __importDefault(require("./routes/profiles"));
const matches_1 = __importDefault(require("./routes/matches"));
const messages_1 = __importDefault(require("./routes/messages"));
const documents_1 = __importDefault(require("./routes/documents"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const admin_1 = __importDefault(require("./routes/admin"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const plans_1 = __importDefault(require("./routes/plans"));
const health_1 = __importDefault(require("./routes/health"));
const demo_1 = __importDefault(require("./routes/demo"));
// Import socket handlers
const messageHandlers_1 = require("./sockets/messageHandlers");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
// Initialize Prisma
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
});
// Initialize Socket.io with proper CORS
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.NODE_ENV === "production"
            ? [process.env.FRONTEND_URL]
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
});
// Setup Socket.io message handlers
(0, messageHandlers_1.setupMessageHandlers)(io);
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || "*"],
        },
    },
}));
// Logging middleware
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// CORS middleware
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://au-pair.netlify.app",
        process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "au-pair-backend",
        version: "1.0.0",
        environment: process.env.NODE_ENV,
    });
});
// Health check (no authentication required)
app.use("/health", health_1.default);
// Demo routes (no authentication required)
app.use("/api/demo", demo_1.default);
// API Routes
app.use("/api/auth", auth_1.default);
app.use("/api/users", users_1.default);
app.use("/api/profiles", profiles_1.default);
app.use("/api/matches", matches_1.default);
app.use("/api/messages", messages_1.default);
app.use("/api/documents", documents_1.default);
app.use("/api/bookings", bookings_1.default);
app.use("/api/calendar", calendar_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/dashboard", dashboard_1.default);
app.use("/api/plans", plans_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err.stack);
    if (err.message === "Not allowed by CORS") {
        return res
            .status(403)
            .json({ message: "CORS error: Origin not allowed" });
    }
    res.status(500).json({
        message: "Internal server error",
        error: process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong",
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found",
        path: req.path,
        method: req.method,
    });
});
// Application startup function
async function startServer() {
    console.log("🔧 Starting application services...");
    // Check critical connections
    const dbConnected = await (0, supabase_1.checkDatabaseConnection)();
    const emailConnected = await (0, email_1.verifyEmailConnection)();
    if (!dbConnected) {
        console.error("⚠️ WARNING: Supabase database connection failed. Application may not function correctly.");
    }
    if (!emailConnected) {
        console.warn("⚠️ WARNING: Email service connection failed. Verification emails will not be sent.");
    }
    // Start server even if some services are down
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
    server.listen(parseInt(PORT, 10), host, () => {
        console.log(`🚀 Au-pair backend server running on ${host}:${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://${host}:${PORT}/health`);
        console.log(`🌐 CORS allowed origins: ${process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "localhost:3000"}`);
        console.log(`✅ Services status: Database: ${dbConnected ? "Connected" : "Failed"}, Email: ${emailConnected ? "Connected" : "Failed"}`);
    });
}
// Start the server
startServer().catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
});
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
        console.log("HTTP server closed");
        try {
            await exports.prisma.$disconnect();
            console.log("Database connection closed");
            process.exit(0);
        }
        catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    });
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.log("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
});
//# sourceMappingURL=index.js.map