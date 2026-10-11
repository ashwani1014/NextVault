const mongoose = require("mongoose");

// Read MongoDB URL from environment variable
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGO_URL = process.env.MONGO_URL;

// For local development, allow a safe default URI
// For production, require MONGO_URL to be set
if (!MONGO_URL) {
  if (NODE_ENV === "production") {
    console.error("❌ Error: MONGO_URL environment variable is required in production");
    process.exit(1);
  } else {
    console.warn("⚠️  Warning: Using default MongoDB URL for development. Set MONGO_URL in .env to override.");
  }
}

// Use provided MONGO_URL or default for development
const MONGO_URI = MONGO_URL || "mongodb://127.0.0.1:27017/Renthouse";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  } catch (err) {
    console.error("❌ Error closing MongoDB connection:", err.message);
  }
}

module.exports = { connectDB, disconnectDB };
