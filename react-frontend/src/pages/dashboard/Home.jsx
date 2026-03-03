import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import LetterCard from "../../components/LetterCard";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import {
    Activity,
    BarChart3,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Inbox,
    LayoutDashboard,
    Loader2,
    Menu,
    RefreshCw,
    Search,
    Send,
    Zap,
    TrendingUp,
    ChevronRight,
    User,
    Users
} from "lucide-react";

export default function Home() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activeTasks: 0,
        archivedTasks: 0,
        onlineUsers: 0,
        totalUsers: 0,
        totalPeople: 0,
        recentTasks: [],
        atgLetters: [],
        atgLettersCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [systemStatus, setSystemStatus] = useState({ isOnline: false, uptime: 0 });

    const fetchStats = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const deptId = user?.dept_id?.id ?? user?.dept_id ?? null;
            const response = await axios.get(`http://localhost:5000/api/stats/dashboard?department_id=${deptId}`);
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const checkHealth = async () => {
        try {
            const response = await axios.get("http://localhost:5000/health");
            setSystemStatus({ isOnline: response.data.status === 'OK', uptime: response.data.uptime });
        } catch (error) {
            setSystemStatus({ isOnline: false, uptime: 0 });
        }
    };

    useEffect(() => {
        if (user) {
            fetchStats();

            // Sync stats every 60s
            const interval = setInterval(() => fetchStats(), 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = seconds % 60;
        return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
    };

    const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, trend }) => (
        <div className={`p-6 rounded-[2rem] border transition-all hover:shadow-lg ${layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a] hover:border-indigo-500/30' :
            layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222] hover:border-gray-200' :
                layoutStyle === 'grid' ? 'bg-white dark:bg-[#141414] border-slate-100 dark:border-[#222]' :
                    'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm'
            }`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgClass} shrink-0`}>
                    <Icon className={`w-6 h-6 ${colorClass}`} />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <h3 className={`text-3xl font-black tracking-tight ${layoutStyle === 'linear' ? 'text-[#eee]' : 'text-slate-900 dark:text-white'}`}>
                    {value}
                </h3>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${layoutStyle === 'linear' ? 'text-[#666]' : 'text-slate-400'}`}>
                    {title}
                </p>
            </div>
        </div>
    );

    const renderDashboardContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Analytics...</p>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <StatCard
                        title="Active Pending"
                        value={stats.activeTasks}
                        icon={Activity}
                        colorClass="text-blue-600 dark:text-blue-400"
                        bgClass="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <StatCard
                        title="Processed Done"
                        value={stats.archivedTasks}
                        icon={CheckCircle2}
                        colorClass="text-emerald-600 dark:text-emerald-400"
                        bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                    />
                    <StatCard
                        title="Total Users"
                        value={stats.totalUsers}
                        icon={Users}
                        colorClass="text-indigo-600 dark:text-indigo-400"
                        bgClass="bg-indigo-50 dark:bg-indigo-900/20"
                    />
                    <StatCard
                        title="Total People"
                        value={stats.totalPeople}
                        icon={User}
                        colorClass="text-orange-600 dark:text-orange-400"
                        bgClass="bg-orange-50 dark:bg-orange-900/20"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Main Content - Recent Work */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className={`text-lg font-black uppercase tracking-tight ${layoutStyle === 'linear' ? 'text-[#eee]' : 'text-slate-900 dark:text-white'}`}>
                                Priority Workflow
                            </h2>
                            <button onClick={() => navigate('/inbox')} className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${layoutStyle === 'linear' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                View Inbox <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {stats.recentTasks.length === 0 ? (
                            <div className={`py-16 flex flex-col items-center justify-center rounded-[2.5rem] border ${layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                                <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No incoming letters right now</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stats.recentTasks.map(task => (
                                    <LetterCard
                                        key={task.id}
                                        id={task.id}
                                        letterId={task.id}
                                        atgId={task.lms_id}
                                        sender={task.sender}
                                        summary={task.summary}
                                        status={task.status?.status_name || 'Incoming'}
                                        step={null}
                                        dueDate={task.date_received}
                                        layout={layoutStyle === 'default' ? 'modern' : layoutStyle}
                                    />
                                ))}
                            </div>
                        )}
                        {/* ATG Dashboard Letters */}
                        <div className="mt-12 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className={`text-lg font-black uppercase tracking-tight text-orange-500`}>
                                    ATG Dashboard Correspondence ({stats.atgLettersCount || 0})
                                </h2>
                            </div>
                            {stats.atgLetters?.length === 0 ? (
                                <div className={`py-12 flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed ${layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                                    <p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">No letters flagged for ATG Dashboard</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {stats.atgLetters.map(assignment => (
                                        <LetterCard
                                            key={assignment.id}
                                            id={assignment.id}
                                            letterId={assignment.letter?.id}
                                            atgId={assignment.letter?.lms_id}
                                            sender={assignment.letter?.sender}
                                            summary={assignment.letter?.summary}
                                            status={assignment.status}
                                            step={assignment.step?.step_name}
                                            dueDate={assignment.due_date || assignment.letter?.date_received}
                                            layout={layoutStyle === 'default' ? 'modern' : layoutStyle}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel - Operations */}
                    <div className="space-y-6">
                        <h2 className={`text-lg font-black uppercase tracking-tight ${layoutStyle === 'linear' ? 'text-[#eee]' : 'text-slate-900 dark:text-white'}`}>
                            Online Presence
                        </h2>
                        <div className={`p-6 md:p-8 rounded-[2.5rem] border overflow-hidden relative ${layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' :
                            layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' :
                                layoutStyle === 'grid' ? 'bg-white dark:bg-[#141414] border-slate-100 dark:border-[#222]' :
                                    'bg-indigo-600 border-none text-white shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/20'
                            }`}>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${layoutStyle === 'modern' || layoutStyle === 'default' ? 'bg-white/20' : 'bg-indigo-500/10'}`}>
                                        <Activity className={`w-6 h-6 ${layoutStyle === 'modern' || layoutStyle === 'default' ? 'text-white' : 'text-indigo-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight">
                                            Online Users
                                        </p>
                                        <p className={`text-2xl font-black mt-1 ${layoutStyle === 'modern' || layoutStyle === 'default' ? 'text-white' : 'text-indigo-500'}`}>
                                            {stats.onlineUsers}
                                        </p>
                                    </div>
                                </div>
                                <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${layoutStyle === 'modern' || layoutStyle === 'default' ? 'text-indigo-100' : 'text-gray-500'}`}>
                                    Personnel currently active across the document management cluster.
                                </p>
                                <button onClick={() => fetchStats(true)} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-sm flex items-center justify-center gap-2 ${layoutStyle === 'modern' || layoutStyle === 'default' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 text-gray-400'}`}>
                                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Sync Metrics
                                </button>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className={`p-6 rounded-[2rem] border ${layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${layoutStyle === 'linear' ? 'text-[#666]' : 'text-gray-400'}`}>Quick Workflows</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => navigate('/new-letter')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${layoutStyle === 'linear' ? 'bg-[#111] hover:bg-[#1a1a1a] text-[#eee]' : 'bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222]'}`}>
                                    <FileText className={`w-5 h-5 ${layoutStyle === 'linear' ? 'text-indigo-400' : 'text-blue-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Compose</span>
                                </button>
                                <button onClick={() => navigate('/setup/trays')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${layoutStyle === 'linear' ? 'bg-[#111] hover:bg-[#1a1a1a] text-[#eee]' : 'bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222]'}`}>
                                    <Inbox className={`w-5 h-5 ${layoutStyle === 'linear' ? 'text-indigo-400' : 'text-blue-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Trays</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        );
    };

    /* ================= LAYOUT WRAPPERS ================= */
    if (layoutStyle === 'grid') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0D0D0D] flex overflow-hidden font-sans">
                <Sidebar />
                <main className="flex-1 flex flex-col h-screen overflow-hidden">
                    <header className="h-20 bg-white dark:bg-[#0D0D0D] border-b border-slate-200 dark:border-[#222] px-4 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Workspace</span>
                                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Overview</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 hidden md:flex">
                            <button onClick={() => fetchStats(true)} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400">
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
                        <div className="w-full">
                            {renderDashboardContent()}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (layoutStyle === 'linear') {
        return (
            <div className="min-h-screen bg-[#080808] text-[#eee] flex overflow-hidden font-sans">
                <Sidebar />
                <main className="flex-1 flex flex-col h-screen overflow-hidden border-l border-[#1a1a1a]">
                    <header className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-4 md:px-6 bg-[#080808]/80 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-[#666] md:hidden"><Menu className="w-5 h-5" /></button>
                            <div className="flex items-center gap-2 text-xs font-bold text-[#666] uppercase tracking-widest">
                                <span className="text-indigo-400">HOME</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-[#eee]">DASHBOARD</span>
                            </div>
                        </div>
                        <button onClick={() => fetchStats(true)} className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-all text-[#666]"><RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /></button>
                    </header>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="w-full px-4 md:px-6 py-6 md:py-10">
                            <div className="mb-10">
                                <h1 className="text-3xl font-black tracking-tight text-[#eee] uppercase">COMMAND CENTER</h1>
                            </div>
                            {renderDashboardContent()}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (layoutStyle === 'notion') {
        return (
            <div className="min-h-screen bg-white dark:bg-[#191919] flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
                    <div className="w-full min-h-screen px-4 md:px-12 pt-12 md:pt-24 pb-16 relative">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="fixed top-6 left-4 p-2 bg-white/80 dark:bg-[#191919]/80 backdrop-blur border rounded-lg text-gray-400 md:hidden z-40"><Menu className="w-5 h-5" /></button>
                        <div className="group mb-12">
                            <div className="flex items-center gap-4 text-gray-400 mb-6">
                                <span className="text-xs font-medium decoration-gray-200 underline-offset-4 flex items-center gap-1"><LayoutDashboard className="w-3 h-3" /> DASHBOARD</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">Workspace Overview</h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400">Bird's-eye view of your document management operations, workflows, and performance analytics.</p>
                        </div>
                        {renderDashboardContent()}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0D0D0D] flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-[#222] px-4 md:px-8 flex items-center justify-between z-10 transition-colors duration-300">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden"><Menu className="w-5 h-5" /></button>
                        <h1 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest">Workspace / Dashboard</h1>
                    </div>
                    <button onClick={() => fetchStats(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="w-full">
                        <div className="mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Workspace Overview</h2>
                            <p className="text-sm text-gray-500 mt-2">Key metrics and recent activity for your department's workflows.</p>
                        </div>
                        {renderDashboardContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}
