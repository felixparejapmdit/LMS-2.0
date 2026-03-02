
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    ShieldCheck,
    Loader2,
    RefreshCw,
    Save,
    Lock,
    Unlock,
    Settings,
    Layout,
    Eye,
    Plus,
    Edit3,
    Trash2,
    Zap,
    Check
} from "lucide-react";
import rolePermissionService from "../../services/rolePermissionService";

const PAGES = [
    { id: "home", name: "Home Dashboard" },
    { id: "inbox", name: "Inbox" },
    { id: "outbox", name: "Outbox" },
    { id: "new-letter", name: "New Letter" },
    { id: "master-table", name: "Master Table" },
    { id: "letters-with-comments", name: "Letters with Comment" },
    { id: "letter-tracker", name: "Letter Tracker" },
    { id: "spam", name: "Spam" },
    { id: "endorsements", name: "Endorsements" },
    { id: "settings", name: "App Settings" },
    { id: "trays", name: "Tray Management" },
    { id: "users", name: "User Management" },
    { id: "contacts", name: "Contact Management" },
    { id: "departments", name: "Department Management" },
    { id: "kinds", name: "Letter Kinds" },
    { id: "steps", name: "Workflow Steps" },
    { id: "statuses", name: "Status Management" },
    { id: "attachments", name: "Attachment Library" },
    { id: "role-matrix", name: "Access Matrix" }
];

const ACTIONS = [
    { id: "can_view", label: "View", icon: Eye },
    { id: "can_create", label: "Create", icon: Plus },
    { id: "can_edit", label: "Edit", icon: Edit3 },
    { id: "can_delete", label: "Delete", icon: Trash2 },
    { id: "can_special", label: "Special", icon: Zap }
];

export default function RoleAccessMatrix() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [matrix, setMatrix] = useState({}); // { [page_id]: permissions }
    const [message, setMessage] = useState({ type: "", text: "" });

    const textColor = layoutStyle === 'linear' ? 'text-[#eee]' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const pageBg = layoutStyle === 'linear' ? 'bg-[#080808]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';

    const fetchRoles = async () => {
        try {
            const data = await rolePermissionService.getRolesWithPermissions();
            setRoles(data);
            if (data.length > 0) {
                setSelectedRoleId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch roles", error);
        }
    };

    const fetchPermissions = async (roleId) => {
        setLoading(true);
        try {
            const data = await rolePermissionService.getPermissionsByRole(roleId);

            // Initialize matrix with default false values for all pages
            const initialMatrix = {};
            PAGES.forEach(page => {
                const existing = data.find(p => p.page_name === page.id);
                initialMatrix[page.id] = {
                    can_view: existing?.can_view || false,
                    can_create: existing?.can_create || false,
                    can_edit: existing?.can_edit || false,
                    can_delete: existing?.can_delete || false,
                    can_special: existing?.can_special || false
                };
            });
            setMatrix(initialMatrix);
        } catch (error) {
            console.error("Failed to fetch permissions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        if (selectedRoleId) {
            fetchPermissions(selectedRoleId);
        }
    }, [selectedRoleId]);

    const handleToggle = (pageId, actionId) => {
        setMatrix(prev => ({
            ...prev,
            [pageId]: {
                ...prev[pageId],
                [actionId]: !prev[pageId][actionId]
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const permissionsToSave = Object.keys(matrix).map(pageId => ({
                page_name: pageId,
                ...matrix[pageId]
            }));

            await rolePermissionService.updateRolePermissions(selectedRoleId, permissionsToSave);
            setMessage({ type: "success", text: "Matrix successfully updated" });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (error) {
            console.error("Save failed", error);
            setMessage({ type: "error", text: "Failed to update permissions" });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleAll = (pageId, value) => {
        setMatrix(prev => ({
            ...prev,
            [pageId]: {
                can_view: value,
                can_create: value,
                can_edit: value,
                can_delete: value,
                can_special: value
            }
        }));
    };

    return (
        <div className={`min-h-screen ${pageBg} flex font-sans transition-colors duration-300`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className={`h-20 ${cardBg} border-b px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Security Protocol</span>
                            <h1 className={`text-xl font-black uppercase tracking-tighter ${textColor}`}>Access Matrix</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {message.text && (
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-right-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                <Check className="w-3 h-3" /> {message.text}
                            </div>
                        )}
                        <button
                            disabled={saving}
                            onClick={handleSave}
                            className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50`}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? "Deploying..." : "Save Matrix"}
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto space-y-8">
                        {/* Selector */}
                        <div className={`p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 ${cardBg}`}>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-blue-500">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>Role Selection</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">Assign granular permissions to systemic roles.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRoleId(role.id)}
                                        className={`px-6 py-4 rounded-3xl border transition-all text-xs font-black uppercase tracking-widest ${selectedRoleId === role.id
                                            ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/20"
                                            : "bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-400 hover:border-blue-500/50"
                                            }`}
                                    >
                                        {role.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Matrix Grid */}
                        <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${cardBg}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className={`border-b ${layoutStyle === 'linear' ? 'border-[#1a1a1a] bg-[#111]' : 'border-gray-50 dark:border-[#222] bg-gray-50/50 dark:bg-white/5'}`}>
                                            <th className="p-8 w-[300px] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Functional Area (Page)</th>
                                            {ACTIONS.map(action => (
                                                <th key={action.id} className="p-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <action.icon className="w-4 h-4 text-blue-500" />
                                                        {action.label}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="p-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Direct Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={ACTIONS.length + 2} className="p-32 text-center text-gray-400">
                                                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-6 opacity-20" />
                                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Decrypting Permissions...</p>
                                                </td>
                                            </tr>
                                        ) : PAGES.map((page) => (
                                            <tr key={page.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                                                            <Layout className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[11px] font-black uppercase tracking-tight ${textColor}`}>{page.name}</span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{page.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {ACTIONS.map(action => (
                                                    <td key={action.id} className="p-8 text-center">
                                                        <button
                                                            onClick={() => handleToggle(page.id, action.id)}
                                                            className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${matrix[page.id]?.[action.id]
                                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                                : "bg-slate-100 dark:bg-white/5 text-gray-300 dark:text-gray-700 hover:text-blue-500"
                                                                }`}
                                                        >
                                                            {matrix[page.id]?.[action.id] ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                                        </button>
                                                    </td>
                                                ))}
                                                <td className="p-8">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleToggleAll(page.id, true)}
                                                            className="px-4 py-2 rounded-xl bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
                                                        >
                                                            Allow All
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleAll(page.id, false)}
                                                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                        >
                                                            Restrict
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

