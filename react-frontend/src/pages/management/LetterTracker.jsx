
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";
import {
    Table as TableIcon,
    Search,
    Loader2,
    RefreshCw,
    Activity,
    FileText,
    Eye,
    Calendar,
    User as UserIcon,
    Hash,
    ChevronRight,
    GitMerge,
    Menu,
    Printer,
    X,
    ChevronDown
} from "lucide-react";
import letterService from "../../services/letterService";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function LetterTracker() {
    const { user, isSuperAdmin } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();
    const { canField } = useAccess();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [isTrackDrawerOpen, setIsTrackDrawerOpen] = useState(false);

    // Filters from query params (set via Home page summary cards)
    const [filterGroup, setFilterGroup] = useState(searchParams.get('group') || '');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [filterPeriod, setFilterPeriod] = useState(searchParams.get('period') || '');

    const periodLabels = { today: 'Today', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', all: 'All Time' };

    // Compute period date cutoff (matches StatsController logic)
    const getPeriodCutoff = (period) => {
        if (!period || period === 'all') return null;
        const now = new Date();
        if (period === 'today') { now.setHours(0, 0, 0, 0); return now; }
        if (period === 'weekly') { now.setDate(now.getDate() - 7); return now; }
        if (period === 'monthly') { now.setMonth(now.getMonth() - 1); return now; }
        if (period === 'yearly') { now.setFullYear(now.getFullYear() - 1); return now; }
        return null;
    };

    const canSearch = canField("letter-tracker", "search");
    const canPdf = canField("letter-tracker", "pdf_button");
    const canTrack = canField("letter-tracker", "track_button");
    const canPrintQR = canField("letter-tracker", "print_qr_button");
    const canRefresh = canField("letter-tracker", "refresh_button");

    // Theme Variables
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222] shadow-sm' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';
    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222] shadow-sm';

    const clearFilter = (key) => {
        if (key === 'group') setFilterGroup('');
        if (key === 'status') setFilterStatus('');
        if (key === 'period') setFilterPeriod('');
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(key);
        setSearchParams(newParams, { replace: true });
    };

    const fetchLetters = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const roleName = user?.roleData?.name || user?.role || '';
            const response = await letterService.getAll({
                user_id: user?.id,
                role: roleName,
                department_id: userDeptId,
                full_name: `${user?.first_name} ${user?.last_name}`.trim(),
                limit: 200 // Higher limit for tracker view
            });
            const data = response.data || response;
            const filtered = Array.isArray(data) ? data : [];

            setLetters(filtered);
        } catch (error) {
            console.error("Failed to fetch letters:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchLetters();
    }, [user?.id]);

    const filteredLetters = letters.filter(letter => {
        // 1. Data Visibility Filter based on Role
        const roleName = user?.roleData?.name?.toString().toUpperCase() || '';
        const isUserRole = roleName === 'USER';
        const isAccessManager = roleName === 'ACCESS MANAGER';

        if ((isUserRole || isAccessManager) && !isSuperAdmin) {
            const isOwner = letter.encoder_id === user.id;

            const userLastName = user?.last_name?.toLowerCase() || '';
            const userFirstName = user?.first_name?.toLowerCase() || '';
            const fullName1 = `${userFirstName} ${userLastName}`.trim();
            const fullName2 = `${userLastName}, ${userFirstName}`.trim();

            const senderStr = (letter.sender || '').toLowerCase();
            const endorseStr = (letter.endorsed || '').toLowerCase();

            const isSenderOrEndorsed =
                (fullName1 && (senderStr.includes(fullName1) || endorseStr.includes(fullName1))) ||
                (fullName2 && (senderStr.includes(fullName2) || endorseStr.includes(fullName2)));

            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const isInDept = letter.assignments?.some(a => (a.department_id?.id ?? a.department_id) === userDeptId) || letter.dept_id === userDeptId;
            if (!isOwner && !isInDept && !isSenderOrEndorsed) return false;
        }

        // 2. Period filter (date range)
        if (filterPeriod && filterPeriod !== 'all') {
            const cutoff = getPeriodCutoff(filterPeriod);
            if (cutoff) {
                const letterDate = new Date(letter.created_at || letter.date_received);
                if (letterDate < cutoff) return false;
            }
        }

        // 3. Group filter (process step name)
        if (filterGroup) {
            const stepMatch = letter.assignments?.some(a =>
                a.step?.step_name?.toLowerCase() === filterGroup.toLowerCase()
            );
            if (!stepMatch) return false;
        }

        // 4. Status filter (status name)
        if (filterStatus) {
            if (filterStatus.toLowerCase() === 'resolved') {
                if (!letter.is_resolved) return false;
            } else {
                const statusName = letter.status?.status_name?.toLowerCase() || '';
                if (statusName !== filterStatus.toLowerCase()) return false;
            }
        }

        // 4. Search Filter
        if (!canSearch) return true;

        return (
            letter.entry_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            letter.lms_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            letter.vemcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            letter.aevm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            letter.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            letter.summary?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });


    const handleTrackOpen = async (letter) => {
        try {
            // Fetch full letter with logs when opening track
            const fullLetter = await letterService.getById(letter.id);
            setSelectedLetter(fullLetter);
            setIsTrackDrawerOpen(true);
        } catch (error) {
            console.error("Failed to fetch full tracking details:", error);

        }
    };

    const handleViewPDF = (letter) => {
        if (!letter.scanned_copy && !letter.attachment_id) return;
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        if ((letter.scanned_copy && letter.attachment_id) || (letter.attachment_id && String(letter.attachment_id).includes(','))) {
            window.open(`${apiBase}/attachments/view-combined/${letter.id}`, "_blank");
        } else {
            const url = letter.scanned_copy
                ? `${apiBase}/attachments/view-path?path=${btoa(letter.scanned_copy)}`
                : `${apiBase}/attachments/view/${letter.attachment_id}`;
            window.open(url, "_blank");
        }
    };

    const handlePrintQR = (entry_id) => {
        const printWindow = window.open('', '_blank');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${entry_id}`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reference QR - ${entry_id}</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: sans-serif; 
                            background: white; 
                            display: flex;
                            align-items: flex-start;
                        }
                        @page { size: auto; margin: 0mm; }
                        .container { 
                            display: flex; 
                            align-items: center; 
                            gap: 2mm; 
                            padding: 2mm; 
                        }
                        img { 
                            width: 9mm; 
                            height: 9mm; 
                            object-fit: contain;
                        }
                        .ref { 
                            font-size: 8pt; 
                            font-weight: 900; 
                            white-space: nowrap;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img src="${qrUrl}" />
                        <div class="ref">${entry_id}</div>
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className={`flex h-screen ${pageBg} overflow-hidden font-sans`}>
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className={`h-16 ${headerBg} border-b px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 transition-colors duration-500`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Digital Archive</span>
                            <h1 className={`text-xl font-bold tracking-tighter uppercase font-outfit ${textColor}`}>Letter Tracker</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {canRefresh && <button onClick={() => fetchLetters(true)} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400">
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>}
                    </div>
                </header>

                <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
                    <div className="w-full max-w-full mx-auto space-y-6 flex-1 flex flex-col min-h-0">
                        {/* Summary & Search */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                            {canSearch && (
                                <div className="relative group min-w-[300px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search reference, sender..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-orange-500/20 outline-none ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Active Filter Pills */}
                        {(filterGroup || filterStatus || filterPeriod) && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtered by:</span>
                                {filterPeriod && filterPeriod !== 'all' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-800/30">
                                        Period: {periodLabels[filterPeriod] || filterPeriod}
                                        <button onClick={() => clearFilter('period')} className="hover:bg-amber-200 dark:hover:bg-amber-800/40 rounded-full p-0.5 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {filterGroup && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/30">
                                        Group: {filterGroup}
                                        <button onClick={() => clearFilter('group')} className="hover:bg-indigo-200 dark:hover:bg-indigo-800/40 rounded-full p-0.5 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {filterStatus && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/30">
                                        Status: {filterStatus}
                                        <button onClick={() => clearFilter('status')} className="hover:bg-emerald-200 dark:hover:bg-emerald-800/40 rounded-full p-0.5 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}


                        {/* Table Container */}
                        <div className={`flex-1 flex flex-col min-h-0 rounded-3xl border shadow-sm ${cardBg}`}>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead className="sticky top-0 z-20">
                                        <tr className={`border-b ${'border-gray-50 dark:border-[#222] bg-gray-50 dark:bg-[#1a1a1a]'}`}>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-12 text-center">#</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Reference #</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Date Received</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Sender</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Letter Summary</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Status</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Track</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">QR</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr><td colSpan="9" className="p-20 text-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" /></td></tr>
                                        ) : filteredLetters.length === 0 ? (
                                            <tr><td colSpan="9" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">No matching records found</td></tr>
                                        ) : filteredLetters.map((letter, index) => (
                                            <tr key={letter.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group">
                                                <td className="px-5 py-4 text-center text-[10px] font-bold text-gray-400">{index + 1}</td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 ${textColor}`}>
                                                        {letter.entry_id}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{new Date(letter.date_received).toLocaleDateString()}</span>
                                                        <span className="text-[10px] text-orange-500 font-bold">{new Date(letter.date_received).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">
                                                    {letter.sender}
                                                </td>
                                                <td className="px-5 py-4 max-w-xs">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-1">{letter.summary}</p>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${letter.status?.status_name === 'Incoming' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                                        {letter.status?.status_name || 'REGISTERED'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {canTrack && <button onClick={() => handleTrackOpen(letter)} className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-100 dark:border-indigo-900/20 shadow-sm"><Activity className="w-3.5 h-3.5" /></button>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {canPrintQR ? (
                                                            <button
                                                                onClick={() => handlePrintQR(letter.entry_id)}
                                                                className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all border border-blue-100 dark:border-blue-900/20 shadow-sm"
                                                                title="Print QR Code"
                                                            >
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {(letter.scanned_copy || letter.attachment_id) ? (
                                                            (() => {
                                                                const isHidden = letter.is_hidden === true || letter.is_hidden === 1 || letter.is_hidden === 'true';
                                                                const isAuthorized = !isHidden;

                                                                if (!canPdf || !isAuthorized) {
                                                                    return <span className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-300 border border-gray-100 dark:border-white/10 opacity-50 cursor-not-allowed" title={isHidden ? "Hidden Letter: Access Restricted" : "No Permission"}><FileText className="w-3.5 h-3.5" /></span>;
                                                                }
                                                                return <button onClick={() => handleViewPDF(letter)} className="p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/20 shadow-sm"><FileText className="w-3.5 h-3.5" /></button>;
                                                            })()




                                                        ) : (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60">No File</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {isTrackDrawerOpen && selectedLetter && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsTrackDrawerOpen(false)}
                    />
                    <div className="w-full max-w-sm bg-white dark:bg-[#141414] shadow-2xl h-full relative z-10 animate-in slide-in-from-right duration-500 flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
                            <div>
                                <span className="text-lg font-black text-orange-500 uppercase tracking-tight">
                                    {selectedLetter?.lms_id}
                                </span>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                    Activity Tracking
                                </p>
                            </div>
                            <button
                                onClick={() => setIsTrackDrawerOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Timeline Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
                            {!selectedLetter?.logs || selectedLetter.logs.length === 0 ? (
                                <p className="text-center text-gray-400 py-20 uppercase font-black tracking-widest text-[10px]">
                                    No activity recorded yet.
                                </p>
                            ) : (
                                <div className="relative">
                                    {(() => {
                                        // 1. Sort ASCENDING (oldest to newest) to process progression
                                        const sorted = [...selectedLetter.logs].sort(
                                            (a, b) =>
                                                new Date(a.timestamp || a.log_date || 0) -
                                                new Date(b.timestamp || b.log_date || 0),
                                        );

                                        // 2. Map and Filter Redundant Consecutive States
                                        const uniqueSequence = [];
                                        let lastStateKey = "";

                                        sorted.forEach((log) => {
                                            const statusComp = (log.status?.status_name || "")
                                                .trim()
                                                .toUpperCase();
                                            const stepComp = (log.step?.step_name || "")
                                                .trim()
                                                .toUpperCase();
                                            const actionType = (log.action_type || "")
                                                .trim()
                                                .toUpperCase();
                                            const deptComp = (log.department?.dept_code || "")
                                                .trim()
                                                .toUpperCase();

                                            let displayHeading = "";
                                            let displaySubheading = "";

                                            // Priority Status Checks (Bypass workflow matrix)
                                            const isPriority =
                                                statusComp.includes("FILED") ||
                                                actionType.includes("FILED") ||
                                                statusComp.includes("HOLD") ||
                                                actionType.includes("HOLD");

                                            // Strictly followed User Mapping Logic
                                            if (actionType.includes("ENDORSE") || statusComp.includes("ENDORSE")) {
                                                const endorsedTo = log.metadata?.endorsed_to;
                                                if (!endorsedTo) return; // SKIP: Only show entries with specific recipient names
                                                displayHeading = endorsedTo;
                                                displaySubheading = ""; // Strictly empty as requested
                                            } else if (statusComp === "INCOMING" || statusComp === "PENDING") {
                                                displayHeading = "Processing";
                                                displaySubheading = "For Incoming";
                                            } else if (statusComp.includes("REVIEW") || stepComp.includes("REVIEW")) {
                                                displayHeading = "ATG Office";
                                                displaySubheading = selectedLetter?.atgnote || "Being Reviewed";
                                            } else if (stepComp === "VEM LETTER" || (deptComp === "EVM" && statusComp.includes("FORWARD"))) {
                                                displayHeading = "Office of the Executive Minister";
                                                displaySubheading = selectedLetter?.evemnote || "Processing";
                                            } else if (stepComp === "AEVM LETTER" || stepComp === "AEVEM LETTER" || (deptComp === "AEVM" && statusComp.includes("FORWARD"))) {
                                                displayHeading = "Office of the Deputy Executive Minister";
                                                displaySubheading = selectedLetter?.aevmnote || "Processing";
                                            } else if (isPriority) {
                                                displayHeading = log.status?.status_name || log.action_type || actionType;
                                                displaySubheading = log.metadata?.location || "";
                                            } else {
                                                displayHeading = log.department?.dept_code || log.step?.step_name || "Activity";
                                                displaySubheading = "";

                                                // SKIP: Remove redundant "ATG" labels as "ATG Office" is already shown
                                                if (displayHeading === "ATG") return;
                                            }

                                            // Detect Duplicate State
                                            const currentStateKey =
                                                `${displayHeading}-${displaySubheading}`.toUpperCase();
                                            if (currentStateKey !== lastStateKey || isPriority) {
                                                uniqueSequence.push({
                                                    ...log,
                                                    displayHeading,
                                                    displaySubheading,
                                                });
                                                lastStateKey = currentStateKey;
                                            }
                                        });

                                        // 3. Newest at bottom: do NOT reverse
                                        return uniqueSequence.map((log, i, arr) => {
                                            const logDate = new Date(log.timestamp || log.log_date);
                                            const isLastItem = i === arr.length - 1;
                                            const isResolved = selectedLetter?.is_resolved;

                                            return (
                                                <div
                                                    key={i}
                                                    className="relative grid grid-cols-[90px_auto_1fr] items-start gap-3 mb-8"
                                                >
                                                    <div className="text-right pt-0.5">
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                            {logDate.toLocaleDateString("en-PH", {
                                                                day: "numeric",
                                                                month: "short",
                                                                timeZone: "Asia/Manila",
                                                            })}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-gray-400">
                                                            {logDate.toLocaleTimeString("en-PH", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                hour12: false,
                                                                timeZone: "Asia/Manila",
                                                            })}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-5 h-5 rounded-full border-2 ${isResolved && isLastItem ? "border-red-500 bg-red-500 shadow-lg shadow-red-500/30" : "border-orange-400 bg-white dark:bg-[#141414]"} z-10 flex items-center justify-center shrink-0`}>
                                                            {!isLastItem || !isResolved ? (
                                                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                                                            ) : null}
                                                        </div>
                                                        {!isLastItem && (
                                                            <div className="flex flex-col items-center flex-1">
                                                                <div className="w-px flex-1 border-l-2 border-dashed border-gray-200 dark:border-[#333] min-h-[1.5rem]" />
                                                                <ChevronDown className="w-3 h-3 text-gray-300 -mt-1 mb-1" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-0.5">
                                                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                            {log.displayHeading}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 whitespace-pre-wrap">
                                                            {log.displaySubheading}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-[#222]">
                            <button
                                onClick={() => setIsTrackDrawerOpen(false)}
                                className="w-full py-3 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
