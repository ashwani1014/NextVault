const mongoose = require("mongoose");

// Read MongoDB URL from environment variable
const NODE_ENV = process.env.NODE_ENV;
const MONGO_URL = process.env.MONGO_URL;

// For local development only, allow a safe default URI when NODE_ENV is explicitly 'development'
// If MONGO_URL is missing and NODE_ENV is unset or any non-development value, fail startup clearly
let MONGO_URI = MONGO_URL;

if (!MONGO_URI) {
  if (NODE_ENV === "development") {
    console.warn("⚠️  Warning: Using default MongoDB URL for development. Set MONGO_URL in .env to override.");
    MONGO_URI = "mongodb://127.0.0.1:27017/Renthouse";
  } else {
    console.error("❌ Error: MONGO_URL environment variable is required (NODE_ENV must be explicitly 'development' to use development fallback)");
    process.exit(1);
  }
}

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
