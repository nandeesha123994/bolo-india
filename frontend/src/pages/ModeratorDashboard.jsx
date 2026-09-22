import { useEffect, useState } from "react";

import {
  getModeratorPosts,
  getPostComments,
  deleteCommentByModerator,
  getSupportMessages,
  replyToSupportMessage,
} from "../services/moderatorService";

import "../styles/ModeratorDashboard.css";

function ModeratorDashboard() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);

  const [supportMessages, setSupportMessages] = useState([]);
  const [replyText, setReplyText] = useState({});

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadModeratorData();
  }, []);

  const loadModeratorData = async () => {
    try {
      // Load posts
      const data = await getModeratorPosts();
      setPosts(data);

      // Load comments for each post
      for (const post of data) {
        const postComments = await getPostComments(post.id);

        setComments((prev) => ({
          ...prev,
          [post.id]: postComments,
        }));
      }

      // Load support messages
      const supportData = await getSupportMessages();
      setSupportMessages(supportData);
    } catch (error) {
      console.error("Failed to load moderator data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteCommentByModerator(commentId);

      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((comment) => comment.id !== commentId),
      }));

      alert("Comment deleted successfully");
    } catch (error) {
      console.error("Failed to delete comment:", error);

      alert(error.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleReply = async (messageId) => {
    const reply = replyText[messageId];

    if (!reply || !reply.trim()) {
      alert("Please enter a reply");
      return;
    }

    try {
      const response = await replyToSupportMessage(messageId, reply);

      setSupportMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? response.supportMessage : message,
        ),
      );

      setReplyText((prev) => ({
        ...prev,
        [messageId]: "",
      }));

      alert("Reply sent successfully");
    } catch (error) {
      console.error("Failed to send reply:", error);

      alert(error.response?.data?.message || "Failed to send reply");
    }
  };

  // ==================== STATISTICS ====================

  const totalPosts = posts.length;

  const totalComments = Object.values(comments).reduce(
    (total, postComments) => total + (postComments?.length || 0),
    0,
  );

  const totalSupportMessages = supportMessages.length;

  const pendingSupportMessages = supportMessages.filter(
    (message) => message.status === "PENDING",
  ).length;

  if (loading) {
    return (
      <div className="moderator-dashboard">
        <div className="moderator-container">
          <div className="moderator-header">
            <h1>Bolo India - Moderator Dashboard 🛡️</h1>

            <p>Loading moderator dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="moderator-dashboard">
      <div className="moderator-container">
        {/* ==================== HEADER ==================== */}

        <div className="moderator-header">
          <h1>Bolo India - Moderator Dashboard 🛡️</h1>

          <p>Manage comments and support user messages.</p>
        </div>

        {/* ==================== TABS ==================== */}

        <div className="moderator-tabs">
          <button
            className={activeTab === "overview" ? "active-tab" : ""}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>

          <button
            className={activeTab === "comments" ? "active-tab" : ""}
            onClick={() => setActiveTab("comments")}
          >
            🗑️ Comment Moderation
          </button>

          <button
            className={activeTab === "support" ? "active-tab" : ""}
            onClick={() => setActiveTab("support")}
          >
            💬 Support Messages
          </button>
        </div>

        {/* ==================== OVERVIEW ==================== */}

        {activeTab === "overview" && (
          <div className="moderator-section">
            <h2>📊 Moderator Overview</h2>

            <div className="moderator-stats">
              <div className="moderator-stat-card">
                <h3>{totalPosts}</h3>
                <p>Total Posts</p>
              </div>

              <div className="moderator-stat-card">
                <h3>{totalComments}</h3>
                <p>Total Comments</p>
              </div>

              <div className="moderator-stat-card">
                <h3>{totalSupportMessages}</h3>
                <p>Total Support Messages</p>
              </div>

              <div className="moderator-stat-card">
                <h3>{pendingSupportMessages}</h3>
                <p>Pending Support</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== COMMENT MODERATION ==================== */}

        {activeTab === "comments" && (
          <div className="moderator-section">
            <h2>🗑️ Comment Moderation</h2>

            {posts.length === 0 ? (
              <p className="moderator-empty">No posts available.</p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="moderator-post">
                  <h3>{post.content}</h3>

                  {comments[post.id]?.length > 0 ? (
                    comments[post.id].map((comment) => (
                      <div key={comment.id} className="moderator-comment">
                        <div>
                          <strong>{comment.user?.name || "User"}</strong>

                          <p>{comment.content}</p>
                        </div>

                        <button
                          onClick={() =>
                            handleDeleteComment(comment.id, post.id)
                          }
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="moderator-empty">No comments on this post.</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== SUPPORT MESSAGES ==================== */}

        {activeTab === "support" && (
          <div className="moderator-section">
            <h2>💬 User Support Messages</h2>

            {supportMessages.length === 0 ? (
              <p className="moderator-empty">No support messages available.</p>
            ) : (
              supportMessages.map((supportMessage) => (
                <div key={supportMessage.id} className="support-message-card">
                  {/* User information */}

                  <div className="support-user">
                    <strong>{supportMessage.user?.name || "User"}</strong>

                    <span>{supportMessage.user?.email || ""}</span>
                  </div>

                  {/* User message */}

                  <div className="support-user-message">
                    <strong>User Message</strong>

                    <p>{supportMessage.message}</p>
                  </div>

                  {/* Status */}

                  <div className="support-status">
                    <strong>Status:</strong>{" "}
                    <span
                      className={
                        supportMessage.status === "RESOLVED"
                          ? "status-resolved"
                          : "status-pending"
                      }
                    >
                      {supportMessage.status}
                    </span>
                  </div>

                  {/* Existing reply */}

                  {supportMessage.reply && (
                    <div className="support-existing-reply">
                      <strong>Moderator Reply</strong>

                      <p>{supportMessage.reply}</p>
                    </div>
                  )}

                  {/* Reply box */}

                  <div className="support-reply-box">
                    <textarea
                      placeholder="Write a reply to the user..."
                      value={replyText[supportMessage.id] || ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({
                          ...prev,
                          [supportMessage.id]: e.target.value,
                        }))
                      }
                    />

                    <button onClick={() => handleReply(supportMessage.id)}>
                      💬 Send Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModeratorDashboard;
