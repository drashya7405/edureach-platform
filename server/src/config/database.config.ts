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

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    if (process.env.NODE_ENV === "test") return;
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      bufferCommands: false,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    if (process.env.NODE_ENV !== "test") {
      throw error;
    }
  }
};

export const closeDatabaseConnections = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export default connectDB;
