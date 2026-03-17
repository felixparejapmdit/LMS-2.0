
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useUI } from "../../context/AuthContext";
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
    Menu
} from "lucide-react";
import rolePermissionService from "../../services/rolePermissionService";
import useAccess from "../../hooks/useAccess";

export default function Roles() {
    const { layoutStyle, setIsMobileMenuOpen } = useUI();
    const access = useAccess();

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState({ id: null, name: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const canField = access?.canField || (() => true);
    const canAdd = canField("roles", "add_button");
    const canEdit = canField("roles", "edit_button");
    const canDelete = canField("roles", "delete_button");
    const canSave = canField("roles", "save_button");
    const canRefresh = canField("roles", "refresh_button");

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const data = await rolePermissionService.getRoles();
            setRoles(data);
        } catch (error) {
            setMessage({ type: "error", text: "Failed to load roles" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleSave = async () => {
        if (!currentRole.name.trim()) return;
        setIsSaving(true);
        try {
            if (currentRole.id) {
                await rolePermissionService.updateRole(currentRole.id, currentRole.name);
                setMessage({ type: "success", text: "Role updated successfully" });
            } else {
                await rolePermissionService.createRole(currentRole.name);
                setMessage({ type: "success", text: "Role created successfully" });
            }
            setIsModalOpen(false);
            setCurrentRole({ id: null, name: "" });
            fetchRoles();
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
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.error || "Failed to delete role" });
        } finally {
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        }
    };

    const filteredRoles = roles.filter(role => 
        role.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                                onClick={() => { setCurrentRole({ id: null, name: "" }); setIsModalOpen(true); }}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.1em]">New Role</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Search Section */}
                        <div className={`${cardBg} rounded-[2.5rem] border shadow-2xl p-6 relative overflow-hidden group`}>
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

                        {/* List Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <div key={i} className={`${cardBg} rounded-[2.5rem] border shadow-sm p-8 space-y-4 animate-pulse`}>
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded-full" />
                                            <div className="h-3 w-1/3 bg-slate-100 dark:bg-white/5 rounded-full" />
                                        </div>
                                    </div>
                                ))
                            ) : filteredRoles.length > 0 ? (
                                filteredRoles.map((role) => (
                                    <div key={role.id} className={`${cardBg} rounded-[2.5rem] border hover:border-blue-500/30 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all p-8 space-y-6 group relative overflow-hidden`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                                        
                                        <div className="flex items-start justify-between relative">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => { setCurrentRole({ id: role.id, name: role.name }); setIsModalOpen(true); }}
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
                                        </div>

                                        <div className="space-y-1 relative">
                                            <h3 className={`text-lg font-black uppercase tracking-tight ${textColor}`}>{role.name}</h3>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Users className="w-3 h-3" />
                                                {role.user_count || 0} users assigned
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-300">
                                            <span>Role ID</span>
                                            <span className="font-mono text-[9px] text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-lg">{role.id.substring(0, 8)}...</span>
                                        </div>
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
                                <p className="text-[9px] text-slate-400 font-medium italic ml-1">
                                    Names are auto-converted to uppercase.
                                </p>
                            </div>

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

