import { Link, useLocation } from "react-router-dom";
import { logout } from "../api/api.js";

function Navbar({ user, setUser }) {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fa-solid fa-vault brand-icon"></i>
        <span>NestVault</span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={isActive("/")}>Home</Link>
        <Link to="/listings" className={isActive("/listings")}>Explore</Link>
        <Link to="/listings/new" className={isActive("/listings/new")}>Add Listing</Link>

        {user ? (
          <>
            <span className="nav-user">
              <i className="fa-solid fa-circle-user"></i>
              {user.username}
            </span>
            <button onClick={handleLogout} className="nav-btn nav-btn-outline">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-btn nav-btn-outline">Login</Link>
            <Link to="/signup" className="nav-btn nav-btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
