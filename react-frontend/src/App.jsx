
import React, { useEffect } from "react";
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
import DepartmentLetters from "./pages/management/DepartmentLetters";
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
import ErrorBoundary from "./components/ErrorBoundary";
import systemPageService from "./services/systemPageService";
import { getPageKeyFromPath, humanizePageId } from "./utils/pageAccess";

const ProtectedRoute = ({ children }) => {
  const { user, loading, hasPermission, permissionsLoaded, isGuest } = useAuth();
  const location = useLocation();
  const pageKey = getPageKeyFromPath(location.pathname);

  useEffect(() => {
    if (!user || !pageKey) return;
    systemPageService.ensurePage({
      page_id: pageKey,
      page_name: humanizePageId(pageKey),
      description: `Auto-discovered from route: ${location.pathname}`
    }).catch(() => { });
  }, [user, pageKey, location.pathname]);

  if (loading || (user && !isGuest && !permissionsLoaded)) {
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

  if (hasPermission && !hasPermission(pageKey, 'can_view')) {
    console.warn(`Access Denied for ${pageKey}`);
    const fallbackCandidates = ["/", "/dashboard", "/letter-tracker", "/inbox", "/vip-view", "/guest/send-letter"];
    const fallback = fallbackCandidates.find((path) => hasPermission(getPageKeyFromPath(path), 'can_view'));
    if (!fallback || fallback === location.pathname) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={fallback} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

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
        <Route path="/departments/:deptId/letters" element={<ProtectedRoute><DepartmentLetters /></ProtectedRoute>} />
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
        <Route path="/guest/send-letter" element={<ProtectedRoute><GuestSendLetter /></ProtectedRoute>} />
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
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
