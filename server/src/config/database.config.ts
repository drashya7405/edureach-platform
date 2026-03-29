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

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Database Name: ${conn.connection.name}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      console.error(`Error connecting to MongoDB: ${error}`);
    }
    process.exit(1);
  }
};

export default connectDB;
