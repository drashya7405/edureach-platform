import "dotenv/config";
import express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.ts";
import chatRoutes from "./routes/chat.routes.ts";
import errorHandler from "./middleware/error-handler.middleware.ts";
import connectDB, { getDatabaseHealth } from "./config/database.config.ts";

const app: Application = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, server-to-server, health checks)
      if (!origin) return callback(null, true);

      const clientEnv = process.env.CLIENT_URL || "";
      const configured = clientEnv
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);

      const isAllowed =
        configured.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.endsWith(".vercel.app");

      if (isAllowed || configured.length === 0) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req: Request, res: Response) => {
  const database = getDatabaseHealth();

  res.status(database.state === "connected" ? 200 : 503).json({
    success: database.state === "connected",
    message: database.state === "connected" ? "Server is healthy." : "Server is running, but database is not ready.",
    data: {
      server: "up",
      database,
      auth: {
        jwtConfigured: Boolean(process.env.JWT_SECRET),
      },
      ai: {
        googleApiConfigured: Boolean(process.env.GOOGLE_API_KEY),
        chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash",
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// Ensure database connection is active for data API routes
app.use(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.MONGODB_URI) {
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

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);

export default app;
