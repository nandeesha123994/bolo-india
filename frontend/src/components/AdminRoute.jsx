import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return <Navigate to="/home" />;
  }

  return children;
}

export default AdminRoute;
