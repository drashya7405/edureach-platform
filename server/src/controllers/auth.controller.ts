import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { hashPassword, comparePassword } from "../utils/password.util.ts";
import { generateToken } from "../utils/jwt.util.ts";
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getClearCookieOptions } from "../utils/cookie.util.ts";
import { getSafeRequestMeta } from "../utils/logger.util.ts";
import type { RegisterInput, LoginInput } from "../validators/auth.validator.ts";

// POST /api/auth/register — Public — Create new account
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body as RegisterInput;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn("Register blocked: duplicate email", getSafeRequestMeta(req));
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
    });

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    // Set secure HTTP-only cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

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
    console.info("Register success", { userId: user._id.toString(), ...getSafeRequestMeta(req) });
  } catch (error: any) {
    if (error?.code === 11000) {
      console.warn("Register blocked: duplicate key", getSafeRequestMeta(req));
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

    console.error("Register failed unexpectedly", getSafeRequestMeta(req), error);
    next(error);
  }
};

// POST /api/auth/login — Public — Verify credentials, return JWT & set cookie
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await User.findOne({ email });
    if (!user) {
      console.warn("Login failed: user not found", getSafeRequestMeta(req));
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.warn("Login failed: invalid password", getSafeRequestMeta(req));
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    // Set secure HTTP-only cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

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
    console.info("Login success", { userId: user._id.toString(), ...getSafeRequestMeta(req) });
  } catch (error) {
    console.error("Login failed unexpectedly", getSafeRequestMeta(req), error);
    next(error);
  }
};

// POST /api/auth/logout — Public/Protected — Clear auth cookie
export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// GET /api/auth/me — Protected — Return current user profile
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;

    if (!currentUser?.userId) {
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
    console.error("Get current user failed", { userId: req.user?.userId, ip: req.ip }, error);
    next(error);
  }
};
