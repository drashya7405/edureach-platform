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
    // 1. Try to read from HTTP-only cookie first
    let token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

    // 2. Fallback to Authorization header: Bearer <token>
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1]?.trim();
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
