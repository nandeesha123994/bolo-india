import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../api";
import { followUser, unfollowUser } from "../services/userService";
import "../styles/Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Unfollow
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
              <div>
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
        ) : (
          <p className="no-users">No users found.</p>
        )}
      </div>
    </div>
  );
}

export default Users;
