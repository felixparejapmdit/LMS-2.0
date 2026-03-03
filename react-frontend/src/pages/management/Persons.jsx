import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    Users as UsersIcon,
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
    UserCircle,
    MapPin,
    MessageSquare
} from "lucide-react";
import axios from "axios";

export default function Persons() {
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500">Error: AuthContext not found</div>;

    const { layoutStyle, setIsMobileMenuOpen } = context;
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        name_id: "",
        area: "",
        telegram: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const res = await axios.get("`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons");
            setPersons(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Fetch failed", error);
            setError("Failed to fetch contacts.");
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

        // Validate name format: "Lastname, Firstname"
        const nameRegex = /^[A-Za-zÀ-ÿ\s-]+,\s[A-Za-zÀ-ÿ\s-]+$/;
        if (!nameRegex.test(formData.name.trim())) {
            setError("Please enter the name in the exact format: Lastname, Firstname (e.g., Doe, John)");
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            if (modalMode === 'create') {
                await axios.post("`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons", formData);
            } else {
                await axios.put(``${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons/${selectedPerson.id}`, formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("CRUD Error:", err);
            setError("Failed to save contact.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this contact?")) return;
        try {
            await axios.delete(``${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons/${id}`);
            fetchData();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed.");
        }
    };

    const openCreateModal = () => {
        setModalMode("create");
        setFormData({ name: "", name_id: "", area: "", telegram: "" });
        setSelectedPerson(null);
        setIsModalOpen(true);
    };

    const openEditModal = (person) => {
        setModalMode("edit");
        setFormData({
            name: person.name || "",
            name_id: person.name_id || "",
            area: person.area || "",
            telegram: person.telegram || ""
        });
        setSelectedPerson(person);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const pageBg = layoutStyle === 'linear' ? 'bg-[#080808]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'linear' ? 'bg-[#080808]/80 backdrop-blur-md border-[#1a1a1a]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'linear' ? 'text-[#eee]' : 'text-slate-900 dark:text-white';

    const renderCard = (person) => {
        return (
            <div key={person.id} className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl flex items-center justify-between'} border shadow-sm hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-900/40 transition-all group cursor-pointer`}>
                <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 overflow-hidden flex-1"}>
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/10 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform shrink-0">
                            <UserCircle className="w-6 h-6" />
                        </div>
                        {viewMode === 'grid' && person.telegram && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                                <MessageSquare className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Telegram</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 relative">
                            <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{person.name}</h3>
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(isMenuOpen === person.id ? null : person.id); }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                                {isMenuOpen === person.id && (
                                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1">
                                        <button onClick={() => openEditModal(person)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"><Edit2 className="w-3 h-3" /> Edit</button>
                                        <button onClick={() => handleDelete(person.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3 h-3" /> Delete</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1">
                            <MapPin className="w-3 h-3" />
                            {person.area || "No Area"}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                            ID: {person.name_id || 'N/A'}
                        </div>
                    </div>
                </div>
                {viewMode === 'list' && (
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block shrink-0">
                            {person.telegram && (
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">TELEGRAM ID</span>
                            )}
                            <p className="text-sm font-bold text-gray-500">{person.telegram || 'User'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(person); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-orange-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-4 md:px-8 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"><Menu className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-orange-500" />
                            <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Management / Contacts</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>
                        <button onClick={openCreateModal} className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest"><Plus className="w-3 h-3" /> Add Contact</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar w-full">
                    <div className="w-full">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                            <div>
                                <h2 className={`text-3xl font-bold ${textColor}`}>Directory / Contacts</h2>
                                <p className="text-gray-500 mt-2">Manage external senders, contact IDs, and Telegram integrations.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm font-sans">
                                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><LayoutGrid className="w-4 h-4" /></button>
                                <button onClick={() => setViewMode("list")} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /><p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Loading...</p></div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                                {persons.map(renderCard)}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Add Contact' : 'Edit Contact'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="text-red-500 text-sm font-bold">{error}</div>}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">LMS / System ID</label>
                                        <input type="text" value={formData.name_id} onChange={e => setFormData({ ...formData, name_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold font-mono" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Area</label>
                                        <input type="text" value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telegram ID (Optional)</label>
                                    <input type="text" value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 focus:border-blue-500 text-sm font-bold text-blue-600 dark:text-blue-400" placeholder="@username or ID" />
                                </div>
                                <div className="pt-4">
                                    <button disabled={submitting} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Contact Info"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
