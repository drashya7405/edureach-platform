import "dotenv/config";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import app from "./app.ts";
import connectDB from "./config/database.config.ts";
import { initializeKnowledgeBase } from "./services/rag.service.ts";

const PORT = Number(process.env.PORT || 5000);

const start = async (): Promise<void> => {
  try {
    // 1. Connect Mongoose (for users collection)
    await connectDB();

    // 2. Start Express as soon as auth data is reachable.
    //    Login/signup should not be blocked by AI indexing or Gemini issues.
    const server = app.listen(PORT, () => {
      const address = server.address() as AddressInfo | null;
      const activePort = address?.port ?? PORT;
      console.log(` EduReach Server is running!`);
      console.log(` URL: http://localhost:${activePort}`);
      console.log(` Node: ${process.version}`);
      console.log(` Press Ctrl+C to stop`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server or change PORT in .env.`);
        process.exit(1);
      }

      console.error("Server failed to start:", error);
      process.exit(1);
    });

    // 3. Warm up the knowledge base in the background.
    //    If this fails, chat may be unavailable, but auth should keep working.
    void initializeKnowledgeBase().catch((error) => {
      console.error("Knowledge base initialization failed:", error);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
