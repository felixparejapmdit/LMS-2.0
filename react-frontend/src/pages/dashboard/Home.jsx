import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import LetterCard from "../../components/LetterCard";
import axios from "axios";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
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
    Plus,
    History,
    AlertTriangle,
    PieChart
} from "lucide-react";
import useAccess from "../../hooks/useAccess";
import API_BASE from "../../config/apiConfig";

export default function Home() {
    const { user } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();
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
        atgLettersCount: 0,
        overdueTasks: [],
        recentActivityLogs: [],
        taskDistribution: []
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [systemStatus, setSystemStatus] = useState({ isOnline: false, uptime: 0 });
    const canField = access?.canField || (() => true);
    const canRefresh = canField("home", "refresh_button");
    const canQuickNewLetter = canField("home", "quick_new_letter_button");
    const canQuickTrays = canField("home", "quick_trays_button");

    const fetchStats = async (showRefresh = false, retryCount = 0) => {
        if (!user?.id) return;
        if (showRefresh) setRefreshing(true);
        
        try {
            const deptId = user?.dept_id?.id ?? user?.dept_id ?? null;
            const roleName = user?.roleData?.name || user?.role || '';
            const response = await axios.get(`${API_BASE}/stats/dashboard`, {
                params: {
                    department_id: deptId,
                    role: roleName
                }
            });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error.message);
            // Retry for aborted/network issues specifically for Brave stability
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message.includes('aborted'))) {
                console.log(`Retrying fetch stats... (${retryCount + 1})`);
                setTimeout(() => fetchStats(showRefresh, retryCount + 1), 1000);
            }
        } finally {
            if (retryCount === 0 || retryCount >= 2) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    const checkHealth = async () => {
        try {
            const healthUrl = API_BASE.replace(/\/api$/, '') + '/health';
            const response = await axios.get(healthUrl);
            setSystemStatus({ isOnline: response.data.status === 'OK', uptime: response.data.uptime });
        } catch (error) {
            setSystemStatus({ isOnline: false, uptime: 0 });
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchStats();

            // Sync stats every 60s
            const interval = setInterval(() => fetchStats(), 60000);
            return () => clearInterval(interval);
        }
    }, [user?.id]);

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

    const SideWidgets = () => {
        let totalStats = stats.taskDistribution?.reduce((s, d) => s + d.value, 0) || 1;
        let angle = 0;
        const colors = ['#3B82F6', '#F97316', '#10B981', '#6366F1', '#8B5CF6', '#EF4444'];

        return (
            <div className="space-y-6">
                {/* Visual Breakdown Donut Chart */}
                <div className={`p-6 rounded-[2rem] border ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-400">
                        <PieChart className="w-4 h-4 text-indigo-500" /> Pipeline Stats
                    </h3>
                    {stats.taskDistribution?.length === 0 ? (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-6">No data</p>
                    ) : (
                        <div className="flex flex-col items-center">
                            <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90 drop-shadow-sm">
                                <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-slate-100 dark:stroke-[#222]" strokeWidth="15" />
                                {stats.taskDistribution.map((d, i) => {
                                    const percentage = (d.value / totalStats);
                                    const strokeDasharray = `${percentage * 251.2} 251.2`;
                                    const strokeDashoffset = `-${angle * 251.2}`;
                                    angle += percentage;
                                    return (
                                        <circle key={d.name} cx="50" cy="50" r="40" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="15"
                                            strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                                    );
                                })}
                            </svg>
                            <div className="mt-6 w-full space-y-2.5">
                                {stats.taskDistribution.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }}></span>
                                            <span className="text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[120px]">{d.name}</span>
                                        </div>
                                        <span className="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-lg">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Overdue Deadlines */}
                <div className={`p-6 rounded-[2rem] border ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-red-100 dark:border-red-900/30' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4" /> Urgent & Overdue
                    </h3>
                    {stats.overdueTasks?.length === 0 ? (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-4">All clear</p>
                    ) : (
                        <div className="space-y-2">
                            {stats.overdueTasks?.map(t => (
                                <Link to={`/letter/${t.id}`} key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111] rounded-xl border border-red-100 dark:border-red-900/30 hover:border-red-300 transition-colors shadow-sm">
                                    <div className="flex flex-col truncate w-[65%]">
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{t.sender}</span>
                                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest truncate">{t.lms_id}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded-lg shadow-sm whitespace-nowrap">
                                        {Math.floor((new Date() - new Date(t.date_received || t.created_at)) / (1000 * 60 * 60 * 24))} Days
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>


            </div>
        );
    };

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
                                Recent Activity
                            </h2>
                            <button onClick={() => navigate('/inbox')} className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${'text-blue-600 hover:text-blue-700'}`}>
                                See All <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {stats.recentActivityLogs?.length === 0 ? (
                            <div className={`py-16 flex flex-col items-center justify-center rounded-[2.5rem] border ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No recent activity</p>
                            </div>
                        ) : (
                            <div className={`p-6 rounded-[2rem] border ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                                <div className="relative pl-3.5 border-l-2 border-slate-100 dark:border-[#333] space-y-6 pt-1">
                                    {stats.recentActivityLogs?.map(log => {
                                        const minAgo = Math.floor((new Date() - new Date(log.timestamp)) / 60000);
                                        const timeStr = minAgo < 60 ? `${minAgo} min${minAgo !== 1 ? 's' : ''}` : minAgo < 1440 ? `${Math.floor(minAgo / 60)} hr${Math.floor(minAgo / 60) !== 1 ? 's' : ''}` : `${Math.floor(minAgo / 1440)} d`;
                                        return (
                                            <div key={log.id} className="relative">
                                                <div className={`absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full ${layoutStyle === 'notion' ? 'ring-white dark:ring-[#191919]' : 'ring-white dark:ring-[#141414]'} bg-blue-500 ring-4`}></div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">
                                                    <span className="font-bold text-gray-900 dark:text-white mr-1">{log.user?.first_name || 'System'}</span>
                                                    {log.action_type}{' '}
                                                    {log.Letter?.lms_id && <span className="font-bold text-blue-500 ml-1 bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded">{log.Letter.lms_id}</span>}
                                                </p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1.5">
                                                    {timeStr} ago
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {/* ATG Dashboard Letters */}
                        <div className="mt-12 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className={`text-lg font-black uppercase tracking-tight text-orange-500`}>
                                    VIP View
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
                                            status={assignment.letter?.status?.status_name || 'ATG Note'}
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
                        <SideWidgets />
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
                                        <h2 className="text-xs font-black text-[#1A1A1B] dark:text-white uppercase tracking-[0.3em]">Recent Activity</h2>
                                        <button onClick={() => navigate('/inbox')} className="text-[10px] font-black text-[#737373] hover:text-[#1A1A1B] uppercase tracking-widest transition-colors flex items-center gap-1">
                                            See All <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {stats.recentActivityLogs?.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-[#111] rounded-3xl border border-[#E5E5E5] dark:border-[#222] border-dashed">
                                            <p className="text-[10px] font-black text-[#737373] uppercase tracking-widest">Nothing recent</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-[#111] p-6 md:p-8 rounded-3xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                            <div className="relative pl-3.5 border-l-2 border-[#E5E5E5] dark:border-[#222] space-y-6 pt-1">
                                                {stats.recentActivityLogs?.map(log => {
                                                    const minAgo = Math.floor((new Date() - new Date(log.timestamp)) / 60000);
                                                    const timeStr = minAgo < 60 ? `${minAgo} min${minAgo !== 1 ? 's' : ''}` : minAgo < 1440 ? `${Math.floor(minAgo / 60)} hr${Math.floor(minAgo / 60) !== 1 ? 's' : ''}` : `${Math.floor(minAgo / 1440)} d`;
                                                    return (
                                                        <div key={log.id} className="relative">
                                                            <div className="absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#111]"></div>
                                                            <p className="text-sm text-[#737373] dark:text-gray-400 leading-snug">
                                                                <span className="font-bold text-[#1A1A1B] dark:text-white mr-1">{log.user?.first_name || 'System'}</span>
                                                                {log.action_type}{' '}
                                                                {log.Letter?.lms_id && <span className="font-bold text-blue-500 ml-1 bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded-md">{log.Letter.lms_id}</span>}
                                                            </p>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#737373] mt-2">
                                                                {timeStr} ago
                                                            </p>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* ATG Section */}
                                    {stats.atgLetters?.length > 0 && (
                                        <div className="mt-12 space-y-6">
                                            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222] pb-4">
                                                <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.3em]">VIP View</h2>
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
                                                        status={assignment.letter?.status?.status_name || 'ATG Note'}
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
                                    <SideWidgets />
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
