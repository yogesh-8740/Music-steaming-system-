import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { ToastProvider } from "./context/ToastContext";

import ProtectedRoute from "./components/common/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Favorites from "./pages/Favorites";
import History from "./pages/History";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import MyUploads from "./pages/MyUploads";
import ArtistUpload from "./pages/ArtistUpload";
import ArtistDashboard from "./pages/ArtistDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import NetworkMap from "./pages/NetworkMap";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PlayerProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected app shell */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/library/favorites" element={<Favorites />} />
                <Route path="/library/history" element={<History />} />
                <Route path="/library/playlists" element={<Playlists />} />
                <Route path="/library/playlists/:id" element={<PlaylistDetail />} />
                <Route path="/library/my-uploads" element={<MyUploads />} />
                <Route path="/upload" element={<ArtistUpload />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/network" element={<NetworkMap />} />

                <Route
                  path="/artist/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["artist", "admin"]}>
                      <ArtistDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </PlayerProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
