import { Link } from "react-router-dom";

function Home() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          Find Your Perfect <br />
          <span className="gradient-text">Luxury Stay</span>
        </h1>
        <p>
          NestVault — India's premium rental platform. Discover handpicked villas,
          cabins, treehouses and more. Your perfect home, secured.
        </p>
        <Link to="/listings" className="hero-btn">
          <i className="fa-solid fa-compass"></i>
          Explore Listings
        </Link>

        <div className="hero-stats">
          <div className="hero-stat">
            <h3>500+</h3>
            <p>Properties</p>
          </div>
          <div className="hero-stat">
            <h3>50+</h3>
            <p>Cities</p>
          </div>
          <div className="hero-stat">
            <h3>10K+</h3>
            <p>Happy Guests</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Home;
