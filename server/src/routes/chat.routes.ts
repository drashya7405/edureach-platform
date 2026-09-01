import { Router } from "express";
import { sendMessage } from "../controllers/chat.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";
import { validateBody } from "../middleware/validate.middleware.ts";
import { chatMessageSchema } from "../validators/chat.validator.ts";
import { chatLimiter } from "../middleware/rate-limiter.middleware.ts";

const router = Router();

// POST /api/chat/message — Protected: Requires authenticated user
router.post(
  "/message",
  authMiddleware,
  chatLimiter,
  validateBody(chatMessageSchema),
  sendMessage,
);

export default router;