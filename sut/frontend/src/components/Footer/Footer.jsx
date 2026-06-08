import { Link } from "react-router-dom";

function Footer() {
  return (
    <div className="container">
      <Link to="/" className="logo-font">
        inkwell
      </Link>
      <span className="attribution">
        Inkwell — a demo app used as the system under test for the Playwright QA
        course.
      </span>
    </div>
  );
}

export default Footer;
