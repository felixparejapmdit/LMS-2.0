import React, { useState } from "react";
import {
    CloudDownload,
    Users,
    UserPlus,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
    RefreshCw,
    Database,
    ShieldCheck
} from "lucide-react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";

export default function DataImport() {
    const { layoutStyle, setIsMobileMenuOpen } = useAuth();
    const access = useAccess();
    const [loading, setLoading] = useState({ persons: false, users: false });
    const [results, setResults] = useState({ persons: null, users: null });
    const [error, setError] = useState({ persons: null, users: null });
    const canField = access?.canField || (() => true);
    const canPersonsImport = canField("data-import", "persons_import_button");
    const canUsersImport = canField("data-import", "users_import_button");

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const handleImport = async (type) => {
        setLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));
        setResults(prev => ({ ...prev, [type]: null }));

        const url = type === 'persons'
            ? 'http://172.18.162.84/api/persons.php'
            : 'http://172.18.162.84/api/users.php';

        try {
            const res = await axios.post(`${API_BASE}/import/${type}`, { url });
            setResults(prev => ({ ...prev, [type]: res.data.stats }));
        } catch (err) {
            console.error(`${type} Import error:`, err);
            setError(prev => ({ ...prev, [type]: err.response?.data?.error || err.message }));
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    // UI Helpers
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    return (
        <div className={`min-h-screen ${pageBg} flex font-sans transition-colors duration-300`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-30 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <CloudDownload className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <CloudDownload className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-gray-400'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Setup</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Data Migration</h2>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto space-y-12">

                        {/* Header Info */}
                        <div className="space-y-2">
                            <h2 className={`text-3xl font-black uppercase tracking-tight ${textColor}`}>System Import</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                                Connect to the peripheral PHP API to synchronize person listings and user credentials.
                                Passwords are automatically re-encrypted using <span className="text-orange-500 font-bold uppercase tracking-widest text-[10px]">Argon2id</span>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Import Persons Card */}
                            <div className={`${cardBg} rounded-[2.5rem] border p-8 space-y-6 relative overflow-hidden group hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-500`}>
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                    <Users className="w-32 h-32" />
                                </div>
                                <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${textColor}`}>Persons Sync</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Synchronizes names, IDs, areas, and Telegram IDs to the central contacts database.</p>
                                </div>

                                {canPersonsImport && (
                                    <div className="pt-4">
                                        <button
                                            onClick={() => handleImport('persons')}
                                            disabled={loading.persons}
                                            className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                        >
                                            {loading.persons ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {loading.persons ? "Syncing..." : "Start Import"}
                                        </button>
                                    </div>
                                )}

                                {results.persons && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-3">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-gray-500">NEW</p>
                                                <p className="text-xl font-black text-emerald-600">{results.persons.imported}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-gray-500">UPD</p>
                                                <p className="text-xl font-black text-blue-500">{results.persons.updated}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-gray-500">TTL</p>
                                                <p className="text-xl font-black text-gray-800 dark:text-gray-200">{results.persons.total}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {error.persons && (
                                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 text-red-500 flex flex-col gap-3">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mt-1.5">Sync Error</p>
                                        </div>
                                        <p className="text-[10px] font-bold leading-relaxed bg-red-500/10 p-3 rounded-xl border border-red-200/20">{error.persons}</p>
                                    </div>
                                )}
                            </div>

                            {/* Import Users Card */}
                            <div className={`${cardBg} rounded-[2.5rem] border p-8 space-y-6 relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500`}>
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                    <ShieldCheck className="w-32 h-32" />
                                </div>
                                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                                    <Database className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${textColor}`}>Users Sync</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Migrates system user accounts. Handles first/last name splitting and security hashing.</p>
                                </div>

                                {canUsersImport && (
                                    <div className="pt-4">
                                        <button
                                            onClick={() => handleImport('users')}
                                            disabled={loading.users}
                                            className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                        >
                                            {loading.users ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {loading.users ? "Migrating..." : "Start Migration"}
                                        </button>
                                    </div>
                                )}

                                {results.users && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-3">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Migrations OK</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-gray-500">NEW</p>
                                                <p className="text-xl font-black text-emerald-600">{results.users.imported}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-gray-500">UPD</p>
                                                <p className="text-xl font-black text-blue-500">{results.users.updated}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-gray-500">TTL</p>
                                                <p className="text-xl font-black text-gray-800 dark:text-gray-200">{results.users.total}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {error.users && (
                                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 text-red-500 flex flex-col gap-3">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mt-1.5">Migration Error</p>
                                        </div>
                                        <p className="text-[10px] font-bold leading-relaxed bg-red-500/10 p-3 rounded-xl border border-red-200/20">{error.users}</p>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Connection Map */}
                        <div className={`${cardBg} rounded-[2.5rem] border p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm`}>
                            <div className="flex items-center gap-4 text-gray-400">
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full">PHP Legacy API</span>
                            </div>
                            <div className="flex-1 h-px bg-slate-100 dark:bg-[#222] relative hidden md:block">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-orange-500 px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest animate-pulse">Syncing</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-orange-500">
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-orange-50 dark:bg-orange-500/10 rounded-full border border-orange-100 dark:border-orange-500/20">LMS 2.0 Core</span>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
