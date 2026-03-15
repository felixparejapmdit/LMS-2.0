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
    Users,
    Plus
} from "lucide-react";
import useAccess from "../../hooks/useAccess";

export default function Home() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const access = useAccess();
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
    const canField = access?.canField || (() => true);
    const canRefresh = canField("home", "refresh_button");
    const canQuickNewLetter = canField("home", "quick_new_letter_button");
    const canQuickTrays = canField("home", "quick_trays_button");

    const fetchStats = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const deptId = user?.dept_id?.id ?? user?.dept_id ?? null;
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/stats/dashboard?department_id=${deptId}`);
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
            const healthUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '') + '/health';
            const response = await axios.get(healthUrl);
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
        <div className={`p-6 rounded-[2rem] border transition-all hover:shadow-lg ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222] hover:border-gray-200' :
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
                <h3 className={`text-3xl font-black tracking-tight ${'text-slate-900 dark:text-white'}`}>
                    {value}
                </h3>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${'text-slate-400'}`}>
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
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading...</p>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <StatCard
                        title="Pending"
                        value={stats.activeTasks}
                        icon={Activity}
                        colorClass="text-blue-600 dark:text-blue-400"
                        bgClass="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <StatCard
                        title="Completed"
                        value={stats.archivedTasks}
                        icon={CheckCircle2}
                        colorClass="text-emerald-600 dark:text-emerald-400"
                        bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                    />
                    <StatCard
                        title="Users"
                        value={stats.totalUsers}
                        icon={Users}
                        colorClass="text-indigo-600 dark:text-indigo-400"
                        bgClass="bg-indigo-50 dark:bg-indigo-900/20"
                    />
                    <StatCard
                        title="Contacts"
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
                            <h2 className={`text-lg font-black uppercase tracking-tight ${'text-slate-900 dark:text-white'}`}>
                                New
                            </h2>
                            <button onClick={() => navigate('/inbox')} className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${'text-blue-600 hover:text-blue-700'}`}>
                                See All <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {stats.recentTasks.length === 0 ? (
                            <div className={`py-16 flex flex-col items-center justify-center rounded-[2.5rem] border ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                                <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No new letters</p>
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
                                        layout={layoutStyle}
                                    />
                                ))}
                            </div>
                        )}
                        {/* ATG Dashboard Letters */}
                        <div className="mt-12 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className={`text-lg font-black uppercase tracking-tight text-orange-500`}>
                                    Flagged
                                </h2>
                            </div>
                            {stats.atgLetters?.length === 0 ? (
                                <div className={`py-12 flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                                    <p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">No flagged letters</p>
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
                                            layout={layoutStyle}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel - Operations */}
                    <div className="space-y-6">
                        <div className={`p-6 md:p-8 rounded-[2.5rem] border overflow-hidden relative ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' :
                            layoutStyle === 'grid' ? 'bg-white dark:bg-[#141414] border-slate-100 dark:border-[#222]' :
                                'bg-indigo-600 border-none text-white shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/20'
                            }`}>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${'bg-indigo-500/10'}`}>
                                        <Activity className={`w-6 h-6 ${'text-indigo-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight">
                                            Online
                                        </p>
                                        <p className={`text-2xl font-black mt-1 ${'text-indigo-500'}`}>
                                            {stats.onlineUsers}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className={`p-6 rounded-[2rem] border ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${'text-gray-400'}`}>Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {canQuickNewLetter && (
                                    <button onClick={() => navigate('/new-letter')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${'bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222]'}`}>
                                        <FileText className={`w-5 h-5 ${'text-blue-500'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">New Letter</span>
                                    </button>
                                )}
                                {canQuickTrays && (
                                    <button onClick={() => navigate('/setup/trays')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors ${'bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222]'}`}>
                                        <Inbox className={`w-5 h-5 ${'text-blue-500'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Trays</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        );
    };

    if (layoutStyle === 'minimalist') {
        return (
            <div className="flex h-screen bg-[#F7F7F7] overflow-hidden font-sans">
                <Sidebar />
                <main className="flex-1 flex flex-col h-screen overflow-hidden">
                    <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-[#E5E5E5] dark:border-[#222] px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors duration-500">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dashboard</span>
                                <h1 className="text-xl font-black text-[#1A1A1B] dark:text-white tracking-tighter uppercase font-outfit">Dashboard</h1>
                            </div>
                        </div>
                        {canRefresh && (
                            <div className="flex items-center gap-4 hidden md:flex">
                                <button onClick={() => fetchStats(true)} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400">
                                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        )}
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-6 md:pt-10 custom-scrollbar">
                        <div className="w-full space-y-8 md:space-y-10 lg:space-y-12">
                            {/* Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                    <p className="text-[10px] font-black text-[#737373] uppercase tracking-[0.2em] mb-2">Active</p>
                                    <h3 className="text-3xl font-black text-[#1A1A1B] dark:text-white">{stats.activeTasks}</h3>
                                </div>
                                <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                    <p className="text-[10px] font-black text-[#737373] uppercase tracking-[0.2em] mb-2">Processed</p>
                                    <h3 className="text-3xl font-black text-[#1A1A1B] dark:text-white">{stats.archivedTasks}</h3>
                                </div>
                                <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                    <p className="text-[10px] font-black text-[#737373] uppercase tracking-[0.2em] mb-2">USERS</p>
                                    <h3 className="text-3xl font-black text-[#1A1A1B] dark:text-white">{stats.totalUsers}</h3>
                                </div>
                                <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                    <p className="text-[10px] font-black text-[#737373] uppercase tracking-[0.2em] mb-2">Contacts</p>
                                    <h3 className="text-3xl font-black text-[#1A1A1B] dark:text-white">{stats.totalPeople}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222] pb-4">
                                        <h2 className="text-xs font-black text-[#1A1A1B] dark:text-white uppercase tracking-[0.3em]">Recent</h2>
                                        <button onClick={() => navigate('/inbox')} className="text-[10px] font-black text-[#737373] hover:text-[#1A1A1B] uppercase tracking-widest transition-colors flex items-center gap-1">
                                            See All <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {stats.recentTasks.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-[#111] rounded-3xl border border-[#E5E5E5] dark:border-[#222] border-dashed">
                                            <p className="text-[10px] font-black text-[#737373] uppercase tracking-widest">Nothing recent</p>
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
                                                    layout="minimalist"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* ATG Section */}
                                    {stats.atgLetters?.length > 0 && (
                                        <div className="mt-12 space-y-6">
                                            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222] pb-4">
                                                <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.3em]">Flagged</h2>
                                            </div>
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
                                                        layout="minimalist"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                        <h3 className="text-[10px] font-black text-[#1A1A1B] dark:text-white uppercase tracking-[0.2em] mb-6">Quick Actions</h3>
                                        <div className="space-y-4">
                                            {canQuickNewLetter && (
                                                <button onClick={() => navigate('/new-letter')} className="w-full flex items-center justify-between p-4 bg-[#F7F7F7] dark:bg-white/5 rounded-xl hover:bg-[#E5E5E5] dark:hover:bg-white/10 transition-colors group">
                                                    <span className="text-[10px] font-black text-[#737373] group-hover:text-[#1A1A1B] dark:group-hover:text-white uppercase tracking-widest">New</span>
                                                    <Plus className="w-4 h-4 text-[#737373]" />
                                                </button>
                                            )}
                                            {canQuickTrays && (
                                                <button onClick={() => navigate('/setup/trays')} className="w-full flex items-center justify-between p-4 bg-[#F7F7F7] dark:bg-white/5 rounded-xl hover:bg-[#E5E5E5] dark:hover:bg-white/10 transition-colors group">
                                                    <span className="text-[10px] font-black text-[#737373] group-hover:text-[#1A1A1B] dark:group-hover:text-white uppercase tracking-widest">Trays</span>
                                                    <Inbox className="w-4 h-4 text-[#737373]" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-[#222] px-4 md:px-8 flex items-center justify-between z-10 transition-colors duration-300">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden"><Menu className="w-5 h-5" /></button>
                        <h1 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest">Home</h1>
                    </div>
                    {canRefresh && <button onClick={() => fetchStats(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></button>}
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="w-full">
                        {renderDashboardContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}
