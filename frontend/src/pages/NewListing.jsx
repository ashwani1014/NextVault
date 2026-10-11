import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createListing } from "../api/api.js";

function NewListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", price: "", location: "", country: "", image: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createListing(form);
      navigate(`/listings/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1>Add New Listing</h1>
      <div className="form-card">
        {error && <div className="flash-message flash-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input name="title" type="text" className="form-input" placeholder="e.g. Sea Breeze Villa" value={form.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-input" placeholder="Describe your property..." value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Price (₹/night) *</label>
            <input name="price" type="number" className="form-input" placeholder="e.g. 2000" value={form.price} onChange={handleChange} required min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input name="location" type="text" className="form-input" placeholder="e.g. Candolim, Goa" value={form.location} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input name="country" type="text" className="form-input" placeholder="e.g. India" value={form.country} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input name="image" type="url" className="form-input" placeholder="https://..." value={form.image} onChange={handleChange} />
            {form.image && (
              <img src={form.image} alt="Preview" style={{ marginTop: "0.5rem", width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px" }} />
            )}
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Adding...</> : <><i className="fa-solid fa-plus"></i> Add Listing</>}
            </button>
            <Link to="/listings" className="btn btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewListing;
