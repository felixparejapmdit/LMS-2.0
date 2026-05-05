import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import LetterCard from "../../components/LetterCard";
import axios from "axios";
import { useSession, useUI } from "../../context/AuthContext";
import {
  Search,
  Loader2,
  RefreshCw,
  Send,
  X,
  Menu as MenuIcon,
} from "lucide-react";
import letterService from "../../services/letterService";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Colour gradients matched per lowercase status keyword
const STATUS_GRADIENTS = {
  released:   "from-blue-600 to-indigo-500",
  done:       "from-emerald-600 to-green-500",
  filed:      "from-amber-600 to-orange-500",
  forwarded:  "from-sky-500 to-blue-400",
  endorsed:   "from-violet-600 to-purple-500",
  dispatched: "from-teal-600 to-cyan-500",
};

function getGradient(statusName = "") {
  const lower = statusName.toLowerCase();
  for (const [key, gradient] of Object.entries(STATUS_GRADIENTS)) {
    if (lower.includes(key)) return gradient;
  }
  return "from-slate-600 to-slate-500";
}

export default function Outbox() {
  const { user } = useSession();
  const { setIsMobileMenuOpen } = useUI();

  // ── URL state ───────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [assignments, setAssignments]         = useState([]);
  const [tabStatuses, setTabStatuses]         = useState([]); // DB-driven ordered list
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [searchTerm, setSearchTerm]           = useState("");
  const [currentPage, setCurrentPage]         = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalRecords, setTotalRecords]       = useState(0);
  const RECORDS_PER_PAGE = 30;

  // ── Active tab (persisted in URL) ────────────────────────────────────────────
  const activeTab = searchParams.get("tab") || (tabStatuses[0]?.status_name?.toLowerCase() || "released");
  const setActiveTab = useCallback((tab) => {
    setSearchParams((prev) => { prev.set("tab", tab); return prev; });
    setCurrentPage(1);
  }, [setSearchParams]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const buildBaseParams = () => {
    const deptId   = user?.dept_id?.id ?? user?.dept_id ?? null;
    const roleName = user?.roleData?.role_name || user?.role || "";
    const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
    return { deptId, roleName, fullName };
  };

  // ── Fetch outbox stats (tab counts from DB) ──────────────────────────────────
  const fetchStats = useCallback(async (search = searchTerm) => {
    if (!user?.id) return;
    try {
      const { deptId, roleName, fullName } = buildBaseParams();
      let url = `${API}/outbox/stats?department_id=${deptId}&user_id=${user.id}&role=${roleName}&full_name=${encodeURIComponent(fullName)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await axios.get(url);
      if (res.data?.statuses?.length) {
        setTabStatuses(res.data.statuses);
        // Auto-set first tab if current tab is missing from DB statuses
        const validTabIds = res.data.statuses.map((s) => s.status_name.toLowerCase());
        const currentTab  = searchParams.get("tab");
        if (!currentTab || !validTabIds.includes(currentTab)) {
          setActiveTab(res.data.statuses[0].status_name.toLowerCase());
        }
      }
    } catch (err) {
      console.error("[OUTBOX] fetchStats error:", err.message);
    }
  }, [user?.id, searchTerm]);

  // ── Fetch letter assignments ─────────────────────────────────────────────────
  const fetchAssignments = useCallback(async (showRefresh = false, retryCount = 0) => {
    if (!user?.id) return;
    if (showRefresh) setRefreshing(true);
    if (retryCount === 0) setLoading(true);

    try {
      const { deptId, roleName, fullName } = buildBaseParams();
      let url = `${API}/letter-assignments?department_id=${deptId}&user_id=${user.id}&role=${roleName}&full_name=${encodeURIComponent(fullName)}`;
      url += `&outbox=true&exclude_vip=true&named_filter=${activeTab}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      url += `&page=${currentPage}&limit=${RECORDS_PER_PAGE}`;

      const res  = await axios.get(url);
      const data = res.data;

      if (data?.data) {
        setAssignments(data.data);
        setTotalPages(data.totalPages || 1);
        setTotalRecords(data.total || data.data.length);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setAssignments(arr);
        setTotalPages(1);
        setTotalRecords(arr.length);
      }
    } catch (err) {
      console.error("[OUTBOX] fetchAssignments error:", err.message);
      if (retryCount < 2 && (err.code === "ECONNABORTED" || err.message?.includes("aborted"))) {
        setTimeout(() => fetchAssignments(showRefresh, retryCount + 1), 1000);
      }
    } finally {
      if (retryCount === 0 || retryCount >= 2) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id, activeTab, currentPage, searchTerm]);

  // ── Recall to Inbox ──────────────────────────────────────────────────────────
  const handleRecall = async (e, assignment) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Move this letter back to Pending?")) return;
    try {
      setRefreshing(true);
      await letterService.update(assignment.letter.id, { global_status: 8 }); // 8 = Pending
      await axios.put(`${API}/letter-assignments/${assignment.id}`, { step_id: null });
      await Promise.all([fetchAssignments(), fetchStats()]);
    } catch (err) {
      console.error("[OUTBOX] recall error:", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Effects ──────────────────────────────────────────────────────────────────
  // Initial load + polling
  useEffect(() => {
    if (!user?.id) return;
    fetchStats();
    fetchAssignments();

    const statsTimer  = setInterval(() => fetchStats(),        15_000);
    const assignTimer = setInterval(() => fetchAssignments(),  30_000);
    return () => { clearInterval(statsTimer); clearInterval(assignTimer); };
  }, [user?.id]);

  // Re-fetch when active tab or page changes
  useEffect(() => {
    if (!user?.id) return;
    fetchAssignments();
  }, [activeTab, currentPage]);

  // Re-fetch when search term changes (also refresh stats to keep counts in sync)
  useEffect(() => {
    if (!user?.id) return;
    fetchStats(searchTerm);
    fetchAssignments();
    setCurrentPage(1);
  }, [searchTerm]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#F7F7F7] dark:bg-[#0D0D0D] overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-[#E5E5E5] dark:border-[#222] px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors print:hidden">
          <div className="flex items-center gap-4 min-w-0 overflow-hidden flex-1">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-400 md:hidden flex-shrink-0"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[10px] text-[#737373] uppercase tracking-[0.2em] font-black">LMS</span>
              <h1 className="text-xl font-black text-[#1A1A1B] dark:text-white tracking-tighter uppercase">
                Outbox
              </h1>
            </div>

            {/* ── Search Input ─────────────────────────────────────────────── */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="outbox-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sender name or ref. code…"
                className="pl-9 pr-8 py-2 h-10 text-[12px] font-medium rounded-xl border border-[#E5E5E5] dark:border-[#333] bg-gray-50/60 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:text-white placeholder-slate-400 transition-all w-52"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ── Status Tabs (DB-driven from ref_statuses) ────────────────── */}
            {tabStatuses.length > 0 && (
              <div className="flex items-center gap-1 border border-[#E5E5E5] dark:border-[#333] p-1.5 rounded-xl bg-gray-50/50 dark:bg-white/5 no-scrollbar overflow-x-auto min-w-0">
                {tabStatuses.map((s) => {
                  const tabId    = s.status_name.toLowerCase();
                  const isActive = activeTab === tabId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveTab(tabId)}
                      className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                        isActive
                          ? `bg-gradient-to-r ${getGradient(s.status_name)} text-white shadow-md`
                          : "text-[#737373] dark:text-[#A3A3A3] hover:text-[#1A1A1B] dark:hover:text-white"
                      }`}
                    >
                      {s.status_name}
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                      }`}>
                        {s.count ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => { fetchAssignments(true); fetchStats(); }}
            className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400 ml-4 flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </header>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <div className="w-full space-y-4">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center border border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#111] rounded-3xl">
                <Loader2 className="w-10 h-10 text-[#1A1A1B] dark:text-white animate-spin mb-4" />
                <span className="text-[10px] font-black text-[#737373] uppercase tracking-widest">
                  Loading outbox…
                </span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#111] rounded-3xl">
                <Send className="w-12 h-12 text-[#E5E5E5] mb-4" />
                <span className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-widest">
                  No letters found in this queue
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 text-[11px] text-emerald-600 hover:underline font-semibold"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Letter list */}
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="group">
                      <LetterCard
                        id={assignment.id}
                        letterId={assignment.letter?.id}
                        atgId={assignment.letter?.lms_id}
                        sender={assignment.letter?.sender}
                        summary={assignment.letter?.summary}
                        status={assignment.letter?.status?.status_name || assignment.status}
                        step={assignment.step?.step_name}
                        dueDate={assignment.due_date}
                        dateReceived={assignment.letter?.date_received}
                        tray={assignment.letter?.tray}
                        layout="minimalist"
                        isOutbox={true}
                        endorsements={assignment.letter?.endorsements}
                        actions={
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button
                              onClick={(e) => handleRecall(e, assignment)}
                              title="Recall to Inbox (Pending)"
                              className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-100 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] p-4 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#737373]">
                    Showing {assignments.length} / {totalRecords} Records
                  </span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        currentPage === 1
                          ? "opacity-30 cursor-not-allowed text-gray-400"
                          : "bg-gray-100 dark:bg-white/5 text-[#1A1A1B] dark:text-white hover:bg-[#1A1A1B] hover:text-white"
                      }`}
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded flex items-center justify-center bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B] text-[10px] font-black">
                        {currentPage}
                      </span>
                      <span className="text-[10px] font-black text-[#737373] uppercase tracking-widest mx-1">of</span>
                      <span className="text-[10px] font-black text-[#1A1A1B] dark:text-white">{totalPages}</span>
                    </div>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        currentPage === totalPages
                          ? "opacity-30 cursor-not-allowed text-gray-400"
                          : "bg-gray-100 dark:bg-white/5 text-[#1A1A1B] dark:text-white hover:bg-[#1A1A1B] hover:text-white"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
