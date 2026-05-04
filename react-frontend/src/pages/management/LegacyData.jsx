import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useSession, useUI } from "../../context/AuthContext";
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

export default function LegacyData() {
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
    const [isPdfDrawerOpen, setIsPdfDrawerOpen] = useState(false);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Filter State
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // Use permissions from letter-tracker as requested "copy features"
    const canSearch = canField("legacy-data", "search") || canField("letter-tracker", "search");
    const canPdf = canField("legacy-data", "pdf_button") || canField("letter-tracker", "pdf_button");
    const canTrack = canField("legacy-data", "track_button") || canField("letter-tracker", "track_button");
    const canRefresh = canField("legacy-data", "refresh_button") || canField("letter-tracker", "refresh_button");

    // Theme Variables
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222] shadow-sm' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';
    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222] shadow-sm';

    const fetchLetters = async (isRefreshing = false, retryCount = 0) => {
        if (isRefreshing || retryCount > 0) setRefreshing(true);
        if (retryCount === 0 && !isRefreshing) setLoading(true);

        try {
            const response = await letterService.getLegacyData();
            // Handle various response formats (direct array, or nested in .data or .letters)
            let data = [];
            if (Array.isArray(response)) {
                data = response;
            } else if (response && Array.isArray(response.data)) {
                data = response.data;
            } else if (response && Array.isArray(response.letters)) {
                data = response.letters;
            }

            setLetters(data);
        } catch (error) {
            console.error("Failed to fetch legacy letters:", error.message);
            // Retry logic for Brave/Aborted requests
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('aborted'))) {
                console.log(`Retrying fetch legacy data... (${retryCount + 1})`);
                setTimeout(() => fetchLetters(isRefreshing, retryCount + 1), 1000);
            }
        } finally {
            if (retryCount === 0 || retryCount >= 2) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        fetchLetters();
    }, []);

    const filteredLetters = letters.filter(letter => {
        // Search Filter
        const s = searchTerm.toLowerCase();
        const legacyId = (letter.atg_id || letter.lms_id || letter.entry_id || letter.id || '').toString().toLowerCase();
        const sender = (letter.sender || '').toLowerCase();
        const summary = (letter.letsum || letter.summary || letter.subject || '').toLowerCase();

        const matchesSearch = !searchTerm || legacyId.includes(s) || sender.includes(s) || summary.includes(s);

        // Date filtration
        const dateStr = letter.date_rec || letter.date_received;
        let dateObj = null;
        if (dateStr) {
            dateObj = new Date(dateStr);
        }

        const matchesMonth = !filterMonth || (dateObj && !isNaN(dateObj) && (dateObj.getMonth() + 1).toString() === filterMonth);
        const matchesYear = !filterYear || (dateObj && !isNaN(dateObj) && dateObj.getFullYear().toString() === filterYear);

        // Status filtration
        const status = letter.status || letter.status_name || 'ARCHIVED';
        const matchesStatus = !filterStatus || status === filterStatus;

        return matchesSearch && matchesMonth && matchesYear && matchesStatus;
    });

    const totalPages = Math.ceil(filteredLetters.length / itemsPerPage);
    const paginatedLetters = filteredLetters.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Derived Filters
    const uniqueYears = [...new Set(letters.map(l => {
        const d = l.date_rec || l.date_received;
        if (!d) return null;
        const dateObj = new Date(d);
        return isNaN(dateObj) ? null : dateObj.getFullYear();
    }).filter(Boolean))].sort((a, b) => b - a);

    const uniqueStatuses = [...new Set(letters.map(l => l.status || l.status_name || 'ARCHIVED'))].sort();

    const months = [
        { val: "1", label: "January" }, { val: "2", label: "February" }, { val: "3", label: "March" },
        { val: "4", label: "April" }, { val: "5", label: "May" }, { val: "6", label: "June" },
        { val: "7", label: "July" }, { val: "8", label: "August" }, { val: "9", label: "September" },
        { val: "10", label: "October" }, { val: "11", label: "November" }, { val: "12", label: "December" }
    ];

    const resetFilters = () => {
        setSearchTerm("");
        setFilterMonth("");
        setFilterYear("");
        setFilterStatus("");
        setCurrentPage(1);
    };

    const handleTrackOpen = (letter) => {
        setSelectedLetter(letter);
        setIsTrackDrawerOpen(true);
    };

    const handleViewPDF = (letter) => {
        const path = letter.file_name || letter.attachment_path || letter.scanned_copy;
        if (!path) {
            alert("This document does not have an attached PDF file.");
            return;
        }

        const fullPath = path.startsWith('http') ? path : `http://172.18.162.84/${path}`;
        setSelectedPdfUrl(fullPath);
        setIsPdfDrawerOpen(true);
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Previous System Records</span>
                            <h1 className={`text-xl font-bold tracking-tighter uppercase font-outfit ${textColor}`}>Archived Documents</h1>
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

                            {canSearch && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                                        className={`pl-4 pr-10 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em] ${cardBg}`}
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                    >
                                        <option value="">All Months</option>
                                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                                    </select>

                                    <select
                                        value={filterYear}
                                        onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                                        className={`pl-4 pr-10 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em] ${cardBg}`}
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                    >
                                        <option value="">All Years</option>
                                        {uniqueYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                    </select>

                                    <select
                                        value={filterStatus}
                                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                        className={`pl-4 pr-10 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em] ${cardBg}`}
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                                    >
                                        <option value="">All Statuses</option>
                                        {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>

                                    <div className="relative group min-w-[250px]">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search reference, sender..."
                                            value={searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                            className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-orange-500/20 outline-none ${cardBg}`}
                                        />
                                    </div>

                                    {(searchTerm || filterMonth || filterYear || filterStatus) && (
                                        <button onClick={resetFilters} className="p-3 text-xs font-bold text-orange-500 hover:bg-orange-50 rounded-xl transition-all uppercase tracking-widest">
                                            Reset
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Table Container */}
                        <div className={`rounded-3xl border overflow-hidden shadow-sm ${cardBg}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className={`border-b ${'border-gray-50 dark:border-[#222] bg-gray-50/50'}`}>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">ID</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Date Received</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Sender</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Letter Summary</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Final Status</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Logs</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">QR</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr><td colSpan="8" className="p-20 text-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" /></td></tr>
                                        ) : paginatedLetters.length === 0 ? (
                                            <tr><td colSpan="8" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">No matching records found</td></tr>
                                        ) : paginatedLetters.map((letter, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group">
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 ${textColor}`}>
                                                        {letter.atg_id || letter.lms_id || letter.entry_id || letter.id}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            {letter.date_rec || letter.date_received ? new Date(letter.date_rec || letter.date_received).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                        <span className="text-[10px] text-orange-500 font-bold">
                                                            {letter.date_rec || letter.date_received ? (
                                                                // Handle potential custom date formats if necessary
                                                                new Date(letter.date_rec || letter.date_received).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                                            ) : ''}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">
                                                    {letter.sender}
                                                </td>
                                                <td className="px-5 py-4 max-w-xs">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-1">{letter.letsum || letter.summary || letter.subject}</p>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-100`}>
                                                        {letter.status || letter.status_name || 'ARCHIVED'}
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
                                                            onClick={() => handlePrintQR(letter.atg_id || letter.lms_id || letter.entry_id)}
                                                            className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all border border-blue-100 dark:border-blue-900/20 shadow-sm"
                                                            title="Print QR Code"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {(letter.file_name || letter.attachment_path || letter.scanned_copy) ? (
                                                            canPdf ? (
                                                                <button onClick={() => handleViewPDF(letter)} className="p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/20 shadow-sm"><FileText className="w-3.5 h-3.5" /></button>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )
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

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="flex flex-col items-center gap-4 py-8 pb-12">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLetters.length)} of {filteredLetters.length} entries
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className={`p-2 rounded-lg border transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-300' : 'hover:bg-orange-500 hover:text-white text-slate-600 border-gray-200 bg-white'}`}
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-180" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) pageNum = i + 1;
                                            else if (currentPage <= 3) pageNum = i + 1;
                                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                            else pageNum = currentPage - 2 + i;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg' : 'hover:bg-gray-100 text-slate-600 border border-gray-100 bg-white'}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className={`p-2 rounded-lg border transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-300' : 'hover:bg-orange-500 hover:text-white text-slate-600 border-gray-200 bg-white'}`}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* PDF VIEWER DRAWER (LEFT SIDE) */}
            {isPdfDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-start">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPdfDrawerOpen(false)} />
                    <div className={`w-full max-w-4xl ${cardBg} h-full relative z-10 animate-in slide-in-from-left duration-500 flex flex-col border-r shadow-2xl`}>
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h2 className={`text-md font-bold uppercase tracking-tight ${textColor}`}>Document Preview</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.open(selectedPdfUrl, '_blank')}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all font-bold text-[10px] uppercase flex items-center gap-1"
                                >
                                    <Printer className="w-4 h-4" /> Open Original
                                </button>
                                <button onClick={() => setIsPdfDrawerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400">
                                    <ChevronRight className="w-6 h-6 rotate-180" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-black overflow-hidden relative">
                            <iframe
                                src={selectedPdfUrl}
                                className="w-full h-full border-none"
                                title="PDF Document Viewer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TRACK DRAWER (RIGHT SIDE) */}
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
                                        <h2 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>Document History</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedLetter.atg_id || selectedLetter.lms_id || selectedLetter.entry_id || selectedLetter.id}</p>
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
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Entry Registered</p>
                                            <h4 className={`text-sm font-bold mt-1 ${textColor}`}>Saved by {selectedLetter.encoder || selectedLetter.encoder_name || 'Legacy User'}</h4>
                                            <p className="text-xs text-gray-500 mt-2 line-clamp-3">{selectedLetter.letsum || selectedLetter.summary || selectedLetter.subject}</p>
                                            <p className="text-[9px] font-black text-gray-400 uppercase mt-2">{selectedLetter.date_rec || selectedLetter.date_received ? new Date(selectedLetter.date_rec || selectedLetter.date_received).toLocaleString() : 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Map legacy logs if available */}
                                    {(selectedLetter.comments || selectedLetter.logs)?.map((log, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-9 w-6 h-6 rounded-full border-4 border-white dark:border-[#141414] shadow-sm z-10 bg-indigo-500`} />
                                            <div>
                                                <p className={`text-[10px] font-black uppercase tracking-widest text-indigo-500`}>
                                                    {log.action_type || log.type || 'Comment'}
                                                </p>
                                                <h4 className={`text-sm font-bold mt-1 ${textColor}`}>{log.content || log.log_details || log.action_taken}</h4>
                                                <p className="text-[9px] font-black text-gray-400 uppercase mt-2">{log.date_sent || log.timestamp ? new Date(log.date_sent || log.timestamp).toLocaleString() : ''}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Final Status */}
                                    <div className="relative pt-4">
                                        <div className="absolute -left-9 w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 border-4 border-white dark:border-[#141414] shadow-sm z-10" />
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Final Outcome</p>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white`}>
                                                {selectedLetter.status || selectedLetter.status_name || 'ARCHIVED'}
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
