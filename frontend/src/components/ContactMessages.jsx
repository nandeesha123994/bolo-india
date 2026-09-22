import { useEffect, useState } from "react";
import {
  getContactMessages,
  replyToContactMessage,
} from "../services/contactService";
import "../styles/ContactMessages.css";

function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getContactMessages();
      setMessages(data.messages || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Failed to load contact messages",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(loadMessages, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const openReply = (message) => {
    setSelectedMessageId(message.id);
    setReply("");
    setError("");
    setSuccess("");
  };

  const closeReply = () => {
    setSelectedMessageId(null);
    setReply("");
    setError("");
  };

  const submitReply = async (event, messageId) => {
    event.preventDefault();

    if (!reply.trim() || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const data = await replyToContactMessage(messageId, reply.trim());
      const updatedMessage = data.contactMessage;

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      );
      setSelectedMessageId(null);
      setReply("");
      setSuccess("Reply sent successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-messages-section">
      <div className="contact-messages-heading">
        <div>
          <h2>Contact Messages</h2>
          <p>Review visitor messages and respond from the dashboard.</p>
        </div>
        <button
          className="contact-refresh-button"
          type="button"
          onClick={loadMessages}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading && <p className="contact-state">Loading contact messages...</p>}

      {!loading && error && (
        <p className="contact-state contact-error">{error}</p>
      )}

      {!loading && !error && messages.length === 0 && (
        <p className="contact-state">No contact messages yet.</p>
      )}

      {!loading && messages.length > 0 && (
        <div className="contact-message-list">
          {messages.map((message) => {
            const isReplyOpen = selectedMessageId === message.id;
            const isPending = message.status === "PENDING";

            return (
              <article className="contact-message-card" key={message.id}>
                <div className="contact-message-header">
                  <div>
                    <h3>{message.subject}</h3>
                    <p className="contact-message-sender">
                      {message.name} · {message.email}
                    </p>
                  </div>
                  <span
                    className={`contact-status contact-status-${message.status.toLowerCase()}`}
                  >
                    {message.status}
                  </span>
                </div>

                <p className="contact-message-date">
                  {new Date(message.createdAt).toLocaleString()}
                </p>
                <p className="contact-message-body">{message.message}</p>

                {message.adminReply && (
                  <div className="contact-admin-reply">
                    <strong>Admin reply</strong>
                    <p>{message.adminReply}</p>
                  </div>
                )}

                {isPending && !isReplyOpen && (
                  <button
                    className="contact-reply-button"
                    type="button"
                    onClick={() => openReply(message)}
                  >
                    Reply
                  </button>
                )}

                {isReplyOpen && (
                  <form
                    className="contact-reply-form"
                    onSubmit={(event) => submitReply(event, message.id)}
                  >
                    <label htmlFor={`reply-${message.id}`}>Reply</label>
                    <textarea
                      id={`reply-${message.id}`}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write your reply..."
                      rows="5"
                      disabled={submitting}
                      required
                    />
                    <div className="contact-reply-actions">
                      <button
                        className="contact-cancel-button"
                        type="button"
                        onClick={closeReply}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        className="contact-reply-button"
                        type="submit"
                        disabled={submitting || !reply.trim()}
                      >
                        {submitting ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}

      {success && <p className="contact-success">{success}</p>}
    </section>
  );
}

export default ContactMessages;
