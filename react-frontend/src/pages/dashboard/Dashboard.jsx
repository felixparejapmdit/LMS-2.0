
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import LetterCard from "../../components/LetterCard";
import { directus } from "../../hooks/useDirectus";
import { readItems } from "@directus/sdk";
import axios from "axios";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
import {
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Inbox,
  Plus,
  ChevronRight,
  ChevronLeft,
  Info,
  History,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Send,
  CalendarDays,
  Zap,
  Menu,
  UserCheck,
  PenTool,
  CheckSquare,
  FileEdit,
  Trash2,
  AlertCircle
} from "lucide-react";
import letterService from "../../services/letterService";
import trayService from "../../services/trayService";
import useAccess from "../../hooks/useAccess";

export default function Dashboard({ view = "inbox", forcedDeptId = null }) {
  const { user } = useSession();
  const { layoutStyle, setIsMobileMenuOpen } = useUI();
  const access = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab state synced with URL
  const activeStepTab = searchParams.get('tab') || 'review';
  const setActiveStepTab = (tab) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };

  const [inboxStats, setInboxStats] = useState({ review: 0, signature: 0, vem: 0, pending: 0, hold: 0, empty_entry: 0 });
  const [trays, setTrays] = useState([]);
  const [steps, setSteps] = useState([]);
  const [selectedTray, setSelectedTray] = useState(null); // Filter for ATG Note
  const canField = access?.canField || (() => true);
  const pageId = forcedDeptId ? "department-letters" : (view === "outbox" ? "outbox" : "inbox");
  const canSearch = canField(pageId, "search");
  const canRefresh = canField(pageId, "refresh_button");
  const canTabFilter = canField(pageId, "tab_filter");
  const canTraySelector = canField(pageId, "tray_selector");

  const tabLabels = {
    review: 'For Review',
    atg_note: 'For ATG Note',
    signature: 'For Signature',
    vem: 'VEM Letter',
    pending: 'Pending',
    hold: 'Hold',
    empty_entry: 'Empty Entry'
  };
  const activeTabLabel = tabLabels[activeStepTab] || 'Letters';

  const fetchAssignments = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setLoading(true);
    setAssignments([]); // Clear stale data before fetching new tab content
    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const roleName = user?.roleData?.role_name || user?.role || '';
      const fullName = `${user?.first_name} ${user?.last_name}`.trim();
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments?department_id=${deptId}&user_id=${user?.id}&role=${roleName}&full_name=${encodeURIComponent(fullName)}`;

      if (view === 'inbox') {
        url += '&status=Pending&exclude_vip=true';
        if (activeStepTab) url += `&named_filter=${activeStepTab}`;
      } else if (view === 'outbox') {
        url += '&status=Pending&outbox=true&exclude_vip=true';
      }

      const response = await axios.get(url);
      setAssignments(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchInboxStats = async () => {
    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/stats/inbox?department_id=${deptId}`);
      setInboxStats(res.data);
    } catch (error) {
      console.error("Error fetching inbox stats:", error);
    }
  };

  const fetchTrays = async () => {
    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const data = await trayService.getAllTrays(deptId);
      setTrays(data);
    } catch (error) {
      console.error("Error fetching trays:", error);
    }
  };

  const fetchSteps = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/process-steps`);
      setSteps(res.data);
    } catch (err) {
      console.error("Error fetching steps:", err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      if (view !== 'inbox' && activeStepTab !== 'review') {
        setActiveStepTab('review');
      }
      fetchAssignments();
      fetchTrays();
      fetchSteps();
      if (view === 'inbox') fetchInboxStats();
      setSelectedTray(null); // Reset filter on tab change
    }
  }, [user?.id, view, activeStepTab]);

  const handleTrayUpdate = async (letterId, trayId, assignmentId) => {
    // Optimistic UI: Immediately hide from current view if it's moving
    if (activeStepTab === 'review' || activeStepTab === 'signature') {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    }

    try {
      await letterService.update(letterId, { tray_id: trayId });
      fetchAssignments();
      fetchInboxStats();
    } catch (err) {
      console.error("Tray update failed:", err);
      fetchAssignments();
    }
  };

  const filteredAssignments = canTraySelector && selectedTray
    ? assignments.filter(a => a.letter?.tray_id === selectedTray)
    : assignments;
  
  const handleQuickAction = async (e, assignment, action) => {
    e.preventDefault();
    e.stopPropagation();

    if (action === 'delete') {
      if (!window.confirm("Are you sure you want to delete this letter?")) return;
      try {
        await letterService.delete(assignment.letter.id);
        fetchAssignments();
        fetchInboxStats();
      } catch (err) {
        console.error("Delete failed:", err);
      }
      return;
    }

    // Workflow transition
    const stepIdMap = {
      'signature': 1, // For Signature
      'review': 2     // For Review
    };

    const newStepId = stepIdMap[action];
    if (!newStepId) return;

    try {
      // Optimistic Update
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
      
      const isMock = assignment.id.toString().startsWith('mock-');
      
      if (isMock) {
        // Find step for department info
        const targetStep = steps.find(s => s.id === newStepId);
        const deptId = targetStep?.dept_id || user?.dept_id?.id || user?.dept_id || null;

        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments`, {
          letter_id: assignment.letter.id,
          step_id: newStepId,
          department_id: deptId,
          assigned_by: user?.id,
          status: 'Pending',
          status_id: 8 // Assuming 8 is mapped to Pending/Active in the DB
        });
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${assignment.id}`, {
          step_id: newStepId
        });
      }

      fetchAssignments();
      fetchInboxStats();
    } catch (err) {
      console.error("Quick action failed:", err);
      fetchAssignments();
    }
  };

  const renderQuickActions = (assignment) => {
    if (activeStepTab !== 'pending') return null;

    return (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button
          onClick={(e) => handleQuickAction(e, assignment, 'review')}
          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
          title="Approve Review"
        >
          <FileEdit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => handleQuickAction(e, assignment, 'signature')}
          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
          title="Approve Signature"
        >
          <PenTool className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => handleQuickAction(e, assignment, 'delete')}
          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
          title="Delete Letter"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Theme Variables
  const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
  const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
  const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
  const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-slate-200 dark:border-[#222] shadow-sm';

  const renderTrayActions = (assignment) => {
    if (!canTraySelector) return null;
    if (view !== 'inbox') return null;
    if (!(activeStepTab === 'review' || activeStepTab === 'signature')) return null;

    if (!trays || trays.length === 0) {
      return (
        <div className="flex items-center px-2 py-1 bg-slate-50 dark:bg-white/5 rounded-lg border border-dashed border-slate-200 dark:border-[#333]">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">No Trays Found</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-[#222] shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mr-1 border-r border-slate-200 dark:border-[#333] pr-2">Tray</span>
        <div className="flex items-center gap-1">
          {trays.map(t => {
            const displayNo = t.tray_no.replace(/Tray\s*/i, '');
            return (
              <button
                key={t.id}
                onClick={(e) => {
                  e.preventDefault();
                  handleTrayUpdate(assignment.letter.id, t.id, assignment.id);
                }}
                className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all flex items-center justify-center border ${assignment.letter.tray_id === t.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-105'
                  : 'bg-white dark:bg-[#0D0D0D] text-slate-500 border-slate-200 dark:border-[#333] hover:border-blue-400 hover:text-blue-500'
                  }`}
                title={`Move to ${t.tray_no}`}
              >
                {displayNo}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (layoutStyle === 'minimalist') {
    return (
      <div className={`min-h-screen ${pageBg} flex overflow-hidden font-sans`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Minimalist Header */}
          <header className={`h-20 ${headerBg} px-4 md:px-6 lg:px-8 flex items-center justify-between z-20`}>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <h1 className={`text-xl font-bold ${textColor} tracking-tight`}>
                  {view === 'inbox' ? 'Inbox' : view === 'outbox' ? 'Outbox' : view}
                </h1>
                <p className="text-[10px] text-[#737373] uppercase tracking-[0.2em] font-medium">LMS</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {view === 'inbox' && canTabFilter && (
                <div className="flex items-center gap-1 border border-[#E5E5E5] dark:border-[#333] p-1 rounded-lg bg-gray-50/50 dark:bg-white/5 no-scrollbar overflow-x-auto">
                  {[
                    { id: 'review', label: 'For Review', count: inboxStats.review },
                    { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                    { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                    { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                    { id: 'pending', label: 'Pending', count: inboxStats.pending },
                    { id: 'hold', label: 'Hold', count: inboxStats.hold },
                    { id: 'empty_entry', label: 'Empty Entry', count: inboxStats.empty_entry }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStepTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === tab.id ? 'bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B]' : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#1A1A1B] dark:hover:text-white'}`}
                    >
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeStepTab === tab.id ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#1A1A1B]' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {canRefresh && (
                <button
                  onClick={() => fetchAssignments(true)}
                  className="p-2 text-[#737373] hover:text-[#1A1A1B] dark:hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10 custom-scrollbar">
            <div className="w-full">
              <div className="mb-8 md:mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#1A1A1B] dark:text-white tracking-tight mb-2">{activeTabLabel}</h2>
                  <p className="text-sm text-[#737373] dark:text-gray-400">{assignments.length} letters.</p>
                </div>

                {view === 'inbox' && canTraySelector && activeStepTab === 'atg_note' && (
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-lg shadow-sm overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setSelectedTray(null)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${!selectedTray ? 'bg-[#1A1A1B] text-white' : 'text-[#737373] hover:text-[#1A1A1B]'}`}
                    >
                      All
                      <span className={`text-[8px] font-black px-1 py-0.5 rounded ${!selectedTray ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {assignments.length}
                      </span>
                    </button>
                    {trays.map(t => {
                      const trayCount = assignments.filter(a => a.letter?.tray_id === t.id).length;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTray(t.id)}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${selectedTray === t.id ? 'bg-[#1A1A1B] text-white' : 'text-[#737373] hover:text-[#1A1A1B]'}`}
                        >
                          {t.tray_no}
                          <span className={`text-[8px] font-black px-1 py-0.5 rounded ${selectedTray === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {trayCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center border border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#141414] rounded-2xl">
                  <Loader2 className="w-8 h-8 text-[#1A1A1B] dark:text-white animate-spin mb-4" />
                  <span className="text-xs font-bold text-[#737373] uppercase tracking-widest">Loading...</span>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#141414] rounded-2xl">
                  <Inbox className="w-10 h-10 text-[#E5E5E5] mb-4" />
                  <span className="text-xs font-bold text-[#A3A3A3] uppercase tracking-widest">No letters</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAssignments.map((assignment) => (
                    assignment.letter && (
                      <div key={assignment.id}>
                        <LetterCard
                          id={assignment.id}
                          letterId={assignment.letter.id}
                          atgId={assignment.letter.lms_id}
                          sender={assignment.letter.sender}
                          summary={assignment.letter.summary}
                          status={assignment.status}
                          step={assignment.step?.step_name}
                          dueDate={assignment.due_date || assignment.letter.date_received}
                          attachment={assignment.letter.attachment}
                          tray={assignment.letter.tray}
                          layout="minimalist"
                          actions={
                            <div className="flex items-center gap-2">
                              {renderTrayActions(assignment)}
                              {renderQuickActions(assignment)}
                            </div>
                          }
                        />
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (layoutStyle === 'grid') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0D0D0D] flex overflow-hidden font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Grid Header */}
          <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-slate-200 dark:border-[#222] px-4 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"
                title="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">LMS</span>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{view === 'inbox' ? 'Inbox' : view === 'outbox' ? 'Outbox' : view}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
              {canSearch && (
                <div className="relative group hidden sm:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="bg-slate-50 dark:bg-white/5 border-2 border-slate-50 dark:border-transparent rounded-2xl pl-12 pr-6 py-2.5 text-sm w-40 lg:w-80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 transition-all outline-none font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
              )}
              {canRefresh && (
                <button
                  onClick={() => fetchAssignments(true)}
                  className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-2"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Refresh</span>
                </button>
              )}
              {view === 'inbox' && canTabFilter && (
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar flex-shrink-0">
                  {[
                    { id: 'review', label: 'For Review', count: inboxStats.review },
                    { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                    { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                    { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                    { id: 'pending', label: 'Pending', count: inboxStats.pending },
                    { id: 'hold', label: 'Hold', count: inboxStats.hold },
                    { id: 'empty_entry', label: 'Empty Entry', count: inboxStats.empty_entry }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStepTab(tab.id)}
                      className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="inline-block">{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeStepTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {/* Entry button removed from here */}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-6 md:pt-10 custom-scrollbar">
            <div className="w-full">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-12">

                {/* Main Content (Full Width) */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-[#141414] rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-[#222]">
                        <Inbox className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{view === 'inbox' ? activeTabLabel : 'Letters'}</h2>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">Total: {assignments.length}</p>
                        </div>

                        {view === 'inbox' && canTraySelector && activeStepTab === 'atg_note' && (
                          <div className="flex items-center gap-2 ml-4 border-l border-slate-200 dark:border-[#222] pl-6 overflow-x-auto no-scrollbar py-1">
                            <button
                              onClick={() => setSelectedTray(null)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${!selectedTray ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600'}`}
                            >
                              All ({assignments.length})
                            </button>
                            {trays.map(t => {
                              const count = assignments.filter(a => a.letter?.tray_id === t.id).length;
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => setSelectedTray(t.id)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${selectedTray === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600'}`}
                                >
                                  {t.tray_no} ({count})
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-24 bg-white dark:bg-[#141414] border border-slate-100 dark:border-[#222] rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading...</p>
                    </div>
                  ) : filteredAssignments.length === 0 ? (
                    <div className="py-24 bg-white dark:bg-[#141414] border border-slate-100 dark:border-[#222] rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Inbox className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                      </div>
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No letters</p>
                    </div>
                  ) : (<div className="space-y-6">
                    {filteredAssignments.map((assignment) => (
                      assignment.letter && (
                        <div key={assignment.id}>
                          <LetterCard
                            id={assignment.id}
                            letterId={assignment.letter.id}
                            atgId={assignment.letter.lms_id}
                            sender={assignment.letter.sender}
                            summary={assignment.letter.summary}
                            status={assignment.status}
                            step={assignment.step?.step_name}
                            dueDate={assignment.due_date || assignment.letter.date_received}
                            attachment={assignment.letter.attachment}
                            layout="grid"
                            actions={
                              <div className="flex items-center gap-2">
                                {renderTrayActions(assignment)}
                                {renderQuickActions(assignment)}
                              </div>
                            }
                          />
                        </div>
                      )
                    ))}
                  </div>
                  )}
                </div>



              </div>
            </div>
          </div>
        </main>
      </div >
    );
  }


  if (layoutStyle === 'notion') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#191919] flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
          <div className="w-full min-h-screen px-4 md:px-12 pt-6 md:pt-10 pb-16 md:pb-32 relative">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="fixed top-6 left-4 p-2 bg-white/80 dark:bg-[#191919]/80 backdrop-blur shadow-sm border border-gray-100 dark:border-[#333] rounded-lg text-gray-400 md:hidden z-40"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="group mb-8">
              <div className="flex items-center gap-4 text-gray-400 mb-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium decoration-gray-200 underline-offset-4 flex items-center gap-1">
                  <Inbox className="w-3 h-3" /> {view.toUpperCase()}
                </span>
                {canRefresh && (
                  <button onClick={() => fetchAssignments(true)} className="hover:text-gray-600">
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-6 mb-4">
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-4 lowercase first-letter:uppercase">
                  {view === 'inbox' ? activeTabLabel :
                    view === 'archive' ? 'Archive' :
                      view === 'upcoming' ? 'Upcoming deadlines' :
                        view === 'outgoing' ? 'Sent correspondence' : 'Outbox'}
                </h1>

                {view === 'inbox' && canTraySelector && activeStepTab === 'atg_note' && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-[#333] mb-4">
                    <button className="text-xs font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors">
                      <Filter className="w-3 h-3" /> Filter
                    </button>
                    {canSearch && (
                      <button className="text-xs font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors">
                        <Search className="w-3 h-3" /> Search
                      </button>
                    )}
                    {view === 'inbox' && canTabFilter && (
                      <div className="flex border-l border-gray-100 dark:border-[#222] pl-4 gap-6">
                        {[
                          { id: 'review', label: 'For Review', count: inboxStats.review },
                          { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                          { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                          { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                          { id: 'pending', label: 'Pending', count: inboxStats.pending },
                          { id: 'hold', label: 'Hold', count: inboxStats.hold },
                          { id: 'empty_entry', label: 'Empty Entry', count: inboxStats.empty_entry }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveStepTab(tab.id)}
                            className={`text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeStepTab === tab.id ? 'text-orange-600 underline underline-offset-8' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            {tab.label}
                            <span className="text-[8px] bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded text-gray-400">
                              {tab.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {view === 'archive' ? 'Completed letters.' :
                  view === 'upcoming' ? 'Upcoming tasks.' :
                    view === 'outgoing' ? 'Sent letters.' :
                      ''}
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-gray-200 animate-spin" />
                <p className="text-sm text-gray-400 font-medium font-sans italic">Loading...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-gray-100 dark:border-[#222] rounded-2xl">
                <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No letters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                  assignment.letter && (
                    <div key={assignment.id}>
                      <LetterCard
                        id={assignment.id}
                        letterId={assignment.letter.id}
                        atgId={assignment.letter.lms_id}
                        sender={assignment.letter.sender}
                        summary={assignment.letter.summary}
                        status={assignment.status}
                        step={assignment.step?.step_name}
                        dueDate={assignment.due_date || assignment.letter.date_received}
                        attachment={assignment.letter.attachment}
                        tray={assignment.letter.tray}
                        layout="notion"
                        actions={
                          <div className="flex items-center gap-2">
                            {renderTrayActions(assignment)}
                            {renderQuickActions(assignment)}
                          </div>
                        }
                      />
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Workspace Toolbar */}
        <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-[#222] px-4 md:px-8 flex items-center justify-between z-10 transition-colors duration-300">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-[10px] md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">{view === 'archive' ? 'History' : 'Inbox'}</h1>
            <div className="h-4 w-[1px] bg-gray-200 dark:bg-[#333] hidden md:block"></div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-200 hidden md:block">{assignments.length} {view === 'archive' ? 'Processed' : 'Pending'}</p>
          </div>

          {view === 'inbox' && canTabFilter && (
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 overflow-x-auto no-scrollbar flex-shrink-0">
              {[
                { id: 'review', label: 'For Review', count: inboxStats.review },
                { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                { id: 'pending', label: 'Pending', count: inboxStats.pending },
                { id: 'hold', label: 'Hold', count: inboxStats.hold },
                { id: 'empty_entry', label: 'Empty Entry', count: inboxStats.empty_entry }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStepTab(tab.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === tab.id ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${activeStepTab === tab.id ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            {canRefresh && (
              <button
                onClick={() => fetchAssignments(true)}
                className="px-4 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 border border-gray-100 dark:border-[#333]"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Refresh</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="w-full">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {view === 'inbox' ? activeTabLabel :
                    view === 'archive' ? 'History' :
                      view === 'upcoming' ? 'Upcoming' :
                        view === 'outgoing' ? 'Sent' : 'Outbox'}
                </h2>

                {view === 'inbox' && canTraySelector && activeStepTab === 'atg_note' && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-[#333]">
                    <button
                      onClick={() => setSelectedTray(null)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${!selectedTray ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      All ({assignments.length})
                    </button>
                    {trays.map(t => {
                      const count = assignments.filter(a => a.letter?.tray_id === t.id).length;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTray(t.id)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedTray === t.id ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {t.tray_no} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {view === 'archive' ? 'Completed letters.' :
                  view === 'upcoming' ? 'Upcoming tasks.' :
                    view === 'outgoing' ? 'Sent letters.' :
                      'Manage letters.'}
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-32 text-center bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] rounded-3xl shadow-sm">
                <Inbox className="w-16 h-16 text-gray-100 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">No records</h3>
                <p className="text-gray-400 dark:text-gray-600 mt-1">No data.</p>
              </div>
            ) : (<div className="grid grid-cols-1 gap-4">
              {filteredAssignments.map((assignment) => (
                assignment.letter && (
                  <div key={assignment.id}>
                    <LetterCard
                      id={assignment.id}
                      letterId={assignment.letter.id}
                      atgId={assignment.letter.lms_id}
                      sender={assignment.letter.sender}
                      summary={assignment.letter.summary}
                      status={assignment.status}
                      step={assignment.step?.step_name}
                      dueDate={assignment.due_date || assignment.letter.date_received}
                      attachment={assignment.letter.attachment}
                      tray={assignment.letter.tray}
                      layout={layoutStyle}
                      actions={
                        <div className="flex items-center gap-2">
                          {renderTrayActions(assignment)}
                          {renderQuickActions(assignment)}
                        </div>
                      }
                    />
                  </div>
                )
              ))}
            </div>
            )}
          </div>
        </div>
      </main>


    </div>
  );
}
