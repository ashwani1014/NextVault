import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getListing, deleteListing, createReview, deleteReview } from "../api/api.js";

function ListingDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchListing = () => {
    getListing(id)
      .then((res) => setListing(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this listing?")) return;
    try {
      await deleteListing(id);
      navigate("/listings");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview(id, { rating, comment });
      setComment("");
      setRating(3);
      fetchListing();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(id, reviewId);
      fetchListing();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loader-wrapper" style={{ minHeight: "50vh" }}>
        <div className="loader"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-house-circle-xmark"></i>
        <h3>Listing not found</h3>
        <Link to="/listings" className="btn btn-primary" style={{ marginTop: "1rem" }}>Back to Listings</Link>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <img
        src={listing.image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"}
        alt={listing.title}
        className="detail-hero-img"
      />

      <div className="detail-header">
        <div>
          <h1 className="detail-title">{listing.title}</h1>
          {listing.description && (
            <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>{listing.description}</p>
          )}
        </div>
        <div className="detail-price">
          ₹{listing.price?.toLocaleString("en-IN")}
          <span>/night</span>
        </div>
      </div>

      <div className="detail-meta">
        <span><i className="fa-solid fa-location-dot"></i>{listing.location}</span>
        <span><i className="fa-solid fa-flag"></i>{listing.country}</span>
        {listing.owner?.username && (
          <span><i className="fa-solid fa-user"></i>Hosted by {listing.owner.username}</span>
        )}
        <span><i className="fa-solid fa-star"></i>{listing.reviews?.length || 0} reviews</span>
      </div>

      <div className="detail-actions">
        {user && listing?.owner && ((listing.owner._id || listing.owner) === user._id) && (
          <>
            <Link to={`/listings/${id}/edit`} className="btn btn-secondary">
              <i className="fa-solid fa-pen"></i> Edit
            </Link>
            <button onClick={handleDelete} className="btn btn-danger">
              <i className="fa-solid fa-trash"></i> Delete
            </button>
          </>
        )}
        <Link to="/listings" className="btn btn-secondary">
          <i className="fa-solid fa-arrow-left"></i> Back
        </Link>
      </div>

      {/* Reviews */}
      <div className="reviews-section">
        <h2>Reviews ({listing.reviews?.length || 0})</h2>

        {listing.reviews?.length === 0 && (
          <div className="empty-state" style={{ padding: "2rem 0" }}>
            <i className="fa-regular fa-star"></i>
            <p>No reviews yet. Be the first!</p>
          </div>
        )}

        {listing.reviews?.map((review) => {
          const isReviewAuthor = user && review.author && ((review.author._id || review.author) === user._id);
          return (
            <div className="review-card" key={review._id}>
              <div className="review-header">
                <div>
                  <span className="review-stars">
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    <span style={{ color: "var(--text-muted)", marginLeft: "6px" }}>{review.rating}/5</span>
                  </span>
                  {review.author?.username && (
                    <span style={{ marginLeft: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      by <strong>{review.author.username}</strong>
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span className="review-date">
                    {new Date(review.createdAt).toLocaleDateString("en-IN")}
                  </span>
                  {isReviewAuthor && (
                    <button
                      onClick={() => handleDeleteReview(review._id)}
                      style={{ background: "none", border: "none", color: "#ff4757", cursor: "pointer", fontSize: "0.8rem" }}
                      title="Delete your review"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
              <p className="review-text">{review.comment}</p>
            </div>
          );
        })}

        {/* Review Form */}
        <div className="review-form">
          <h3>Leave a Review</h3>
          {user ? (
            <form onSubmit={handleReviewSubmit} className="form-card">
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div className="range-wrapper">
                  <input
                    type="range" min="1" max="5" value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                  />
                  <span className="range-value">{rating}</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-input"
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  rows={4}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting...</> : <><i className="fa-solid fa-paper-plane"></i> Submit Review</>}
              </button>
            </form>
          ) : (
            <div className="empty-state" style={{ padding: "1.5rem" }}>
              <p>Please <Link to="/login" style={{ color: "var(--primary-color)", fontWeight: 600 }}>log in</Link> to leave a review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListingDetail;
