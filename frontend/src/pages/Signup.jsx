import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/api.js";

function Signup({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", email: "", password: "" });

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors = {};
    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedUsername) {
      errors.username = "Username is required.";
    } else if (trimmedUsername.length < 3) {
      errors.username = "Username must be at least 3 characters.";
    }

    if (!trimmedEmail) {
      errors.email = "Email is required.";
    } else if (!validateEmail(trimmedEmail)) {
      errors.email = "Please provide a valid email address.";
    }

    if (!form.password) {
      errors.password = "Password is required.";
    } else if (form.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await signup({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setUser(res.data.data);
      navigate("/listings");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="form-card">
          <h1>Create Account</h1>
          <p className="auth-subtitle">Join Ekart House today</p>

          {error && <div className="flash-message flash-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                name="username"
                type="text"
                className={`form-input ${fieldErrors.username ? "input-error" : ""}`}
                placeholder="yourname"
                value={form.username}
                onChange={handleChange}
                disabled={loading}
              />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                name="email"
                type="email"
                className={`form-input ${fieldErrors.email ? "input-error" : ""}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
              />
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                name="password"
                type="password"
                className={`form-input ${fieldErrors.password ? "input-error" : ""}`}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
              />
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating...</> : <><i className="fa-solid fa-user-plus"></i> Sign Up</>}
            </button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
