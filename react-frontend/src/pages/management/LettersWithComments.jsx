
import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    Loader2,
    Search,
    FileText,
    MessageSquare,
    Calendar,
    Clock,
    RefreshCw,
    CheckCircle2,
    FileSearch,
    Eye
} from "lucide-react";
import letterService from "../../services/letterService";
import axios from "axios";

export default function LettersWithComments() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("signature"); // "signature" or "review"

    const textColor = 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await letterService.getAll();
            // Filter only letters that have comments
            const lettersWithComments = (Array.isArray(data) ? data : []).filter(l => l.comments && l.comments.length > 0);
            setLetters(lettersWithComments);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getLatestStep = (letter) => {
        if (!letter.assignments || letter.assignments.length === 0) return "N/A";
        const sorted = [...letter.assignments].sort((a, b) => b.id - a.id);
        return sorted[0].step?.step_name || "N/A";
    };

    const filteredLetters = letters.filter(l => {
        const step = getLatestStep(l).toLowerCase();
        const matchesTab = activeTab === "signature"
            ? step.includes("signature")
            : step.includes("review");

        const matchesSearch =
            l.lms_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.summary?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesTab && matchesSearch;
    });

    const handleViewPDF = (letter) => {
        if (!letter.scanned_copy && !letter.attachment_id) return;
        const url = letter.scanned_copy
            ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view-path?path=${btoa(letter.scanned_copy)}`
            : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view/${letter.attachment_id}`;
        window.open(url, '_blank');
    };

    return (
        <div className={`min-h-screen ${pageBg} flex font-sans transition-colors duration-300`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className={`h-20 ${cardBg} border-b px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <RefreshCw className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex flex-col">

                            <h1 className={`text-xl font-black uppercase tracking-tighter ${textColor}`}>Letters with Comment</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => fetchData(true)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
                    <div className="w-full space-y-6">
                        {/* Tabs & Search */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
                                <button
                                    onClick={() => setActiveTab("signature")}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "signature"
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        }`}
                                >
                                    For Signature
                                </button>
                                <button
                                    onClick={() => setActiveTab("review")}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "review"
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        }`}
                                >
                                    For Review
                                </button>
                            </div>

                            <div className="relative group min-w-[350px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter commented records..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border text-sm transition-all focus:ring-2 focus:ring-orange-500/20 outline-none ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}
                                />
                            </div>
                        </div>

                        {/* List View Table */}
                        <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${cardBg}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className={`border-b ${'border-gray-50 dark:border-[#222] bg-gray-50/50 dark:bg-white/5'}`}>
                                            <th className="p-6 w-20 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">PDF</th>
                                            <th className="p-6 w-48 text-[10px] font-black uppercase tracking-widest text-gray-400">LMS_ID</th>
                                            <th className="p-6 w-56 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Received</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Comment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="4" className="p-20 text-center">
                                                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Retrieving Records...</p>
                                                </td>
                                            </tr>
                                        ) : filteredLetters.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-20 text-center">
                                                    <FileSearch className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">No {activeTab} letters with comments found</p>
                                                </td>
                                            </tr>
                                        ) : filteredLetters.map((letter) => (
                                            <tr key={letter.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-6 text-center">
                                                    {(letter.scanned_copy || letter.attachment_id) ? (
                                                        <button
                                                            onClick={() => handleViewPDF(letter)}
                                                            className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all mx-auto shadow-sm"
                                                        >
                                                            <FileText className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-200">-</span>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[11px] font-black tracking-tighter ${textColor}`}>{letter.lms_id || 'PENDING'}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[150px]">{letter.sender}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                            <Calendar className="w-3.5 h-3.5 text-orange-500" />
                                                            {new Date(letter.date_received || letter.createdAt).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {new Date(letter.date_received || letter.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="space-y-2">
                                                        {letter.comments.slice(0, 1).map((comment) => (
                                                            <div key={comment.id} className="group/comment relative">
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-2 italic">
                                                                    "{comment.comment_body}"
                                                                </p>
                                                                <div className="mt-1 flex items-center gap-2">
                                                                    <div className="w-1 h-1 rounded-full bg-orange-500" />
                                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Latest Directive</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {letter.comments.length > 1 && (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/10 text-orange-500 text-[8px] font-black uppercase tracking-widest">
                                                                + {letter.comments.length - 1} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary Footer */}
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-6">
                            <span>Showing {filteredLetters.length} commented records</span>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

