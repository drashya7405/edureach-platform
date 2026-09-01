import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { hashPassword, comparePassword } from "../utils/password.util.ts";
import { generateToken } from "../utils/jwt.util.ts";

const getRequestMeta = (req: Request) => ({
  email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined,
  ip: req.ip,
  userAgent: req.get("user-agent") || "unknown",
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register — Public — Create new account
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const rawPhone = typeof req.body?.phone === "string" && req.body.phone.trim() ? req.body.phone.trim() : null;

    if (!rawName || !rawEmail || !rawPassword) {
      res.status(400).json({
        success: false,
        message: "Full name, email address, and password are required.",
      });
      return;
    }

    if (rawName.length < 2 || rawName.length > 100) {
      res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 100 characters.",
      });
      return;
    }

    if (!EMAIL_REGEX.test(rawEmail)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
      return;
    }

    if (rawPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    const existingUser = await User.findOne({ email: rawEmail });
    if (existingUser) {
      console.warn("Register blocked: duplicate email", getRequestMeta(req));
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const hashedPassword = await hashPassword(rawPassword);
    const user = await User.create({
      name: rawName,
      email: rawEmail,
      password: hashedPassword,
      phone: rawPhone,
    });

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
    });
    console.info("Register success", { userId: user._id.toString(), ...getRequestMeta(req) });
  } catch (error: any) {
    if (error?.code === 11000) {
      console.warn("Register blocked: duplicate key", getRequestMeta(req));
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((e: any) => e.message)
        .join(", ");
      res.status(400).json({
        success: false,
        message: messages || "Validation failed.",
      });
      return;
    }

    console.error("Register failed unexpectedly", getRequestMeta(req), error);
    next(error);
  }
};

// POST /api/auth/login — Public — Verify credentials, return JWT
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";

    if (!rawEmail || !rawPassword) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const user = await User.findOne({ email: rawEmail });
    if (!user) {
      console.warn("Login failed: user not found", getRequestMeta(req));
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const isPasswordValid = await comparePassword(rawPassword, user.password);
    if (!isPasswordValid) {
      console.warn("Login failed: invalid password", getRequestMeta(req));
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
    });
    console.info("Login success", { userId: user._id.toString(), ...getRequestMeta(req) });
  } catch (error) {
    console.error("Login failed unexpectedly", getRequestMeta(req), error);
    next(error);
  }
};

// GET /api/auth/me — Protected — Return current user profile
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser) {
      res.status(401).json({ success: false, message: "Not authenticated." });
      return;
    }

    const user = await User.findById(currentUser.userId).select("-password");
    if (!user) {
      console.warn("Auth lookup failed: user missing", { userId: currentUser.userId, ip: req.ip });
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error("Get current user failed", { userId: (req as any).user?.userId, ip: req.ip }, error);
    next(error);
  }
};
