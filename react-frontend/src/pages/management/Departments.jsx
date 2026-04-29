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
import sectionService from "../../services/sectionService";
import { History, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";

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
        dept_code: "",
        group_id: 1
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [sectionHistory, setSectionHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [allSections, setAllSections] = useState([]);
    const [showSectionSelector, setShowSectionSelector] = useState(false);

    const groupNames = {
        1: "EVM",
        2: "AEVM",
        3: "ATG"
    };

    const groupColors = {
        1: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        2: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        3: "bg-orange-500/10 text-orange-600 border-orange-500/20"
    };

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const [deptData, sectionData] = await Promise.all([
                departmentService.getAll(),
                sectionService.getOverview()
            ]);
            
            const merged = (Array.isArray(deptData) ? deptData : []).map(dept => {
                const section = sectionData.find(s => s.id === dept.id);
                return { ...dept, ...section };
            });
            
            setDepartments(merged);
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
        setFormData({ dept_name: "", dept_code: "", group_id: 1 });
        setSelectedDept(null);
        setIsModalOpen(true);
        setShowSectionSelector(false);
    };

    const openEditModal = async (item) => {
        if (!canEdit) return;
        setModalMode("edit");
        setFormData({
            dept_name: item.dept_name || "",
            dept_code: item.dept_code || "",
            group_id: item.group_id || 1
        });
        setSelectedDept(item);
        setIsModalOpen(true);
        setIsMenuOpen(null);
        setShowSectionSelector(false);

        // Fetch history and all sections
        setLoadingHistory(true);
        try {
            const [history, sections] = await Promise.all([
                sectionService.getDeptHistory(item.id),
                sectionService.getRegistry()
            ]);
            setSectionHistory(history);
            setAllSections(sections);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleForceNewSection = async () => {
        if (!window.confirm("Assign a new section? Current sequence will be closed.")) return;
        try {
            await sectionService.forceNewSection(selectedDept.id);
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Failed to force new section: " + err.message);
        }
    };

    const handleManualSectionAssign = async (code) => {
        if (!window.confirm(`Assign section #${code} to this department?`)) return;
        try {
            await sectionService.assignSpecificSection(selectedDept.id, code);
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Assignment failed: " + err.message);
        }
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
                className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-3xl'} border shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all group overflow-visible relative`}
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
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-gray-500 font-medium line-clamp-1">{item.dept_code}</p>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${groupColors[item.group_id] || groupColors[1]}`}>
                                        {groupNames[item.group_id] || "EVM"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Current Section</span>
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-500/20">
                                    {item.active_section || "None"}
                                </span>
                            </div>
                            <div className="w-32 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-50 dark:border-white/5">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
                                        item.progress >= 95 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                                        item.progress >= 75 ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 
                                        'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                    }`}
                                    style={{ width: `${item.progress || 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between w-full mt-0.5">
                                <span className={`text-[8px] font-black uppercase ${
                                    item.progress >= 95 ? 'text-red-500' : 
                                    item.progress >= 75 ? 'text-orange-500' : 
                                    'text-emerald-500'
                                }`}>
                                    {item.progress >= 95 ? 'Critical' : item.progress >= 75 ? 'Warning' : 'Stable'}
                                </span>
                                <span className="text-[8px] font-bold text-gray-400">
                                    {item.current_sequence || 0} / 999
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(isMenuOpen === item.id ? null : item.id); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {isMenuOpen === item.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => navigate(`/departments/${item.id}/letters`)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 active:scale-95 transition-all"><Building2 className="w-3 h-3" /> View Letters</button>
                                    {canEdit && <button onClick={() => openEditModal(item)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"><Edit2 className="w-3 h-3" /> Edit</button>}
                                    {canDelete && <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3 h-3" /> Delete</button>}
                                </div>
                            )}
                        </div>
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
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Setup</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Departments</h2>
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
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Add Dept' : 'Edit Dept'}</h3>
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
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Group</label>
                                        <select 
                                            value={formData.group_id} 
                                            onChange={e => setFormData({ ...formData, group_id: parseInt(e.target.value) })} 
                                            className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        >
                                            <option value={1}>EVM</option>
                                            <option value={2}>AEVM</option>
                                            <option value={3}>ATG</option>
                                        </select>
                                    </div>

                                    {modalMode === 'edit' && (
                                        <div className="space-y-6 pt-6 border-t border-dashed border-gray-100 dark:border-white/5">
                                            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-emerald-500 shadow-sm">
                                                            <Zap className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">Active Section</p>
                                                            <p className={`text-sm font-black uppercase tracking-tight ${textColor}`}>{selectedDept?.active_section || "N/A"}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowSectionSelector(!showSectionSelector)}
                                                        className={`flex items-center gap-2 px-3 py-2 text-[8px] font-black uppercase rounded-lg border transition-all shadow-sm ${showSectionSelector ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-white/10 text-gray-400 hover:text-emerald-500 border-gray-100 dark:border-white/5'}`}
                                                    >
                                                        <Edit2 className="w-3 h-3" /> Set Section Code
                                                    </button>
                                                </div>

                                                {showSectionSelector && (
                                                    <div className="mt-2 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Select Section:</p>
                                                        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                            {allSections.filter(s => s.status === 'AVAILABLE' || s.id === selectedDept?.id).map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => handleManualSectionAssign(s.section_code)}
                                                                    className={`p-2 text-[10px] font-black rounded-lg border transition-all ${s.section_code === selectedDept?.active_section ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-[#333] hover:border-emerald-500 hover:text-emerald-500'}`}
                                                                >
                                                                    {s.section_code}
                                                                </button>
                                                            ))}
                                                            {allSections.filter(s => s.status === 'AVAILABLE').length === 0 && (
                                                                <p className="col-span-4 text-[9px] text-gray-400 font-bold italic py-2 text-center">No available sections.</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                                            <button 
                                                                type="button"
                                                                onClick={handleForceNewSection}
                                                                className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 text-[8px] font-black uppercase rounded-lg text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                                            >
                                                                Auto-Assign New
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <History className="w-3 h-3" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Section History</p>
                                                </div>
                                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                    {loadingHistory ? (
                                                        <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-emerald-500" /></div>
                                                    ) : sectionHistory.length === 0 ? (
                                                        <p className="text-[10px] text-gray-400 font-bold italic py-2">No history recorded.</p>
                                                    ) : (
                                                        sectionHistory.map(usage => (
                                                            <div key={usage.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 dark:border-white/5 bg-white dark:bg-white/5 text-[10px]">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-emerald-500">#{usage.section_code}</span>
                                                                    <span className="text-gray-300">|</span>
                                                                    <span className="text-gray-500 font-bold">{usage.current_sequence} letters</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {usage.is_active ? (
                                                                        <span className="flex items-center gap-1 text-emerald-500 font-black uppercase tracking-widest text-[8px]"><Zap className="w-2 h-2" /> Active</span>
                                                                    ) : (
                                                                        <span className="text-gray-400 font-bold">Filled: {new Date(usage.filled_at || usage.updated_at).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
