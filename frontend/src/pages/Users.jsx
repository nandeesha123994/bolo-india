import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import API_URL, { API_ORIGIN } from "../api";
import { useFeedback } from "../components/FeedbackProvider";
import { followUser, unfollowUser } from "../services/userService";
import "../styles/Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const { showToast } = useFeedback();

  // Load users
  const loadUsers = async (search = "") => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/users/all?search=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Supports both a direct array and a { users: [] } response
      const allUsers = Array.isArray(response.data)
        ? response.data
        : response.data.users || [];

      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Follow
  const handleFollow = async (userId) => {
    const user = users.find((item) => item.id === userId);

    try {
      setPendingUserId(userId);
      await followUser(userId);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isFollowing: true } : user,
        ),
      );
      showToast(`You are now following ${user?.name || "this user"}.`);
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to follow user.",
        "error",
      );
    } finally {
      setPendingUserId(null);
    }
  };

  // Unfollow
  const handleUnfollow = async (userId) => {
    const user = users.find((item) => item.id === userId);

    try {
      setPendingUserId(userId);
      await unfollowUser(userId);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isFollowing: false } : user,
        ),
      );
      showToast(`You unfollowed ${user?.name || "this user"}.`);
    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.message || "Failed to unfollow user.",
        "error",
      );
    } finally {
      setPendingUserId(null);
    }
  };

  // Search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    loadUsers(value);
  };

  return (
    <div className="users-container">
      <div className="users-card">
        <h1>People on Bolo India 🇮🇳</h1>

        <div className="users-search">
          <input
            type="text"
            placeholder="🔍 Search people..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        {users.length > 0 ? (
          users.map((user) => (
            <div className="user-item" key={user.id}>
              <div className="user-profile-summary">
                <Link
                  to={`/profile/${user.id}`}
                  className="users-avatar-link"
                  aria-label={`View ${user.name}'s profile`}
                >
                  {user.profileImage ? (
                    <img
                      src={
                        user.profileImage.startsWith("http")
                          ? user.profileImage
                          : `${API_ORIGIN}${user.profileImage.startsWith("/") ? "" : "/"}${user.profileImage}`
                      }
                      alt=""
                      className="users-avatar"
                    />
                  ) : (
                    <span className="users-avatar-placeholder">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </Link>
                <div>
                  <h3>
                    <Link to={`/profile/${user.id}`} className="users-name-link">
                      {user.name}
                    </Link>
                  </h3>
                  <p>{user.email}</p>
                </div>
              </div>

              <div className="user-actions">
                {user.isFollowing ? (
                  <button
                    className="unfollow-btn"
                    onClick={() => handleUnfollow(user.id)}
                    disabled={pendingUserId === user.id}
                  >
                    {pendingUserId === user.id ? "Please wait..." : "Unfollow"}
                  </button>
                ) : (
                  <button
                    className="follow-btn"
                    onClick={() => handleFollow(user.id)}
                    disabled={pendingUserId === user.id}
                  >
                    {pendingUserId === user.id ? "Please wait..." : "Follow"}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="no-users">No users found.</p>
        )}
      </div>
    </div>
  );
}

export default Users;
