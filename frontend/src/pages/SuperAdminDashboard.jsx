import { useEffect, useState } from "react";
import axios from "axios";
import ContactMessages from "../components/ContactMessages";
import API_BASE_URL from "../api";
import "../styles/SuperAdminDashboard.css";

const API_URL = `${API_BASE_URL}/users`;
const USERS_PER_PAGE = 10;

function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Registration state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "USER",
  });

  const [creatingUser, setCreatingUser] = useState(false);

  const token = localStorage.getItem("token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // ==================== LOAD USERS WITH GLOBAL SEARCH + PAGINATION ====================

  const loadUsers = async (page = currentPage, search = searchTerm) => {
    try {
      setLoadingUsers(true);

      const response = await axios.get(`${API_URL}/admin/users`, {
        ...authConfig,
        params: {
          page,
          limit: USERS_PER_PAGE,
          search: search.trim(),
        },
      });

      const userList = response.data.users || [];
      const pagination = response.data.pagination || {};

      setUsers(userList);

      setCurrentPage(Number(pagination.currentPage) || page);
      setTotalPages(Number(pagination.totalPages) || 1);
      setTotalUsersCount(
        Number(pagination.totalUsers ?? pagination.total ?? userList.length),
      );

      // Preserve selected roles for users on other pages.
      const roles = {};

      userList.forEach((user) => {
        roles[user.id] = user.role;
      });

      setSelectedRoles((previous) => ({
        ...previous,
        ...roles,
      }));
    } catch (error) {
      console.error("Failed to load users:", error);

      alert(
        error.response?.data?.message ||
          "Failed to load users. Please try again.",
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  // ==================== INITIAL LOAD ====================

  useEffect(() => {
    loadUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== GLOBAL SEARCH ====================

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setSearchTerm(value);
    setCurrentPage(1);

    // Search across all users through the backend API.
    loadUsers(1, value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    loadUsers(1, "");
  };

  // ==================== PAGE NAVIGATION ====================

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || loadingUsers) {
      return;
    }

    loadUsers(page, searchTerm);
  };

  // ==================== CREATE USER ====================

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (!newUser.name.trim() || !newUser.email.trim()) {
      alert("Please enter the user's name and email.");
      return;
    }

    try {
      setCreatingUser(true);

      const response = await axios.post(
        `${API_URL}/admin/register`,
        {
          name: newUser.name.trim(),
          email: newUser.email.trim(),
          role: newUser.role,
        },
        authConfig,
      );

      alert(response.data.message || "User registered successfully.");

      setNewUser({
        name: "",
        email: "",
        role: "USER",
      });

      // Refresh the current search results and page.
      await loadUsers(currentPage, searchTerm);
    } catch (error) {
      console.error("Create user error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to register user. Please try again.",
      );
    } finally {
      setCreatingUser(false);
    }
  };

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

    if (!newRole) {
      alert("Please select a role.");
      return;
    }

    try {
      await axios.put(
        `${API_URL}/admin/role/${userId}`,
        { role: newRole },
        authConfig,
      );

      alert(`Role updated to ${newRole}`);

      // Reload current search results after updating the role.
      await loadUsers(currentPage, searchTerm);
    } catch (error) {
      console.error("Failed to update role:", error);

      alert(error.response?.data?.message || "Failed to update user role.");
    }
  };

  // ==================== STATISTICS ====================

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
                <h2>{totalUsersCount}</h2>
                <p>Total Users</p>
              </div>

              <div className="super-stat-card">
                <h2>{totalAdmins}</h2>
                <p>Admins on Current Page</p>
              </div>

              <div className="super-stat-card">
                <h2>{totalContentManagers}</h2>
                <p>Content Managers on Current Page</p>
              </div>

              <div className="super-stat-card">
                <h2>{totalModerators}</h2>
                <p>Moderators on Current Page</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== USER MANAGEMENT ==================== */}

        {activeTab === "users" && (
          <div className="management-content">
            <h2 className="section-title">👥 User Management</h2>

            {/* ==================== REGISTER USER ==================== */}

            <div className="management-content">
              <h3>➕ Register New User</h3>

              <p>
                Register a user and send their login credentials to their email
                address.
              </p>

              <form onSubmit={handleCreateUser}>
                <div className="post-field">
                  <label htmlFor="new-user-name">Full Name</label>

                  <input
                    id="new-user-name"
                    type="text"
                    value={newUser.name}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        name: event.target.value,
                      })
                    }
                    placeholder="Enter full name"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="post-field">
                  <label htmlFor="new-user-email">Email Address</label>

                  <input
                    id="new-user-email"
                    type="email"
                    value={newUser.email}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        email: event.target.value,
                      })
                    }
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="post-field">
                  <label htmlFor="new-user-role">Assign Role</label>

                  <select
                    id="new-user-role"
                    value={newUser.role}
                    onChange={(event) =>
                      setNewUser({
                        ...newUser,
                        role: event.target.value,
                      })
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="CONTENT_MANAGER">CONTENT MANAGER</option>
                    <option value="MODERATOR">MODERATOR</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="super-update-button"
                  disabled={creatingUser}
                >
                  {creatingUser
                    ? "Registering..."
                    : "Register User & Send Email"}
                </button>
              </form>
            </div>

            {/* ==================== EXISTING USERS ==================== */}

            <h3 className="section-title">
              Existing Users ({totalUsersCount})
            </h3>

            {/* GLOBAL SEARCH BAR */}

            <div className="super-user-search">
              <label htmlFor="super-admin-user-search">Search users</label>

              <div className="super-user-search-box">
                <span className="search-icon" aria-hidden="true">
                  🔍
                </span>

                <input
                  id="super-admin-user-search"
                  type="search"
                  placeholder="Search all users by name, email, user ID, or role..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  autoComplete="off"
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="super-search-clear"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {searchTerm.trim() && (
                <p className="super-search-results">
                  {loadingUsers
                    ? "Searching users..."
                    : `${totalUsersCount} matching user(s) found`}
                </p>
              )}
            </div>

            {/* USERS TABLE */}

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
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="6" className="super-no-users">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="super-no-users">
                        {searchTerm.trim()
                          ? "No users match your search."
                          : "No users found."}
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="super-user-id">#{user.id}</td>

                        <td>
                          <div className="super-table-user">
                            <div className="super-user-avatar">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>

                            <strong>{user.name}</strong>
                          </div>
                        </td>

                        <td className="super-user-email">{user.email}</td>

                        <td>
                          <span
                            className={`super-role-badge role-${user.role.toLowerCase()}`}
                          >
                            {user.role}
                          </span>
                        </td>

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

                        <td>
                          {user.role === "SUPER_ADMIN" ? (
                            <span className="super-protected-text">
                              Protected
                            </span>
                          ) : (
                            <button
                              className="super-update-button"
                              onClick={() => updateRole(user.id)}
                              disabled={loadingUsers}
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

            {/* ==================== PAGINATION ==================== */}

            {totalUsersCount > USERS_PER_PAGE && (
              <div className="super-pagination">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loadingUsers}
                >
                  ← Previous
                </button>

                <span>
                  Page <strong>{currentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loadingUsers}
                >
                  Next →
                </button>
              </div>
            )}
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
