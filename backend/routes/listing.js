
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn, isOwner } = require("../middleware/auth.js");

// GET all listings (public)
router.get("/", async (req, res) => {
  try {
    const allListings = await Listing.find({})
      .populate("owner", "username");

    return res.json({
      success: true,
      data: allListings,
    });
  } catch (err) {
    console.error("Error fetching listings:", err);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
    });
  }
});

// GET single listing by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID.",
      });
    }

    const listing = await Listing.findById(id)
      .populate("owner", "username")
      .populate({
        path: "reviews",
        populate: {
          path: "author",
          select: "username",
        },
      });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    return res.json({
      success: true,
      data: listing,
    });
  } catch (err) {
    console.error("Error fetching listing:", err);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
    });
  }
});

// POST create new listing (authenticated users only)
router.post("/", isLoggedIn, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      location,
      country,
      image,
    } = req.body;

    // Never trust owner supplied in the request body.
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

    return res.status(201).json({
      success: true,
      data: newListing,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid value for "${err.path || "field"}".`,
      });
    }

    console.error("Error creating listing:", err);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
    });
  }
});

// PUT update listing (authenticated owner only)
router.put("/:id", isLoggedIn, isOwner, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      location,
      country,
      image,
    } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) {
      updateData.description = description;
    }

    if (price !== undefined) {
      if (
        price === null ||
        (typeof price === "string" && price.trim() === "")
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value for "price".',
        });
      }

      const numPrice = Number(price);

      if (!Number.isFinite(numPrice)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value for "price". Expected a number.',
        });
      }

      updateData.price = numPrice;
    }

    if (location !== undefined) updateData.location = location;
    if (country !== undefined) updateData.country = country;
    if (image !== undefined) updateData.image = image;

    // Do not allow clients to change owner or reviews.
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    return res.json({
      success: true,
      data: updatedListing,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      // Mongoose provides field-specific validation details.
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid value for "${err.path || "field"}".`,
      });
    }

    console.error("Error updating listing:", err);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
    });
  }
});

// DELETE listing (authenticated owner only)
router.delete("/:id", isLoggedIn, isOwner, async (req, res) => {
  try {
    const listing =
      req.listing || (await Listing.findById(req.params.id));

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    // Delete associated reviews before deleting the listing.
    if (listing.reviews && listing.reviews.length > 0) {
      await Review.deleteMany({
        _id: { $in: listing.reviews },
      });
    }

    await Listing.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Listing deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting listing:", err);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
    });
  }
});

module.exports = router;
