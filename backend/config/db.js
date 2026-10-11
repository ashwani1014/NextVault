const mongoose = require("mongoose");

// Read MongoDB URL from environment variable
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("❌ Error: MONGO_URL environment variable is required");
  process.exit(1);
}

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL);
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
