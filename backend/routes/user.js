const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user.js");

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
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
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    },
  });
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
