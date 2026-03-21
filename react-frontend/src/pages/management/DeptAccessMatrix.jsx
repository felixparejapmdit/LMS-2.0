
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    ShieldCheck,
    Loader2,
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
    Check,
    HelpCircle,
    Info,
    Search,
    ChevronDown,
    Building2,
    ShieldAlert
} from "lucide-react";
import rolePermissionService from "../../services/rolePermissionService";
import systemPageService from "../../services/systemPageService";
import { humanizePageId } from "../../utils/pageAccess";
import { getFieldPresetForPage } from "../../utils/fieldPresets";
import useAccess from "../../hooks/useAccess";
import axios from "axios";
import API_BASE from "../../config/apiConfig";

const ACTIONS = [
    { id: "can_view", label: "View", icon: Eye },
    { id: "can_create", label: "Create", icon: Plus },
    { id: "can_edit", label: "Edit", icon: Edit3 },
    { id: "can_delete", label: "Delete", icon: Trash2 },
    { id: "can_special", label: "Special", icon: Zap },
    { id: "field_permissions", label: "Fields", icon: Settings }
];

const mergeFieldPermissions = (pageId, existing = {}) => {
    const defaults = getFieldPresetForPage(pageId);
    const projected = {};
    Object.keys(defaults).forEach((key) => {
        projected[key] = Object.prototype.hasOwnProperty.call(existing || {}, key)
            ? existing[key]
            : true;
    });
    return projected;
};

