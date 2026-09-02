import type { Request, Response, NextFunction } from "express";
import { getRAGResponse } from "../services/rag.service.ts";

// POST /api/chat/message
export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const reqStart = Date.now();
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ success: false, message: "Message is required." });
      return;
    }

    const userId = req.user?.userId || "anonymous";
    console.log(`[CHAT:CONTROLLER] Request received for user ${userId} at ${new Date().toISOString()}`);

    const answer = await getRAGResponse(message.trim());

    const totalDuration = Date.now() - reqStart;
    console.log(`[CHAT:CONTROLLER] Request completed with status 200 in ${totalDuration} ms`);

    res.json({ success: true, data: { message: answer } });
  } catch (error) {
    const totalDuration = Date.now() - reqStart;
    console.error(`[CHAT:CONTROLLER] Request failed after ${totalDuration} ms:`, error);
    next(error);
  }
};