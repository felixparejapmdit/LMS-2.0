
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
import {
    Search,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Shield,
    Monitor,
    Globe,
    Clock,
    User as UserIcon,
    RefreshCw,
    Menu
} from "lucide-react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AuditLogs() {
    const { user } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222] shadow-sm' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';
    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222] shadow-sm';

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/audit-logs`, {
                params: { page, limit, search }
            });
            setLogs(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error("Failed to fetch audit logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchLogs();
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const getBrowserIcon = (browser) => {
        const colors = {
            'Chrome': 'text-green-500 bg-green-50 dark:bg-green-900/10',
            'Firefox': 'text-orange-500 bg-orange-50 dark:bg-orange-900/10',
            'Safari': 'text-blue-500 bg-blue-50 dark:bg-blue-900/10',
            'Edge': 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/10',
            'Opera': 'text-red-500 bg-red-50 dark:bg-red-900/10',
        };
        return colors[browser] || 'text-gray-500 bg-gray-50 dark:bg-gray-900/10';
    };

    return (
        <div className={`flex h-screen ${pageBg} overflow-hidden font-sans`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className={`h-16 ${headerBg} border-b px-4 md:px-8 flex items-center justify-between z-10 transition-colors duration-300`}>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden"><Menu className="w-5 h-5" /></button>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Security</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Audit Logs</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchLogs}
                            className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-500 border border-slate-100 dark:border-white/5"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="space-y-6">

                        {/* Search & Stats Bar */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, IP, browser..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 ${cardBg} border rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/20 transition-all ${textColor}`}
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {total} total records
                                </span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className={`rounded-3xl border overflow-hidden ${cardBg}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead>
                                        <tr className="border-b border-gray-50 dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.02]">
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-12 text-center">#</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Date & Time</div>
                                            </th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                <div className="flex items-center gap-1.5"><UserIcon className="w-3 h-3" /> Name</div>
                                            </th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                <div className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> IP Address</div>
                                            </th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Browser</th>
                                            <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                <div className="flex items-center gap-1.5"><Monitor className="w-3 h-3" /> Device / OS</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr><td colSpan="6" className="p-20 text-center"><Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto" /></td></tr>
                                        ) : logs.length === 0 ? (
                                            <tr><td colSpan="6" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">No audit logs found</td></tr>
                                        ) : logs.map((log, index) => (
                                            <tr key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-5 py-4 text-center text-[10px] font-bold text-gray-400">{(page - 1) * limit + index + 1}</td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[10px] text-violet-500 font-bold">
                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/10 rounded-lg flex items-center justify-center text-violet-500">
                                                            <UserIcon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-800 dark:text-white uppercase">{log.user_name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/10">
                                                        {log.ip_address || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${getBrowserIcon(log.browser)}`}>
                                                        {log.browser || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{log.device_os || '—'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className={`flex items-center justify-between ${cardBg} border p-4 rounded-2xl`}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#737373]">
                                Showing {logs.length} / {total} Records
                            </span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${page === 1 ? 'opacity-30 cursor-not-allowed text-gray-400' : 'bg-gray-100 dark:bg-white/5 text-[#1A1A1B] dark:text-white hover:bg-[#1A1A1B] hover:text-white cursor-pointer'}`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded flex items-center justify-center bg-[#1A1A1B] dark:bg-white text-white dark:text-[#1A1A1B] text-[10px] font-black">{page}</span>
                                    <span className="text-[10px] font-black text-[#737373] uppercase tracking-widest mx-1">of</span>
                                    <span className="text-[10px] font-black text-[#1A1A1B] dark:text-white">{totalPages}</span>
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${page === totalPages ? 'opacity-30 cursor-not-allowed text-gray-400' : 'bg-gray-100 dark:bg-white/5 text-[#1A1A1B] dark:text-white hover:bg-[#1A1A1B] hover:text-white cursor-pointer'}`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
