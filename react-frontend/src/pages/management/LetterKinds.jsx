import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";
import {
    Tags,
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
    Building2,
    Filter
} from "lucide-react";
import letterKindService from "../../services/letterKindService";
import departmentService from "../../services/departmentService";
import SearchableSelect from "../../components/SearchableSelect";

export default function LetterKinds() {
    const access = useAccess();
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500">Error: AuthContext not found</div>;

    const { user, layoutStyle, setIsMobileMenuOpen, refreshSetupStatus } = context;
    const canField = access?.canField || (() => true);
    const canAdd = canField("letter-kinds", "add_button");
    const canEdit = canField("letter-kinds", "edit_button");
    const canDelete = canField("letter-kinds", "delete_button");
    const canSave = canField("letter-kinds", "save_button");
    const canRefresh = canField("letter-kinds", "refresh_button");
    const canViewToggle = canField("letter-kinds", "view_toggle");
    
    const [kinds, setKinds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedKind, setSelectedKind] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null);

    const [formData, setFormData] = useState({
        kind_name: "",
        description: "",
        dept_id: ""
    });
    const [departments, setDepartments] = useState([]);
    const [deptFilter, setDeptFilter] = useState("all");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    const isSuperAdmin = ['ADMINISTRATOR'].includes(roleName);

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const params = isSuperAdmin 
                ? (deptFilter !== 'all' ? { dept_id: deptFilter } : {}) 
                : { dept_id: userDeptId };
            
            const data = await letterKindService.getAll(params);
            setKinds(Array.isArray(data) ? data : []);

            if (isSuperAdmin && departments.length === 0) {
                try {
                    const depts = await departmentService.getAll();
                    setDepartments(depts);
                } catch (err) {
                    console.error("Failed to fetch departments", err);
                }
            }
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
    }, [deptFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const finalDeptId = isSuperAdmin ? (formData.dept_id || null) : userDeptId;
            
            if (modalMode === 'create') {
                await letterKindService.create({ ...formData, dept_id: finalDeptId });
            } else {
                await letterKindService.update(selectedKind.id, { ...formData, dept_id: finalDeptId });
            }
            setIsModalOpen(false);
            fetchData();
            if (refreshSetupStatus) refreshSetupStatus();
        } catch (err) {
            console.error("CRUD Error:", err);
            setError("Failed to save letter kind.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this kind?")) return;
        try {
            await letterKindService.delete(id);
            fetchData();
            if (refreshSetupStatus) refreshSetupStatus();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed.");
        }
    };

    const openCreateModal = () => {
        if (!canAdd) return;
        setModalMode("create");
        setFormData({ kind_name: "", description: "", dept_id: "" });
        setSelectedKind(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        if (!canEdit) return;
        setModalMode("edit");
        setFormData({
            kind_name: item.kind_name || "",
            description: item.description || "",
            dept_id: item.dept_id || ""
        });
        setSelectedKind(item);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const renderCard = (item) => (
        <div key={item.id} className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl flex items-center justify-between'} border shadow-sm hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-900/40 transition-all group cursor-pointer`}>
            <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 overflow-hidden flex-1"}>
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/10 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                    <Tags className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 relative">
                        <div>
                            <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{item.kind_name}</h3>
                            {isSuperAdmin && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {item.department?.dept_name || "Administrator's Default"}
                                    </span>
                                </div>
                            )}
                        </div>
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
                    <p className="text-xs text-gray-500 font-medium line-clamp-1">{item.description || "No description"}</p>
                </div>
            </div>
            {viewMode === 'list' && (
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        {canEdit && <button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-purple-500"><Edit2 className="w-4 h-4" /></button>}
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
                            <Tags className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Tags className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-purple-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Management</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Letter Kinds</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {canRefresh && <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>}
                        {canAdd && <button onClick={openCreateModal} className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-purple-500/20 uppercase tracking-widest"><Plus className="w-3 h-3" /> Add Kind</button>}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <h2 className={`text-3xl font-bold ${textColor}`}>Reference Kinds</h2>
                                {isSuperAdmin && (
                                    <div className="flex-1 min-w-[200px]">
                                        <SearchableSelect 
                                            options={[
                                                { id: 'all', dept_name: 'All Departments' },
                                                { id: 'null', dept_name: 'Admin Defaults' },
                                                ...departments
                                            ]}
                                            value={deptFilter}
                                            onChange={setDeptFilter}
                                            placeholder="Filter by Department"
                                            icon={Filter}
                                            allowClear={false}
                                        />
                                    </div>
                                )}
                            </div>
                            {canViewToggle && (
                                <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1 rounded-2xl border border-gray-100 dark:border-[#222]">
                                    <button onClick={() => setViewMode("grid")} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><LayoutGrid className="w-4 h-4" /></button>
                                    <button onClick={() => setViewMode("list")} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-10 h-10 text-purple-500 animate-spin" /></div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" : "space-y-4"}>
                                {kinds.map(renderCard)}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-md rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-visible`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Create Kind' : 'Edit Kind'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="text-red-500">{error}</div>}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kind Name</label>
                                    <input type="text" required value={formData.kind_name} onChange={e => setFormData({ ...formData, kind_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold placeholder:text-slate-300" placeholder="e.g. LETTER, ORDER, MEMO..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" rows={3} placeholder="Optional description..."></textarea>
                                </div>
                                {isSuperAdmin && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Department</label>
                                        <SearchableSelect 
                                            options={departments}
                                            value={formData.dept_id}
                                            onChange={val => setFormData({ ...formData, dept_id: val })}
                                            placeholder="Select Department"
                                            emptyMessage="No departments found."
                                        />
                                    </div>
                                )}
                                <div className="pt-4">
                                    {canSave && <button disabled={submitting} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Kind"}</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
