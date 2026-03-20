
import React, { useEffect, useState } from "react";
import { LAST_REFRESH_KEY } from "../../context/authConstants";
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
    Check,
    HelpCircle,
    Info,
    FileCode,
    Search,
    Menu,
    X
} from "lucide-react";
import rolePermissionService from "../../services/rolePermissionService";
import systemPageService from "../../services/systemPageService";
import { BASE_SYSTEM_PAGES, humanizePageId } from "../../utils/pageAccess";
import { getFieldPresetForPage } from "../../utils/fieldPresets";
import useAccess from "../../hooks/useAccess";


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

export default function RoleAccessMatrix() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const access = useAccess();

    const [roles, setRoles] = useState([]);
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [matrix, setMatrix] = useState({}); // { [page_id]: permissions }
    const [fieldModal, setFieldModal] = useState({ isOpen: false, pageId: null, fields: {} });
    const [isInstructionOpen, setIsInstructionOpen] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [searchTerm, setSearchTerm] = useState("");
    const canField = access?.canField || (() => true);
    const canSearch = canField("role-matrix", "search");
    const canSave = canField("role-matrix", "save_button");
    const canEditField = canField("role-matrix", "edit_field");
    const canAllowAll = canField("role-matrix", "allow_all_button");
    const canRestrict = canField("role-matrix", "restrict_button");
    const canRoleSelector = canField("role-matrix", "role_selector");

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const fetchInitialData = async () => {
        try {
            await systemPageService.syncPages(BASE_SYSTEM_PAGES).catch(() => { });
            const [rolesData, pagesData] = await Promise.all([
                rolePermissionService.getRolesWithPermissions(),
                systemPageService.getAll()
            ]);
            setRoles(rolesData);

            const pageMap = new Map();
            (pagesData || []).forEach((page) => pageMap.set(page.page_id, page));

            // Backfill pages found in role permissions but not yet in system_pages
            (rolesData || []).forEach((role) => {
                (role.permissions || []).forEach((perm) => {
                    if (!perm?.page_name || pageMap.has(perm.page_name)) return;
                    pageMap.set(perm.page_name, {
                        page_id: perm.page_name,
                        page_name: humanizePageId(perm.page_name)
                    });
                });
            });

            const sortedPages = Array.from(pageMap.values()).sort((a, b) => a.page_name.localeCompare(b.page_name));
            setPages(sortedPages);
            if (rolesData.length > 0) {
                setSelectedRoleId(rolesData[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    };

    const fetchPermissions = async (roleId) => {
        setLoading(true);
        try {
            const data = await rolePermissionService.getPermissionsByRole(roleId);
            const normalizePageId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");

            // Initialize matrix with default false values for all pages from DB
            const initialMatrix = {};
            pages.forEach(page => {
                const existing = data.find((p) =>
                    p.page_name === page.page_id ||
                    normalizePageId(p.page_name) === normalizePageId(page.page_id)
                );
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedRoleId && pages.length > 0) {
            fetchPermissions(selectedRoleId);
        }
    }, [selectedRoleId, pages]);

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

            // Reload auth context if current user role was updated
            if (user?.role === selectedRoleId || user?.roleData?.id === selectedRoleId) {
                localStorage.removeItem(LAST_REFRESH_KEY); localStorage.removeItem("auth_permissions");
                window.location.reload(); // Hard refresh to apply security locks globally
            }
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
                can_special: value,
                field_permissions: mergeFieldPermissions(pageId, prev[pageId]?.field_permissions)
            }
        }));
    };


    const getPageCategory = (pageId) => {
        const id = pageId.toLowerCase();
        if (id.includes('home') || id.includes('dashboard') || id.includes('activity') || id.includes('guest')) return 'System';
        if (id.includes('user') || id.includes('role') || id.includes('access') || id.includes('dept')) return 'Users';
        if (id.includes('letter') || id.includes('table') || id.includes('comments') || id.includes('endorse') || id.includes('detail')) return 'Letters';
        if (id.includes('tray') || id.includes('status') || id.includes('kind') || id.includes('step') || id.includes('attach') || id.includes('person') || id.includes('import') || id.includes('pdf')) return 'Setup';
        return 'Others';
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredPages = pages.filter((page) => {
        if (!normalizedSearch) return true;
        return (
            page.page_name?.toLowerCase().includes(normalizedSearch) ||
            page.page_id?.toLowerCase().includes(normalizedSearch) ||
            getPageCategory(page.page_id).toLowerCase().includes(normalizedSearch)
        );
    });

    const categorizedPages = filteredPages.reduce((acc, page) => {
        const cat = getPageCategory(page.page_id);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(page);
        return acc;
    }, {});

    const CATEGORY_ORDER = [
        'System',
        'Users',
        'Letters',
        'Setup',
        'Others'
    ];

    return (
        <div className={`h-screen ${pageBg} flex font-sans transition-colors duration-300 overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-30 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Setup</span>
                            <h1 className={`text-xl font-black tracking-tighter uppercase font-outfit ${textColor}`}>Access Matrix</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {message.text && (
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-right-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                <Check className="w-3 h-3" /> {message.text}
                            </div>
                        )}
                        <button
                            onClick={() => setIsInstructionOpen(true)}
                            className={`p-3 bg-slate-100 dark:bg-white/5 text-gray-400 hover:text-blue-500 rounded-2xl transition-all active:scale-95`}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        {canSave && (
                            <button
                                disabled={saving}
                                onClick={handleSave}
                                className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50`}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? "Saving..." : "Save"}
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                    <div className="w-full space-y-6">
                        {/* Selector */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {canRoleSelector && (
                                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit flex-wrap">
                                    {roles.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => setSelectedRoleId(role.id)}
                                            title={(role.user_names && role.user_names !== "null") ? `Assigned to: ${role.user_names}` : "No users assigned"}
                                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedRoleId === role.id
                                                ? "bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm"
                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5"
                                                }`}
                                        >
                                            {role.name}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${selectedRoleId === role.id ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                                                {role.user_count || 0}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {canSearch && (
                                <div className="relative group min-w-[350px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search page name, key, or category..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-2xl border text-sm transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Matrix Grid */}
                        <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${cardBg}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-[#222]">
                                            <th className="p-3 w-12 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">#</th>
                                            <th className="p-3 w-[250px] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Page</th>
                                            {ACTIONS.map(action => (
                                                <th key={action.id} className="p-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <action.icon className="w-4 h-4 text-blue-500" />
                                                        <span className="hidden md:inline">{action.label}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="p-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={ACTIONS.length + 3} className="p-32 text-center text-gray-400">
                                                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-6 opacity-20" />
                                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Loading...</p>
                                                </td>
                                            </tr>
                                        ) : CATEGORY_ORDER.filter(cat => categorizedPages[cat]).length === 0 ? (
                                            <tr>
                                                <td colSpan={ACTIONS.length + 3} className="p-20 text-center text-gray-400">
                                                    <p className="text-xs font-black uppercase tracking-widest opacity-60">No pages match your search.</p>
                                                </td>
                                            </tr>
                                        ) : CATEGORY_ORDER.filter(cat => categorizedPages[cat]).map(category => (
                                            <React.Fragment key={category}>
                                                <tr className="bg-slate-50 dark:bg-white/2">
                                                    <td colSpan={ACTIONS.length + 3} className="p-4 px-8 border-y border-gray-100 dark:border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">{category}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {categorizedPages[category].map((page, index) => (
                                                    <tr key={page.page_id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                                                        <td className="p-3 text-[11px] font-black text-gray-400 font-mono">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 shrink-0">
                                                                    <Layout className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className={`text-[10px] font-black uppercase tracking-tight truncate ${textColor}`}>{page.page_name}</span>
                                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate">{page.page_id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {ACTIONS.map(action => (
                                                            <td key={action.id} className="p-3 text-center">
                                                                {action.id === 'field_permissions' ? (
                                                                    <button
                                                                        disabled={!canEditField}
                                                                        onClick={() => {
                                                                            const currentFields = mergeFieldPermissions(page.page_id, matrix[page.page_id]?.field_permissions || {});
                                                                            setFieldModal({
                                                                                isOpen: true,
                                                                                pageId: page.page_id,
                                                                                fields: currentFields
                                                                            });
                                                                        }}
                                                                        className={`w-9 h-9 rounded-xl md:rounded-[1rem] flex items-center justify-center transition-all mx-auto ${Object.keys(matrix[page.page_id]?.field_permissions || {}).length > 0
                                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                                            : "bg-slate-100 dark:bg-white/5 text-gray-300 dark:text-gray-700 hover:text-blue-500"
                                                                            } ${!canEditField ? 'opacity-40 pointer-events-none' : ''}`}
                                                                    >
                                                                        <Settings className="w-3 h-3" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleToggle(page.page_id, action.id)}
                                                                        className={`w-7 h-7 rounded-lg md:rounded-xl flex items-center justify-center transition-all mx-auto ${matrix[page.page_id]?.[action.id]
                                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                                            : "bg-slate-100 dark:bg-white/5 text-gray-300 dark:text-gray-700 hover:text-blue-500"
                                                                            }`}
                                                                    >
                                                                        {matrix[page.page_id]?.[action.id] ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="p-3">
                                                            <div className="flex justify-end gap-1.5 flex-wrap md:flex-nowrap">
                                                                {canAllowAll && (
                                                                    <button
                                                                        onClick={() => handleToggleAll(page.page_id, true)}
                                                                        className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                                                    >
                                                                        Allow
                                                                    </button>
                                                                )}
                                                                {canRestrict && (
                                                                    <button
                                                                        onClick={() => handleToggleAll(page.page_id, false)}
                                                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                                                    >
                                                                        Deny
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Field Permissions Modal */}
            {
                fieldModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFieldModal({ isOpen: false, pageId: null, fields: {} })} />
                        <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 overflow-hidden`}>
                            <div className="p-8 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Component Permissions</span>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{fieldModal.pageId}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setFieldModal(prev => ({
                                            ...prev,
                                            fields: Object.fromEntries(Object.keys(prev.fields).map(k => [k, true]))
                                        }))}
                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => setFieldModal(prev => ({
                                            ...prev,
                                            fields: Object.fromEntries(Object.keys(prev.fields).map(k => [k, false]))
                                        }))}
                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors"
                                    >
                                        Clear All
                                    </button>
                                    <button onClick={() => setFieldModal({ isOpen: false, pageId: null, fields: {} })} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-gray-400 ml-1">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 gap-4">
                                    {Object.keys(fieldModal.fields).map((fieldKey) => (
                                        <div 
                                            key={fieldKey}
                                            onClick={() => {
                                                setFieldModal(prev => ({
                                                    ...prev,
                                                    fields: {
                                                        ...prev.fields,
                                                        [fieldKey]: !prev.fields[fieldKey]
                                                    }
                                                }));
                                            }}
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                                                fieldModal.fields[fieldKey] 
                                                    ? 'border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10' 
                                                    : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 opacity-60'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${fieldModal.fields[fieldKey] ? 'text-blue-500' : 'text-slate-400'}`}>Component ID</span>
                                                <span className={`text-sm font-bold capitalize ${textColor}`}>{fieldKey.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors relative ${fieldModal.fields[fieldKey] ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/20'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${fieldModal.fields[fieldKey] ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(fieldModal.fields).length === 0 && (
                                        <div className="py-12 text-center text-slate-400 font-medium italic">
                                            No explicit components defined for this page.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-8 bg-slate-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
                                <button
                                    onClick={() => {
                                        setMatrix(prev => ({
                                            ...prev,
                                            [fieldModal.pageId]: {
                                                ...prev[fieldModal.pageId],
                                                field_permissions: fieldModal.fields
                                            }
                                        }));
                                        setFieldModal({ isOpen: false, pageId: null, fields: {} });
                                    }}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Instruction Modal */}
            {
                isInstructionOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 shadow-2xl backdrop-blur-xl" onClick={() => setIsInstructionOpen(false)} />
                        <div className={`${cardBg} w-full max-w-2xl rounded-[3rem] border shadow-2xl relative z-10 overflow-hidden`}>
                            <div className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Protocol Guide</span>
                                            <h3 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>Access Matrix Briefing</h3>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsInstructionOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-gray-400 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <h4 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Dynamic Logic</h4>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                            The matrix detects pages automatically from the database. Any Page added to the <b>system_pages</b> collection will appear here instantly.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                                <FileCode className="w-4 h-4" />
                                            </div>
                                            <h4 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Component Locks</h4>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                            Use the <b>Fields (Gear)</b> icon to restrict specific UI elements like buttons or text inputs using JSON tags.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Info className="w-4 h-4 text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Restriction Example</span>
                                    </div>
                                    <div className="bg-slate-900/5 dark:bg-black/20 p-4 rounded-2xl font-mono text-[10px] leading-relaxed text-blue-500 overflow-x-auto">
                                        {`{`} <br />
                                        &nbsp;&nbsp;&quot;delete_button&quot;: false,<br />
                                        &nbsp;&nbsp;&quot;edit_salary_field&quot;: false,<br />
                                        &nbsp;&nbsp;&quot;approve_action&quot;: true<br />
                                        {`}`}
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">
                                        * The UI calls <b>canField(page, tag)</b> to check these locks. If a tag is not present or set to true, it remains visible by default.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setIsInstructionOpen(false)}
                                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                                >
                                    Acknowledge Briefing
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
