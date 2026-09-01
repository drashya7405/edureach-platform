import express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.ts";
import chatRoutes from "./routes/chat.routes.ts";
import healthRoutes from "./routes/health.routes.ts";
import errorHandler from "./middleware/error-handler.middleware.ts";
import { requestLogger } from "./utils/logger.util.ts";
import { generalApiLimiter } from "./middleware/rate-limiter.middleware.ts";
import { connectDB } from "./config/database.config.ts";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);

// Health endpoints
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

// Mount application routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);

export default app;
