import type { Request, Response, NextFunction } from "express";

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "info", message, ...meta }));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", message, ...meta }));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message, ...meta }));
  },
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      status: res.statusCode,
      durationMs,
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip || req.socket.remoteAddress,
    };
    if (res.statusCode >= 500) {
      console.error(JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify(logData));
    } else if (process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify(logData));
    }
  });
  next();
};
