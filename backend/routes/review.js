const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn, isReviewAuthor } = require("../middleware/auth.js");

// POST create review for a listing (protected: authenticated users only)
router.post("/", isLoggedIn, async (req, res) => {
  let createdReview = null;
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const { comment, rating } = req.body;
    // Always assign author from authenticated session user (never trust client-supplied author)
    createdReview = new Review({
      comment,
      rating,
      author: req.user._id,
    });

    await createdReview.save();

    try {
      listing.reviews.push(createdReview._id);
      await listing.save();
    } catch (listingErr) {
      console.error("❌ Failed to save listing with new review:", listingErr.message);
      // Rollback: delete the created review if saving the listing fails to prevent orphan reviews
      try {
        await Review.findByIdAndDelete(createdReview._id);
      } catch (cleanupErr) {
        console.error("❌ Failed to clean up orphan review during rollback:", cleanupErr.message);
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create review. Please try again.",
      });
    }

    res.status(201).json({ success: true, data: createdReview });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error("❌ Review creation error:", err.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
});

// GET all reviews for a listing (public)
router.get("/", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const listing = await Listing.findById(id).populate({
      path: "reviews",
      populate: {
        path: "author",
        select: "username",
      },
    });
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    res.json({ success: true, data: listing.reviews });
  } catch (err) {
    console.error("❌ Error fetching reviews:", err.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
});

// PUT update review (protected: review author only)
router.put("/:reviewId", isLoggedIn, isReviewAuthor, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment, rating } = req.body;
    const updateData = {};
    if (comment !== undefined) updateData.comment = comment;
    if (rating !== undefined) updateData.rating = rating;

    // Notice: author and _id cannot be modified via update requests
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updateData,
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updatedReview });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error("❌ Error updating review:", err.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
});

// DELETE a review (protected: review author only)
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, async (req, res) => {
  try {
    const { id, reviewId } = req.params;
    if (id) {
      await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    }
    await Review.findByIdAndDelete(reviewId);
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    console.error("❌ Error deleting review:", err.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
});

module.exports = router;
