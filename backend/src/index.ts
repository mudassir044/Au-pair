import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { checkDatabaseConnection } from "./utils/supabase";
import { verifyEmailConnection } from "./utils/email";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import profilesRoutes from "./routes/profiles";
import matchesRoutes from "./routes/matches";
import messagesRoutes from "./routes/messages";
import documentsRoutes from "./routes/documents";
import bookingsRoutes from "./routes/bookings";
import calendarRoutes from "./routes/calendar";
import adminRoutes from "./routes/admin";
import dashboardRoutes from "./routes/dashboard";
import plansRoutes from "./routes/plans";
import healthRoutes from "./routes/health";

// Import socket handlers
import { setupMessageHandlers } from "./sockets/messageHandlers";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Prisma
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Initialize Socket.io with proper CORS
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL as string]
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
});

// Setup Socket.io message handlers
setupMessageHandlers(io);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", process.env.FRONTEND_URL || "*"],
      },
    },
  }),
);

// Logging middleware
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// CORS middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://au-pair.netlify.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use("/health", healthRoutes);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/plans", plansRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Error:", err.stack);

    if (err.message === "Not allowed by CORS") {
      return res
        .status(403)
        .json({ message: "CORS error: Origin not allowed" });
    }

    res.status(500).json({
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  },
);

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
  const dbConnected = await checkDatabaseConnection();
  const emailConnected = await verifyEmailConnection();

  if (!dbConnected) {
    console.error(
      "⚠️ WARNING: Supabase database connection failed. Application may not function correctly.",
    );
  }

  if (!emailConnected) {
    console.warn(
      "⚠️ WARNING: Email service connection failed. Verification emails will not be sent.",
    );
  }

  // Start server even if some services are down
  server.listen(parseInt(PORT as string, 10), () => {
    console.log(`🚀 Au-pair backend server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(
      `🌐 CORS allowed origins: ${process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "localhost:3000"}`,
    );
    console.log(
      `✅ Services status: Database: ${dbConnected ? "Connected" : "Failed"}, Email: ${emailConnected ? "Connected" : "Failed"}`,
    );
  });
}

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    console.log("HTTP server closed");

    try {
      await prisma.$disconnect();
      console.log("Database connection closed");
      process.exit(0);
    } catch (error) {
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
