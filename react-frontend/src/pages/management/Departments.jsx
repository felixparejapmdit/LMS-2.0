import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";
import LetterListMini from "./LetterListMini";
import {
    Building2,
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
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    ChevronDown
} from "lucide-react";
import departmentService from "../../services/departmentService";

export default function Departments() {
    const access = useAccess();
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500">Error: AuthContext not found</div>;

    const { layoutStyle, setIsMobileMenuOpen } = context;
    const canField = access?.canField || (() => true);
    const canAdd = canField("departments", "add_button");
    const canEdit = canField("departments", "edit_button");
    const canDelete = canField("departments", "delete_button");
    const canSave = canField("departments", "save_button");
    const canRefresh = canField("departments", "refresh_button");
    const canViewToggle = canField("departments", "view_toggle");
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedDept, setSelectedDept] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null);
    const [expandedDepts, setExpandedDepts] = useState({}); // Tracking expanded state per ID

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [formData, setFormData] = useState({
        dept_name: "",
        dept_code: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await departmentService.getAll();
            setDepartments(Array.isArray(data) ? data : []);
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
                await departmentService.create(formData);
            } else {
                await departmentService.update(selectedDept.id, formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("CRUD Error:", err);
            setError("Failed to save department.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this department?")) return;
        try {
            await departmentService.delete(id);
            fetchData();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed.");
        }
    };

    const openCreateModal = () => {
        if (!canAdd) return;
        setModalMode("create");
        setFormData({ dept_name: "", dept_code: "" });
        setSelectedDept(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        if (!canEdit) return;
        setModalMode("edit");
        setFormData({
            dept_name: item.dept_name || "",
            dept_code: item.dept_code || ""
        });
        setSelectedDept(item);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const toggleExpand = (id) => {
        setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const totalPages = Math.ceil(departments.length / itemsPerPage);
    const paginatedDepartments = departments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderCard = (item) => {
        const isExpanded = expandedDepts[item.id];
        return (
            <div
                key={item.id}
                className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-3xl'} border shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all group overflow-hidden`}
            >
                <div
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center justify-between cursor-pointer group/header"
                >
                    <div className="flex items-center gap-6 overflow-hidden flex-1">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{item.dept_name}</h3>
                                <div className={`aspect-square w-5 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-500' : 'text-slate-300'}`}>
                                    <ChevronDown className="w-3 h-3" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 font-medium line-clamp-1">{item.dept_code}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(isMenuOpen === item.id ? null : item.id); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {isMenuOpen === item.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => navigate(`/departments/${item.id}/letters`)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 active:scale-95 transition-all"><Building2 className="w-3 h-3" /> Dedicated Workspace</button>
                                    {canEdit && <button onClick={() => openEditModal(item)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"><Edit2 className="w-3 h-3" /> Edit Entry</button>}
                                    {canDelete && <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3 h-3" /> Remove Unit</button>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5 animate-in slide-in-from-top-4 duration-500">
                        <LetterListMini deptId={item.id} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <Building2 className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Building2 className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-emerald-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Management</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Departments/Sections</h2>
                            </div>
                        </div>
                    </div>
                    {canViewToggle && (
                        <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1 rounded-2xl border border-gray-100 dark:border-[#222]">
                            {canRefresh && <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>}
                            {canAdd && <button onClick={openCreateModal} className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"><Plus className="w-3 h-3" /> Add Dept</button>}
                            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><LayoutGrid className="w-4 h-4" /></button>
                            <button onClick={() => setViewMode("list")} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto">

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>
                        ) : (
                            <>
                                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" : "space-y-4"}>
                                    {paginatedDepartments.map(renderCard)}
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 mt-10">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="p-3 rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] text-gray-500 hover:text-emerald-500 hover:border-emerald-200 shadow-sm disabled:opacity-50 disabled:hover:border-gray-100 dark:disabled:hover:border-[#222] disabled:hover:text-gray-500 transition-all"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-10 h-10 rounded-2xl text-[10px] font-black transition-all ${currentPage === page
                                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                                        : 'bg-white dark:bg-[#141414] text-gray-500 border border-gray-100 dark:border-[#222] hover:border-emerald-200 hover:text-emerald-500 shadow-sm'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="p-3 rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] text-gray-500 hover:text-emerald-500 hover:border-emerald-200 shadow-sm disabled:opacity-50 disabled:hover:border-gray-100 dark:disabled:hover:border-[#222] disabled:hover:text-gray-500 transition-all"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-md rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-visible`}>
                        <div className="p-8">
                            <div className="flex flex-col space-y-6 formWrapper formArea formContent formForm formValues">
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Create Dept' : 'Edit Dept'}</h3>
                                    <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && <div className="text-red-500">{error}</div>}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dept Name</label>
                                        <input type="text" required value={formData.dept_name} onChange={e => setFormData({ ...formData, dept_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dept Code</label>
                                        <input type="text" required value={formData.dept_code} onChange={e => setFormData({ ...formData, dept_code: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                    <div className="pt-4">
                                        {canSave && <button disabled={submitting} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Department"}</button>}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
