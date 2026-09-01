import "dotenv/config";
import { z } from "zod";
import { RAG_CONFIG } from "./rag.config.ts";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z
    .string({ required_error: "MONGODB_URI is required" })
    .min(1, "MONGODB_URI cannot be empty"),
  JWT_SECRET: z
    .string({ required_error: "JWT_SECRET is required" })
    .min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_API_KEY: z
    .string({ required_error: "GOOGLE_API_KEY is required" })
    .min(1, "GOOGLE_API_KEY cannot be empty"),
  GEMINI_CHAT_MODEL: z.string().default(RAG_CONFIG.defaultChatModel),
  GEMINI_EMBEDDING_MODEL: z.string().default(RAG_CONFIG.defaultEmbeddingModel),
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig | null = null;

export const validateEnv = (): EnvConfig => {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`\x1b[31m[CONFIG ERROR] Invalid environment configuration:\n${errorDetails}\x1b[0m`);

    if (process.env.NODE_ENV === "production") {
      throw new Error(`Environment validation failed. Please check server environment variables.`);
    }
  }

  validatedEnv = result.success ? result.data : (process.env as unknown as EnvConfig);
  return validatedEnv;
};

export const env = validateEnv();
