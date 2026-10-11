const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");

// Require user to be authenticated
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: "You must be logged in" });
  }
  next();
};

// Require authenticated user to be the owner of the listing
const isOwner = async (req, res, next) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ success: false, message: "You must be logged in" });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const ownerId = listing.owner && (listing.owner._id || listing.owner);
    if (!ownerId || (ownerId.equals ? !ownerId.equals(req.user._id) : ownerId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action" });
    }

    req.listing = listing;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Require authenticated user to be the author of the review
const isReviewAuthor = async (req, res, next) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ success: false, message: "You must be logged in" });
    }

    const reviewId = req.params.reviewId || req.params.id;
    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    // If nested under /api/listings/:id/reviews/:reviewId, also validate listing ID if present
    if (req.params.id && req.params.reviewId && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const authorId = review.author && (review.author._id || review.author);
    if (!authorId || (authorId.equals ? !authorId.equals(req.user._id) : authorId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action" });
    }

    req.review = review;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  isLoggedIn,
  isOwner,
  isReviewAuthor,
};
