import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllListings } from "../api/api.js";

function Listings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllListings()
      .then((res) => setListings(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loader-wrapper" style={{ minHeight: "50vh" }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>All Listings</h1>
        <Link to="/listings/new" className="btn btn-primary">
          <i className="fa-solid fa-plus"></i> Create New
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-house-circle-xmark"></i>
          <h3>No listings yet</h3>
          <p>Be the first to add a listing!</p>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map((listing) => (
            <Link to={`/listings/${listing._id}`} key={listing._id} className="listing-card">
              <div className="listing-card-img-wrapper">
                <img
                  src={listing.image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"}
                  alt={listing.title}
                  className="listing-card-img"
                />
                <div className="listing-card-price">
                  ₹{listing.price?.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="listing-card-body">
                <div className="listing-card-title">{listing.title}</div>
                <div className="listing-card-location">
                  <i className="fa-solid fa-location-dot"></i>
                  {listing.location}, {listing.country}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Listings;
