import { useEffect, useState } from "react";

import {
  getModeratorPosts,
  getModeratorComments,
  deleteCommentByModerator,
  getSupportMessages,
  replyToSupportMessage,
} from "../services/moderatorService";

import "../styles/ModeratorDashboard.css";

function ModeratorDashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [supportMessages, setSupportMessages] = useState([]);
  const [supportPage, setSupportPage] = useState(1);
  const [supportPagination, setSupportPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMessages: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [moderatorComments, setModeratorComments] = useState([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsPagination, setCommentsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalComments: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [replyText, setReplyText] = useState({});

  const [activeTab, setActiveTab] = useState("overview");

  const loadModeratorData = async () => {
    try {
      // Load posts
      const data = await getModeratorPosts();
      setPosts(data);

      const commentsData = await getModeratorComments(1, 5);
      setModeratorComments(commentsData.comments || []);
      setCommentsPage(commentsData.pagination?.currentPage || 1);
      setCommentsPagination(commentsData.pagination);

      // Load support messages
      const supportData = await getSupportMessages(1, 5);
      setSupportMessages(supportData.messages || []);
      setSupportPage(supportData.pagination?.currentPage || 1);
      setSupportPagination(supportData.pagination);
    } catch (error) {
      console.error("Failed to load moderator data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(loadModeratorData, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadCommentsPage = async (page) => {
    try {
      const commentsData = await getModeratorComments(page, 5);

      setModeratorComments(commentsData.comments || []);
      setCommentsPage(commentsData.pagination?.currentPage || page);
      setCommentsPagination(commentsData.pagination);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const loadSupportPage = async (page) => {
    try {
      const supportData = await getSupportMessages(page, 5);

      setSupportMessages(supportData.messages || []);
      setSupportPage(supportData.pagination?.currentPage || page);
      setSupportPagination(supportData.pagination);
    } catch (error) {
      console.error("Failed to load support messages:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteCommentByModerator(commentId);

      setModeratorComments((previousComments) =>
        previousComments.filter((comment) => comment.id !== commentId),
      );

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

  const totalComments = commentsPagination.totalComments;

  const totalSupportMessages = supportPagination.totalMessages;

  const pendingSupportMessages = supportMessages.filter(
    (message) => message.status === "PENDING",
  ).length;

  if (loading) {
    return (
      <div className="moderator-dashboard">
        <div className="moderator-container">
          <div className="moderator-header">
            <h1>Moderator Dashboard 🛡️</h1>

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
          <h1>Moderator Dashboard 🛡️</h1>

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

            {moderatorComments.length === 0 ? (
              <p className="moderator-empty">No comments available.</p>
            ) : (
              moderatorComments.map((comment) => (
                <div key={comment.id} className="moderator-comment-card">
                  <div>
                    <strong>{comment.user?.name || "User"}</strong>

                    <p>{comment.content}</p>

                    <small>On Post #{comment.post?.id}</small>
                  </div>

                  <button onClick={() => handleDeleteComment(comment.id)}>
                    🗑️ Delete
                  </button>
                </div>
              ))
            )}

            {commentsPagination.totalPages > 1 && (
              <div className="moderator-pagination">
                <button
                  onClick={() => loadCommentsPage(commentsPage - 1)}
                  disabled={!commentsPagination.hasPreviousPage}
                >
                  ← Previous
                </button>

                <span>
                  Page {commentsPagination.currentPage} of{" "}
                  {commentsPagination.totalPages}
                </span>

                <button
                  onClick={() => loadCommentsPage(commentsPage + 1)}
                  disabled={!commentsPagination.hasNextPage}
                >
                  Next →
                </button>
              </div>
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

            {supportPagination.totalPages > 1 && (
              <div className="support-pagination">
                <button
                  onClick={() => loadSupportPage(supportPage - 1)}
                  disabled={!supportPagination.hasPreviousPage}
                >
                  ← Previous
                </button>

                <span>
                  Page {supportPagination.currentPage} of{" "}
                  {supportPagination.totalPages}
                </span>

                <button
                  onClick={() => loadSupportPage(supportPage + 1)}
                  disabled={!supportPagination.hasNextPage}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModeratorDashboard;
