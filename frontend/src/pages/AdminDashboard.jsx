import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState("users");

  const token = localStorage.getItem("token");

  // ==================== LOAD USERS ====================

  const loadUsers = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/users/admin/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  // ==================== LOAD POSTS ====================

  const loadPosts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/posts");

      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Failed to load posts:", error);
    }
  };

  // ==================== LOAD COMMENTS ====================

  const loadComments = async (currentPosts) => {
    try {
      const allComments = [];

      for (const post of currentPosts) {
        const response = await axios.get(
          `http://localhost:5000/api/posts/${post.id}/comments`,
        );

        const postComments = response.data.comments || [];

        postComments.forEach((comment) => {
          allComments.push({
            ...comment,
            postId: post.id,
            postContent: post.content,
          });
        });
      }

      setComments(allComments);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  // ==================== LOAD DATA ====================

  useEffect(() => {
    loadUsers();
    loadPosts();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      loadComments(posts);
    } else {
      setComments([]);
    }
  }, [posts]);

  // ==================== ACTIVATE / DEACTIVATE ====================

  const updateUserStatus = async (userId, isActive) => {
    try {
      await axios.put(
        `http://localhost:5000/api/users/admin/status/${userId}`,
        {
          isActive: !isActive,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        !isActive
          ? "User activated successfully"
          : "User deactivated successfully",
      );

      loadUsers();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to update user status");
    }
  };

  // ==================== DELETE POST ====================

  const deletePost = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post?",
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

      alert("Post deleted successfully");

      loadPosts();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to delete post");
    }
  };

  // ==================== DELETE COMMENT ====================

  const deleteComment = async (commentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/posts/comment/${commentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert("Comment deleted successfully");

      setComments((previousComments) =>
        previousComments.filter((comment) => comment.id !== commentId),
      );
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to delete comment");
    }
  };

  // ==================== STATISTICS ====================

  const totalUsers = users.length;

  const totalAdmins = users.filter((user) => user.role === "ADMIN").length;

  const totalContentManagers = users.filter(
    (user) => user.role === "CONTENT_MANAGER",
  ).length;

  const totalModerators = users.filter(
    (user) => user.role === "MODERATOR",
  ).length;

  // ==================== UI ====================

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h1>Admin Dashboard 🛡️</h1>

        <p className="admin-description">User and platform management</p>

        {/* ==================== STATISTICS ==================== */}

        <div className="admin-stats">
          <div className="stat-card">
            <h2>{totalUsers}</h2>
            <p>Total Users</p>
          </div>

          <div className="stat-card">
            <h2>{totalAdmins}</h2>
            <p>Admins</p>
          </div>

          <div className="stat-card">
            <h2>{totalContentManagers}</h2>
            <p>Content Managers</p>
          </div>

          <div className="stat-card">
            <h2>{totalModerators}</h2>
            <p>Moderators</p>
          </div>

          <div className="stat-card">
            <h2>{posts.length}</h2>
            <p>Total Posts</p>
          </div>

          <div className="stat-card">
            <h2>{comments.length}</h2>
            <p>Total Comments</p>
          </div>
        </div>

        {/* ==================== MANAGEMENT TABS ==================== */}

        <div className="admin-tabs">
          <button
            className={activeTab === "users" ? "active-tab" : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </button>

          <button
            className={activeTab === "posts" ? "active-tab" : ""}
            onClick={() => setActiveTab("posts")}
          >
            📝 Posts
          </button>

          <button
            className={activeTab === "comments" ? "active-tab" : ""}
            onClick={() => setActiveTab("comments")}
          >
            💬 Comments
          </button>
        </div>

        {/* ==================== USER MANAGEMENT ==================== */}

        {activeTab === "users" && (
          <div className="management-content">
            <h2 className="section-title">👥 User Management</h2>

            {users.length === 0 ? (
              <p>No users available.</p>
            ) : (
              users.map((user) => (
                <div className="admin-user" key={user.id}>
                  <div>
                    <h3>{user.name}</h3>

                    <p>{user.email}</p>

                    <span>Role: {user.role}</span>

                    <br />

                    <span
                      className={
                        user.isActive ? "active-status" : "inactive-status"
                      }
                    >
                      {user.isActive ? "🟢 Active" : "🔴 Inactive"}
                    </span>
                  </div>

                  <div className="admin-actions">
                    {user.role === "SUPER_ADMIN" ? (
                      <span className="protected-user">👑 Protected</span>
                    ) : (
                      <button
                        className={
                          user.isActive
                            ? "deactivate-button"
                            : "activate-button"
                        }
                        onClick={() => updateUserStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== POST MANAGEMENT ==================== */}

        {activeTab === "posts" && (
          <div className="management-content">
            <h2 className="section-title">📝 Post Management</h2>

            {posts.length === 0 ? (
              <p>No posts available.</p>
            ) : (
              posts.map((post) => (
                <div className="admin-post" key={post.id}>
                  <div className="admin-post-content">
                    <h3>{post.author?.name || "Unknown User"}</h3>

                    <p>{post.content}</p>

                    {post.image && (
                      <img
                        src={`http://localhost:5000${post.image}`}
                        alt="Post"
                        className="admin-post-image"
                      />
                    )}

                    <small>Post ID: {post.id}</small>
                  </div>

                  <button
                    className="delete-post-button"
                    onClick={() => deletePost(post.id)}
                  >
                    🗑️ Delete Post
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== COMMENT MANAGEMENT ==================== */}

        {activeTab === "comments" && (
          <div className="management-content">
            <h2 className="section-title">💬 Comment Management</h2>

            {comments.length === 0 ? (
              <p>No comments available.</p>
            ) : (
              comments.map((comment) => (
                <div className="admin-post" key={comment.id}>
                  <div className="admin-post-content">
                    <h3>{comment.user?.name || "Unknown User"}</h3>

                    <p>{comment.content}</p>

                    <small>On Post #{comment.postId}</small>
                  </div>

                  <button
                    className="delete-post-button"
                    onClick={() => deleteComment(comment.id)}
                  >
                    🗑️ Delete Comment
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
