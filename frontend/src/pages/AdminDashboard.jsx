import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AdminDashboard.css";

const API_BASE_URL = "http://localhost:5000/api";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);

  const [usersPagination, setUsersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [postsPagination, setPostsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [commentsPagination, setCommentsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalComments: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [roleCounts, setRoleCounts] = useState({
    ADMIN: 0,
    CONTENT_MANAGER: 0,
    MODERATOR: 0,
  });

  const [activeTab, setActiveTab] = useState("users");

  const token = localStorage.getItem("token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // ==================== LOAD USERS ====================

  const loadUsers = async (page = 1) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/users/admin/users?page=${page}&limit=5`,
        authConfig,
      );

      const userList = response.data.users || [];

      setUsers(userList);

      setUsersPagination(
        response.data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalUsers: userList.length,
          limit: 5,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );

      setRoleCounts({
        ADMIN: response.data.roleCounts?.ADMIN ?? 0,
        CONTENT_MANAGER: response.data.roleCounts?.CONTENT_MANAGER ?? 0,
        MODERATOR: response.data.roleCounts?.MODERATOR ?? 0,
      });
    } catch (error) {
      console.error(
        "Failed to load users:",
        error.response?.data || error.message,
      );
    }
  };

  // ==================== LOAD POSTS ====================

  const loadPosts = async (page = 1) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/posts?page=${page}&limit=5`,
      );

      const postList = response.data.posts || [];

      setPosts(postList);

      setPostsPagination(
        response.data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalPosts: postList.length,
          limit: 5,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );
    } catch (error) {
      console.error(
        "Failed to load posts:",
        error.response?.data || error.message,
      );
    }
  };

  // ==================== LOAD COMMENTS ====================

  const loadComments = async (page = 1) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/posts/admin/comments?page=${page}&limit=5`,
        authConfig,
      );

      const commentList = (response.data.comments || []).map((comment) => ({
        ...comment,
        postId: comment.post?.id,
        postContent: comment.post?.content,
      }));

      setComments(commentList);

      setCommentsPagination(
        response.data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalComments: commentList.length,
          limit: 5,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );
    } catch (error) {
      console.error(
        "Failed to load comments:",
        error.response?.data || error.message,
      );
    }
  };

  // ==================== LOAD DATA ====================

  useEffect(() => {
    loadUsers(1);
    loadPosts(1);
    loadComments(1);
  }, []);

  // ==================== ACTIVATE / DEACTIVATE USER ====================

  const updateUserStatus = async (userId, isActive) => {
    try {
      await axios.put(
        `${API_BASE_URL}/users/admin/status/${userId}`,
        { isActive: !isActive },
        authConfig,
      );

      alert(
        !isActive
          ? "User activated successfully"
          : "User deactivated successfully",
      );

      await loadUsers(usersPagination.currentPage);
    } catch (error) {
      console.error("Update user status error:", error);

      alert(error.response?.data?.message || "Failed to update user status");
    }
  };

  // ==================== DELETE POST ====================

  const deletePost = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post?",
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/posts/admin/${postId}`, authConfig);

      alert("Post deleted successfully");

      await loadPosts(postsPagination.currentPage);
    } catch (error) {
      console.error("Delete post error:", error);

      alert(error.response?.data?.message || "Failed to delete post");
    }
  };

  // ==================== DELETE COMMENT ====================

  const deleteComment = async (commentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/posts/comment/${commentId}`,
        authConfig,
      );

      alert("Comment deleted successfully");

      await loadComments(commentsPagination.currentPage);
    } catch (error) {
      console.error("Delete comment error:", error);

      alert(error.response?.data?.message || "Failed to delete comment");
    }
  };

  // ==================== STATISTICS ====================

  const totalUsers = usersPagination?.totalUsers ?? users.length;

  const totalAdmins = roleCounts?.ADMIN ?? 0;

  const totalContentManagers = roleCounts?.CONTENT_MANAGER ?? 0;

  const totalModerators = roleCounts?.MODERATOR ?? 0;

  const totalPosts = postsPagination?.totalPosts ?? posts.length;

  const totalComments = commentsPagination?.totalComments ?? comments.length;

  // ==================== UI ====================

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h1>Admin Dashboard 🛡️</h1>

        <p className="admin-description">User and platform management</p>

        {/* STATISTICS */}

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
            <h2>{totalPosts}</h2>
            <p>Total Posts</p>
          </div>

          <div className="stat-card">
            <h2>{totalComments}</h2>
            <p>Total Comments</p>
          </div>
        </div>

        {/* MANAGEMENT TABS */}

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

        {/* USER MANAGEMENT */}

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

            {usersPagination?.totalPages > 1 && (
              <PaginationControls
                pagination={usersPagination}
                onPageChange={loadUsers}
              />
            )}
          </div>
        )}

        {/* POST MANAGEMENT */}

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

            {postsPagination?.totalPages > 1 && (
              <PaginationControls
                pagination={postsPagination}
                onPageChange={loadPosts}
              />
            )}
          </div>
        )}

        {/* COMMENT MANAGEMENT */}

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

                    <small>On Post #{comment.postId ?? "N/A"}</small>
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

            {commentsPagination?.totalPages > 1 && (
              <PaginationControls
                pagination={commentsPagination}
                onPageChange={loadComments}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PAGINATION ====================

function PaginationControls({ pagination, onPageChange }) {
  const currentPage = pagination?.currentPage ?? 1;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="admin-pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!pagination?.hasPreviousPage}
      >
        ← Previous
      </button>

      <span>
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!pagination?.hasNextPage}
      >
        Next →
      </button>
    </div>
  );
}

export default AdminDashboard;
