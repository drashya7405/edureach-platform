import "dotenv/config";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "./app.ts";
import { validateEnv } from "./config/env.config.ts";
import connectDB, { closeDatabaseConnections } from "./config/database.config.ts";
import { checkKnowledgeBaseStatus, closeVectorMongoClient } from "./services/rag.service.ts";

// Validate required environment variables at startup
const env = validateEnv();
const PORT = Number(env.PORT || 3001);

let httpServer: Server | null = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error("[SHUTDOWN] Forced shutdown after timeout (10s).");
    process.exit(1);
  }, 10000);

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => {
          if (err) return reject(err);
          console.log("[SHUTDOWN] HTTP server closed.");
          resolve();
        });
      });
    }

    await closeDatabaseConnections();
    await closeVectorMongoClient();

    clearTimeout(shutdownTimeout);
    console.log("[SHUTDOWN] Graceful shutdown completed cleanly.");
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimeout);
    console.error("[SHUTDOWN] Error during graceful shutdown:", error);
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  try {
    // 1. Connect Mongoose (for users collection)
    await connectDB();

    // 2. Start Express
    httpServer = app.listen(PORT, () => {
      const address = httpServer?.address() as AddressInfo | null;
      const activePort = address?.port ?? PORT;
      console.log(`\n=========================================`);
      console.log(` EduReach Server is running!`);
      console.log(` Environment: ${env.NODE_ENV}`);
      console.log(` URL: http://localhost:${activePort}`);
      console.log(` Node: ${process.version}`);
      console.log(`=========================================\n`);
    });

    httpServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server or change PORT in .env.`);
        process.exit(1);
      }
      console.error("Server failed to start:", error);
      process.exit(1);
    });

    // 3. Verify knowledge base status in background (non-destructive)
    void checkKnowledgeBaseStatus().catch((error) => {
      console.warn("[RAG:STATUS] Knowledge base status check encountered an error:", error);
    });

    // 4. Register signal handlers
    process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
