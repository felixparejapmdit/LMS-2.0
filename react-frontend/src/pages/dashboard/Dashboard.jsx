
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import LetterCard from "../../components/LetterCard";
import { directus } from "../../hooks/useDirectus";
import { readItems } from "@directus/sdk";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
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
  CheckCircle,
  UserCheck,
  PenTool
} from "lucide-react";
import processStepService from "../../services/processStepService";
import letterService from "../../services/letterService";
import trayService from "../../services/trayService";

export default function Dashboard({ view = "inbox", forcedDeptId = null }) {
  const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState("review"); // named_filter
  const [inboxStats, setInboxStats] = useState({ review: 0, signature: 0, vem: 0, pending: 0, hold: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [steps, setSteps] = useState([]);
  const [trays, setTrays] = useState([]);
  const [selectedTray, setSelectedTray] = useState(null); // Filter for ATG Note

  const tabLabels = {
    review: 'For Review',
    atg_note: 'For ATG Note',
    signature: 'For Signature',
    vem: 'VEM Letter',
    pending: 'Pending',
    hold: 'On Hold'
  };
  const activeTabLabel = tabLabels[activeStepTab] || 'Active Records';

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

  const fetchSteps = async () => {
    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const data = await processStepService.getAll(deptId);
      setSteps(data);
    } catch (error) {
      console.error("Error fetching steps:", error);
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

  useEffect(() => {
    if (user) {
      if (view !== 'inbox') {
        setActiveStepTab('review');
      }
      fetchAssignments();
      fetchSteps();
      fetchTrays();
      if (view === 'inbox') fetchInboxStats();
      setSelectedTray(null); // Reset filter on tab change
    }
  }, [user, view, activeStepTab]);

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

  const filteredAssignments = selectedTray
    ? assignments.filter(a => a.letter?.tray_id === selectedTray)
    : assignments;

  const handleStepAction = async (assignmentId, nextStepName) => {
    if (assignmentId.toString().startsWith('mock-')) {
      alert("This record is unassigned. Please assign it to a department/user first.");
      return;
    }
    setActionLoading(assignmentId);
    try {
      const nextStep = steps.find(s => s.step_name.toLowerCase().includes(nextStepName.toLowerCase()));
      if (!nextStep) {
        alert(`Step "${nextStepName}" not found in your DNA configuration.`);
        throw new Error(`Step ${nextStepName} not found`);
      }

      // Update via backend
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${assignmentId}`, {
        step_id: nextStep.id
      });

      fetchAssignments();
      fetchInboxStats();
    } catch (err) {
      console.error("Step action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Theme Variables
  const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
  const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
  const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
  const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-slate-200 dark:border-[#222] shadow-sm';

  const renderTrayActions = (assignment) => {
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
          <header className={`h-20 ${headerBg} px-8 flex items-center justify-between z-20`}>
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
                <p className="text-[10px] text-[#737373] uppercase tracking-[0.2em] font-medium">LMS Workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {view === 'inbox' && (
                <div className="flex items-center gap-1 border border-[#E5E5E5] dark:border-[#222] p-1 rounded-lg bg-gray-50/50 dark:bg-white/5 no-scrollbar overflow-x-auto max-w-[400px]">
                  {[
                    { id: 'review', label: 'For Review', count: inboxStats.review },
                    { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                    { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                    { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                    { id: 'pending', label: 'Pending', count: inboxStats.pending },
                    { id: 'hold', label: 'On Hold', count: inboxStats.hold }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStepTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === tab.id ? 'bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B]' : 'text-[#737373] hover:text-[#1A1A1B] dark:hover:text-white'}`}
                    >
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeStepTab === tab.id ? 'bg-white/10 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => fetchAssignments(true)}
                className="p-2 text-[#737373] hover:text-[#1A1A1B] dark:hover:text-white transition-colors"
                title="Sync Data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
            <div className="max-w-6xl">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#1A1A1B] dark:text-white tracking-tight mb-2">{activeTabLabel}</h2>
                  <p className="text-sm text-[#737373]">Viewing {assignments.length} assignments currently on hold or in progress.</p>
                </div>

                {view === 'inbox' && activeStepTab === 'atg_note' && (
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-lg shadow-sm">
                    <button
                      onClick={() => setSelectedTray(null)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${!selectedTray ? 'bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B]' : 'text-[#737373] hover:text-[#1A1A1B]'}`}
                    >
                      All
                    </button>
                    {trays.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTray(t.id)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${selectedTray === t.id ? 'bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B]' : 'text-[#737373] hover:text-[#1A1A1B]'}`}
                      >
                        {t.tray_no}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center border border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#141414] rounded-2xl">
                  <Loader2 className="w-8 h-8 text-[#1A1A1B] dark:text-white animate-spin mb-4" />
                  <span className="text-xs font-bold text-[#737373] uppercase tracking-widest">Fetching Content...</span>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#141414] rounded-2xl">
                  <Inbox className="w-10 h-10 text-[#E5E5E5] mb-4" />
                  <span className="text-xs font-bold text-[#A3A3A3] uppercase tracking-widest">Inbox Zero</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAssignments.map((assignment) => (
                    assignment.letter && (
                      <div key={assignment.id} className="relative group">
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
                          actions={renderTrayActions(assignment)}
                        />
                        {view === 'inbox' && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Signature'); }}
                              className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Workspace</span>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{view === 'inbox' ? 'Inbox' : view === 'outbox' ? 'Outbox' : view}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
              <div className="relative group hidden sm:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600" />
                <input
                  type="text"
                  placeholder="Search records..."
                  className="bg-slate-50 dark:bg-white/5 border-2 border-slate-50 dark:border-transparent rounded-2xl pl-12 pr-6 py-2.5 text-sm w-40 lg:w-80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 transition-all outline-none font-bold text-slate-700 dark:text-slate-200"
                />
              </div>
              <button
                onClick={() => fetchAssignments(true)}
                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-2"
                title="Refresh Cache"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Sync</span>
              </button>
              {view === 'inbox' && (
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-[#222] overflow-x-auto no-scrollbar">
                  {[
                    { id: 'review', label: 'For Review', count: inboxStats.review },
                    { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                    { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                    { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                    { id: 'pending', label: 'Pending', count: inboxStats.pending },
                    { id: 'hold', label: 'On Hold', count: inboxStats.hold }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStepTab(tab.id)}
                      className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === tab.id ? 'bg-white dark:bg-[#333] text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="inline-block">{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeStepTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
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
                          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{view === 'inbox' ? activeTabLabel : 'Active Records'}</h2>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">Total: {assignments.length} items</p>
                        </div>

                        {view === 'inbox' && activeStepTab === 'atg_note' && (
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
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading Records...</p>
                    </div>
                  ) : filteredAssignments.length === 0 ? (
                    <div className="py-24 bg-white dark:bg-[#141414] border border-slate-100 dark:border-[#222] rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Inbox className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                      </div>
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No Records Found</p>
                    </div>
                  ) : (<div className="space-y-6">
                    {filteredAssignments.map((assignment) => (
                      assignment.letter && (
                        <div key={assignment.id} className="relative group">
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
                            actions={renderTrayActions(assignment)}
                          />
                          {view === 'inbox' && (
                            <div className={`absolute top-1/2 -translate-y-1/2 -right-12 flex flex-col gap-2 transition-opacity z-10 ${(activeStepTab === 'review' || activeStepTab === 'signature') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              <button
                                onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Signature'); }}
                                className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 hover:scale-110 transition-all font-black text-[10px]"
                                title="Approved Signature"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Review'); }}
                                className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-xl shadow-blue-500/20 hover:scale-110 transition-all"
                                title="Approved Review"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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
                <button onClick={() => fetchAssignments(true)} className="hover:text-gray-600">
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-6 mb-4">
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-4 lowercase first-letter:uppercase">
                  {view === 'inbox' ? activeTabLabel :
                    view === 'archive' ? 'Archive' :
                      view === 'upcoming' ? 'Upcoming deadlines' :
                        view === 'outgoing' ? 'Sent correspondence' : 'Outbox'}
                </h1>

                {view === 'inbox' && activeStepTab === 'atg_note' && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-[#333] mb-4">
                    <button
                      onClick={() => setSelectedTray(null)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${!selectedTray ? 'bg-white dark:bg-[#333] text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      All ({assignments.length})
                    </button>
                    {trays.map(t => {
                      const count = assignments.filter(a => a.letter?.tray_id === t.id).length;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTray(t.id)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedTray === t.id ? 'bg-white dark:bg-[#333] text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {t.tray_no} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                {view === 'archive' ? 'History of all completed letter assignments.' :
                  view === 'upcoming' ? 'Tasks with nearing due dates and deadlines.' :
                    view === 'outgoing' ? 'Correspondence sent to external entities.' :
                      ''}
              </p>
            </div>

            <div className="mb-10 flex items-center justify-between border-t border-gray-100 dark:border-[#222] pt-4">
              <div className="flex gap-4">
                <button className="text-xs font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors">
                  <Filter className="w-3 h-3" /> Filter
                </button>
                <button className="text-xs font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors">
                  <Search className="w-3 h-3" /> Search
                </button>
                {view === 'inbox' && (
                  <div className="flex border-l border-gray-100 dark:border-[#222] pl-4 gap-6">
                    {[
                      { id: 'review', label: 'For Review', count: inboxStats.review },
                      { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                      { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                      { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                      { id: 'pending', label: 'Pending', count: inboxStats.pending },
                      { id: 'hold', label: 'On Hold', count: inboxStats.hold }
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
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-gray-200 animate-spin" />
                <p className="text-sm text-gray-400 font-medium font-sans italic">Fetching blocks...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-gray-100 dark:border-[#222] rounded-2xl">
                <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No results found.</p>
              </div>
            ) : (<div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                assignment.letter && (
                  <div key={assignment.id} className="relative group">
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
                      actions={renderTrayActions(assignment)}
                    />
                    {view === 'inbox' && (
                      <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity ${(activeStepTab === 'review' || activeStepTab === 'signature') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Signature'); }}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Approved Signature"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Review'); }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Approved Review"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0D0D0D] flex overflow-hidden">
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
            <h1 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">Workspace / {view === 'archive' ? 'Archive' : 'Inbox'}</h1>
            <div className="h-4 w-[1px] bg-gray-200 dark:bg-[#333] hidden md:block"></div>
            <p className="text-sm font-medium text-gray-900 hidden md:block">{assignments.length} {view === 'archive' ? 'Processed' : 'Pending'}</p>
          </div>

          {view === 'inbox' && (
            <div className="flex bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-gray-100 dark:border-[#222] overflow-x-auto no-scrollbar">
              {[
                { id: 'review', label: 'For Review', count: inboxStats.review },
                { id: 'atg_note', label: 'For ATG Note', count: inboxStats.atg_note },
                { id: 'signature', label: 'For Signature', count: inboxStats.signature },
                { id: 'vem', label: 'VEM Letter', count: inboxStats.vem },
                { id: 'pending', label: 'Pending', count: inboxStats.pending },
                { id: 'hold', label: 'On Hold', count: inboxStats.hold }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStepTab(tab.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === tab.id ? 'bg-white dark:bg-[#222] text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeStepTab === tab.id ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAssignments(true)}
              className="px-4 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 border border-gray-100 dark:border-[#333]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Fetch Assignments</span>
            </button>          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="w-full">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {view === 'inbox' ? activeTabLabel :
                    view === 'archive' ? 'Archive' :
                      view === 'upcoming' ? 'Upcoming Tasks' :
                        view === 'outgoing' ? 'Outgoing Letters' : 'Outbox'}
                </h2>

                {view === 'inbox' && activeStepTab === 'atg_note' && (
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
                {view === 'archive' ? 'History of all completed letter assignments.' :
                  view === 'upcoming' ? 'Tasks with nearing due dates and deadlines.' :
                    view === 'outgoing' ? 'Correspondence sent to external entities.' :
                      'Manage your departmental letters and workflow steps.'}
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Synchronizing with Directus...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="py-32 text-center bg-white border border-gray-100 rounded-3xl shadow-sm">
                <Inbox className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-300 uppercase tracking-widest">Inbox Zero</h3>
                <p className="text-gray-400 mt-1">No pending letters for your department.</p>
              </div>
            ) : (<div className="grid grid-cols-1 gap-4">
              {filteredAssignments.map((assignment) => (
                assignment.letter && (
                  <div className="relative group" key={assignment.id}>
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
                      actions={renderTrayActions(assignment)}
                    />

                    {view === 'inbox' && (
                      <div className={`absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2 transition-opacity p-2 ${(activeStepTab === 'review' || activeStepTab === 'signature') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Signature'); }}
                          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg"
                          title="Approved Signature"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); handleStepAction(assignment.id, 'Review'); }}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-lg"
                          title="Approved Review"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
