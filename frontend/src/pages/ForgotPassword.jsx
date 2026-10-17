import { useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../api";
import "../styles/ForgotPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/users/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      setMessage(
        "If an account with this email exists, a password reset link has been sent.",
      );

      setEmail("");
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      {" "}
      <div className="forgot-password-card">
        {" "}
        <div className="forgot-password-logo">🇮🇳</div>
        <h1>Forgot Password?</h1>
        <p className="forgot-password-subtitle">
          No worries! Enter your registered email address and we'll send you a
          link to reset your password.
        </p>
        <form onSubmit={handleForgotPassword}>
          <div className="forgot-password-input-group">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setMessage("");
              }}
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            className="forgot-password-button"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        {message && (
          <div className="forgot-password-success">
            <span>✓</span>
            <p>{message}</p>
          </div>
        )}
        {error && (
          <div className="forgot-password-error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}
        <Link to="/login" className="forgot-password-back">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
