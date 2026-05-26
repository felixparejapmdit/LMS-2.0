import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";
import {
    Trash2,
    RefreshCw,
    Loader2,
    RotateCcw,
    XCircle,
    Info,
    Inbox,
    Search,
    ChevronLeft,
    ChevronRight,
    AlertTriangle
} from "lucide-react";
import letterService from "../../services/letterService";

export default function Trash() {
    const access = useAccess();
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500 text-[10px] font-black uppercase tracking-widest">Error: AuthContext not found</div>;

    const { user, layoutStyle, setIsMobileMenuOpen } = context;
    const canField = access?.canField || (() => true);
    const canRestore = canField("trash", "restore_button");
    const canPurge = canField("trash", "purge_button");

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [error, setError] = useState("");
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, title: '', message: '', isLoading: false });

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);
        try {
            const params = {
                is_deleted: true,
                page: currentPage,
                limit: 10,
                search: searchTerm,
                user_id: user?.id,
                role: user?.roleData?.name || user?.role || ''
            };
            const response = await letterService.getAll(params);
            setLetters(Array.isArray(response.data) ? response.data : []);
            setTotalPages(response.totalPages || 1);
            setTotalRecords(response.total || 0);
        } catch (error) {
            console.error("Fetch Trash failed", error);
            setError("Failed to fetch deleted letters.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentPage, searchTerm]);

    const executeAction = async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
            if (confirmDialog.type === 'restore') {
                await letterService.restore(confirmDialog.id);
            } else if (confirmDialog.type === 'delete_permanent') {
                await letterService.deletePermanent(confirmDialog.id);
            } else if (confirmDialog.type === 'empty') {
                const ids = letters.map(l => l.id);
                const result = await letterService.bulkDeletePermanent(ids);
                if (Array.isArray(result?.failed) && result.failed.length > 0) {
                    const failedIds = result.failed.map(x => x.id).filter(Boolean);
                    alert(`Some items could not be deleted right now (IDs: ${failedIds.join(', ')}). Please try again.`);
                }
            }
            fetchData();
        } catch (err) {
            console.error("Action failed:", err);
            alert("Action failed. Please try again.");
        } finally {
            setConfirmDialog({ isOpen: false, type: '', id: null, title: '', message: '', isLoading: false });
        }
    };

    const handleRestore = (id) => {
        setConfirmDialog({ isOpen: true, type: 'restore', id, title: 'Restore Letter', message: 'Are you sure you want to restore this letter to the Master Table? It will be removed from the Trash.' });
    };

    const handleDeletePermanent = (id) => {
        setConfirmDialog({ isOpen: true, type: 'delete_permanent', id, title: 'Permanently Delete Letter', message: 'Are you sure you want to PERMANENTLY delete this letter? This action cannot be undone and all associated data will be lost.' });
    };

    const handleEmptyTrash = () => {
        setConfirmDialog({ isOpen: true, type: 'empty', id: null, title: 'Empty Trash', message: 'Are you sure you want to permanently delete ALL items currently in the trash? This action is IRREVERSIBLE.' });
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-500" />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Management</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Trash Bin</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search deleted..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-[#333] rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-500/20 w-64 uppercase tracking-widest"
                            />
                        </div>
                        <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>
                        {letters.length > 0 && canPurge && (
                            <button onClick={handleEmptyTrash} className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest"><XCircle className="w-3 h-3" /> Empty Trash</button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="w-full space-y-6">
                        {/* Auto-delete Info Alert */}
                        <div className="flex items-start gap-4 p-5 bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl shadow-sm">
                            <Info className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-black text-red-800 dark:text-red-400 uppercase tracking-widest">30-Day Retention Policy</h3>
                                <p className="text-[10px] font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-widest leading-relaxed">
                                    Items in the Trash will be permanently deleted after 30 days. Please restore any required documents before they are automatically purged.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-10 h-10 text-red-500 animate-spin" /></div>
                        ) : letters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-40">
                                <Inbox className="w-20 h-20 text-slate-300" />
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Trash is empty</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`${cardBg} rounded-[2rem] border overflow-hidden shadow-sm`}>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-[#222] bg-slate-50/50 dark:bg-white/[0.02]">
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Letter Details</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Deleted At</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                            {letters.map((letter) => (
                                                <tr key={letter.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group">
                                                    <td className="p-6">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{letter.lms_id}</span>
                                                            <span className={`text-xs font-bold ${textColor}`}>{letter.sender || "No Sender"}</span>
                                                            <p className="text-[10px] text-gray-400 font-medium line-clamp-1 italic max-w-md">{letter.summary}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                                {new Date(letter.deleted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                                {new Date(letter.deleted_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canRestore && (
                                                                <button 
                                                                    onClick={() => handleRestore(letter.id)}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 dark:border-emerald-500/20"
                                                                >
                                                                    <RotateCcw className="w-3 h-3" /> Restore
                                                                </button>
                                                            )}
                                                            {canPurge && (
                                                                <button 
                                                                    onClick={() => handleDeletePermanent(letter.id)}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100 dark:border-red-500/20"
                                                                >
                                                                    <XCircle className="w-3 h-3" /> Purge
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Showing {letters.length} of {totalRecords} Deleted Items
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="p-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-[#333] rounded-xl text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <span className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg text-[10px] font-black">{currentPage}</span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase px-1">of</span>
                                            <span className="text-[10px] font-black text-slate-500">{totalPages}</span>
                                        </div>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="p-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-[#333] rounded-xl text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Custom Confirmation Modal */}
            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`${cardBg} rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-[#222] overflow-hidden animate-in zoom-in-95 duration-200`}>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full ${confirmDialog.type === 'restore' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'}`}>
                                    {confirmDialog.type === 'restore' ? <RotateCcw className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                </div>
                                <h3 className={`text-lg font-black uppercase tracking-tight ${textColor}`}>
                                    {confirmDialog.title}
                                </h3>
                            </div>
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 leading-relaxed mb-8 uppercase tracking-widest">
                                {confirmDialog.message}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmDialog({ isOpen: false, type: '', id: null, title: '', message: '', isLoading: false })}
                                    disabled={confirmDialog.isLoading}
                                    className="px-5 py-2.5 text-xs font-black text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 rounded-xl transition-colors uppercase tracking-widest disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeAction}
                                    disabled={confirmDialog.isLoading}
                                    className={`px-5 py-2.5 flex items-center gap-2 text-xs font-black text-white rounded-xl transition-all shadow-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed ${
                                        confirmDialog.type === 'restore' 
                                            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                                            : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                    }`}
                                >
                                    {confirmDialog.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {confirmDialog.type === 'restore' ? 'Yes, Restore' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
