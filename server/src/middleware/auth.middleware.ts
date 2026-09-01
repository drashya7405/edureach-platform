import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JWTPayload } from "../utils/jwt.util.ts";
import { AUTH_COOKIE_NAME } from "../utils/cookie.util.ts";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }

    // 2. Check Authorization: Bearer <token> header fallback
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in to continue.",
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
        return;
      }
      if (error.name === "JsonWebTokenError") {
        res.status(401).json({ success: false, message: "Invalid authentication token. Please sign in again." });
        return;
      }
    }
    res.status(401).json({ success: false, message: "Authentication failed. Please sign in again." });
  }
};

export default authMiddleware;
