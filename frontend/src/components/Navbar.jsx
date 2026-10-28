import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalNotifications: 0,
    unreadNotifications: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const loadNotifications = async (page = 1) => {
    try {
      const data = await getNotifications(page, 5);

      setNotifications(data.notifications || []);

      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalNotifications: 0,
          unreadNotifications: 0,
          limit: 5,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );

      setCurrentPage(page);
      setUnreadCount(data.pagination?.unreadNotifications || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (token) {
      loadNotifications(1);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      const wasUnread = notification && !notification.isRead;

      await markNotificationAsRead(notificationId);

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );

      if (wasUnread) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true })),
      );

      setUnreadCount(0);

      setPagination((previous) => ({
        ...previous,
        unreadNotifications: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const canAccessDashboard =
    user &&
    ["ADMIN", "SUPER_ADMIN", "CONTENT_MANAGER", "MODERATOR"].includes(
      user.role,
    );

  // Automatically highlights the current route
  const navLinkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

  return (
    <nav
      className={`navbar${location.pathname === "/chat" ? " chat-navbar" : ""}`}
    >
      <div
        className="navbar-logo"
        onClick={() => navigate(token ? "/home" : "/")}
      >
        <span className="navbar-logo-in">IN</span>
        <span className="navbar-logo-name">Bolo India</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/home" end className={navLinkClass}>
          Home
        </NavLink>

        {token && (
          <>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>

            <NavLink to="/users" className={navLinkClass}>
              People
            </NavLink>

            <NavLink to="/chat" className={navLinkClass}>
              Chat
            </NavLink>

            <NavLink to="/my-reports" className={navLinkClass}>
              My Reports
            </NavLink>

            {canAccessDashboard && (
              <NavLink to="/admin" className={navLinkClass}>
                Dashboard
              </NavLink>
            )}
          </>
        )}

        {/* Notifications */}
        {token && (
          <div className="notification-container">
            <button
              className="notification-button"
              onClick={() => setShowNotifications((previous) => !previous)}
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              {unreadCount > 0 && (
                <span className="notification-count">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>

                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="no-notifications">No notifications yet.</p>
                ) : (
                  <>
                    <div className="notification-list">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`notification-item ${
                            !notification.isRead ? "unread" : ""
                          }`}
                          onClick={() =>
                            handleNotificationClick(notification.id)
                          }
                        >
                          <span className="notification-icon">
                            {notification.type === "LIKE" && "❤️"}
                            {notification.type === "COMMENT" && "💬"}
                            {notification.type === "FOLLOW" && "👤"}
                            {notification.type === "ROLE_UPDATE" && "🔐"}
                          </span>

                          <div className="notification-content">
                            <p>{notification.message}</p>
                            <small>
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>

                    {pagination.totalPages > 1 && (
                      <div className="notification-pagination">
                        <button
                          onClick={() => loadNotifications(currentPage - 1)}
                          disabled={!pagination.hasPreviousPage}
                        >
                          ←
                        </button>

                        <span>
                          Page {pagination.currentPage} of{" "}
                          {pagination.totalPages}
                        </span>

                        <button
                          onClick={() => loadNotifications(currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                        >
                          →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Login and Register */}
        {!token && (
          <>
            <NavLink to="/login" className={navLinkClass}>
              Login
            </NavLink>

            <NavLink to="/register" className={navLinkClass}>
              Register
            </NavLink>
          </>
        )}

        {/* Logout */}
        {token && <button onClick={handleLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
