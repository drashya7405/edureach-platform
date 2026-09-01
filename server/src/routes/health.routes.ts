import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get("/ready", (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const isDbReady = dbState === 1;

  if (isDbReady) {
    res.status(200).json({
      success: true,
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: "not_ready",
      database: dbState === 2 ? "connecting" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/", (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      server: "up",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbState === 1 ? "connected" : "disconnected",
        readyState: dbState,
      },
      auth: {
        jwtConfigured: Boolean(process.env.JWT_SECRET),
      },
      ai: {
        googleApiConfigured: Boolean(process.env.GOOGLE_API_KEY),
      },
    },
  });
});

export default router;
