import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getListing, updateListing } from "../api/api.js";

function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", price: "", location: "", country: "", image: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getListing(id)
      .then((res) => {
        const l = res.data.data;
        setForm({ title: l.title || "", description: l.description || "", price: l.price || "", location: l.location || "", country: l.country || "", image: l.image || "" });
      })
      .catch(() => setError("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateListing(id, form);
      navigate(`/listings/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-wrapper" style={{ minHeight: "50vh" }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h1>Edit Listing</h1>
      <div className="form-card">
        {error && <div className="flash-message flash-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input name="title" type="text" className="form-input" value={form.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-input" value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Price (₹/night)</label>
            <input name="price" type="number" className="form-input" value={form.price} onChange={handleChange} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input name="location" type="text" className="form-input" value={form.location} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input name="country" type="text" className="form-input" value={form.country} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input name="image" type="url" className="form-input" value={form.image} onChange={handleChange} />
            {form.image && (
              <img src={form.image} alt="Preview" style={{ marginTop: "0.5rem", width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px" }} />
            )}
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> Save Changes</>}
            </button>
            <Link to={`/listings/${id}`} className="btn btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditListing;
