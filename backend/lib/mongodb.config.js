import mongoose from "mongoose";

export const connectDB = async (delay = 5000) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      heartbeatFrequencyMS: 10000, // Frequency of server health checks
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Handle disconnections
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected. Attempting to reconnect...");
      setTimeout(() => connectDB(delay), delay); // try to connect recursively
    });

    // Handle connection errors
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);

    console.log(`Retrying connection`);
    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectDB(delay); // Recursive retry with decremented retries
  }
};
