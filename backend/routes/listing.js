const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");

// GET all listings
router.get("/", async (req, res) => {
  try {
    const allListings = await Listing.find({});
    res.json({ success: true, data: allListings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single listing by ID
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("reviews");
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new listing
router.post("/", async (req, res) => {
  try {
    const newListing = new Listing(req.body);
    await newListing.save();
    res.status(201).json({ success: true, data: newListing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update listing
router.put("/:id", async (req, res) => {
  try {
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!updatedListing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    res.json({ success: true, data: updatedListing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE listing
router.delete("/:id", async (req, res) => {
  try {
    const deletedListing = await Listing.findByIdAndDelete(req.params.id);
    if (!deletedListing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    res.json({ success: true, message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
