
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
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
    Send
} from "lucide-react";

export default function LetterEndorsement() {
    const navigate = useNavigate();
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const [endorsements, setEndorsements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const printRef = useRef(null);

    const fetchEndorsements = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const roleName = user?.roleData?.name || user?.role || '';
            const deptId = user?.dept_id?.id || user?.dept_id || '';

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements`, {
                params: {
                    user_id: user.id,
                    department_id: deptId,
                    role: roleName
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
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this endorsement record?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/${id}`);
            fetchEndorsements();
        } catch (e) {
            alert("Delete failed.");
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

    const filtered = endorsements.filter(e =>
        e.endorsed_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.letter?.lms_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.letter?.sender?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by endorsed_to name
    const grouped = filtered.reduce((acc, e) => {
        const key = e.endorsed_to;
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {});

    // Theme Variables
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className={`h-16 ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]'} border-b px-4 md:px-8 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden">
                            <Menu className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2 rounded-xl transition-colors ${'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Bell className={`w-4 h-4 ${'text-orange-500'}`} />
                            <h1 className={`text-[10px] font-black uppercase tracking-[0.2em] ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-gray-400'}`}>
                                Letter Endorsements
                            </h1>
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[9px] font-black rounded-full">
                                {endorsements.length}
                            </span>
                        </div>
                    </div>
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
                                                                <button
                                                                    onClick={() => handlePrint(e)}
                                                                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-100 dark:border-blue-900/20 transition-all shadow-sm"
                                                                    title="Print"
                                                                >
                                                                    <Printer className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate(`/letter/${e.letter_id}`)}
                                                                    className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/10 transition-all"
                                                                    title="View Letter"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(e.id)}
                                                                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 dark:border-red-900/20 transition-all"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
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
