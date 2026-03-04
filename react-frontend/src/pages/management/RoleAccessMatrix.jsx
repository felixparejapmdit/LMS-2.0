
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
    Check,
    HelpCircle,
    Info,
    FileCode
} from "lucide-react";
import rolePermissionService from "../../services/rolePermissionService";
import systemPageService from "../../services/systemPageService";


const ACTIONS = [
    { id: "can_view", label: "View", icon: Eye },
    { id: "can_create", label: "Create", icon: Plus },
    { id: "can_edit", label: "Edit", icon: Edit3 },
    { id: "can_delete", label: "Delete", icon: Trash2 },
    { id: "can_special", label: "Special", icon: Zap },
    { id: "field_permissions", label: "Fields", icon: Settings }
];

export default function RoleAccessMatrix() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();

    const [roles, setRoles] = useState([]);
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [matrix, setMatrix] = useState({}); // { [page_id]: permissions }
    const [fieldModal, setFieldModal] = useState({ isOpen: false, pageId: null, fields: "" });
    const [isInstructionOpen, setIsInstructionOpen] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const textColor = 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';

    const fetchInitialData = async () => {
        try {
            const [rolesData, pagesData] = await Promise.all([
                rolePermissionService.getRolesWithPermissions(),
                systemPageService.getAll()
            ]);
            setRoles(rolesData);
            const sortedPages = (pagesData || []).sort((a, b) => a.page_name.localeCompare(b.page_name));
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

            // Initialize matrix with default false values for all pages from DB
            const initialMatrix = {};
            pages.forEach(page => {
                const existing = data.find(p => p.page_name === page.page_id);
                initialMatrix[page.page_id] = {
                    can_view: existing?.can_view || false,
                    can_create: existing?.can_create || false,
                    can_edit: existing?.can_edit || false,
                    can_delete: existing?.can_delete || false,
                    can_special: existing?.can_special || false,
                    field_permissions: existing?.field_permissions || {}
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
                can_special: value
            }
        }));
    };


    const getPageCategory = (pageId) => {
        const id = pageId.toLowerCase();
        if (id.includes('home') || id.includes('dashboard') || id.includes('activity') || id.includes('guest')) return 'Core Systems';
        if (id.includes('user') || id.includes('role') || id.includes('access') || id.includes('dept')) return 'Identity & Management';
        if (id.includes('letter') || id.includes('table') || id.includes('comments') || id.includes('endorse') || id.includes('detail')) return 'Records & Correspondence';
        if (id.includes('tray') || id.includes('status') || id.includes('kind') || id.includes('step') || id.includes('attach') || id.includes('person') || id.includes('import') || id.includes('pdf')) return 'Configuration & Setup';
        return 'Other Modules';
    };

    const categorizedPages = pages.reduce((acc, page) => {
        const cat = getPageCategory(page.page_id);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(page);
        return acc;
    }, {});

    const CATEGORY_ORDER = [
        'Core Systems',
        'Identity & Management',
        'Records & Correspondence',
        'Configuration & Setup',
        'Other Modules'
    ];

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
                            onClick={() => setIsInstructionOpen(true)}
                            className={`p-3 bg-slate-100 dark:bg-white/5 text-gray-400 hover:text-blue-500 rounded-2xl transition-all active:scale-95`}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
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
                    <div className="max-w-[100vw] mx-auto space-y-8 px-4 md:px-8">
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
                                        <tr className={`border-b ${'border-gray-50 dark:border-[#222] bg-gray-50/50 dark:bg-white/5'}`}>
                                            <th className="p-8 w-16 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">#</th>
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
                                                <td colSpan={ACTIONS.length + 3} className="p-32 text-center text-gray-400">
                                                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-6 opacity-20" />
                                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Decrypting Permissions...</p>
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
                                                        <td className="p-8 text-[11px] font-black text-gray-400 font-mono">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                                                                    <Layout className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={`text-[11px] font-black uppercase tracking-tight ${textColor}`}>{page.page_name}</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{page.page_id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {ACTIONS.map(action => (
                                                            <td key={action.id} className="p-8 text-center">
                                                                {action.id === 'field_permissions' ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const currentFields = matrix[page.page_id]?.field_permissions || {};
                                                                            setFieldModal({
                                                                                isOpen: true,
                                                                                pageId: page.page_id,
                                                                                fields: JSON.stringify(currentFields, null, 2)
                                                                            });
                                                                        }}
                                                                        className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${Object.keys(matrix[page.page_id]?.field_permissions || {}).length > 0
                                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                                            : "bg-slate-100 dark:bg-white/5 text-gray-300 dark:text-gray-700 hover:text-blue-500"
                                                                            }`}
                                                                    >
                                                                        <Settings className="w-5 h-5" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleToggle(page.page_id, action.id)}
                                                                        className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${matrix[page.page_id]?.[action.id]
                                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                                            : "bg-slate-100 dark:bg-white/5 text-gray-300 dark:text-gray-700 hover:text-blue-500"
                                                                            }`}
                                                                    >
                                                                        {matrix[page.page_id]?.[action.id] ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="p-8">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleToggleAll(page.page_id, true)}
                                                                    className="px-4 py-2 rounded-xl bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                                >
                                                                    Allow All
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleAll(page.page_id, false)}
                                                                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-white transition-all shadow-sm active:scale-95"
                                                                >
                                                                    Restrict
                                                                </button>
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
            {fieldModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFieldModal({ isOpen: false, pageId: null, fields: "" })} />
                    <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 p-8`}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Field Permissions</span>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{fieldModal.pageId}</h3>
                            </div>
                            <button onClick={() => setFieldModal({ isOpen: false, pageId: null, fields: "" })} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 font-medium italic">
                                Use JSON format to restrict specific components: <br />
                                <code>{`{ "delete_btn": false, "salary_field": false }`}</code>
                            </p>
                            <textarea
                                value={fieldModal.fields}
                                onChange={(e) => setFieldModal(prev => ({ ...prev, fields: e.target.value }))}
                                className="w-full h-64 p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-mono text-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder={`{ "component_id": false }`}
                            />
                            <button
                                onClick={() => {
                                    try {
                                        const parsed = JSON.parse(fieldModal.fields);
                                        setMatrix(prev => ({
                                            ...prev,
                                            [fieldModal.pageId]: {
                                                ...prev[fieldModal.pageId],
                                                field_permissions: parsed
                                            }
                                        }));
                                        setFieldModal({ isOpen: false, pageId: null, fields: "" });
                                    } catch (e) {
                                        alert("Invalid JSON format");
                                    }
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-blue-500/20"
                            >
                                Apply component configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instruction Modal */}
            {isInstructionOpen && (
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
                                        The matrix detects pages automatically from the database. Any Functional Area added to the <b>system_pages</b> collection will appear here instantly.
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
            )}
        </div>
    );
}

// Helper X icon if not imported
const X = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
