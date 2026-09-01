import { Router } from "express";
import type { Request, Response } from "express";
import { getDatabaseHealth } from "../config/database.config.ts";

const router = Router();

// GET /api/health/live — Process Liveness Probe
router.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health/ready — Dependency Readiness Probe (MongoDB)
router.get("/ready", (_req: Request, res: Response) => {
  const dbHealth = getDatabaseHealth();
  const isReady = dbHealth.state === "connected";

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? "ready" : "not_ready",
    database: dbHealth.state,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health — General Health Overview
router.get("/", (_req: Request, res: Response) => {
  const dbHealth = getDatabaseHealth();
  const isHealthy = dbHealth.state === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? "EduReach Server is healthy." : "Server is running, but database is not ready.",
    data: {
      server: "up",
      database: {
        state: dbHealth.state,
        connected: isHealthy,
      },
      auth: {
        jwtConfigured: Boolean(process.env.JWT_SECRET),
      },
      ai: {
        googleApiConfigured: Boolean(process.env.GOOGLE_API_KEY),
        chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash",
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
