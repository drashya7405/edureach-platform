import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.ts";
import type { JWTPayload } from "../utils/jwt.util.ts";
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

    // 1. Primary: Extract JWT from Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // 2. Secondary / Fallback: Read JWT from HTTP-only cookie
    if (!token && req.cookies?.[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to continue.",
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({
          success: false,
          message: "Session has expired. Please log in again.",
        });
        return;
      }
      if (error.name === "JsonWebTokenError") {
        res.status(401).json({
          success: false,
          message: "Invalid authentication token. Please log in again.",
        });
        return;
      }
    }
    res.status(401).json({
      success: false,
      message: "Authentication failed. Please log in again.",
    });
  }
};

export default authMiddleware;
