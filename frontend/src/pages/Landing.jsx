import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../api";
import "./Landing.css";

import bolologo from "../assets/Bolo_India_Logo.svg";
import GroupImage from "../assets/Group_Image.jpg";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";

import { FaXTwitter } from "react-icons/fa6";

function Landing() {
  const navigate = useNavigate();

  // ==================== CONTACT FORM STATE ====================

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [contactStatus, setContactStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==================== CONTACT FORM HANDLER ====================

  const handleContactChange = (e) => {
    const { name, value } = e.target;

    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    setContactStatus("");

    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit message");
      }

      setContactStatus("success");

      setContactForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact form error:", error);

      setContactStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      {/* ==================== HEADER ==================== */}

      <header className="landing-header">
        <div className="landing-logo">
          <img
            src={bolologo}
            alt="Bolo India Logo"
            className="landing-logo-image"
          />
        </div>

        <div className="landing-header-buttons">
          <button onClick={() => navigate("/register")}>Register</button>

          <button onClick={() => navigate("/login")}>Login</button>
        </div>
      </header>

      {/* ==================== HERO ==================== */}

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-image">
            <img src={GroupImage} alt="Bolo India" className="company-image" />
          </div>

          <h1>Bolo India</h1>

          <h2>Presenting India to the World</h2>

          <p>Share your thoughts, ideas and moments with India.</p>

          <div className="landing-hero-buttons">
            <button
              className="register-button"
              onClick={() => navigate("/register")}
            >
              Register
            </button>

            <button className="login-button" onClick={() => navigate("/login")}>
              Login
            </button>
          </div>
        </div>
      </section>

      {/* ==================== ABOUT ==================== */}

      <section className="landing-about">
        <div className="landing-section-content">
          <p className="about-greeting">Namaskara! 🙏</p>

          <h2>Welcome to Bolo-India-Media</h2>

          <p className="about-description">
            We’re a bunch of Tech & Content geeks based in Bangalore, creating a
            great space for we Indians to connect with each other on everything
            that’s India.
          </p>

          <p className="about-description">
            Taking cue from the thoughts and words of our Honourable PM, we’re
            creating this for India — Made in India, by Indians.
          </p>

          <p className="about-description">
            Join us if you’re looking for a heady mix of great technology, doing
            magic with data, great content & media, and above all, creating
            something incredible and unique for India.
          </p>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}

      <section className="landing-features">
        <h2>What You Can Do</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <span>👥</span>

            <h3>Connect</h3>

            <p>Connect with people and build your network.</p>
          </div>

          <div className="feature-card">
            <span>📝</span>

            <h3>Share</h3>

            <p>Share your thoughts, ideas and moments.</p>
          </div>

          <div className="feature-card">
            <span>❤️</span>

            <h3>Engage</h3>

            <p>Like, comment and interact with posts.</p>
          </div>

          <div className="feature-card">
            <span>🔔</span>

            <h3>Stay Updated</h3>

            <p>Receive notifications and stay connected.</p>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}

      <section className="landing-cta">
        <h2>Join Bolo India Today</h2>

        <p>Create your account and start sharing with India.</p>

        <button onClick={() => navigate("/register")}>
          Create Your Account
        </button>
      </section>

      {/* ==================== CONTACT ==================== */}

      <section className="landing-contact">
        <div className="contact-container">
          <div className="contact-heading">
            <p className="contact-label">GET IN TOUCH</p>

            <h2>Contact Us</h2>

            <p>
              Have a question, suggestion, or want to connect with us? We'd love
              to hear from you.
            </p>
          </div>

          <div className="contact-content">
            {/* ==================== CONTACT INFORMATION ==================== */}

            <div className="contact-info-box">
              <h3>Let’s Connect</h3>

              <div className="contact-item">
                <span>📧</span>

                <div>
                  <h4>Email</h4>

                  <p>info@boloindia.com</p>
                </div>
              </div>

              <div className="contact-item">
                <span>📞</span>

                <div>
                  <h4>Phone</h4>

                  <p>+91 XXXXX XXXXX</p>
                </div>
              </div>

              <div className="contact-item">
                <span>📍</span>

                <div>
                  <h4>Location</h4>

                  <p>Bengaluru, Karnataka, India</p>
                </div>
              </div>
            </div>

            {/* ==================== CONTACT FORM ==================== */}

            <form className="contact-form" onSubmit={handleContactSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={contactForm.name}
                onChange={handleContactChange}
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={contactForm.email}
                onChange={handleContactChange}
                required
              />

              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={contactForm.subject}
                onChange={handleContactChange}
                required
              />

              <textarea
                name="message"
                placeholder="Your Message"
                rows="5"
                value={contactForm.message}
                onChange={handleContactChange}
                required
              ></textarea>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>

              {contactStatus === "success" && (
                <p className="contact-success">
                  ✅ Your message has been submitted successfully!
                </p>
              )}

              {contactStatus === "error" && (
                <p className="contact-error">
                  ❌ Something went wrong. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}

      <footer className="landing-footer">
        <div className="footer-content">
          {/* ==================== FOOTER BRAND ==================== */}

          <div className="footer-brand">
            <img src={bolologo} alt="Bolo India" className="footer-logo" />

            <p>Connecting India through technology, content and community.</p>
          </div>

          {/* ==================== QUICK LINKS ==================== */}

          <div className="footer-links">
            <h3>Quick Links</h3>

            <button onClick={() => navigate("/login")}>Login</button>

            <button onClick={() => navigate("/register")}>Register</button>
          </div>

          {/* ==================== CONTACT ==================== */}

          <div className="footer-contact">
            <h3>Contact</h3>

            <p>📧 info@boloindia.com</p>

            <p>📍 Bengaluru, Karnataka, India</p>
          </div>

          {/* ==================== SOCIAL MEDIA ==================== */}

          <div className="footer-social">
            <h3>Follow Us</h3>

            <div className="social-links">
              <a href="https://www.boloindia.com/" aria-label="Facebook">
                <FaFacebookF />
              </a>

              <a
                href="https://www.instagram.com/boloindia.medianetworks/"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>

              <a
                href="https://www.linkedin.com/company/bolo-india-media-networks/home/"
                aria-label="LinkedIn"
              >
                <FaLinkedinIn />
              </a>

              <a
                href="https://www.youtube.com/@BoloIndiaMediaNetworks"
                aria-label="YouTube"
              >
                <FaYoutube />
              </a>

              <a href="#" aria-label="X">
                <FaXTwitter />
              </a>
            </div>
          </div>
        </div>

        {/* ==================== FOOTER BOTTOM ==================== */}

        <div className="footer-bottom">
          <p>© 2026 Bolo-India Media Networks Pvt Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
