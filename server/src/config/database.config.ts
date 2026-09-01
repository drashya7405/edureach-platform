import "dotenv/config";
import mongoose from "mongoose";

const mongooseStateLabels: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export const getDatabaseHealth = () => {
  const { connection } = mongoose;

  return {
    readyState: connection.readyState,
    state: mongooseStateLabels[connection.readyState] || "unknown",
    host: connection.host || null,
    name: connection.name || null,
  };
};

let cachedPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (): Promise<typeof mongoose> => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  try {
    cachedPromise = mongoose.connect(mongoURI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
    const conn = await cachedPromise;
    console.log(`MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    cachedPromise = null;
    if (error instanceof Error) {
      console.error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      console.error(`Error connecting to MongoDB: ${error}`);
    }
    throw error;
  }
};

export default connectDB;
