import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  sendSupportMessage,
  getMySupportMessages,
} from "../services/supportService";

import { useFeedback } from "../components/FeedbackProvider";
import "../styles/Support.css";

function Support() {
  const { showToast } = useFeedback();
  const [message, setMessage] = useState("");
  const [supportMessages, setSupportMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadSupportMessages();
  }, []);

  const loadSupportMessages = async () => {
    try {
      const data = await getMySupportMessages();

      setSupportMessages(data);
    } catch (error) {
      console.error("Failed to load support messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      showToast("Please enter your message.", "error");
      return;
    }

    try {
      setSending(true);

      const response = await sendSupportMessage(message);

      setSupportMessages((prev) => [response.supportMessage, ...prev]);

      setMessage("");

      showToast("Message sent to Moderator successfully.");
    } catch (error) {
      console.error("Failed to send support message:", error);

      showToast(
        error.response?.data?.message || "Failed to send support message.",
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="support-page">
      <div className="support-container">
        <Link to="/profile" className="support-back-button">
          ← Back to Profile
        </Link>
        {/* Header */}
        <div className="support-header">
          <h1>💭 Help & Support</h1>

          <p>Have a doubt? Contact our Moderator team.</p>
        </div>

        {/* Send Message */}
        <div className="support-card">
          <h2>Contact Moderator</h2>

          <form onSubmit={handleSubmit}>
            <textarea
              placeholder="Write your doubt or message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button type="submit" disabled={sending}>
              {sending ? "Sending..." : "💬 Send Message"}
            </button>
          </form>
        </div>

        {/* Previous Messages */}
        <div className="support-card">
          <h2>My Support Messages</h2>

          {loading ? (
            <p className="support-empty">Loading messages...</p>
          ) : supportMessages.length === 0 ? (
            <p className="support-empty">
              You haven't contacted Moderator yet.
            </p>
          ) : (
            supportMessages.map((supportMessage) => (
              <div key={supportMessage.id} className="support-message">
                {/* User Message */}
                <div className="support-user-message">
                  <strong>Your Message</strong>

                  <p>{supportMessage.message}</p>
                </div>

                {/* Status */}
                <div className="support-status">
                  <strong>Status:</strong>{" "}
                  <span
                    className={
                      supportMessage.status === "RESOLVED"
                        ? "support-resolved"
                        : "support-pending"
                    }
                  >
                    {supportMessage.status}
                  </span>
                </div>

                {/* Moderator Reply */}
                {supportMessage.reply && (
                  <div className="support-moderator-reply">
                    <strong>🛡️ Moderator Reply</strong>

                    <p>{supportMessage.reply}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Support;
