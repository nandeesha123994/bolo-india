import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/ContentManagerDashboard.css";

function ContentManagerDashboard() {
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportResponses, setReportResponses] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

  const token = localStorage.getItem("token");

  // ==================== LOAD POSTS ====================

  const loadPosts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/posts");

      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Failed to load posts:", error);
    }
  };

  // ==================== LOAD REPORTS ====================

  const loadReports = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/reports", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setReports(response.data.reports || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  };

  useEffect(() => {
    loadPosts();
    loadReports();
  }, []);

  // ==================== DELETE POST ====================

  const deletePost = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this content?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/posts/admin/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Content removed successfully");

      loadPosts();
      loadReports();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to remove content");
    }
  };

  // ==================== UPDATE REPORT STATUS ====================

  const updateReportStatus = async (reportId, status) => {
    const response = reportResponses[reportId];

    if (!response || !response.trim()) {
      alert("Please write a response before updating the report.");
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/reports/${reportId}/status`,
        {
          status,
          response: response.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        status === "RESOLVED"
          ? "Report resolved successfully"
          : "Report rejected successfully",
      );

      setReportResponses((prev) => ({
        ...prev,
        [reportId]: "",
      }));

      loadReports();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to update report");
    }
  };

  // ==================== STATISTICS ====================

  const totalPosts = posts.length;

  const totalComments = posts.reduce(
    (total, post) => total + (post.comments?.length || 0),
    0,
  );

  const totalLikes = posts.reduce(
    (total, post) => total + (post.likes?.length || 0),
    0,
  );

  const pendingReportList = reports.filter(
    (report) => report.status === "PENDING",
  );

  const pendingReports = pendingReportList.length;

  const reportHistory = reports.filter((report) => report.status !== "PENDING");

  // ==================== UI ====================

  return (
    <div className="content-manager-container">
      <div className="content-manager-card">
        <h1>Content Manager Dashboard 🎯</h1>

        <p className="content-manager-description">
          Content review and management
        </p>

        {/* ==================== TABS ==================== */}

        <div className="content-manager-tabs">
          <button
            className={activeTab === "overview" ? "active-tab" : ""}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>

          <button
            className={activeTab === "pending" ? "active-tab" : ""}
            onClick={() => setActiveTab("pending")}
          >
            🚩 Pending Reports
          </button>

          <button
            className={activeTab === "history" ? "active-tab" : ""}
            onClick={() => setActiveTab("history")}
          >
            📋 Report History
          </button>
        </div>

        {/* ==================== OVERVIEW ==================== */}

        {activeTab === "overview" && (
          <div className="management-content">
            <h2 className="section-title">Content Statistics</h2>

            <div className="content-stats">
              <div className="content-stat-card">
                <h2>{totalPosts}</h2>
                <p>Total Posts</p>
              </div>

              <div className="content-stat-card">
                <h2>{totalComments}</h2>
                <p>Total Comments</p>
              </div>

              <div className="content-stat-card">
                <h2>{totalLikes}</h2>
                <p>Total Likes</p>
              </div>

              <div className="content-stat-card">
                <h2>{pendingReports}</h2>
                <p>Pending Reports</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PENDING REPORTS ==================== */}

        {activeTab === "pending" && (
          <div className="management-content">
            <h2 className="section-title">Reported Posts 🚩</h2>

            {pendingReportList.length === 0 ? (
              <div className="reported-placeholder">
                <h3>No pending reports</h3>

                <p>There are currently no reports waiting for review.</p>
              </div>
            ) : (
              pendingReportList.map((report) => (
                <div className="content-post" key={report.id}>
                  <div className="content-post-details">
                    <h3>🚩 Reported Post #{report.post?.id}</h3>

                    <p>
                      <strong>Post:</strong>{" "}
                      {report.post?.content || "Content unavailable"}
                    </p>

                    <p>
                      <strong>Posted by:</strong>{" "}
                      {report.post?.author?.name || "Unknown User"}
                    </p>

                    <p>
                      <strong>Reported by:</strong>{" "}
                      {report.reporter?.name || "Unknown User"}
                    </p>

                    <p>
                      <strong>Reason:</strong> {report.reason}
                    </p>

                    <p>
                      <strong>Status:</strong> {report.status}
                    </p>

                    <textarea
                      className="report-response-input"
                      placeholder="Write your response to the user..."
                      value={reportResponses[report.id] || ""}
                      onChange={(e) =>
                        setReportResponses((prev) => ({
                          ...prev,
                          [report.id]: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="report-actions">
                    <button
                      className="resolve-report-button"
                      onClick={() => updateReportStatus(report.id, "RESOLVED")}
                    >
                      ✅ Resolve
                    </button>

                    <button
                      className="reject-report-button"
                      onClick={() => updateReportStatus(report.id, "REJECTED")}
                    >
                      ❌ Reject
                    </button>

                    <button
                      className="remove-content-button"
                      onClick={() => deletePost(report.post.id)}
                    >
                      🗑️ Remove Content
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== REPORT HISTORY ==================== */}

        {activeTab === "history" && (
          <div className="management-content">
            <h2 className="section-title">📋 Report History</h2>

            {reportHistory.length === 0 ? (
              <div className="reported-placeholder">
                <h3>No report history</h3>

                <p>No resolved or rejected reports yet.</p>
              </div>
            ) : (
              reportHistory.map((report) => (
                <div className="content-post" key={report.id}>
                  <div className="content-post-details">
                    <h3>📋 Reported Post #{report.post?.id}</h3>

                    <p>
                      <strong>Post:</strong>{" "}
                      {report.post?.content || "Content unavailable"}
                    </p>

                    <p>
                      <strong>Posted by:</strong>{" "}
                      {report.post?.author?.name || "Unknown User"}
                    </p>

                    <p>
                      <strong>Reported by:</strong>{" "}
                      {report.reporter?.name || "Unknown User"}
                    </p>

                    <p>
                      <strong>Reason:</strong> {report.reason}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        className={
                          report.status === "RESOLVED"
                            ? "report-status-resolved"
                            : "report-status-rejected"
                        }
                      >
                        {report.status}
                      </span>
                    </p>

                    <p>
                      <strong>Response:</strong>{" "}
                      {report.response || "No response provided"}
                    </p>
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

export default ContentManagerDashboard;
