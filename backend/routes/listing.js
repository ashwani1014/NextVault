const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn, isOwner } = require("../middleware/auth.js");

// GET all listings (public)
router.get("/", async (req, res) => {
  try {
    const allListings = await Listing.find({}).populate("owner", "username email");
    res.json({ success: true, data: allListings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single listing by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }
    const listing = await Listing.findById(id)
      .populate("owner", "username email")
      .populate({
        path: "reviews",
        populate: {
          path: "author",
          select: "username email",
        },
      });
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new listing (protected: authenticated users only)
router.post("/", isLoggedIn, async (req, res) => {
  try {
    const { title, description, price, location, country, image } = req.body;
    // Always assign owner from authenticated session user (never trust req.body.owner)
    const newListing = new Listing({
      title,
      description,
      price,
      location,
      country,
      image,
      owner: req.user._id,
    });
    await newListing.save();
    res.status(201).json({ success: true, data: newListing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update listing (protected: listing owner only)
router.put("/:id", isLoggedIn, isOwner, async (req, res) => {
  try {
    const { title, description, price, location, country, image } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (location !== undefined) updateData.location = location;
    if (country !== undefined) updateData.country = country;
    if (image !== undefined) updateData.image = image;

    // Notice: owner and reviews cannot be modified via update requests
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updatedListing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE listing (protected: listing owner only)
router.delete("/:id", isLoggedIn, isOwner, async (req, res) => {
  try {
    const listing = req.listing || (await Listing.findById(req.params.id));
    if (listing && listing.reviews && listing.reviews.length > 0) {
      await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
