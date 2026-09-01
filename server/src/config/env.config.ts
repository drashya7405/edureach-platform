export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
  GOOGLE_API_KEY: string;
  GEMINI_MODEL: string;
  GEMINI_EMBEDDING_MODEL: string;
}

export const validateEnv = (): EnvConfig => {
  const missing: string[] = [];
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.GOOGLE_API_KEY) missing.push("GOOGLE_API_KEY");

  if (missing.length > 0 && process.env.NODE_ENV !== "test") {
    console.error(`[CONFIG ERROR] Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    PORT: Number(process.env.PORT) || 5000,
    NODE_ENV: process.env.NODE_ENV || "development",
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/edureach_test",
    JWT_SECRET: process.env.JWT_SECRET || "default-jwt-secret-for-development-only-12345",
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
  };
};

export const env = validateEnv();
