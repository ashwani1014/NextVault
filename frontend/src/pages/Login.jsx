import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/api.js";

function Login({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });

  const validateForm = () => {
    const errors = {};
    const trimmedUsername = form.username.trim();

    if (!trimmedUsername) {
      errors.username = "Username is required.";
    }

    if (!form.password) {
      errors.password = "Password is required.";
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
      const res = await login({ username: form.username.trim(), password: form.password });
      setUser(res.data.data);
      navigate("/listings");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="form-card">
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Log in to your account</p>

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
              <label className="form-label">Password</label>
              <input
                name="password"
                type="password"
                className={`form-input ${fieldErrors.password ? "input-error" : ""}`}
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
              />
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Logging in...</> : <><i className="fa-solid fa-right-to-bracket"></i> Log In</>}
            </button>
          </form>

          <p className="auth-switch">Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
