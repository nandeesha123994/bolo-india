import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ==================== GET NOTIFICATIONS ====================

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, [token]);

  // ==================== LOGOUT ====================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  // ==================== MARK ONE AS READ ====================

  const handleNotificationClick = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // ==================== MARK ALL AS READ ====================

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // ==================== UNREAD COUNT ====================

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const canAccessDashboard =
    user &&
    (user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "CONTENT_MANAGER" ||
      user.role === "MODERATOR");

  return (
    <nav className="navbar">
      <div className="navbar-logo">🇮🇳 Bolo India</div>

      <div className="navbar-links">
        <Link to="/home">Home</Link>

        {token && <Link to="/profile">Profile</Link>}

        {token && <Link to="/users">People</Link>}

        {token && <Link to="/my-reports">My Reports</Link>}

        {token && canAccessDashboard && <Link to="/admin">Dashboard</Link>}

        {/* ==================== NOTIFICATIONS ==================== */}

        {token && (
          <div className="notification-container">
            <button
              className="notification-button"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
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
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${
                          !notification.isRead ? "unread" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <span className="notification-icon">
                          {notification.type === "LIKE" && "❤️"}
                          {notification.type === "COMMENT" && "💬"}
                          {notification.type === "FOLLOW" && "👤"}
                        </span>

                        <div className="notification-content">
                          <p>{notification.message}</p>

                          <small>
                            {new Date(notification.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!token && (
          <>
            <Link to="/login">Login</Link>

            <Link to="/register">Register</Link>
          </>
        )}

        {token && <button onClick={handleLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
