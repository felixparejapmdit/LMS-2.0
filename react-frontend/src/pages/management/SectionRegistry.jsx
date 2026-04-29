import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    LayoutGrid,
    List as ListIcon,
    Building2,
    ShieldCheck,
    AlertCircle,
    Zap,
    RefreshCw,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Filter,
    CheckCircle2
} from "lucide-react";
import sectionService from "../../services/sectionService";
import departmentService from "../../services/departmentService";

export default function SectionRegistry() {
    const context = useAuth();
    if (!context) return null;
    const { layoutStyle, setIsMobileMenuOpen } = context;

    const [sections, setSections] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = viewMode === "grid" ? 40 : 15;

    // Assignment Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);
    const [assignLoading, setAssignLoading] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState("");

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const [sectionData, deptData] = await Promise.all([
                sectionService.getRegistry(),
                departmentService.getAll()
            ]);
            setSections(sectionData);
            setDepartments(deptData);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const textColor = 'text-slate-900 dark:text-white';
    const cardBg = 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

    const getStatusColor = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'ACTIVE': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'FULL': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const filteredSections = sections.filter(s => {
        const matchesSearch = s.section_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (s.department?.dept_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
    const paginatedSections = filteredSections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleOpenAssign = (section) => {
        // Allow opening for AVAILABLE (to assign) or any assigned section (to unassign)
        if (section.status === 'AVAILABLE' || section.assigned_to_dept_id) {
            setSelectedSection(section);
            setIsAssignModalOpen(true);
        }
    };

    const handleUnassign = async (sectionCode) => {
        if (!window.confirm(`Unassign section ${sectionCode}?`)) return;
        setAssignLoading(true);
        try {
            await sectionService.unassignSection(sectionCode);
            setIsAssignModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Unassignment failed: " + err.message);
        } finally {
            setAssignLoading(false);
        }
    };

    const handleAssign = async (deptId) => {
        setAssignLoading(true);
        try {
            await sectionService.assignSpecificSection(deptId, selectedSection.section_code);
            setIsAssignModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Assignment failed: " + err.message);
        } finally {
            setAssignLoading(false);
        }
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-20 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <LayoutGrid className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                                <LayoutGrid className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Setup</h1>
                                    <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-600 text-[8px] font-black rounded-lg border border-orange-500/20 uppercase tracking-widest">Resets Annually</span>
                                </div>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Sections</h2>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 max-w-2xl px-8">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                            />
                        </div>
                        <select 
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="px-4 py-2.5 bg-white dark:bg-[#141414] border border-slate-100 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                            <option value="all">All</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="ACTIVE">Active</option>
                            <option value="FULL">Full</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-2xl border border-slate-100 dark:border-white/10">
                        <button onClick={() => fetchData(true)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all">
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                        <button 
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:bg-white dark:hover:bg-white/10'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:bg-white dark:hover:bg-white/10'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        </div>
                    ) : filteredSections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
                            <Filter className="w-16 h-16 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">No sections match your filters</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
                                    {paginatedSections.map(section => (
                                        <button 
                                            key={section.id}
                                            onClick={() => handleOpenAssign(section)}
                                            className={`p-6 rounded-[2rem] border bg-white dark:bg-[#141414] transition-all flex flex-col items-center gap-3 relative group ${
                                                section.status === 'AVAILABLE' ? 'border-emerald-100 dark:border-emerald-900/20 hover:border-emerald-500 hover:scale-105 active:scale-95' :
                                                section.status === 'ACTIVE' ? 'border-orange-100 dark:border-orange-900/20 shadow-lg shadow-orange-500/5 hover:border-orange-500' :
                                                'border-red-100 dark:border-red-900/20 opacity-60 hover:opacity-100 transition-opacity'
                                            }`}
                                        >
                                            <span className="text-2xl font-black tracking-tighter text-slate-800 dark:text-white">{section.section_code}</span>
                                            <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${getStatusColor(section.status)}`}>
                                                {section.status}
                                            </span>
                                            {section.department && (
                                                <div className="mt-2 flex flex-col items-center text-center">
                                                    <div className="w-6 h-6 bg-slate-50 dark:bg-white/5 rounded-lg flex items-center justify-center text-gray-400 mb-1">
                                                        <Building2 className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase text-gray-500 line-clamp-1 max-w-[80px]">
                                                        {section.department.dept_code}
                                                    </span>
                                                </div>
                                            )}
                                            {section.status === 'AVAILABLE' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Zap className="w-3 h-3 text-emerald-500" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <div className="col-span-1 text-center">Code</div>
                                        <div className="col-span-2 text-center">Status</div>
                                        <div className="col-span-5">Assigned Department</div>
                                        <div className="col-span-4 text-right">Last Activity</div>
                                    </div>
                                    {paginatedSections.map(section => (
                                        <div 
                                            key={section.id}
                                            onClick={() => handleOpenAssign(section)}
                                            className={`grid grid-cols-12 items-center px-6 py-4 rounded-2xl border ${cardBg} hover:border-orange-500/50 transition-all cursor-pointer group`}
                                        >
                                            <div className="col-span-1 flex justify-center">
                                                <span className="text-lg font-black tracking-tighter text-slate-800 dark:text-white">{section.section_code}</span>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <span className={`px-3 py-1 rounded-xl border text-[8px] font-black uppercase tracking-widest ${getStatusColor(section.status)}`}>
                                                    {section.status}
                                                </span>
                                            </div>
                                            <div className="col-span-5 flex items-center gap-3">
                                                {section.department ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-colors">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">{section.department.dept_name}</span>
                                                            <span className="text-[10px] font-bold text-gray-400">{section.department.dept_code}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic">Unassigned</span>
                                                )}
                                            </div>
                                            <div className="col-span-4 text-right text-[10px] font-bold text-gray-400">
                                                {section.updated_at ? new Date(section.updated_at).toLocaleString() : 'N/A'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-12 pb-12">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="p-3 rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] text-gray-500 hover:text-orange-500 hover:border-orange-200 shadow-sm disabled:opacity-50 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                    </div>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="p-3 rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] text-gray-500 hover:text-orange-500 hover:border-orange-200 shadow-sm disabled:opacity-50 transition-all"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Assignment Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Assign Section {selectedSection?.section_code}</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Select Department</p>
                                </div>
                                <button onClick={() => { setIsAssignModalOpen(false); setModalSearchTerm(""); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="relative mb-6 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Find department..."
                                    value={modalSearchTerm}
                                    onChange={(e) => setModalSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                                />
                            </div>

                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedSection?.assigned_to_dept_id ? (
                                    <div className="py-8 flex flex-col items-center gap-4 text-center">
                                        <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <Building2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Currently Assigned to:</p>
                                            <p className="text-sm font-black text-orange-500 uppercase">{selectedSection.department?.dept_name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{selectedSection.department?.dept_code}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleUnassign(selectedSection.section_code)}
                                            disabled={assignLoading}
                                            className="mt-4 px-8 py-3 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                        >
                                            Unassign Code
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {departments.filter(d => 
                                            (d.dept_name || "").toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                            (d.dept_code || "").toLowerCase().includes(modalSearchTerm.toLowerCase())
                                        ).length === 0 ? (
                                            <div className="py-12 text-center text-gray-400 font-bold italic">No departments found</div>
                                        ) : (
                                            departments
                                            .filter(d => 
                                                (d.dept_name || "").toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                                (d.dept_code || "").toLowerCase().includes(modalSearchTerm.toLowerCase())
                                            )
                                            .map(dept => (
                                                <button
                                                    key={dept.id}
                                                    disabled={assignLoading}
                                                    onClick={() => handleAssign(dept.id)}
                                                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:border-orange-500/30 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-all shadow-sm">
                                                            <Building2 className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-tight">{dept.dept_name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400">{dept.dept_code}</p>
                                                        </div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        {assignLoading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
