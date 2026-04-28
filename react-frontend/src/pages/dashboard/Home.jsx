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
    PieChart,
    Layers,
    ArrowRightLeft,
    ShieldCheck,
    Contact,
    Building2,
    HelpCircle
} from "lucide-react";
import TutorialGuide from "../../components/TutorialGuide";
import useAccess from "../../hooks/useAccess";
import API_BASE from "../../config/apiConfig";

export default function Home() {
    const { user, isSuperAdmin } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();
    const access = useAccess();
    const navigate = useNavigate();
    const { startTutorial } = useUI();
    const [stats, setStats] = useState({
        activeTasks: 0,
        archivedTasks: 0,
        onlineUsers: 0,
        totalUsers: 0,
        totalPeople: 0,
        totalDepartments: 0,
        recentTasks: [],
        atgLetters: [],
        atgLettersCount: 0,
        overdueTasks: [],
        recentActivityLogs: [],
        taskDistribution: [],
        statusDistribution: [],
        letterTypeDistribution: []
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState('today');
    const [systemStatus, setSystemStatus] = useState({ isOnline: false, uptime: 0 });
    const canField = access?.canField || (() => true);
    const canRefresh = canField("home", "refresh_button");
    const canQuickNewLetter = canField("home", "quick_new_letter_button");
    const canQuickTrays = canField("home", "quick_trays_button") || isSuperAdmin;
    const canQuickSetup = isSuperAdmin;

    const fetchStats = async (showRefresh = false, retryCount = 0) => {
        if (!user?.id) return;
        if (showRefresh) setRefreshing(true);

        try {
            const deptId = user?.dept_id?.id ?? user?.dept_id ?? null;
            const roleName = user?.roleData?.name || user?.role || '';
            const response = await axios.get(`${API_BASE}/stats/dashboard`, {
                params: {
                    user_id: user.id,
                    department_id: deptId,
                    role: roleName,
                    full_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
                    period
                }
            });
            setStats(response.data);
            console.log("[STATS] Dashboard response:", response.data);
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
            fetchStats(true); // show refresh indicator when changing period

            // Sync stats every 60s
            const interval = setInterval(() => fetchStats(), 60000);
            return () => clearInterval(interval);
        }
    }, [user?.id, period]);

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = seconds % 60;
        return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
    };

    const StatCard = ({ title, value, icon: Icon, gradientClass, iconColorClass, trend }) => (
        <div className={`p-6 rounded-[2rem] border relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl ${gradientClass} border-transparent text-white shadow-lg`}>
            {/* Background Icon with Opacity */}
            <div className="absolute -right-4 -bottom-4 opacity-20 transform -rotate-12">
                <Icon className="w-32 h-32" />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-md shrink-0`}>
                        <Icon className={`w-6 h-6 text-white`} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded-lg text-xs font-bold">
                            <TrendingUp className="w-3 h-3" />
                            {trend}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-4xl font-black tracking-tight drop-shadow-sm">
                        {value}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">
                        {title}
                    </p>
                </div>
            </div>
        </div>
    );

    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

    const SummaryChart = ({ title, data, icon: Icon, gradientFrom = 'from-indigo-600', gradientTo = 'to-violet-500', colorClass = "text-indigo-500", onItemClick }) => {
        const total = data?.reduce((acc, d) => acc + d.value, 0) || 0;
        const allZero = data?.length > 0 && total === 0;
        let cumulativeAngle = 0;

        return (
            <div className={`rounded-[2rem] border border-transparent shadow-lg relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-xl`}>
                {/* Gradient Header — mirrors the stat cards */}
                <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} p-5 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-md shrink-0">
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">{title}</span>
                    </div>
                    <span className="text-2xl font-black text-white">{total}</span>
                </div>

                {/* Body */}
                <div className={`p-5 ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : 'bg-white dark:bg-[#141414]'}`}>
                    {(!data || data.length === 0) ? (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-8">No data</p>
                    ) : (
                        <div className="flex gap-4 items-start">
                            {/* Donut */}
                            <div className="relative shrink-0 w-24 h-24">
                                <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90 drop-shadow-sm">
                                    <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-slate-100 dark:stroke-[#333]" strokeWidth="15" />
                                    {!allZero && data.map((d, i) => {
                                        const percentage = total > 0 ? (d.value / total) : 0;
                                        const strokeDasharray = `${percentage * 251.2} 251.2`;
                                        const strokeDashoffset = `-${cumulativeAngle * 251.2}`;
                                        cumulativeAngle += percentage;
                                        return (
                                            <circle key={d.name} cx="50" cy="50" r="40" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="15"
                                                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                                        );
                                    })}
                                </svg>
                                {/* Center label when all zero */}
                                {allZero && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-lg font-black text-gray-300 dark:text-gray-600">0</span>
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-2 min-w-0">
                                {data.map((d, i) => (
                                    <div key={d.name}
                                        onClick={() => onItemClick && d.value > 0 && onItemClick(d.name)}
                                        className={`flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${onItemClick && d.value > 0 ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10' : ''}`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: allZero ? '#d1d5db' : colors[i % colors.length] }}></span>
                                            <span className={`truncate ${allZero ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>{d.name}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg shrink-0 ${allZero ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5' : 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/5'}`}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    const SideWidgets = () => {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="today">Today</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <SummaryChart
                        title="Group Summary"
                        data={stats.taskDistribution}
                        icon={PieChart}
                        gradientFrom="from-indigo-600"
                        gradientTo="to-violet-500"
                        onItemClick={(name) => navigate(`/letter-tracker?group=${encodeURIComponent(name)}&period=${period}`)}
                    />
                    <SummaryChart
                        title="Status Summary"
                        data={stats.statusDistribution}
                        onItemClick={(name) => navigate(`/letter-tracker?status=${encodeURIComponent(name)}&period=${period}`)}
                        icon={Activity}
                        gradientFrom="from-emerald-600"
                        gradientTo="to-teal-500"
                        colorClass="text-emerald-500"
                    />
                </div>
            </div>
        );
    };


    const OverdueWidget = () => (
        <div className={`p-6 rounded-[2rem] border ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-red-100 dark:border-red-900/30' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" /> Urgent & Overdue
            </h3>
            <p className="text-[9px] font-bold text-red-900/40 dark:text-red-400/40 uppercase tracking-widest mb-4 leading-relaxed">
                Pending letters older than 5 days
            </p>
            {stats.overdueTasks?.length === 0 ? (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-4">All clear</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                {/* 1. Group and Status Cards (SideWidgets) on top */}
                <SideWidgets />

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
                                                    {log.Letter?.lms_id && (
                                                        <Link to={`/letter/${log.Letter.id}`} className="font-bold text-blue-500 ml-1 bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                                            {log.Letter.lms_id}
                                                        </Link>
                                                    )}
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

                        <OverdueWidget />

                        {/* ATG Dashboard Letters REMOVED as per user request */}
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
                                    <button onClick={() => navigate('/new-letter')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'}`}>
                                        <FileText className={`w-5 h-5 ${'text-blue-500'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">New Letter</span>
                                    </button>
                                )}
                                {canQuickTrays && (
                                    <button onClick={() => navigate('/setup/trays')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${'bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20'}`}>
                                        <Inbox className={`w-5 h-5 ${'text-indigo-500'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Trays</span>
                                    </button>
                                )}
                                {canQuickSetup && (
                                    <>
                                        <button onClick={() => navigate('/setup/statuses')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'}`}>
                                            <ShieldCheck className={`w-5 h-5 ${'text-emerald-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Statuses</span>
                                        </button>
                                        <button onClick={() => navigate('/setup/process-steps')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20'}`}>
                                            <ArrowRightLeft className={`w-5 h-5 ${'text-orange-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">Group</span>
                                        </button>
                                        <button onClick={() => navigate('/setup/letter-kinds')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${'bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20'}`}>
                                            <Layers className={`w-5 h-5 ${'text-purple-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">Kinds</span>
                                        </button>
                                        <button onClick={() => navigate('/setup/departments')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${'bg-teal-50/50 dark:bg-teal-900/10 hover:bg-teal-100 dark:hover:bg-teal-900/20'}`}>
                                            <Building2 className={`w-5 h-5 ${'text-teal-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Depts</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Consolidated Metrics Card */}
                        <div className={`p-6 rounded-[2rem] border ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${'text-gray-400'}`}>Metrics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{stats.activeTasks}</p>
                                        <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">Active</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <div>
                                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{stats.archivedTasks}</p>
                                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Processed</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    <div>
                                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{stats.totalUsers}</p>
                                        <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">Users</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 dark:bg-orange-900/10">
                                    <Building2 className="w-4 h-4 text-orange-500" />
                                    <div>
                                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{stats.totalDepartments || stats.totalDepartment || 0}</p>
                                        <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-0.5">Departments</p>
                                    </div>
                                </div>
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
                            <div className="flex items-center gap-2 hidden md:flex">
                                <button
                                    id="btn-help"
                                    onClick={startTutorial}
                                    className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400 group"
                                    title="Open Tutorial"
                                >
                                    <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                                <button onClick={() => fetchStats(true)} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400">
                                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        )}
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-6 md:pt-10 custom-scrollbar">
                        <div className="w-full space-y-8 md:space-y-10 lg:space-y-12">
                            {/* Group and Status Cards (SideWidgets) on top */}
                            <SideWidgets />

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
                                                                {log.Letter?.lms_id && (
                                                                    <Link to={`/letter/${log.Letter.id}`} className="font-bold text-blue-500 ml-1 bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                                                        {log.Letter.lms_id}
                                                                    </Link>
                                                                )}
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
                                    <div className="mt-8">
                                        <OverdueWidget />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                        <h3 className="text-[10px] font-black text-[#1A1A1B] dark:text-white uppercase tracking-[0.2em] mb-6">Quick Actions</h3>
                                        <div className="space-y-4">
                                            {canQuickNewLetter && (
                                                <button onClick={() => navigate('/new-letter')} className="w-full flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all group">
                                                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">New Letter</span>
                                                    <Plus className="w-4 h-4 text-blue-500" />
                                                </button>
                                            )}
                                            {canQuickTrays && (
                                                <button onClick={() => navigate('/setup/trays')} className="w-full flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all group">
                                                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Trays</span>
                                                    <Inbox className="w-4 h-4 text-indigo-500" />
                                                </button>
                                            )}
                                            {canQuickSetup && (
                                                <>
                                                    <button onClick={() => navigate('/setup/statuses')} className="w-full flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all group">
                                                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">Statuses</span>
                                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                    </button>
                                                    <button onClick={() => navigate('/setup/process-steps')} className="w-full flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all group">
                                                        <span className="text-[10px] font-black text-orange-700 dark:text-orange-300 uppercase tracking-widest">Group</span>
                                                        <ArrowRightLeft className="w-4 h-4 text-orange-500" />
                                                    </button>
                                                    <button onClick={() => navigate('/setup/letter-kinds')} className="w-full flex items-center justify-between p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-all group">
                                                        <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest">Kinds</span>
                                                        <Layers className="w-4 h-4 text-purple-500" />
                                                    </button>
                                                    <button onClick={() => navigate('/setup/departments')} className="w-full flex items-center justify-between p-4 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/20 transition-all group">
                                                        <span className="text-[10px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-widest">Depts</span>
                                                        <Building2 className="w-4 h-4 text-teal-500" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Consolidated Metrics Card */}
                                    <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                        <h3 className="text-[10px] font-black text-[#1A1A1B] dark:text-white uppercase tracking-[0.2em] mb-6">Metrics</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
                                                <Activity className="w-4 h-4 text-blue-500" />
                                                <div>
                                                    <p className="text-lg font-black text-[#1A1A1B] dark:text-white leading-none">{stats.activeTasks}</p>
                                                    <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">Active</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <div>
                                                    <p className="text-lg font-black text-[#1A1A1B] dark:text-white leading-none">{stats.archivedTasks}</p>
                                                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Processed</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10">
                                                <Users className="w-4 h-4 text-indigo-500" />
                                                <div>
                                                    <p className="text-lg font-black text-[#1A1A1B] dark:text-white leading-none">{stats.totalUsers}</p>
                                                    <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">Users</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 dark:bg-orange-900/10">
                                                <Building2 className="w-4 h-4 text-orange-500" />
                                                <div>
                                                    <p className="text-lg font-black text-[#1A1A1B] dark:text-white leading-none">{stats.totalDepartments || stats.totalDepartment || 0}</p>
                                                    <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-0.5">Departments</p>
                                                </div>
                                            </div>
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
                    {canRefresh && (
                        <div className="flex items-center gap-2">
                            <button
                                id="btn-help"
                                onClick={startTutorial}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all group"
                                title="Open Tutorial"
                            >
                                <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                            <button onClick={() => fetchStats(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all">
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    )}
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
