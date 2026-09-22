import { Navigate } from "react-router-dom";

import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import ContentManagerDashboard from "../pages/ContentManagerDashboard";
import ModeratorDashboard from "../pages/ModeratorDashboard";

function RoleDashboard() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  switch (user.role) {
    case "SUPER_ADMIN":
      return <SuperAdminDashboard />;

    case "ADMIN":
      return <AdminDashboard />;

    case "CONTENT_MANAGER":
      return <ContentManagerDashboard />;

    case "MODERATOR":
      return <ModeratorDashboard />;

    case "USER":
      return <Navigate to="/home" />;

    default:
      return <Navigate to="/login" />;
  }
}

export default RoleDashboard;
