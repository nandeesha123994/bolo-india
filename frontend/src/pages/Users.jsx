import { useEffect, useState } from "react";
import axios from "axios";
import { followUser, unfollowUser } from "../services/userService";
import "../styles/Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:5000/api/users/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const allUsers = response.data.users || response.data;

      const currentUser = JSON.parse(localStorage.getItem("user"));

      const otherUsers = allUsers.filter((user) => user.id !== currentUser.id);

      setUsers(otherUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ==================== FOLLOW ====================

  const handleFollow = async (userId) => {
    try {
      await followUser(userId);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isFollowing: true } : user,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("Failed to follow user");
    }
  };

  // ==================== UNFOLLOW ====================

  const handleUnfollow = async (userId) => {
    try {
      await unfollowUser(userId);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isFollowing: false } : user,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("Failed to unfollow user");
    }
  };

  // ==================== SEARCH ====================

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();

    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="users-container">
      <div className="users-card">
        <h1>People on Bolo India 🇮🇳</h1>

        {/* ==================== SEARCH ==================== */}

        <div className="users-search">
          <input
            type="text"
            placeholder="🔍 Search people by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ==================== USERS ==================== */}

        {filteredUsers.length === 0 ? (
          <p className="no-users">No users found.</p>
        ) : (
          filteredUsers.map((user) => (
            <div className="user-item" key={user.id}>
              <div className="user-info">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>

              <div className="user-actions">
                {user.isFollowing ? (
                  <button
                    className="unfollow-btn"
                    onClick={() => handleUnfollow(user.id)}
                  >
                    Unfollow
                  </button>
                ) : (
                  <button
                    className="follow-btn"
                    onClick={() => handleFollow(user.id)}
                  >
                    Follow
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Users;
