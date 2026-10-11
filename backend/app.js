// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const { connectDB, disconnectDB } = require("./config/db.js");
const User = require("./models/user.js");

// Route imports
const listingRoutes = require("./routes/listing.js");
const reviewRoutes = require("./routes/review.js");
const userRoutes = require("./routes/user.js");

const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || "development";

// ─── Environment Variable Validation ───
if (NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET) {
    console.error("❌ Error: SESSION_SECRET environment variable is required in production");
    process.exit(1);
  }
} else {
  // For local development, use a default if not set
  if (!process.env.SESSION_SECRET) {
    console.warn("⚠️  Warning: Using default SESSION_SECRET for development. Set SESSION_SECRET in .env for security.");
    process.env.SESSION_SECRET = "dev-secret-key-change-in-production";
  }
}

// ─── Middleware ───
app.use(
  cors({
    origin: "http://localhost:5173", // Vite frontend
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session Config ───
const sessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};
app.use(session(sessionOptions));

// ─── Passport Config ───
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ─── API Routes ───
app.get("/api", (req, res) => {
  res.json({ success: true, message: "NestVault API is running 🏠" });
});

app.use("/api/listings", listingRoutes);
app.use("/api/listings/:id/reviews", reviewRoutes);
app.use("/api/auth", userRoutes);

// ─── Graceful Shutdown ───
let server;

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async (err) => {
      if (err) {
        console.error("❌ Error closing HTTP server:", err.message);
        process.exit(1);
      }

      console.log("✅ HTTP server closed");

      // Close database connection
      await disconnectDB();

      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    });

    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─── Connect to Database and Start Server ───
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start HTTP server only after DB connection succeeds
    server = app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error("❌ Server error:", err.message);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
