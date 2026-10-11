function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
      <span>NestVault</span> &copy; {new Date().getFullYear()}
        </div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms of Use</a>
          <a href="#">Contact</a>
        </div>
        <div className="footer-social">
          <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
          <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook"></i></a>
          <a href="#" aria-label="LinkedIn"><i className="fa-brands fa-linkedin"></i></a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
