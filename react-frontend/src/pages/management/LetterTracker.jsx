
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
    Printer
} from "lucide-react";
import letterService from "../../services/letterService";
import { useNavigate } from "react-router-dom";

export default function LetterTracker() {
    const { user, isSuperAdmin } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();
    const { canField } = useAccess();
    const navigate = useNavigate();

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [isTrackDrawerOpen, setIsTrackDrawerOpen] = useState(false);
    const canSearch = canField("letter-tracker", "search");
    const canPdf = canField("letter-tracker", "pdf_button");
    const canTrack = canField("letter-tracker", "track_button");
    const canRefresh = canField("letter-tracker", "refresh_button");

    // Theme Variables
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222] shadow-sm' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';
    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222] shadow-sm';

    const fetchLetters = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const roleName = user?.roleData?.name || user?.role || '';
            const data = await letterService.getAll({
                user_id: user?.id,
                role: roleName,
                department_id: userDeptId,
                full_name: `${user?.first_name} ${user?.last_name}`.trim()
            });
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

        if (isUserRole && !isSuperAdmin) {
            const isOwner = letter.encoder_id === user.id;
            // Check if letter belongs to user's department via assignments
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const isInUserDept = letter.assignments?.some(a => (a.department_id?.id ?? a.department_id) === userDeptId);

            if (!isOwner && !isInUserDept) return false;
        }

        // 2. Search Filter
        if (!canSearch) return true;

        return (
            letter.entry_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            // Fallback to what we have if fetch fails
            setSelectedLetter(letter);
            setIsTrackDrawerOpen(true);
        }
    };

    const handleViewPDF = (letter) => {
        if (!letter.scanned_copy && !letter.attachment_id) return;
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const url = letter.scanned_copy
            ? `${apiBase}/attachments/view-path?path=${btoa(letter.scanned_copy)}`
            : `${apiBase}/attachments/view/${letter.attachment_id}`;
        window.open(url, '_blank');
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

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <div className="max-w-full mx-auto space-y-6">
                        {/* Summary & Search */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className={`text-2xl font-bold uppercase tracking-tight ${textColor}`}>Letter Tracker</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{isSuperAdmin ? 'Full Access Monitoring' : 'Your Registered Records'}</p>
                            </div>
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

                        {/* Table Container */}
                        <div className={`rounded-3xl border overflow-hidden shadow-sm ${cardBg}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className={`border-b ${'border-gray-50 dark:border-[#222] bg-gray-50/50'}`}>
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
                                            <tr><td colSpan="8" className="p-20 text-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" /></td></tr>
                                        ) : filteredLetters.length === 0 ? (
                                            <tr><td colSpan="8" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">No matching records found</td></tr>
                                        ) : filteredLetters.map((letter) => (
                                            <tr key={letter.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group">
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
                                                        <button
                                                            onClick={() => handlePrintQR(letter.entry_id)}
                                                            className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all border border-blue-100 dark:border-blue-900/20 shadow-sm"
                                                            title="Print QR Code"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {canPdf && (letter.scanned_copy || letter.attachment_id) ? (
                                                            <button onClick={() => handleViewPDF(letter)} className="p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/20 shadow-sm"><FileText className="w-3.5 h-3.5" /></button>
                                                        ) : <span className="text-gray-300">-</span>}
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

            {/* TRACK DRAWER */}
            {
                isTrackDrawerOpen && selectedLetter && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsTrackDrawerOpen(false)} />
                        <div className={`w-full max-w-md ${cardBg} h-full relative z-10 animate-in slide-in-from-right duration-500 flex flex-col border-l`}>
                            <div className="p-8 border-b flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-indigo-500">
                                        <GitMerge className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>Workflow Track</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedLetter.entry_id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsTrackDrawerOpen(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-gray-400"><ChevronRight className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="relative pl-8 space-y-12 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-white/5">
                                    {/* Entry Point */}
                                    <div className="relative">
                                        <div className="absolute -left-9 w-6 h-6 rounded-full bg-orange-500 border-4 border-white dark:border-[#141414] shadow-sm z-10" />
                                        <div>
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Entry Registration</p>
                                            <h4 className={`text-sm font-bold mt-1 ${textColor}`}>Letter Registered by {selectedLetter.encoder?.first_name || 'Guest'}</h4>
                                            <p className="text-xs text-gray-500 mt-2 line-clamp-3">{selectedLetter.summary}</p>
                                            <p className="text-[9px] font-black text-gray-400 uppercase mt-2">{new Date(selectedLetter.date_received).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: true })}</p>
                                        </div>
                                    </div>

                                    {selectedLetter.logs?.map((log, i) => {
                                        const isEndorsement = log.action_type === 'Endorsed';
                                        return (
                                            <div key={i} className="relative">
                                                <div className={`absolute -left-9 w-6 h-6 rounded-full border-4 border-white dark:border-[#141414] shadow-sm z-10 ${isEndorsement ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isEndorsement ? 'text-orange-500' : 'text-indigo-500'}`}>
                                                        {isEndorsement ? 'Endorsement' : log.action_type || 'Update'}
                                                    </p>
                                                    <h4 className={`text-sm font-bold mt-1 ${isEndorsement ? 'text-orange-500' : textColor}`}>{log.log_details || log.action_taken}</h4>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mt-2">{new Date(log.timestamp || log.log_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: true })}</p>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Final Status */}
                                    <div className="relative pt-4">
                                        <div className="absolute -left-9 w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 border-4 border-white dark:border-[#141414] shadow-sm z-10" />
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current State</p>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white`}>
                                                {selectedLetter.status?.status_name || 'PROCESSING'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
