
import React, { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

// Auth
import Login from "./pages/auth/Login";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";
import Home from "./pages/dashboard/Home";
import Outbox from "./pages/dashboard/Outbox";
import VIPView from "./pages/dashboard/VIPView";
import NewLetter from "./pages/management/NewLetter";
import MasterTable from "./pages/management/MasterTable";
import LetterTracker from "./pages/management/LetterTracker";
import LettersWithComments from "./pages/management/LettersWithComments";
import LetterEndorsement from "./pages/management/LetterEndorsement";
import LetterDetail from "./pages/management/LetterDetail";
import LegacyData from "./pages/management/LegacyData";
import VemResumen from "./pages/management/VemResumen";
import AevmResumen from "./pages/management/AevmResumen";
import ResumenPage from "./pages/management/ResumenPage";
import RoleAccessMatrix from "./pages/management/RoleAccessMatrix";
import DeptAccessMatrix from "./pages/management/DeptAccessMatrix";
import Roles from "./pages/management/Roles";
import Trays from "./pages/management/Trays";
import Users from "./pages/management/Users";
import InterDeptManagement from "./pages/management/InterDeptManagement";
import DepartmentViewer from "./pages/management/DepartmentViewer";
import Persons from "./pages/management/Persons";
import Departments from "./pages/management/Departments";
import DepartmentLetters from "./pages/management/DepartmentLetters";
import LetterKinds from "./pages/management/LetterKinds";
import ProcessSteps from "./pages/management/ProcessSteps";
import Statuses from "./pages/management/Statuses";
import Attachments from "./pages/management/Attachments";
import UploadPDFFiles from "./pages/management/UploadPDFFiles";
import SectionRegistry from "./pages/management/SectionRegistry";
import AuditLogs from "./pages/management/AuditLogs";

// Setup
import SetupWizard from "./pages/setup/SetupWizard";
import DataImport from "./pages/setup/DataImport";

// User
import Settings from "./pages/user/Settings";
import Profile from "./pages/user/Profile";

// Guest
import GuestSendLetter from "./pages/guest/GuestSendLetter";
import Maintenance from "./pages/Maintenance";

import { AuthProvider, useAuth, useSession } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import axios from "axios";

// Global Axios Error Logger
axios.interceptors.response.use(
  response => response,
  error => {
    const status = error.response ? error.response.status : 'NETWORK/TIMEOUT';
    const url = error.config ? error.config.url : 'UNKNOWN';
    console.error(`%c[API ERROR] ${status} | ${url}`, 'color: white; background: red; padding: 2px 5px; border-radius: 3px; font-weight: bold;');
    console.error('Details:', error.response?.data || error.message);

    // Auto-redirect to maintenance on gateway errors (backend down/updating)
    if (status === 502 || status === 503 || status === 504) {
      if (window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
    }

    return Promise.reject(error);
  }
);
import systemPageService from "./services/systemPageService";
import { getPageKeyFromPath, humanizePageId } from "./utils/pageAccess";

const ProtectedRoute = ({ children }) => {
  const { user, loading, hasPermission, permissionsLoaded, isGuest, isSuperAdmin } = useSession();
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

  useEffect(() => {
    console.log(`[NAV] ProtectedRoute mounted for ${location.pathname}. Loading: ${loading}, PermsLoaded: ${permissionsLoaded}`);
  }, [loading, permissionsLoaded, location.pathname]);

  if (loading || (user && !isGuest && !permissionsLoaded)) {
    console.log(`[BOOT] Showing spinner on ${location.pathname} (loading: ${loading}, permsLoaded: ${permissionsLoaded})`);
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

  if (user && !isSuperAdmin && hasPermission && !hasPermission(pageKey, 'can_view')) {
    console.warn(`Access Denied for ${pageKey}. User Role: ${user?.role || user?.roleData?.name}. isSuperAdmin: ${isSuperAdmin}`);
    const fallbackCandidates = ["/", "/dashboard", "/letter-tracker", "/inbox", "/guest/send-letter"];
    const fallback = fallbackCandidates.find((path) => hasPermission(getPageKeyFromPath(path), 'can_view'));
    if (!fallback || fallback === location.pathname) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={fallback} replace />;
  }

  return children;
};

function AppRoutes() {
  const navigate = useNavigate();
  
  const sequenceRef = useRef("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      // Triggers (Ctrl+Y or Ctrl+A)
      if (e.ctrlKey && key === 'y') {
        sequenceRef.current = 'ctrl_y';
        e.preventDefault();
        console.log("[SHORTCUT] Sequence primed: ctrl_y");
      } else if (e.ctrlKey && key === 'a') {
        sequenceRef.current = 'ctrl_a';
        e.preventDefault();
        console.log("[SHORTCUT] Sequence primed: ctrl_a");
      } 
      // Completions (X after Ctrl+Y, or M after Ctrl+A)
      else if (sequenceRef.current === 'ctrl_y' && key === 'x') {
        e.preventDefault();
        console.log("[SHORTCUT] Navigating to VEM Resumen");
        navigate('/vem-resumen');
        sequenceRef.current = '';
      } else if (sequenceRef.current === 'ctrl_a' && key === 'm') {
        e.preventDefault();
        console.log("[SHORTCUT] Navigating to AEVM Resumen");
        navigate('/aevm-resumen');
        sequenceRef.current = '';
      } 
      // Reset if any other key is pressed (except Control itself)
      else if (key !== 'control') {
        sequenceRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <>
      <TutorialGuideOverlay />
      <CommandBar />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Dashboard view="inbox" /></ProtectedRoute>} />
        <Route path="/outbox" element={<ProtectedRoute><Outbox /></ProtectedRoute>} />
        <Route path="/vip-view" element={<ProtectedRoute><VIPView /></ProtectedRoute>} />
        <Route path="/new-letter" element={<ProtectedRoute><NewLetter /></ProtectedRoute>} />
        <Route path="/setup" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
        <Route path="/setup/trays" element={<ProtectedRoute><Trays /></ProtectedRoute>} />
        <Route path="/setup/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/setup/inter-dept" element={<ProtectedRoute><InterDeptManagement /></ProtectedRoute>} />
        <Route path="/dept-viewer" element={<ProtectedRoute><DepartmentViewer /></ProtectedRoute>} />
        <Route path="/setup/persons" element={<ProtectedRoute><Persons /></ProtectedRoute>} />
        <Route path="/setup/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
        <Route path="/departments/:deptId/letters" element={<ProtectedRoute><DepartmentLetters /></ProtectedRoute>} />
        <Route path="/setup/letter-kinds" element={<ProtectedRoute><LetterKinds /></ProtectedRoute>} />
        <Route path="/setup/process-steps" element={<ProtectedRoute><ProcessSteps /></ProtectedRoute>} />
        <Route path="/setup/statuses" element={<ProtectedRoute><Statuses /></ProtectedRoute>} />
        <Route path="/setup/attachments" element={<ProtectedRoute><Attachments /></ProtectedRoute>} />
        <Route path="/setup/role-matrix" element={<ProtectedRoute><RoleAccessMatrix /></ProtectedRoute>} />
        <Route path="/setup/dept-matrix" element={<ProtectedRoute><DeptAccessMatrix /></ProtectedRoute>} />
        <Route path="/setup/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
        <Route path="/setup/data-import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
        <Route path="/master-table" element={<ProtectedRoute><MasterTable /></ProtectedRoute>} />
        <Route path="/letters-with-comments" element={<ProtectedRoute><LettersWithComments /></ProtectedRoute>} />
        <Route path="/letter-tracker" element={<ProtectedRoute><LetterTracker /></ProtectedRoute>} />
        <Route path="/legacy-data" element={<ProtectedRoute><LegacyData /></ProtectedRoute>} />
        <Route path="/upload-pdf" element={<ProtectedRoute><UploadPDFFiles /></ProtectedRoute>} />
        <Route path="/setup/sections" element={<ProtectedRoute><SectionRegistry /></ProtectedRoute>} />
        <Route path="/setup/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
        <Route path="/guest/send-letter" element={<ProtectedRoute><GuestSendLetter /></ProtectedRoute>} />
        <Route path="/endorsements" element={<ProtectedRoute><LetterEndorsement /></ProtectedRoute>} />
        <Route path="/letter/:id" element={<ProtectedRoute><LetterDetail /></ProtectedRoute>} />
        <Route path="/vem-resumen" element={<ProtectedRoute><VemResumen /></ProtectedRoute>} />
        <Route path="/aevm-resumen" element={<ProtectedRoute><AevmResumen /></ProtectedRoute>} />
        <Route path="/resumen" element={<ProtectedRoute><ResumenPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/maintenance" element={<Maintenance />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

import TutorialGuideOverlay from "./components/TutorialGuide";
import CommandBar from "./components/CommandBar";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
