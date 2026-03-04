
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Auth
import Login from "./pages/auth/Login";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";
import Home from "./pages/dashboard/Home";
import VIPView from "./pages/dashboard/VIPView";
import Spam from "./pages/dashboard/Spam";

// Management
import NewLetter from "./pages/management/NewLetter";
import MasterTable from "./pages/management/MasterTable";
import LetterTracker from "./pages/management/LetterTracker";
import LettersWithComments from "./pages/management/LettersWithComments";
import LetterEndorsement from "./pages/management/LetterEndorsement";
import LetterDetail from "./pages/management/LetterDetail";
import RoleAccessMatrix from "./pages/management/RoleAccessMatrix";
import Trays from "./pages/management/Trays";
import Users from "./pages/management/Users";
import Persons from "./pages/management/Persons";
import Departments from "./pages/management/Departments";
import LetterKinds from "./pages/management/LetterKinds";
import ProcessSteps from "./pages/management/ProcessSteps";
import Statuses from "./pages/management/Statuses";
import Attachments from "./pages/management/Attachments";
import UploadPDFFiles from "./pages/management/UploadPDFFiles";

// Setup
import SetupWizard from "./pages/setup/SetupWizard";
import DataImport from "./pages/setup/DataImport";

// User
import Settings from "./pages/user/Settings";
import Profile from "./pages/user/Profile";

// Guest
import GuestSendLetter from "./pages/guest/GuestSendLetter";

import { AuthProvider, useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0d0d0d]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Securing Connection...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }


  // RBAC Check
  const getPageKey = (path) => {
    if (path === "/" || path === "/dashboard") return "home";
    if (path === "/guest/send-letter") return "guest-send-letter";
    if (path.startsWith("/setup/")) return path.split("/").pop();
    if (path.startsWith("/letter/")) return "letter-detail"; // Map dynamic letter IDs to the detail permission
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    // Handle any other specific dynamic mappings here
    return cleanPath;
  };

  const pageKey = getPageKey(location.pathname);
  if (hasPermission && !hasPermission(pageKey, 'can_view')) {
    console.warn(`Access Denied for ${pageKey}`);
    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    if (roleName === 'VIP') return <Navigate to="/vip-view" replace />;
    if (roleName === 'USER') return <Navigate to="/letter-tracker" replace />;
    return <Navigate to="/letter-tracker" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/guest/send-letter" element={<GuestSendLetter />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Dashboard view="inbox" /></ProtectedRoute>} />
        <Route path="/outbox" element={<ProtectedRoute><Dashboard view="outbox" /></ProtectedRoute>} />
        <Route path="/vip-view" element={<ProtectedRoute><VIPView /></ProtectedRoute>} />
        <Route path="/new-letter" element={<ProtectedRoute><NewLetter /></ProtectedRoute>} />
        <Route path="/setup" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
        <Route path="/setup/trays" element={<ProtectedRoute><Trays /></ProtectedRoute>} />
        <Route path="/setup/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/setup/persons" element={<ProtectedRoute><Persons /></ProtectedRoute>} />
        <Route path="/setup/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
        <Route path="/setup/letter-kinds" element={<ProtectedRoute><LetterKinds /></ProtectedRoute>} />
        <Route path="/setup/process-steps" element={<ProtectedRoute><ProcessSteps /></ProtectedRoute>} />
        <Route path="/setup/statuses" element={<ProtectedRoute><Statuses /></ProtectedRoute>} />
        <Route path="/setup/attachments" element={<ProtectedRoute><Attachments /></ProtectedRoute>} />
        <Route path="/setup/role-matrix" element={<ProtectedRoute><RoleAccessMatrix /></ProtectedRoute>} />
        <Route path="/setup/data-import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
        <Route path="/master-table" element={<ProtectedRoute><MasterTable /></ProtectedRoute>} />
        <Route path="/letters-with-comments" element={<ProtectedRoute><LettersWithComments /></ProtectedRoute>} />
        <Route path="/letter-tracker" element={<ProtectedRoute><LetterTracker /></ProtectedRoute>} />
        <Route path="/upload-pdf" element={<ProtectedRoute><UploadPDFFiles /></ProtectedRoute>} />
        <Route path="/spam" element={<ProtectedRoute><Spam /></ProtectedRoute>} />
        <Route path="/endorsements" element={<ProtectedRoute><LetterEndorsement /></ProtectedRoute>} />
        <Route path="/letter/:id" element={<ProtectedRoute><LetterDetail /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
