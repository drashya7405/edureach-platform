import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { hashPassword, comparePassword } from "../utils/password.util.ts";
import { generateToken } from "../utils/jwt.util.ts";
import { setAuthCookie, clearAuthCookie } from "../utils/cookie.util.ts";

const getRequestMeta = (req: Request) => ({
  email: typeof req.body?.email === "string" ? req.body.email.toLowerCase() : undefined,
  ip: req.ip,
  userAgent: req.get("user-agent") || "unknown",
});

// POST /api/auth/register — Public — Create new account
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.warn("Register blocked: duplicate email", getRequestMeta(req));
      res.status(409).json({ success: false, message: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || null,
    });

    const token = generateToken({ userId: user._id.toString(), email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
      },
    });
    console.info("Register success", { userId: user._id.toString(), ...getRequestMeta(req) });
  } catch (error) {
    console.error("Register failed", getRequestMeta(req), error);
    next(error);
  }
};

// POST /api/auth/login — Public — Verify credentials, return JWT & set cookie
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.warn("Login failed: user not found", getRequestMeta(req));
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.warn("Login failed: invalid password", getRequestMeta(req));
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
      },
    });
    console.info("Login success", { userId: user._id.toString(), ...getRequestMeta(req) });
  } catch (error) {
    console.error("Login failed unexpectedly", getRequestMeta(req), error);
    next(error);
  }
};

// POST /api/auth/logout — Public/Protected — Clear auth cookie
export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
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
          id: user._id,
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
