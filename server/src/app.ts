import "dotenv/config";
import express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.ts";
import chatRoutes from "./routes/chat.routes.ts";
import healthRoutes from "./routes/health.routes.ts";
import errorHandler from "./middleware/error-handler.middleware.ts";
import connectDB from "./config/database.config.ts";
import { requestLogger } from "./utils/logger.util.ts";
import { generalApiLimiter } from "./middleware/rate-limiter.middleware.ts";

const app: Application = express();

// Trust proxy headers if running behind reverse proxy / load balancer
app.set("trust proxy", 1);

// CORS configuration — production-safe origin control
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, health probes)
      if (!origin) return callback(null, true);

      const clientEnv = process.env.CLIENT_URL || process.env.FRONTEND_URL || "";
      const allowedList = clientEnv
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);

      const isDev = process.env.NODE_ENV !== "production";
      const isLocalhost =
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:");

      if (allowedList.includes(origin)) {
        return callback(null, true);
      }

      if (isDev && (isLocalhost || allowedList.length === 0)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy: Origin ${origin} not allowed.`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Request body size limits (prevent memory exhaustion attacks)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// HTTP-Only Cookie Parser
app.use(cookieParser());

// Structured Request Logger
app.use(requestLogger);

// Health check endpoints (no db middleware restriction)
app.use("/api/health", healthRoutes);

// Rate limiting for API traffic
app.use("/api", generalApiLimiter);

// Ensure database connection is active for data API routes (skipped in test mode)
app.use(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV !== "test" && process.env.MONGODB_URI) {
      await connectDB();
    }
    next();
  } catch (error) {
    console.error("Database connection failed for request:", error);
    res.status(503).json({
      success: false,
      message: "Database service unavailable. Please check your MongoDB connection.",
    });
  }
});

// Application API routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Centralized error handling
app.use(errorHandler);

export default app;
