import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";
import {
    Paperclip,
    Plus,
    Loader2,
    RefreshCw,
    MoreVertical,
    LayoutGrid,
    List,
    Menu,
    X,
    Edit2,
    Trash2,
} from "lucide-react";
import attachmentService from "../../services/attachmentService";

export default function Attachments() {
    const access = useAccess();
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500">Error: AuthContext not found</div>;

    const { layoutStyle, setIsMobileMenuOpen } = context;
    const canField = access?.canField || (() => true);
    const canAdd = canField("attachments", "add_button");
    const canEdit = canField("attachments", "edit_button");
    const canDelete = canField("attachments", "delete_button");
    const canSave = canField("attachments", "save_button");
    const canRefresh = canField("attachments", "refresh_button");
    const canViewToggle = canField("attachments", "view_toggle");
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null);

    const [formData, setFormData] = useState({
        attachment_name: "",
        description: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await attachmentService.getAll();
            setAttachments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch failed", error);
            setError("Failed to fetch data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            if (modalMode === 'create') {
                await attachmentService.create(formData);
            } else {
                await attachmentService.update(selectedAttachment.id, formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("CRUD Error:", err);
            setError("Failed to save attachment.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this attachment type?")) return;
        try {
            await attachmentService.delete(id);
            fetchData();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed.");
        }
    };

    const openCreateModal = () => {
        if (!canAdd) return;
        setModalMode("create");
        setFormData({ attachment_name: "", description: "" });
        setSelectedAttachment(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        if (!canEdit) return;
        setModalMode("edit");
        setFormData({
            attachment_name: item.attachment_name || "",
            description: item.description || ""
        });
        setSelectedAttachment(item);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const renderCard = (item) => (
        <div key={item.id} className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl flex items-center justify-between'} border shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all group cursor-pointer`}>
            <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 overflow-hidden flex-1"}>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                    <Paperclip className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 relative">
                        <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{item.attachment_name}</h3>
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(isMenuOpen === item.id ? null : item.id); }} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {isMenuOpen === item.id && (
                                <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1">
                                    {canEdit && <button onClick={() => openEditModal(item)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"><Edit2 className="w-3 h-3" /> Edit</button>}
                                    {canDelete && <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3 h-3" /> Delete</button>}
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium line-clamp-1">{item.description || 'No description'}</p>
                </div>
            </div>
            {viewMode === 'list' && (
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        {canEdit && <button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-emerald-500"><Edit2 className="w-4 h-4" /></button>}
                        {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <Paperclip className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Paperclip className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-emerald-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Management</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Attachments</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {canRefresh && <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>}
                        {canAdd && <button onClick={openCreateModal} className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"><Plus className="w-3 h-3" /> Add Attachment</button>}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                            <div>
                                <h2 className={`text-3xl font-bold ${textColor}`}>Attachments</h2>
                                <p className="text-gray-500 mt-2">Manage physical attachment types (e.g., USB, Photo, etc.)</p>
                            </div>
                            {canViewToggle && (
                                <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1 rounded-2xl border border-gray-100 dark:border-[#222]">
                                    <button onClick={() => setViewMode("grid")} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><LayoutGrid className="w-4 h-4" /></button>
                                    <button onClick={() => setViewMode("list")} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" : "space-y-4"}>
                                {attachments.map(renderCard)}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-md rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Create Attachment' : 'Edit Attachment'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="text-red-500">{error}</div>}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Attachment Name (e.g., USB, Photo)</label>
                                    <input type="text" required value={formData.attachment_name} onChange={e => setFormData({ ...formData, attachment_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" rows={3}></textarea>
                                </div>
                                <div className="pt-4">
                                    {canSave && <button disabled={submitting} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Attachment Type"}</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
