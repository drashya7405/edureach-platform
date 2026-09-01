import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";
import { validateBody } from "../middleware/validate.middleware.ts";
import { registerSchema, loginSchema } from "../validators/auth.validator.ts";
import { authLimiter } from "../middleware/rate-limiter.middleware.ts";

const router = Router();

router.post("/register", authLimiter, validateBody(registerSchema), register);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);

export default router;