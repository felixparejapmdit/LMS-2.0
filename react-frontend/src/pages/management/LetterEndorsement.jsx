import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";
import axios from "axios";
import {
    ArrowLeft,
    Bell,
    Printer,
    Trash2,
    Loader2,
    FileText,
    User,
    Search,
    RefreshCw,
    ChevronRight,
    Inbox,
    Menu,
    Send,
    MessageSquare
} from "lucide-react";

export default function LetterEndorsement() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const { canField } = useAccess();
    const [endorsements, setEndorsements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const printRef = useRef(null);
    const canSearch = canField("endorsements", "search");
    const canPrint = canField("endorsements", "print_button");
    const canDelete = canField("endorsements", "delete_button");
    const canView = canField("endorsements", "view_button");
    const canRefresh = canField("endorsements", "refresh_button");
    const [notifiedIds, setNotifiedIds] = useState(new Set());
    const [notifyingId, setNotifyingId] = useState(null);

    const fetchEndorsements = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const roleName = user?.roleData?.name || user?.role || '';
            const deptId = user?.dept_id?.id || user?.dept_id || '';
            const mineOnly = searchParams.get('mine') === '1';
            const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements`, {
                params: {
                    user_id: user.id,
                    department_id: deptId,
                    role: roleName,
                    mine: mineOnly ? 'true' : 'false',
                    full_name: fullName
                }
            });
            setEndorsements(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error("Failed to fetch endorsements:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEndorsements();
    }, [user?.id, searchParams.toString()]);

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this endorsement record?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/${id}`);
            fetchEndorsements();
        } catch (e) {
            alert("Delete failed.");
        }
    };

    const handleNotifyTelegram = async (endorsement) => {
        if (notifyingId) return;
        setNotifyingId(endorsement.id);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/notify-telegram`, {
                endorsement_id: endorsement.id,
                chat_id: endorsement.telegram_info?.chat_id
            });
            setNotifiedIds(prev => new Set([...prev, endorsement.id]));
        } catch (e) {
            console.error("Notification failed:", e);
        } finally {
            setNotifyingId(null);
        }
    };

    const handlePrint = (endorsement) => {
        const letter = endorsement.letter;
        const printWindow = window.open("", "_blank", "width=900,height=700");
        printWindow.document.write(`
            <html>
            <head>
                <title>Letter Endorsement - ${letter?.lms_id || ""}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 40px; color: #111; }
                    .header { border-bottom: 3px solid #f6a17b; padding-bottom: 20px; margin-bottom: 30px; }
                    .label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #999; font-weight: bold; margin-bottom: 4px; }
                    .value { font-size: 14px; font-weight: bold; color: #111; margin-bottom: 18px; }
                    .box { border: 1px solid #eee; border-radius: 16px; padding: 24px; margin-bottom: 24px; background: #fafafa; }
                    h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #111; }
                    .endorsed-tag { background: #f6a17b; color: white; font-size: 10px; padding: 4px 12px; border-radius: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; display: inline-block; margin-bottom: 16px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Letter Endorsement</h1>
                    <div class="endorsed-tag">Endorsed To: ${endorsement.endorsed_to}</div>
                </div>
                <div class="box">
                    <div class="label">LMS ID</div>
                    <div class="value">${letter?.lms_id || "—"}</div>
                    <div class="label">Sender / Origin</div>
                    <div class="value">${letter?.sender || "—"}</div>
                    <div class="label">Letter Summary</div>
                    <div class="value" style="white-space:pre-wrap;font-weight:normal;">${letter?.summary || "—"}</div>
                    <div class="label">Letter Kind</div>
                    <div class="value">${letter?.letterKind?.kind_name || "Standard"}</div>
                </div>
                <div class="box">
                    <div class="label">Endorsed To</div>
                    <div class="value">${endorsement.endorsed_to}</div>
                    <div class="label">Endorsed On</div>
                    <div class="value">${new Date(endorsement.endorsed_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: true })}</div>
                    ${endorsement.notes ? `<div class="label">Notes</div><div class="value" style="white-space:pre-wrap;font-weight:normal;">${endorsement.notes}</div>` : ""}
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filtered = endorsements.filter(e => {
        if (!canSearch) return true;
        return (
            e.endorsed_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.letter?.lms_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.letter?.sender?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Group by endorsed_to name
    const grouped = filtered.reduce((acc, e) => {
        const key = e.endorsed_to;
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {});

    // Theme Variables
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222] shadow-sm' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';
    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className={`h-16 ${headerBg} border-b px-4 md:px-12 flex items-center justify-between sticky top-0 z-30 shrink-0 transition-colors duration-500`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-400 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management</span>
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[8px] font-black rounded-lg">
                                    {endorsements.length}
                                </span>
                            </div>
                            <h1 className={`text-xl font-black tracking-tighter uppercase font-outfit ${textColor}`}>Endorsements</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {canRefresh && <button onClick={() => fetchEndorsements()} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>}
                    </div>
                    {canSearch && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Search endorsements..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`pl-9 pr-4 py-2 text-xs rounded-xl border outline-none w-56 ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-200'}`}
                            />
                        </div>
                    )}
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading endorsements...</p>
                        </div>
                    ) : endorsements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/10 rounded-full flex items-center justify-center">
                                <Bell className="w-10 h-10 text-orange-200 dark:text-orange-900" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Endorsements Yet</p>
                            <p className="text-xs text-gray-400">Assign letters to people from the Master Table to see them here.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(grouped).map(([personName, items]) => (
                                <div key={personName}>
                                    {/* Group header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">{personName}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{items.length} letter{items.length !== 1 ? 's' : ''} endorsed</p>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className={`${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'} rounded-2xl border shadow-sm overflow-hidden`}>
                                        <table className="w-full">
                                            <thead>
                                                <tr className={`${'border-gray-50 dark:border-[#222] bg-gray-50 dark:bg-white/5'} border-b`}>
                                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">LMS ID</th>
                                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Sender</th>
                                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3 hidden md:table-cell">Letter Summary</th>
                                                    <th className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3 hidden md:table-cell">Endorsed On</th>
                                                    <th className="text-right text-[9px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${'divide-gray-50 dark:divide-[#222]'}`}>
                                                {items.map(e => (
                                                    <tr key={e.id} className={`transition-colors ${'hover:bg-gray-50/50 dark:hover:bg-white/5'}`}>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-xs font-black uppercase tracking-widest ${'text-orange-600'}`}>
                                                                {e.letter?.lms_id || `#${e.letter_id}`}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className={`text-xs font-bold ${'text-gray-900 dark:text-white'}`}>
                                                                {e.letter?.sender || "—"}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 hidden md:table-cell max-w-xs">
                                                            <p className="text-xs text-gray-500 font-medium line-clamp-2">
                                                                {e.letter?.summary || "—"}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 hidden md:table-cell">
                                                            <p className="text-[10px] text-gray-400 font-bold">
                                                                {new Date(e.endorsed_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {e.telegram_info?.has_telegram && (
                                                                    <button
                                                                        onClick={() => handleNotifyTelegram(e)}
                                                                        disabled={notifyingId === e.id}
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                                                                            notifiedIds.has(e.id)
                                                                                ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-100 dark:border-emerald-900/20 hover:bg-emerald-500 hover:text-white"
                                                                                : "bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-100 dark:border-indigo-900/20 hover:bg-indigo-500 hover:text-white"
                                                                        }`}
                                                                        title={notifiedIds.has(e.id) ? "Resend Notification" : "Notify via Telegram"}
                                                                    >
                                                                        {notifyingId === e.id ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                                        )}
                                                                        <span className="hidden sm:inline">
                                                                            {notifiedIds.has(e.id) ? "Resend Notification" : "Notify via Telegram"}
                                                                        </span>
                                                                    </button>
                                                                )}
                                                                {canPrint && (
                                                                    <button
                                                                        onClick={() => handlePrint(e)}
                                                                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-100 dark:border-blue-900/20 transition-all shadow-sm"
                                                                        title="Print"
                                                                    >
                                                                        <Printer className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                {canView && (
                                                                    <button
                                                                        onClick={() => navigate(`/letter/${e.letter_id}`)}
                                                                        className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/10 transition-all"
                                                                        title="View Letter"
                                                                    >
                                                                        <FileText className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                {canDelete && (
                                                                    <button
                                                                        onClick={() => handleDelete(e.id)}
                                                                        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 dark:border-red-900/20 transition-all"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
