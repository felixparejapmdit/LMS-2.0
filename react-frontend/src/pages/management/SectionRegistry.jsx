import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    LayoutGrid,
    Building2,
    ShieldCheck,
    AlertCircle,
    Zap,
    RefreshCw,
    Loader2
} from "lucide-react";
import sectionService from "../../services/sectionService";

export default function SectionRegistry() {
    const context = useAuth();
    if (!context) return null;
    const { layoutStyle, setIsMobileMenuOpen } = context;

    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await sectionService.getRegistry();
            setSections(data);
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'ACTIVE': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'FULL': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <LayoutGrid className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-orange-500" />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Global Section Pool</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
                            {sections.map(section => (
                                <div 
                                    key={section.id}
                                    className={`p-4 rounded-3xl border bg-white dark:bg-[#141414] transition-all flex flex-col items-center gap-2 ${
                                        section.status === 'AVAILABLE' ? 'border-emerald-100 dark:border-emerald-900/20' :
                                        section.status === 'ACTIVE' ? 'border-orange-100 dark:border-orange-900/20 shadow-lg shadow-orange-500/5' :
                                        'border-red-100 dark:border-red-900/20 opacity-60'
                                    }`}
                                >
                                    <span className="text-xl font-black tracking-tighter">{section.section_code}</span>
                                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${getStatusColor(section.status)}`}>
                                        {section.status}
                                    </span>
                                    {section.department && (
                                        <div className="mt-2 flex flex-col items-center text-center">
                                            <Building2 className="w-3 h-3 text-gray-400 mb-1" />
                                            <span className="text-[8px] font-black uppercase text-gray-500 line-clamp-1">
                                                {section.department.dept_code}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
