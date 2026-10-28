import "../styles/Login.css";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { loginUser } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loginInProgressRef = useRef(false);

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginInProgressRef.current) return;

    setErrors({});
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    loginInProgressRef.current = true;
    setIsLoading(true);

    try {
      const data = await loginUser(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess(data.message);

      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (error) {
      setErrors({
        server:
          error?.response?.data?.message || error?.message || "Login failed",
      });
    } finally {
      loginInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <button
        type="button"
        className="back-landing-button"
        onClick={() => navigate("/")}
      >
        ← Back to Home Page
      </button>
      <div className="login-card">
        <h1>Bolo India 🇮🇳</h1>

        <h2>Welcome Back</h2>
        <p>Login to your account</p>

        {errors.server && (
          <p className="login-error" role="alert">
            {errors.server}
          </p>
        )}

        {success && (
          <p className="login-success" role="status">
            {success}
          </p>
        )}

        <form onSubmit={handleLogin} aria-busy={isLoading}>
          {/* Email */}
          <input
            type="email"
            placeholder="Enter your email"
            aria-label="Email"
            aria-invalid={Boolean(errors.email)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {errors.email && <p className="field-error">{errors.email}</p>}

          {/* Password */}
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              aria-label="Password"
              aria-invalid={Boolean(errors.password)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {errors.password && <p className="field-error">{errors.password}</p>}

          {/* Forgot Password */}
          <div className="forgot-password">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={isLoading}
          >
            {isLoading && (
              <span className="login-spinner" aria-hidden="true" />
            )}
            <span>{isLoading ? "Logging in..." : "Login"}</span>
          </button>
        </form>

        <div className="login-register">
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
