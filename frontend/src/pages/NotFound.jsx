import { Link } from "react-router-dom";
import "../styles/NotFound.css";

function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <div className="not-found-icon">🇮🇳</div>

        <h1>404</h1>

        <h2>Page Not Found</h2>

        <p>
          Oops! The page you're looking for doesn't exist or the URL is
          incorrect.
        </p>

        <Link to="/login" className="not-found-button">
          ← Go to Login
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