export default function DeptAccessMatrix() {
    const { user, layoutStyle } = useAuth();
    const access = useAccess();

    const [roles, setRoles] = useState([]);
    const [pages, setPages] = useState([]);
    const [mainPermissions, setMainPermissions] = useState([]); // Permissions from Main Role (usually User/Staff)
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [matrix, setMatrix] = useState({});
    const [fieldModal, setFieldModal] = useState({ isOpen: false, pageId: null, fields: {} });
    const [message, setMessage] = useState({ type: "", text: "" });
    const [searchTerm, setSearchTerm] = useState("");

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get roles assigned to this Access Manager's department
            const deptId = user?.dept_id;
            if (!deptId) {
                setLoading(false);
                return;
            }

            const rolesListRes = await axios.get(`${API_BASE}/role-permissions/roles`);
            const adminRole = rolesListRes.data.find(r => 
                ['ADMINISTRATOR', 'SYSTEM ADMIN', 'SUPERUSER'].includes(r.name?.toUpperCase())
            );

            const [rolesRes, pagesData, mainPermsRes] = await Promise.all([
                axios.get(`${API_BASE}/role-permissions/roles-with-permissions?dept_id=${deptId}`),
                systemPageService.getAll(),
                adminRole ? rolePermissionService.getPermissionsByRole(adminRole.id) : Promise.resolve([])
            ]);

            setRoles(rolesRes.data);
            setPages(pagesData);
            setMainPermissions(mainPermsRes);

            if (rolesRes.data.length > 0) {
                setSelectedRoleId(rolesRes.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchPermissions = async (roleId) => {
        try {
            const data = await rolePermissionService.getPermissionsByRole(roleId);
            const initialMatrix = {};
            pages.forEach(page => {
                const existing = data.find(p => p.page_name === page.page_id);
                initialMatrix[page.page_id] = {
                    can_view: existing?.can_view || false,
                    can_create: existing?.can_create || false,
                    can_edit: existing?.can_edit || false,
                    can_delete: existing?.can_delete || false,
                    can_special: existing?.can_special || false,
                    field_permissions: mergeFieldPermissions(page.page_id, existing?.field_permissions)
                };
            });
            setMatrix(initialMatrix);
        } catch (error) {
            console.error("Failed to fetch permissions", error);
        }
    };

    useEffect(() => {
        if (selectedRoleId && pages.length > 0) {
            fetchPermissions(selectedRoleId);
        }
    }, [selectedRoleId, pages]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const permissionsToSave = Object.keys(matrix).map(pageId => ({
                page_name: pageId,
                ...matrix[pageId]
            }));
            await rolePermissionService.updateRolePermissions(selectedRoleId, permissionsToSave);
            setMessage({ type: "success", text: "Department matrix updated" });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (error) {
            setMessage({ type: "error", text: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    // Filter pages: Only show pages that the Main Access Matrix has allowed (can_view = true in Main Permissions)
    const allowedPageIds = new Set(
        mainPermissions.filter(p => p.can_view).map(p => p.page_name)
    );

    const filteredPages = pages.filter(page => {
        const isAllowed = allowedPageIds.has(page.page_id);
        const matchesSearch = page.page_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             page.page_id?.toLowerCase().includes(searchTerm.toLowerCase());
        return isAllowed && matchesSearch;
    });

    if (!user?.dept_id) {
        return (
            <div className={`h-screen ${pageBg} flex`}>
                <Sidebar />
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                    <ShieldAlert className="w-16 h-16 text-yellow-500 mb-6" />
                    <h2 className={`text-2xl font-black uppercase ${textColor}`}>Department Configuration Missing</h2>
                    <p className="text-slate-400 mt-2">Your account must be assigned to a department to manage its access matrix.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen ${pageBg} flex font-sans transition-colors duration-300 overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-30 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Unit Management</span>
                            <h1 className={`text-xl font-black tracking-tighter uppercase ${textColor}`}>Unit Access Matrix</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {message.text && (
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                <Check className="w-3 h-3" /> {message.text}
                            </div>
                        )}
                        <button
                            disabled={saving}
                            onClick={handleSave}
                            className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50`}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Unit Matrix
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar space-y-8">
                    {/* Dept Branding */}
                    <div className={`${cardBg} p-6 rounded-[2rem] border flex items-center gap-6 shadow-sm`}>
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className={`text-lg font-black uppercase ${textColor}`}>Managing: {user?.department?.dept_name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delegating permissions for department-specific roles</p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search allowed pages..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
                            {roles.length > 0 ? roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedRoleId === role.id ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {role.name}
                                </button>
                            )) : (
                                <span className="px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase">No Unit Roles Found</span>
                            )}
                        </div>
                    </div>

                    <div className={`${cardBg} rounded-[2.5rem] border overflow-hidden shadow-sm`}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-[#222]">
                                    <th className="p-4 w-[250px] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Allowed Page</th>
                                    {ACTIONS.filter(a => a.id !== 'can_special').map(action => (
                                        <th key={action.id} className="p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{action.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                {loading ? (
                                    <tr><td colSpan={10} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
                                ) : filteredPages.map(page => (
                                    <tr key={page.page_id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className={`text-[11px] font-black uppercase ${textColor}`}>{page.page_name}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{page.page_id}</span>
                                            </div>
                                        </td>
                                        {ACTIONS.filter(a => a.id !== 'can_special').map(action => (
                                            <td key={action.id} className="p-4 text-center">
                                                {action.id === 'field_permissions' ? (
                                                    <button 
                                                        onClick={() => {
                                                            const currentFields = mergeFieldPermissions(page.page_id, matrix[page.page_id]?.field_permissions);
                                                            setFieldModal({ isOpen: true, pageId: page.page_id, fields: currentFields });
                                                        }}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto transition-all ${Object.keys(matrix[page.page_id]?.field_permissions || {}).length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500'}`}
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setMatrix(prev => ({ ...prev, [page.page_id]: { ...prev[page.page_id], [action.id]: !prev[page.page_id][action.id] }}))}
                                                        className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${matrix[page.page_id]?.[action.id] ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-300 hover:text-blue-500'}`}
                                                    >
                                                        {matrix[page.page_id]?.[action.id] ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Field Modal Minimal Version */}
            {fieldModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFieldModal({ isOpen: false, pageId: null, fields: {} })} />
                    <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 overflow-hidden`}>
                        <div className="p-8 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <h3 className={`text-xl font-black uppercase ${textColor}`}>Ui Configuration</h3>
                            <button onClick={() => setFieldModal({ isOpen: false, pageId: null, fields: {} })}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-8 max-h-[50vh] overflow-y-auto space-y-4">
                            {Object.keys(fieldModal.fields).map(key => (
                                <div key={key} onClick={() => setFieldModal(p => ({ ...p, fields: { ...p.fields, [key]: !p.fields[key] }}))} className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer ${fieldModal.fields[key] ? 'border-blue-500 bg-blue-50/5 dark:bg-blue-900/10' : 'border-gray-100 dark:border-white/5'}`}>
                                    <span className={`text-[10px] font-black uppercase ${fieldModal.fields[key] ? 'text-blue-600' : 'text-slate-400'}`}>{key.replace(/_/g, ' ')}</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${fieldModal.fields[key] ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all ${fieldModal.fields[key] ? 'right-0.75' : 'left-0.75'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-8 bg-slate-50/50 dark:bg-white/5">
                            <button
                                onClick={() => {
                                    setMatrix(prev => ({ ...prev, [fieldModal.pageId]: { ...prev[fieldModal.pageId], field_permissions: fieldModal.fields }}));
                                    setFieldModal({ isOpen: false, pageId: null, fields: {} });
                                }}
                                className="w-full py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl"
                            >Confirm Settings</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
