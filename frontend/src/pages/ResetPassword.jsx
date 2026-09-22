import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../styles/ResetPassword.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/users/reset-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to reset password");
        return;
      }

      setMessage("Password reset successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-page">
      <div className="password-card">
        <div className="password-logo">🇮🇳</div>

        <h1>Create New Password</h1>

        <p className="password-subtitle">
          Enter your new password below. Make sure it is at least 6 characters
          long.
        </p>

        <form onSubmit={handleResetPassword}>
          {/* New Password */}
          <div className="password-input-group">
            <label>New Password</label>

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-eye-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="password-input-group">
            <label>Confirm Password</label>

            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-eye-button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" className="password-button" disabled={loading}>
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>

        {message && <div className="password-success">{message}</div>}

        {error && <div className="password-error">{error}</div>}

        <Link to="/login" className="password-back-link">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
