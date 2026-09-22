import { useEffect, useState } from "react";
import axios from "axios";
import ContactMessages from "../components/ContactMessages";
import "../styles/SuperAdminDashboard.css";

function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

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

      const userList = response.data.users || [];

      setUsers(userList);

      const roles = {};

      userList.forEach((user) => {
        roles[user.id] = user.role;
      });

      setSelectedRoles(roles);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ==================== ROLE CHANGE ====================

  const handleRoleChange = (userId, role) => {
    setSelectedRoles((previous) => ({
      ...previous,
      [userId]: role,
    }));
  };

  // ==================== UPDATE ROLE ====================

  const updateRole = async (userId) => {
    const newRole = selectedRoles[userId];

    try {
      await axios.put(
        `http://localhost:5000/api/users/admin/role/${userId}`,
        {
          role: newRole,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(`Role updated to ${newRole}`);

      loadUsers();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to update user role");
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
    <div className="super-admin-container">
      <div className="super-admin-card">
        {/* ==================== HEADER ==================== */}

        <h1>Super Admin Dashboard 👑</h1>

        <p className="super-admin-description">
          Complete platform and role management
        </p>

        {/* ==================== TABS ==================== */}

        <div className="super-admin-tabs">
          <button
            className={activeTab === "overview" ? "active-tab" : ""}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>

          <button
            className={activeTab === "users" ? "active-tab" : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 User Management
          </button>

          <button
            className={activeTab === "contact" ? "active-tab" : ""}
            onClick={() => setActiveTab("contact")}
          >
            📩 Contact Messages
          </button>
        </div>

        {/* ==================== OVERVIEW ==================== */}

        {activeTab === "overview" && (
          <div className="management-content">
            <h2 className="section-title">Platform Statistics</h2>

            <div className="super-admin-stats">
              <div className="super-stat-card">
                <h2>{totalUsers}</h2>
                <p>Total Users</p>
              </div>

              <div className="super-stat-card">
                <h2>{totalAdmins}</h2>
                <p>Admins</p>
              </div>

              <div className="super-stat-card">
                <h2>{totalContentManagers}</h2>
                <p>Content Managers</p>
              </div>

              <div className="super-stat-card">
                <h2>{totalModerators}</h2>
                <p>Moderators</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== USER MANAGEMENT ==================== */}

        {activeTab === "users" && (
          <div className="management-content">
            <h2 className="section-title">👥 User Management</h2>

            <div className="super-user-table-wrapper">
              <table className="super-user-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Change Role</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="super-no-users">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        {/* ID */}

                        <td className="super-user-id">#{user.id}</td>

                        {/* USER */}

                        <td>
                          <div className="super-table-user">
                            <div className="super-user-avatar">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>

                            <strong>{user.name}</strong>
                          </div>
                        </td>

                        {/* EMAIL */}

                        <td className="super-user-email">{user.email}</td>

                        {/* CURRENT ROLE */}

                        <td>
                          <span
                            className={`super-role-badge role-${user.role.toLowerCase()}`}
                          >
                            {user.role}
                          </span>
                        </td>

                        {/* CHANGE ROLE */}

                        <td>
                          {user.role === "SUPER_ADMIN" ? (
                            <strong className="super-protected-role">
                              👑 Protected
                            </strong>
                          ) : (
                            <select
                              className="super-role-select"
                              value={selectedRoles[user.id] || user.role}
                              onChange={(event) =>
                                handleRoleChange(user.id, event.target.value)
                              }
                            >
                              <option value="USER">USER</option>

                              <option value="ADMIN">ADMIN</option>

                              <option value="CONTENT_MANAGER">
                                CONTENT MANAGER
                              </option>

                              <option value="MODERATOR">MODERATOR</option>
                            </select>
                          )}
                        </td>

                        {/* ACTION */}

                        <td>
                          {user.role === "SUPER_ADMIN" ? (
                            <span className="super-protected-text">
                              Protected
                            </span>
                          ) : (
                            <button
                              className="super-update-button"
                              onClick={() => updateRole(user.id)}
                            >
                              Update Role
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== CONTACT MESSAGES ==================== */}

        {activeTab === "contact" && (
          <div className="management-content">
            <h2 className="section-title">📩 Contact Messages</h2>

            <ContactMessages />
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
