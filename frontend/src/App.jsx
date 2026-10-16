import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import RoleDashboard from "./components/RoleDashboard";
import MyReports from "./pages/MyReports";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import Support from "./pages/Support";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== PUBLIC PAGES ==================== */}

        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ==================== PROTECTED PAGES ==================== */}

        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Navbar />
              <Support />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navbar />
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-reports"
          element={
            <ProtectedRoute>
              <Navbar />
              <MyReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Navbar />
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Navbar />
              <RoleDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/moderator"
          element={
            <ProtectedRoute>
              <Navbar />
              <ModeratorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Navbar />
              <Home />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
