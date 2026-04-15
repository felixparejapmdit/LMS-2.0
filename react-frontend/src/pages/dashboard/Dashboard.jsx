
import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import LetterCard from "../../components/LetterCard";
import EmptyEntryView from "./EmptyEntryView";
import axios from "axios";
import { useSession, useUI } from "../../context/AuthContext";
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
  UserCheck,
  PenTool,
  CheckSquare,
  FileEdit,
  Trash2,
  AlertCircle,
  FileText,
  X,
  Printer,
  Menu as MenuIcon
} from "lucide-react";
import letterService from "../../services/letterService";
import trayService from "../../services/trayService";
import useAccess from "../../hooks/useAccess";

export default function Dashboard({ view = "inbox", forcedDeptId = null }) {
  const { user } = useSession();
  const { layoutStyle, setIsMobileMenuOpen } = useUI();
  const access = useAccess();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [inboxFilter, setInboxFilter] = useState('all');
  const [selectedTray, setSelectedTray] = useState(null);
  const [inboxStats, setInboxStats] = useState({ review: 0, signature: 0, vem: 0, pending: 0, hold: 0, empty_entry: 0 });
  const [trays, setTrays] = useState([]);
  const [steps, setSteps] = useState([]);
  const [modalLetters, setModalLetters] = useState([]);
  const [lmsIdInput, setLmsIdInput] = useState('');
  const [isAddingLetter, setIsAddingLetter] = useState(false);
  const [modalError, setModalError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage] = useState(30);

  const activeStepTab = searchParams.get('tab') || 'signature';
  const setActiveStepTab = (tab) => {
    setSelectedIds([]); // Clear selections when changing tabs
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };

  const canField = access?.canField || (() => true);
  const pageId = forcedDeptId ? "department-letters" : (view === "outbox" ? "outbox" : "inbox");
  const canSearch = canField(pageId, "search");
  const canRefresh = canField(pageId, "refresh_button");
  const canTabFilter = canField(pageId, "tab_filter");
  const canTraySelector = canField(pageId, "tray_selector");

  const pageBg = "bg-[#F7F7F7] dark:bg-[#0D0D0D]";
  const headerBg = "bg-white dark:bg-[#0D0D0D] border-b border-[#E5E5E5] dark:border-[#222]";
  const textColor = "text-[#1A1A1B] dark:text-white";

  const format12h = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    });
  };

  const tabLabels = {
    signature: 'For Signature',
    review: 'For Review',
    atg_note: 'FOR ATG NOTE',
    vem: 'VEM LETTER',
    avem: 'AEVEM LETTER',
    pending: 'PENDING',
    hold: 'HOLD',
    empty_entry: 'EMPTY ENTRY'
  };

  const tabGradients = {
    signature: 'from-blue-500 to-cyan-400',
    review: 'from-emerald-500 to-teal-400',
    atg_note: 'from-indigo-500 to-violet-400',
    vem: 'from-amber-500 to-orange-400',
    avem: 'from-rose-500 to-pink-400',
    pending: 'from-slate-600 to-slate-500',
    hold: 'from-red-500 to-orange-400',
    empty_entry: 'from-gray-600 to-gray-500'
  };
  const activeTabLabel = tabLabels[activeStepTab] || 'Letters';

  const fetchAssignments = async (showRefresh = false, retryCount = 0) => {
    if (!user?.id) return;
    if (showRefresh) setRefreshing(true);
    if (retryCount === 0) setLoading(true);

    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const roleName = user?.roleData?.role_name || user?.role || '';
      const fullName = `${user?.first_name} ${user?.last_name}`.trim();
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments?department_id=${deptId}&user_id=${user?.id}&role=${roleName}&full_name=${encodeURIComponent(fullName)}`;

      if (view === 'inbox') {
        const skipGlobalStatus = ['atg_note', 'pending', 'empty_entry', 'hold', 'review', 'signature', 'vem', 'avem'].includes(activeStepTab);
        if (!skipGlobalStatus) url += '&global_status=8';
        url += '&exclude_vip=true';
        if (activeStepTab) url += `&named_filter=${activeStepTab}`;
      } else if (view === 'outbox') {
        url += '&global_status=8&outbox=true&exclude_vip=true';
      }

      url += `&page=${currentPage}&limit=${recordsPerPage}`;

      const response = await axios.get(url);
      const resData = response.data;

      if (resData && typeof resData === 'object' && resData.data) {
        setAssignments(resData.data);
        setTotalPages(resData.totalPages || 1);
        setTotalRecords(resData.total || resData.data.length);
      } else {
        const dataArray = Array.isArray(resData) ? resData : [];
        setAssignments(dataArray);
        setTotalRecords(dataArray.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

      if (view === 'inbox') fetchInboxStats();
    } catch (error) {
      console.error("Error fetching items:", error.message);
      // Retry logic for Brave/Aborted requests
      if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('aborted'))) {
        console.log(`Retrying fetch assignments... (${retryCount + 1})`);
        setTimeout(() => fetchAssignments(showRefresh, retryCount + 1), 1000);
      }
    } finally {
      if (retryCount === 0 || retryCount >= 2) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const fetchInboxStats = async () => {
    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const roleName = user?.roleData?.role_name || user?.role || '';
      const fullName = `${user?.first_name} ${user?.last_name}`.trim();
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/stats/inbox?department_id=${deptId}&user_id=${user?.id}&role=${roleName}&full_name=${encodeURIComponent(fullName)}`);
      setInboxStats(res.data);
    } catch (error) {
      console.error("Error fetching inbox stats:", error);
    }
  };

  const fetchTrays = async () => {
    if (!user?.id) return;
    try {
      const deptId = forcedDeptId ?? (user?.dept_id?.id ?? user?.dept_id ?? null);
      const data = await trayService.getAllTrays({ dept_id: deptId });
      setTrays(data);
    } catch (error) {
      console.error("Error fetching trays:", error.message);
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
      if (view !== 'inbox' && activeStepTab !== 'signature') {
        setActiveStepTab('signature');
      }
      fetchAssignments();
      fetchTrays();
      fetchSteps();
      if (view === 'inbox') fetchInboxStats();

      const statsInterval = setInterval(() => { if (view === 'inbox') fetchInboxStats(); }, 15000);
      const assignInterval = setInterval(() => { fetchAssignments(); }, 30000);
      return () => { clearInterval(statsInterval); clearInterval(assignInterval); }
    }
  }, [user?.id, view, activeStepTab, currentPage]);

  useEffect(() => {
    if (isPrintModalOpen) {
      if (selectedIds.length > 0) {
        setModalLetters(assignments.filter(a => selectedIds.includes(a.id)).map(a => a.letter).filter(l => !!l));
      } else {
        setModalLetters([]);
      }
    } else {
      setModalLetters([]);
      setModalError('');
      setLmsIdInput('');
    }
  }, [isPrintModalOpen, selectedIds, assignments]);

  const toggleSelection = (e, id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const visibleIds = filteredBySteps.map(a => a.id);
    setSelectedIds(selectedIds.length === visibleIds.length ? [] : visibleIds);
  };

  const handleTrayUpdate = async (letterId, trayId, assignmentId) => {
    try {
      // Optimistic Update
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      await letterService.update(letterId, { tray_id: trayId, global_status: 1 });
      fetchAssignments();
      fetchInboxStats();
    } catch (err) {
      console.error("Tray update failed:", err);
      fetchAssignments();
    }
  };

  const handleBulkAction = async (action, data = null) => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const selectedAssignments = assignments.filter(a => selectedIds.includes(a.id));
      const letterIds = selectedAssignments.map(a => a.letter?.id).filter(id => !!id);

      if (['atg_incoming', 'atg_note_step', 'hold'].includes(action)) {
        setAssignments(prev => prev.filter(a => !selectedIds.includes(a.id)));
      }

      if (action === 'tray') {
        await Promise.all(letterIds.map(id => letterService.update(id, { tray_id: data, global_status: 1 })));
      } else if (action === 'hold') {
        const holdStatusId = 7;
        await Promise.all(letterIds.map(id => letterService.update(id, { global_status: holdStatusId })));
        await Promise.all(selectedIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${id}?user_id=${user?.id}`, { status_id: holdStatusId })));
      } else if (action === 'atg_incoming') {
        const incomingStatusId = 1;
        await Promise.all(letterIds.map(id => letterService.update(id, { global_status: incomingStatusId })));
        await Promise.all(selectedIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${id}?user_id=${user?.id}`, { status_id: 8, step_id: null })));
      } else if (action === 'atg_note_step') {
        const atgNoteStatusId = 2;
        await Promise.all(letterIds.map(id => letterService.update(id, { global_status: atgNoteStatusId })));
        await Promise.all(selectedIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${id}?user_id=${user?.id}`, { status_id: 8, step_id: null })));
      } else if (action === 'print') {
        window.print();
        setLoading(false); return;
      } else if (['approve_signature', 'approve_review'].includes(action)) {
        const stepId = action === 'approve_signature' ? 1 : 2;
        await Promise.all(selectedIds.map(id => axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${id}?user_id=${user?.id}`, { step_id: stepId, status_id: 8 })));
      } else if (action === 'delete') {
        if (!window.confirm(`Delete ${selectedIds.length} letters?`)) { setLoading(false); return; }
        await Promise.all(letterIds.map(id => letterService.delete(id)));
      }

      setSelectedIds([]);
      fetchAssignments();
      fetchInboxStats();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (e, assignment, action) => {
    e.preventDefault(); e.stopPropagation();
    if (action === 'delete') {
      if (!window.confirm("Are you sure?")) return;
      try { await letterService.delete(assignment.letter.id); fetchAssignments(); } catch (err) { console.error(err); }
      return;
    }
    const stepId = action === 'signature' ? 1 : 2;
    try {
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${assignment.id}`, { step_id: stepId });
      fetchAssignments();
    } catch (err) { console.error(err); fetchAssignments(); }
  };

  const renderQuickActions = (assignment) => {
    if (activeStepTab !== 'pending') return null;
    return (
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button
          onClick={(e) => handleQuickAction(e, assignment, 'review')}
          title="Move to For Review"
          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-colors"
        >
          <FileEdit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => handleQuickAction(e, assignment, 'signature')}
          title="Move to For Signature"
          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 transition-colors"
        >
          <PenTool className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => handleQuickAction(e, assignment, 'delete')}
          title="Delete Document"
          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderTrayActions = (assignment) => {
    if (!['review', 'signature', 'vem', 'avem'].includes(activeStepTab)) return null;
    return (
      <div className="flex items-center gap-1">
        {trays.map(t => (
          <button
            key={t.id}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTrayUpdate(assignment.letter.id, t.id, assignment.id); }}
            className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${assignment.letter?.tray_id === t.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-600'}`}
          >
            {t.tray_no}
          </button>
        ))}
      </div>
    );
  };

  const filteredBySteps = assignments.filter(a => {
    if (canTraySelector && selectedTray && a.letter?.tray_id !== selectedTray) return false;

    // Explicitly exclude HOLD status from specific tabs
    if (['review', 'signature', 'vem', 'avem'].includes(activeStepTab)) {
      const gStatus = a.letter?.global_status;
      const sName = a.status?.status_name || a.letter?.status?.status_name;
      if (gStatus === 7 || sName === 'Hold') return false;
    }

    if (activeStepTab === 'atg_note' && inboxFilter !== 'all') {
      const stepId = a.letter?.step_id ?? a.step_id;
      if (inboxFilter === 'signature') return stepId === 1;
      if (inboxFilter === 'review') return stepId === 2;
    }
    return true;
  });

  const renderBulkActions = () => {
    if (view !== 'inbox') return null;
    const showTrays = ['review', 'signature', 'vem', 'avem'].includes(activeStepTab);
    const showPrintHold = ['review', 'signature', 'vem', 'avem', 'atg_note', 'hold'].includes(activeStepTab);
    const isGrid = layoutStyle === 'grid';
    return (
      <div className={`flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-2xl shadow-sm transition-all duration-300 ${selectedIds.length > 0 ? 'opacity-100 scale-100 mb-4' : 'opacity-0 scale-95 h-0 overflow-hidden mb-0'}`}>
        <button onClick={handleSelectAll} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length > 0 ? (isGrid ? 'bg-blue-600' : 'bg-orange-600') + ' text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
          {selectedIds.length === filteredBySteps.length && filteredBySteps.length > 0 ? 'Deselect All' : 'Check All'}
        </button>

        {activeStepTab === 'pending' && (
          <div className="flex items-center gap-1.5 ml-1 border-l pl-2 border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleBulkAction('approve_review')}
              disabled={selectedIds.length === 0}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all ${selectedIds.length === 0 ? 'opacity-30 pointer-events-none' : 'hover:scale-105 shadow-sm shadow-emerald-100'}`}
              title="Move to For Review"
            >
              For Review
            </button>
            <button
              onClick={() => handleBulkAction('approve_signature')}
              disabled={selectedIds.length === 0}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all ${selectedIds.length === 0 ? 'opacity-30 pointer-events-none' : 'hover:scale-105 shadow-sm shadow-blue-100'}`}
              title="Move to For Signature"
            >
              For Signature
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={selectedIds.length === 0}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 text-red-600 hover:bg-red-50 transition-all ${selectedIds.length === 0 ? 'opacity-30 pointer-events-none' : 'hover:scale-105 shadow-sm shadow-red-100'}`}
              title="Delete Selected"
            >
              Delete
            </button>
          </div>
        )}

        {showTrays && trays.map(t => (
          <button key={t.id} onClick={() => handleBulkAction('tray', t.id)} disabled={selectedIds.length === 0} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedIds.length > 0 ? (isGrid ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50') : 'bg-gray-50 text-gray-300 pointer-events-none'}`}>{t.tray_no}</button>
        ))}
        {activeStepTab === 'hold' && (
          <>
            <button onClick={() => handleBulkAction('atg_incoming')} disabled={selectedIds.length === 0} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all ${selectedIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>For Incoming</button>
            <button onClick={() => handleBulkAction('atg_note_step')} disabled={selectedIds.length === 0} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all ${selectedIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>For ATG Note</button>
          </>
        )}
        {showPrintHold && (
          <>
            <button onClick={() => handleBulkAction('print')} disabled={selectedIds.length === 0} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Print List</button>
            <button onClick={() => setIsPrintModalOpen(true)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isGrid ? 'bg-blue-600' : 'bg-orange-500'} text-white shadow-sm`}>Print Resumen</button>
            {activeStepTab !== 'hold' && <button onClick={() => handleBulkAction('hold')} disabled={selectedIds.length === 0} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all">Hold</button>}
          </>
        )}
        {activeStepTab === 'atg_note' && (
          <select value={inboxFilter} onChange={(e) => setInboxFilter(e.target.value)} className="ml-auto px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white outline-none">
            <option value="all">Sort: All</option>
            <option value="review">For Review</option>
            <option value="signature">For Signature</option>
          </select>
        )}
      </div>
    );
  };

  const handleAddModalLetter = async (e) => {
    e.preventDefault();
    if (!lmsIdInput.trim()) return;
    setIsAddingLetter(true);
    setModalError('');
    try {
      const letter = await letterService.getByLmsId(lmsIdInput.trim());
      if (modalLetters.find(l => l.id === letter.id)) {
        setModalError('Letter already in the list.');
      } else {
        setModalLetters(prev => [letter, ...prev]);
        setLmsIdInput('');
      }
    } catch (err) {
      setModalError('Letter not found.');
    } finally {
      setIsAddingLetter(false);
    }
  };

  const handleAtgViewBulk = async () => {
    if (modalLetters.length === 0) return;
    setLoading(true);
    try {
      // For each letter in the modal, update it to ATG Note (Status 2) and clear tray (null)
      await Promise.all(modalLetters.map(l =>
        letterService.update(l.id, { global_status: 2, tray_id: null })
      ));

      // Also update any existing assignments for these letters to "incoming" (Status 8) but clear step
      const letterIds = modalLetters.map(l => l.id);
      const relevantAssignments = assignments.filter(a => letterIds.includes(a.letter?.id));
      if (relevantAssignments.length > 0) {
        await Promise.all(relevantAssignments.map(a =>
          axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${a.id}`, {
            status_id: 8,
            step_id: 2 // Move to 'For Review' by default for VIP View
          })
        ));
      }

      setIsPrintModalOpen(false);
      navigate('/vip-view');
    } catch (err) {
      console.error("ATG View transition failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderPrintSummaryModal = () => {
    if (!isPrintModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsPrintModalOpen(false)} />
        <div className="bg-white dark:bg-[#141414] w-full max-w-5xl rounded-[2.5rem] border shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:p-0 print:m-0">

          {/* Header */}
          <div className="p-8 border-b flex items-center justify-between bg-slate-50 dark:bg-white/5 print:hidden">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-[#141414] rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-[#222]">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">{activeTabLabel}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Summary Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form onSubmit={handleAddModalLetter} className="relative mr-4">
                <input
                  type="text"
                  placeholder="Type LMS_ID to Add..."
                  value={lmsIdInput}
                  onChange={(e) => setLmsIdInput(e.target.value)}
                  className="pl-4 pr-10 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48 transition-all uppercase"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-50 rounded-lg text-blue-600">
                  {isAddingLetter ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
                {modalError && <span className="absolute -bottom-6 left-0 text-[10px] text-red-500 font-bold uppercase tracking-tighter whitespace-nowrap">{modalError}</span>}
              </form>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-3 bg-white dark:bg-white/5 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-white/10 flex items-center justify-center shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-12 custom-scrollbar print:overflow-visible print:p-0">
            <div className="hidden print:flex flex-col mb-8 border-b-2 border-slate-900 pb-4">
              <div className="flex justify-between items-end">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Correspondence Summary</h2>
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">Date:</span>
                  <span className="text-xs font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-white/10 print:border-slate-900">
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-12 print:text-slate-900">#</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32 print:text-slate-900">Date & Time</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24 print:text-slate-900">LMS Code</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:text-slate-900">Sender</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:text-slate-900">Letter Summary</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:hidden">Action</th>
                </tr>
              </thead>
              <tbody>
                {modalLetters.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-200 dark:text-gray-800">
                        <Inbox className="w-20 h-20" />
                        <span className="text-base font-black uppercase tracking-widest">No Selected letters</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  modalLetters.map((l, idx) => (
                    <tr key={l.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 transition-colors print:border-slate-200">
                      <td className="py-6 px-4 text-xs font-black text-slate-400 print:text-slate-900">{idx + 1}</td>
                      <td className="py-6 px-4">
                        <div className="flex flex-col text-[10px] font-bold text-slate-500 print:text-slate-900">
                          <span>{new Date(l.date_received || l.createdAt).toLocaleDateString()}</span>
                          <span className="text-orange-500 font-black">{new Date(l.date_received || l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>
                      </td>
                      <td className="py-6 px-4 text-xs font-black text-blue-600 uppercase print:text-slate-900">{l.lms_id}</td>
                      <td className="py-6 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 dark:text-white uppercase print:text-slate-900">{l.sender}</span>
                          <span className="text-[10px] text-slate-400 font-bold print:hidden">{l.locale || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md print:text-slate-900" dangerouslySetInnerHTML={{ __html: l.summary }}></div>
                      </td>
                      <td className="py-6 px-4 print:hidden">
                        <button
                          onClick={() => setModalLetters(prev => prev.filter(x => x.id !== l.id))}
                          className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-300 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Print Footer / Signatures (Visible only on print or report view) */}
            <div className="hidden print:block mt-20 pt-12 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-12">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Naghanda:</span>
                  <div className="border-b border-slate-900 pb-2">
                    <span className="text-xs font-black uppercase">{user?.first_name} {user?.last_name}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Pangalan ng nagdala:</span>
                  <div className="border-b border-slate-900 h-6"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Notasyon:</span>
                  <div className="border-b border-slate-900 h-6"></div>
                </div>
              </div>
              <div className="mt-8 text-right">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Count: {modalLetters.length}</p>
              </div>
            </div>
          </div>

          <div className="p-8 border-t flex items-center justify-between bg-slate-50 dark:bg-white/5 print:hidden">
            <button
              onClick={handleAtgViewBulk}
              disabled={modalLetters.length === 0}
              className="px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-indigo-600 text-[10px] font-black rounded-2xl uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              ATG View (Move to VIP)
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} disabled={modalLetters.length === 0} className="px-8 py-3 bg-blue-600 text-white text-[10px] font-black rounded-2xl shadow-xl hover:bg-blue-700 uppercase tracking-widest flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Summary
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body { background: white !important; margin: 0 !important; padding: 0 !important; }
            .print-hidden { display: none !important; }
            #root > div > main > header,
            #root > div > div.print-hidden { display: none !important; }
            .fixed.inset-0.z-\\[110\\] { 
                position: static !important; 
                display: block !important; 
                background: white !important;
                padding: 0 !important;
            }
            .fixed.inset-0.z-\\[110\\] > div:first-child { display: none !important; } /* Hide backdrop */
            .bg-white.dark\\:bg-\\[\\#141414\\].w-full.max-w-5xl {
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                position: static !important;
            }
            @page { margin: 10mm; size: portrait; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className={`flex h-screen ${pageBg} overflow-hidden font-sans print:p-0 print:h-auto print:overflow-visible`}>
      <div className="print:hidden">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Minimalist Header */}
        <header className={`h-16 ${headerBg} px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors shadow-sm print:hidden`}>
          <div className="flex items-center gap-8 overflow-hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[10px] text-[#737373] uppercase tracking-[0.2em] font-black">LMS</span>
              <h1 className={`text-xl font-black ${textColor} tracking-tighter uppercase`}>
                {view === 'inbox' ? 'Inbox' : view === 'outbox' ? 'Outbox' : view}
              </h1>
            </div>

            {/* Tabs moved to the left, next to the title */}
            {view === 'inbox' && canTabFilter && (
              <div className="flex items-center gap-1 border border-[#E5E5E5] dark:border-[#333] p-1.5 rounded-xl bg-gray-50/50 dark:bg-white/5 no-scrollbar overflow-x-auto min-w-0">
                {Object.entries(tabLabels).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveStepTab(id)}
                    className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${activeStepTab === id ? `bg-gradient-to-r ${tabGradients[id] || 'bg-[#1A1A1B] dark:bg-white'} text-white shadow-md` : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#1A1A1B] dark:hover:text-white'}`}
                  >
                    {label}
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${activeStepTab === id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'}`}>
                      {inboxStats[id] || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {canRefresh && (
              <button
                onClick={() => fetchAssignments(true)}
                className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-0 md:pt-0 custom-scrollbar print:hidden">
          <div className="w-full space-y-4 md:space-y-4 lg:space-y-4">
            {view === 'inbox' && canTraySelector && activeStepTab === 'atg_note' && (
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-[#E5E5E5] dark:border-[#222] pb-4">
                <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-xl shadow-sm overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedTray(null)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!selectedTray ? 'bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B]' : 'text-[#737373] hover:text-[#1A1A1B]'}`}
                  >
                    All
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${!selectedTray ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#1A1A1B]' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                      {assignments.length}
                    </span>
                  </button>
                  {trays.map(t => {
                    const trayCount = assignments.filter(a => a.letter?.tray_id === t.id).length;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTray(t.id)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedTray === t.id ? 'bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B]' : 'text-[#737373] hover:text-[#1A1A1B]'}`}
                      >
                        {t.tray_no}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${selectedTray === t.id ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#1A1A1B]' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                          {trayCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center border border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#111] rounded-3xl">
                <Loader2 className="w-10 h-10 text-[#1A1A1B] dark:text-white animate-spin mb-4" />
                <span className="text-[10px] font-black text-[#737373] uppercase tracking-widest">Refreshing assignments...</span>
              </div>
            ) : activeStepTab === 'empty_entry' ? (
              <EmptyEntryView 
                assignments={filteredBySteps}
                onRefresh={fetchAssignments}
                user={user}
              />
            ) : filteredBySteps.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#111] rounded-3xl">
                <Inbox className="w-12 h-12 text-[#E5E5E5] mb-4" />
                <span className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-widest">No letters found in this queue</span>
              </div>
            ) : (
              <div className="space-y-6">
                {renderBulkActions()}
                <div className="space-y-4">
                  {filteredBySteps.map((assignment) => (
                    <div key={assignment.id} className="flex items-start gap-4 group">
                      {view === 'inbox' && (
                        <div className="flex-shrink-0 pt-6">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(assignment.id)}
                            onChange={(e) => toggleSelection(e, assignment.id)}
                            className="w-5 h-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer bg-white"
                          />
                        </div>
                      )}
                      <div className="w-full">
                        <LetterCard
                          id={assignment.id}
                          letterId={assignment.letter?.id}
                          atgId={assignment.letter?.lms_id}
                          sender={assignment.letter?.sender}
                          summary={assignment.letter?.summary}
                          status={assignment.status}
                          step={assignment.step?.step_name}
                          tray={assignment.letter?.tray}
                          layout="minimalist"
                          actions={
                            <div className="flex items-center gap-2">
                              {renderTrayActions(assignment)}
                              {renderQuickActions(assignment)}
                            </div>
                          }
                        />
                      </div>
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
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed text-gray-400' : 'bg-gray-100 dark:bg-white/5 text-[#1A1A1B] dark:text-white hover:bg-[#1A1A1B] hover:text-white pointer-events-auto cursor-pointer'}`}
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded flex items-center justify-center bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B] text-[10px] font-black">{currentPage}</span>
                      <span className="text-[10px] font-black text-[#737373] uppercase tracking-widest mx-1">of</span>
                      <span className="text-[10px] font-black text-[#1A1A1B] dark:text-white">{totalPages}</span>
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed text-gray-400' : 'bg-gray-100 dark:bg-white/5 text-[#1A1A1B] dark:text-white hover:bg-[#1A1A1B] hover:text-white pointer-events-auto cursor-pointer'}`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {renderPrintSummaryModal()}
      </main>
    </div>
  );
}
