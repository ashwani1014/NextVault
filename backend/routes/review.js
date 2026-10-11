const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn, isReviewAuthor } = require("../middleware/auth.js");

// POST create review for a listing (protected: authenticated users only)
router.post("/", isLoggedIn, async (req, res) => {
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
    const newReview = new Review({
      comment,
      rating,
      author: req.user._id,
    });

    await newReview.save();
    listing.reviews.push(newReview._id);
    await listing.save();

    res.status(201).json({ success: true, data: newReview });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
        select: "username email",
      },
    });
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    res.json({ success: true, data: listing.reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update review (protected: review author only)
router.put("/:reviewId", isLoggedIn, isReviewAuthor, async (req, res) => {
  try {
    const reviewId = req.params.reviewId || req.params.id;
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
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE a review (protected: review author only)
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, async (req, res) => {
  try {
    const reviewId = req.params.reviewId || req.params.id;
    const listingId = req.params.id !== reviewId ? req.params.id : null;

    if (listingId) {
      await Listing.findByIdAndUpdate(listingId, { $pull: { reviews: reviewId } });
    } else {
      await Listing.updateMany({ reviews: reviewId }, { $pull: { reviews: reviewId } });
    }

    await Review.findByIdAndDelete(reviewId);
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
