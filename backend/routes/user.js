const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user.js");

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateUsernameForSignup = (username) => {
  return username && username.trim().length >= 3;
};

const validateUsernameForLogin = (username) => {
  return username && username.trim().length > 0;
};

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Backend validation
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!validateUsernameForSignup(trimmedUsername)) {
      return res.status(400).json({ success: false, message: "Username must be at least 3 characters." });
    }

    if (!validateEmail(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const newUser = new User({ email: trimmedEmail, username: trimmedUsername });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) {
        // Account created but session login failed
        console.error("Session login failed after account creation:", err.message);
        return res.status(500).json({
          success: false,
          message: "Account created but failed to establish session. Please try logging in."
        });
      }
      res.status(201).json({
        success: true,
        data: {
          _id: registeredUser._id,
          username: registeredUser.username,
          email: registeredUser.email,
        },
      });
    });
  } catch (err) {
    // Handle duplicate email/username errors from passport-local-mongoose
    if (err.name === 'UserExistsError') {
      return res.status(400).json({ success: false, message: "Username or email already exists." });
    }
    // Log unexpected errors safely without exposing sensitive details
    console.error("Unexpected signup error:", err.message);
    res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", (req, res, next) => {
  // Handle missing or invalid request body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ success: false, message: "Invalid request." });
  }

  const { username, password } = req.body;

  // Backend validation
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  // Validate username is a string before calling trim
  if (typeof username !== 'string') {
    return res.status(400).json({ success: false, message: "Username must be a string." });
  }

  if (!username.trim()) {
    return res.status(400).json({ success: false, message: "Username is required." });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required." });
  }

  // Use trimmed username for authentication (don't enforce minimum length for login)
  req.body.username = username.trim();

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      // Log unexpected Passport authentication errors safely
      console.error("Passport authentication error:", err.message);
      return res.status(500).json({ success: false, message: "Login failed. Please try again." });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("Session login error:", err.message);
        return res.status(500).json({ success: false, message: "Login failed. Please try again." });
      }
      res.json({
        success: true,
        data: {
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email,
        },
      });
    });
  })(req, res, next);
});

// GET /api/auth/logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// GET /api/auth/current-user
router.get("/current-user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      data: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
      },
    });
  } else {
    res.json({ success: false, data: null });
  }
});

module.exports = router;
