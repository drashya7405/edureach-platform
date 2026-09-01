import type { Request, Response, NextFunction } from "express";

export const sanitizeEmail = (email?: string): string | undefined => {
  if (!email || typeof email !== "string") return undefined;
  const [user, domain] = email.trim().toLowerCase().split("@");
  if (!user || !domain) return undefined;
  const maskedUser = user.length <= 2 ? user : `${user.slice(0, 2)}***`;
  return `${maskedUser}@${domain}`;
};

export const getSafeRequestMeta = (req: Request) => {
  return {
    method: req.method,
    path: req.originalUrl || req.path,
    ip: req.ip || req.socket.remoteAddress || "unknown",
    userAgent: req.get("user-agent") || "unknown",
    maskedEmail: sanitizeEmail(req.body?.email),
  };
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    const logLevel = res.statusCode >= 500 ? "error" : isError ? "warn" : "info";

    const logPayload = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      status: res.statusCode,
      durationMs: duration,
      method: req.method,
      path: req.originalUrl || req.path,
      ip: req.ip || "unknown",
    };

    if (res.statusCode >= 500) {
      console.error(JSON.stringify(logPayload));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify(logPayload));
    } else if (process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify(logPayload));
    }
  });

  next();
};
