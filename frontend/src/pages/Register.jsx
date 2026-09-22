import "../styles/Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerUser } from "../services/authService";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Password must contain at least one number";
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      const data = await registerUser(name, email, password);

      setSuccess(data.message);

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      setErrors({
        server: error.response?.data?.message || "Registration failed",
      });
    }
  };

  return (
    <div className="register-container">
      <button
        type="button"
        className="back-landing-button"
        onClick={() => navigate("/")}
      >
        ← Back to Home Page
      </button>
      <div className="register-card">
        <h1>Bolo India 🇮🇳</h1>

        <h2>Create Account</h2>
        <p>Join the Bolo India community</p>

        {errors.server && <p className="register-error">{errors.server}</p>}

        {success && <p className="register-success">{success}</p>}

        <form onSubmit={handleRegister}>
          {/* Name */}
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {errors.name && <p className="field-error">{errors.name}</p>}

          {/* Email */}
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {errors.email && <p className="field-error">{errors.email}</p>}

          {/* Password */}
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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

          {/* Confirm Password */}
          <div className="password-input">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {errors.confirmPassword && (
            <p className="field-error">{errors.confirmPassword}</p>
          )}

          <button type="submit">Register</button>
        </form>

        <div className="register-login">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
