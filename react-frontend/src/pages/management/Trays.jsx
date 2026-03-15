
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { directus } from "../../hooks/useDirectus";
import { readItems } from "@directus/sdk";
import { useAuth } from "../../context/AuthContext";
import {
    Box as TrayIcon,
    Plus,
    Loader2,
    RefreshCw,
    MoreVertical,
    FileText,
    ChevronRight,
    LayoutGrid,
    List,
    Archive,
    Menu,
    X,
    Edit2,
    Trash2,
    AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import trayService from "../../services/trayService";
import useAccess from "../../hooks/useAccess";

export default function Trays() {
    const access = useAccess();
    const context = useAuth();
    const navigate = useNavigate();

    // Safety check for context
    if (!context) {
        return <div className="p-20 text-red-500">Error: AuthContext not found</div>;
    }

    const { user, layoutStyle, setIsMobileMenuOpen } = context;
    const canField = access?.canField || (() => true);
    const canAdd = canField("trays", "add_button");
    const canEdit = canField("trays", "edit_button");
    const canDelete = canField("trays", "delete_button");
    const canSave = canField("trays", "save_button");
    const canRefresh = canField("trays", "refresh_button");
    const canViewToggle = canField("trays", "view_toggle");
    const canNavigate = canField("trays", "navigate_button");
    const [trays, setTrays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
    const [selectedTray, setSelectedTray] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null); // id of tray with open menu

    const [formData, setFormData] = useState({
        tray_no: "",
        description: "",
        capacity: 100
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchTrays = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            console.log("Trays: Fetching data via TrayService...");
            const data = await trayService.getAllTrays();
            console.log("Trays: Data received", data);
            setTrays(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Trays: Fetch failed", error);
            // Fallback to direct directus if backend fails or for demo
            try {
                const directData = await directus.request(readItems("trays", { fields: ["*", "letters.*"] }));
                setTrays(directData);
            } catch (fallbackError) {
                setTrays([
                    { id: 1, tray_no: "A-101", description: "Incoming Processing", capacity: 50, letters: [] },
                    { id: 2, tray_no: "B-202", description: "Outgoing Dispatch", capacity: 30, letters: [] },
                    { id: 3, tray_no: "C-303", description: "Departmental Archive", capacity: 100, letters: [] },
                ]);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTrays();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            if (modalMode === 'create') {
                await trayService.createTray(formData);
            } else {
                await trayService.updateTray(selectedTray.id, formData);
            }
            setIsModalOpen(false);
            setFormData({ tray_no: "", description: "", capacity: 100 });
            fetchTrays();
        } catch (err) {
            console.error("CRUD Error:", err);
            setError("Failed to save tray via TrayService.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this tray?")) return;
        try {
            await trayService.deleteTray(id);
            fetchTrays();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed via TrayService.");
        }
    };

    const openCreateModal = () => {
        if (!canAdd) return;
        setModalMode("create");
        setFormData({ tray_no: "", description: "", capacity: 100 });
        setSelectedTray(null);
        setIsModalOpen(true);
    };

    const openEditModal = (tray) => {
        if (!canEdit) return;
        setModalMode("edit");
        setFormData({
            tray_no: tray.tray_no,
            description: tray.description,
            capacity: tray.capacity
        });
        setSelectedTray(tray);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <TrayIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <TrayIcon className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-orange-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Workspace</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Trays</h2>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {canRefresh && (
                            <button
                                onClick={() => fetchTrays(true)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                        {canAdd && (
                            <button
                                onClick={openCreateModal}
                                className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest"
                            >
                                <Plus className="w-3 h-3" />
                                New
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                            <div>
                                <h2 className={`text-3xl font-bold ${textColor}`}>Trays</h2>
                                <p className="text-gray-500 mt-2">Manage storage.</p>
                            </div>

                            {canViewToggle && (
                                <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm font-sans">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4">
                                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Loading...</p>
                            </div>
                        ) : trays.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4 text-center bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222]">
                                <TrayIcon className="w-16 h-16 text-slate-100 dark:text-[#222]" />
                                <h3 className="text-lg font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">No trays</h3>
                                <p className="text-sm text-slate-400 max-w-xs">Add a tray to get started.</p>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" : "space-y-4"}>
                                {trays.map((tray) => {
                                    const count = tray.letters?.length || 0;
                                    const capacity = tray.capacity || 100;
                                    const percent = Math.min(Math.round((count / capacity) * 100), 100);

                                    return (
                                        <div
                                            key={tray.id}
                                            className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl flex items-center justify-between'} border shadow-sm hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-900/40 transition-all group cursor-pointer`}
                                        >
                                            <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 overflow-hidden flex-1"}>
                                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/10 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform shrink-0">
                                                    <Archive className="w-6 h-6" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1 relative">
                                                        <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{tray.tray_no || 'TRAY'}</h3>
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsMenuOpen(isMenuOpen === tray.id ? null : tray.id);
                                                                }}
                                                                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                            >
                                                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                                            </button>

                                                            {isMenuOpen === tray.id && (
                                                                <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1">
                                                                    {canEdit && <button
                                                                        onClick={() => openEditModal(tray)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                        Edit
                                                                    </button>}
                                                                    {canDelete && <button
                                                                        onClick={() => handleDelete(tray.id)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                        Delete
                                                                    </button>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium line-clamp-1">{tray.description || 'General storage bin'}</p>
                                                </div>

                                                {viewMode === 'grid' && (
                                                    <div className="pt-6 border-t border-gray-50 dark:border-[#222]">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Space</span>
                                                            <span className="text-[10px] font-black text-orange-500">{percent}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-[#222] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-orange-500 transition-all duration-1000"
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="w-3 h-3 text-gray-400" />
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{count} Files</span>
                                                            </div>
                                                            {canNavigate && <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/inbox?tray=${tray.tray_no}`);
                                                                }}
                                                                className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                Check
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {viewMode === 'list' && (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden md:block shrink-0">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity</p>
                                                        <p className={`text-sm font-black ${count >= capacity ? 'text-red-500' : 'text-orange-500'}`}>
                                                            {count} / {capacity}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {canEdit && <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(tray); }}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-blue-500"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>}
                                                        {canDelete && <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(tray.id); }}
                                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-gray-400 hover:text-red-500"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>}
                                                        {canNavigate && <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/inbox?tray=${tray.tray_no}`); }}
                                                            className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all text-gray-300 hover:text-orange-500"
                                                        >
                                                            <ChevronRight className="w-5 h-5" />
                                                        </button>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {canAdd && <button
                                    onClick={openCreateModal}
                                    className={`border-2 border-dashed border-slate-200 dark:border-[#333] ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4' : 'p-4 rounded-2xl flex items-center justify-center gap-4'} hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/5 transition-all group shadow-sm`}
                                >
                                    <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest group-hover:text-orange-500">+ New Tray</span>
                                </button>}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-md rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                {modalMode === 'create' ? 'Add' : 'Edit'}
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold uppercase border border-red-100 dark:border-red-900/20">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. A-101"
                                        value={formData.tray_no}
                                        onChange={e => setFormData({ ...formData, tray_no: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border ${'bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'} text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Purpose"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border ${'bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'} text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Capacity</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                        className={`w-full px-6 py-4 rounded-2xl border ${'bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'} text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner`}
                                    />
                                </div>

                                <div className="pt-4">
                                    {canSave && <button
                                        disabled={submitting}
                                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 group"
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                        )}
                                        {modalMode === 'create' ? 'Save' : 'Save'}
                                    </button>}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
