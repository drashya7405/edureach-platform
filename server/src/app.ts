import chatRoutes from "./routes/chat.routes.ts";
import express from "express";
import type { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.ts";
import errorHandler from "./middleware/error-handler.middleware.ts";
import { getDatabaseHealth } from "./config/database.config.ts";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req: Request, res: Response) => {
  const database = getDatabaseHealth();

  res.status(database.state === "connected" ? 200 : 503).json({
    success: database.state === "connected",
    message: database.state === "connected" ? "Server is healthy." : "Server is running, but database is not ready.",
    data: {
      server: "up",
      database,
      auth: {
        jwtConfigured: Boolean(process.env.JWT_SECRET),
      },
      ai: {
        googleApiConfigured: Boolean(process.env.GOOGLE_API_KEY),
      },
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);

export default app;
