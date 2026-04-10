import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { 
    Plus, 
    Search, 
    RefreshCw, 
    Edit3, 
    Trash2, 
    ShieldCheck, 
    Users, 
    Save, 
    X,
    ShieldAlert,
    Menu,
    Building2,
    Filter,
    LayoutGrid,
    List
} from "lucide-react";
import rolePermissionService from "../../services/rolePermissionService";
import departmentService from "../../services/departmentService";
import useAccess from "../../hooks/useAccess";

export default function Roles() {
    const { user, layoutStyle, setIsMobileMenuOpen, refreshSetupStatus } = useAuth();
    const access = useAccess();

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState({ id: null, name: "", dept_id: "" });
    const [departments, setDepartments] = useState([]);
    const [deptFilter, setDeptFilter] = useState("all");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [viewMode, setViewMode] = useState("grid");

    const canField = access?.canField || (() => true);
    const canAdd = canField("roles", "add_button");
    const canEdit = canField("roles", "edit_button");
    const canDelete = canField("roles", "delete_button");
    const canSave = canField("roles", "save_button");
    const canRefresh = canField("roles", "refresh_button");
    const canViewToggle = canField("roles", "view_toggle");

    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    const isSuperAdmin = ['ADMINISTRATOR'].includes(roleName);

    // Names that must NEVER appear in Access Manager view
    const ADMIN_ROLE_NAMES = ['ADMINISTRATOR'];

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id ?? null;

            let params;
            if (isSuperAdmin) {
                // Administrator: filter by deptFilter selection (no admin exclusion — they see everything)
                params = deptFilter !== 'all' ? { dept_id: deptFilter } : {};
            } else {
                // Access Manager: must have a valid dept_id, exclude admin-level roles
                if (!userDeptId) {
                    // No dept assigned → show nothing
                    setRoles([]);
                    setLoading(false);
                    return;
                }
                params = { dept_id: userDeptId, exclude_admin: 'true' };
            }

            const data = await rolePermissionService.getRoles(params);
            const rawRoles = Array.isArray(data) ? data : [];

            // Client-side safety net: strip admin-level roles from Access Manager view
            const safeRoles = isSuperAdmin
                ? rawRoles
                : rawRoles.filter(r => !ADMIN_ROLE_NAMES.includes((r.name || '').toUpperCase()));

            setRoles(safeRoles);

            if (isSuperAdmin && departments.length === 0) {
                const depts = await departmentService.getAll();
                setDepartments(depts);
            }
        } catch (error) {
            console.error("Fetch failed", error);
            setMessage({ type: "error", text: "Failed to load roles" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [deptFilter, user?.dept_id, user?.roleData?.name]);

    const handleSave = async () => {
        if (!currentRole.name.trim()) return;
        setIsSaving(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const finalDeptId = isSuperAdmin ? (currentRole.dept_id || null) : userDeptId;
            
            if (currentRole.id) {
                const updateData = { name: currentRole.name };
                if (isSuperAdmin) updateData.dept_id = finalDeptId;
                await rolePermissionService.updateRole(currentRole.id, updateData);
                setMessage({ type: "success", text: "Role updated successfully" });
            } else {
                await rolePermissionService.createRole({ name: currentRole.name, dept_id: finalDeptId });
                setMessage({ type: "success", text: "Role created successfully" });
            }
            setIsModalOpen(false);
            setCurrentRole({ id: null, name: "", dept_id: "" });
            fetchRoles();
            if (refreshSetupStatus) refreshSetupStatus();
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.error || "Failed to save role" });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        }
    };

    const handleDelete = async (roleId) => {
        if (!window.confirm("Are you sure you want to delete this role?")) return;
        try {
            await rolePermissionService.deleteRole(roleId);
            setMessage({ type: "success", text: "Role deleted successfully" });
            fetchRoles();
            if (refreshSetupStatus) refreshSetupStatus();
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.error || "Failed to delete role" });
        } finally {
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        }
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = !deptFilter || deptFilter === 'all' 
            ? true 
            : (deptFilter === 'null' 
                ? (role.dept_id === null || role.dept_id === undefined || role.dept_id === "") 
                : role.dept_id == deptFilter);
        return matchesSearch && matchesDept;
    });

    return (
        <div className={`h-screen ${pageBg} flex font-sans transition-colors duration-300 overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-30 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Setup</span>
                            <h1 className={`text-xl font-black tracking-tighter uppercase font-outfit ${textColor}`}>Roles</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {message.text && (
                            <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
                                message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                            }`}>
                                {message.type === 'success' ? <ShieldCheck className="w-3 h-3 text-green-500" /> : <ShieldAlert className="w-3 h-3 text-red-500" />}
                                {message.text}
                            </div>
                        )}
                        {canRefresh && (
                            <button onClick={fetchRoles} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-500 transition-all active:rotate-180">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                            </button>
                        )}
                        {canAdd && (
                            <button 
                                onClick={() => { setCurrentRole({ id: null, name: "", dept_id: "" }); setIsModalOpen(true); }}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.1em]">New Role</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto space-y-8">
                        {/* Search & Filter Section */}
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className={`flex-1 ${cardBg} rounded-[2.5rem] border shadow-2xl p-6 relative overflow-hidden group w-full`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                                <div className="relative flex items-center gap-4">
                                    <Search className="w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search roles by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                            {isSuperAdmin && (
                                <div className={`${cardBg} rounded-[2.5rem] border shadow-2xl p-6 relative overflow-hidden group shrink-0 min-w-[250px]`}>
                                    <div className="relative flex items-center gap-3">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        <select 
                                            value={deptFilter}
                                            onChange={e => setDeptFilter(e.target.value)}
                                            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 outline-none cursor-pointer w-full"
                                        >
                                            <option value="all">All Departments</option>
                                            <option value="null">Admin Defaults</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.dept_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {canViewToggle && (
                                <div className={`${cardBg} rounded-[2.5rem] border shadow-2xl p-2 relative overflow-hidden flex items-center gap-1 shrink-0`}>
                                    <button 
                                        onClick={() => setViewMode("grid")} 
                                        className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode("list")} 
                                        className={`p-3 rounded-2xl transition-all ${viewMode === 'list' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* List Section */}
                        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" : "space-y-4"}>
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <div key={i} className={`${cardBg} rounded-[2.5rem] border shadow-sm ${viewMode === 'grid' ? 'p-8 space-y-4' : 'p-6 flex items-center justify-between'} animate-pulse`}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded-full" />
                                                <div className="h-3 w-1/3 bg-slate-100 dark:bg-white/5 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : filteredRoles.length > 0 ? (
                                filteredRoles.map((role) => (
                                    <div key={role.id} className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem] flex-col space-y-6' : 'p-6 rounded-2xl flex-row items-center justify-between'} border hover:border-blue-500/30 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all flex group relative overflow-hidden`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                                        
                                        <div className={`flex ${viewMode === 'grid' ? 'items-start justify-between w-full' : 'items-center gap-6 flex-1 min-w-0'}`}>
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            
                                            <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'hidden' : 'block'}`}>
                                                <div className="flex items-center gap-3">
                                                    <h3 className={`text-sm font-black uppercase tracking-tight truncate ${textColor}`}>{role.name}</h3>
                                                    {isSuperAdmin && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 shrink-0">
                                                            <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                                                                {role.department?.dept_name || "Admin"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Users className="w-2.5 h-2.5" />
                                                        {role.userCount || 0} users
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-300 uppercase tracking-widest font-mono">
                                                        ID: {role.id.substring(0, 8)}
                                                    </div>
                                                </div>
                                            </div>

                                            {viewMode === 'grid' && (
                                                <div className="flex gap-2 relative z-10">
                                                    {canEdit && (
                                                        <button 
                                                            onClick={() => { setCurrentRole({ id: role.id, name: role.name, dept_id: role.dept_id || "" }); setIsModalOpen(true); }}
                                                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-500 transition-colors"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button 
                                                            onClick={() => handleDelete(role.id)}
                                                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {viewMode === 'grid' ? (
                                            <>
                                                <div className="space-y-1 relative">
                                                    <h3 className={`text-lg font-black uppercase tracking-tight ${textColor}`}>{role.name}</h3>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Users className="w-3 h-3" />
                                                        {role.userCount || 0} users assigned
                                                    </div>
                                                    {isSuperAdmin && (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <Building2 className="w-3 h-3 text-slate-400" />
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {role.department?.dept_name || "Administrator's Default"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-300">
                                                    <span>Role ID</span>
                                                    <span className="font-mono text-[9px] text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-lg">{role.id.substring(0, 8)}...</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 relative z-10 shrink-0">
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => { setCurrentRole({ id: role.id, name: role.name, dept_id: role.dept_id || "" }); setIsModalOpen(true); }}
                                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-95"
                                                        title="Edit Role"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={() => handleDelete(role.id)}
                                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95"
                                                        title="Delete Role"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center space-y-4">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-300">
                                        <ShieldAlert className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-500">No roles found</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Try adjusting your search terms</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Role Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300`}>
                        <div className="p-8 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{currentRole.id ? 'Edit Role' : 'New Role'}</span>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{currentRole.id ? 'Edit Role' : 'Create Role'}</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Role Name <span className="text-blue-500 font-bold">*</span>
                                </label>
                                <div className="relative group">
                                    <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input 
                                        type="text"
                                        placeholder="e.g. Administrator, Guest, Encoder..."
                                        value={currentRole.name}
                                        onChange={(e) => setCurrentRole(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                                        className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-100 dark:border-[#333] bg-slate-50/50 dark:bg-white/5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {isSuperAdmin && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        Assigned Department
                                    </label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={currentRole.dept_id || ""} 
                                            onChange={e => setCurrentRole(prev => ({ ...prev, dept_id: e.target.value }))} 
                                            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-100 dark:border-[#333] bg-slate-50/50 dark:bg-white/5 text-sm font-bold appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Administrator Default</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.dept_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={isSaving || !currentRole.name.trim()}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {currentRole.id ? 'Save Changes' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
