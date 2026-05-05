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
    Shield,
    Contact,
    Building2,
    HelpCircle
} from "lucide-react";
import useAccess from "../../hooks/useAccess";
import API_BASE from "../../config/apiConfig";
import { getAssetUrl } from "../../hooks/useDirectus";
import TutorialGuide from "../../components/TutorialGuide";

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

    const currentDate = new Date();
    const getWeekNumber = (d) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    };

    const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
    const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1);
    const [filterWeek, setFilterWeek] = useState(getWeekNumber(currentDate));

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
                    period,
                    year: filterYear,
                    month: filterMonth,
                    week: filterWeek
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
    }, [user?.id, period, filterYear, filterMonth, filterWeek]);

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

    const SummaryChart = ({ title, data, icon: Icon, gradientFrom = 'from-indigo-600', gradientTo = 'to-violet-500', onItemClick }) => {
        const [hoveredIndex, setHoveredIndex] = useState(null);
        const total = data?.reduce((acc, d) => acc + d.value, 0) || 0;
        const allZero = data?.length > 0 && total === 0;
        let cumulativeAngle = 0;

        // Icon mapping for legend items
        const getLabelIcon = (name) => {
            const n = name.toLowerCase();
            if (n.includes('incoming')) return Inbox;
            if (n.includes('review')) return History;
            if (n.includes('signature')) return ShieldCheck;
            if (n.includes('pending')) return Clock;
            if (n.includes('done')) return CheckCircle2;
            if (n.includes('endorsed')) return Zap;
            if (n.includes('vip')) return Star;
            return Layers;
        };

        return (
            <div className={`rounded-[2.5rem] border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-[15px] shadow-2xl relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-indigo-500/10 group`}>
                {/* Header */}
                <div className="p-6 pb-2 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradientFrom} ${gradientTo} shadow-lg shadow-indigo-500/20`}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">{title}</span>
                            <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-transparent mt-1 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 pt-2">
                    {(!data || data.length === 0) ? (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-12">No metrics available</p>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            {/* Donut Column */}
                            <div className="relative shrink-0 w-32 h-32 flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                                    {/* Definitions for Gradients */}
                                    <defs>
                                        {data.map((_, i) => (
                                            <linearGradient key={`grad-${i}`} id={`grad-${title.replace(/\s+/g, '')}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor={colors[i % colors.length]} />
                                                <stop offset="100%" stopColor={colors[(i + 1) % colors.length]} stopOpacity="0.8" />
                                            </linearGradient>
                                        ))}
                                    </defs>

                                    <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-slate-100/50 dark:stroke-white/5" strokeWidth="12" />
                                    {!allZero && data.map((d, i) => {
                                        const percentage = total > 0 ? (d.value / total) : 0;
                                        const strokeDasharray = `${percentage * 251.2} 251.2`;
                                        const strokeDashoffset = `-${cumulativeAngle * 251.2}`;
                                        cumulativeAngle += percentage;
                                        const isHovered = hoveredIndex === i;

                                        return (
                                            <circle
                                                key={d.name}
                                                cx="50" cy="50" r="40"
                                                fill="transparent"
                                                stroke={`url(#grad-${title.replace(/\s+/g, '')}-${i})`}
                                                strokeWidth={isHovered ? 16 : 12}
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                className="transition-all duration-500 ease-out cursor-help"
                                                onMouseEnter={() => setHoveredIndex(i)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                                opacity={d.value === 0 ? 0 : 1}
                                            />
                                        );
                                    })}
                                </svg>
                                {/* Center label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{total}</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest -mt-1">Total</span>
                                </div>
                            </div>

                            {/* Legend Column */}
                            <div className="flex-1 space-y-3 min-w-0 w-full">
                                {data.map((d, i) => {
                                    const percentage = total > 0 ? (d.value / total * 100) : 0;
                                    const LabelIcon = getLabelIcon(d.name);
                                    const isHovered = hoveredIndex === i;
                                    const isActive = d.value > 0;

                                    return (isActive || d.value === 0) && (
                                        <div key={d.name}
                                            onMouseEnter={() => setHoveredIndex(i)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            onClick={() => onItemClick && isActive && onItemClick(d.name)}
                                            className={`group/item flex flex-col gap-1 transition-all duration-300 ${!isActive ? 'opacity-30 grayscale' : 'opacity-100'} ${isHovered ? 'translate-x-1' : ''} ${isActive ? 'cursor-pointer' : ''}`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform ${isHovered ? 'scale-110 rotate-3' : ''}`} style={{ backgroundColor: `${colors[i % colors.length]}15`, border: `1px solid ${colors[i % colors.length]}30` }}>
                                                        <LabelIcon className="w-3 h-3" style={{ color: colors[i % colors.length] }} />
                                                    </div>
                                                    <span className={`text-xs font-black uppercase tracking-widest truncate ${isHovered ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {d.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-gray-900 dark:text-white">{d.value}</span>
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-1000 ease-out"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: colors[i % colors.length],
                                                        boxShadow: isHovered ? `0 0 10px ${colors[i % colors.length]}50` : 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
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
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/80 dark:bg-[#141414]/80 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-white/5 w-max overflow-x-auto no-scrollbar shadow-inner">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'weekly', label: 'Weekly' },
                            { id: 'monthly', label: 'Monthly' },
                            { id: 'yearly', label: 'Yearly' },
                            { id: 'all', label: 'All Time' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setPeriod(tab.id)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase transition-all duration-300 relative overflow-hidden group ${period === tab.id
                                        ? 'text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
                                    }`}
                            >
                                {period === tab.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl" />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    {period === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {period === 'weekly' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                            <input
                                type="number"
                                min="1"
                                max="53"
                                value={filterWeek}
                                onChange={(e) => setFilterWeek(e.target.value)}
                                className="w-20 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-[#222] bg-white dark:bg-[#141414] focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                                placeholder="Week"
                            />
                            <input
                                type="number"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="w-24 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-[#222] bg-white dark:bg-[#141414] focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                                placeholder="Year"
                            />
                        </div>
                    )}

                    {period === 'monthly' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-[#222] bg-white dark:bg-[#141414] focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all cursor-pointer"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="w-24 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-[#222] bg-white dark:bg-[#141414] focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                                placeholder="Year"
                            />
                        </div>
                    )}

                    {period === 'yearly' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                            <input
                                type="number"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="w-24 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-[#222] bg-white dark:bg-[#141414] focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                                placeholder="Year"
                            />
                        </div>
                    )}
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
        <div className={`p-10 rounded-[3rem] bg-white dark:bg-[#141414] border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden group`}>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-red-600 dark:text-red-400">Urgent & Overdue</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Pending for more than 5 days
                        </p>
                    </div>
                </div>
                {stats.overdueTasks?.length > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-red-600 dark:text-red-400 leading-none">{stats.overdueTasks.length}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Items</span>
                    </div>
                )}
            </div>

            {stats.overdueTasks?.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-white/10">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400/20 mb-4" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No overdue items found</p>
                </div>
            ) : (
                <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                                <th className="pb-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                                <th className="pb-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Sender / Source</th>
                                <th className="pb-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Urgency</th>
                                <th className="pb-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {stats.overdueTasks?.map(t => {
                                const days = Math.floor((new Date() - new Date(t.date_received || t.created_at)) / (1000 * 60 * 60 * 24));
                                return (
                                    <tr
                                        key={t.id}
                                        onClick={() => navigate(`/letter/${t.id}`)}
                                        className="group/row hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        <td className="py-6">
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-lg group-hover/row:bg-red-500 group-hover/row:text-white transition-all">
                                                {t.lms_id}
                                            </span>
                                        </td>
                                        <td className="py-6">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{t.sender}</p>
                                        </td>
                                        <td className="py-6 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[8px] font-black rounded-lg uppercase tracking-widest">
                                                <Zap className="w-3 h-3" />
                                                High Priority
                                            </span>
                                        </td>
                                        <td className="py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xl font-black text-red-600 dark:text-red-400 leading-none group-hover/row:scale-110 transition-transform">{days}</span>
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Days Overdue</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );



    const AuditLogsWidget = () => {
        const [logs, setLogs] = useState([]);
        const [widgetLoading, setWidgetLoading] = useState(true);

        useEffect(() => {
            const fetchLogs = async () => {
                try {
                    const res = await axios.get(`${API_BASE}/audit-logs`, {
                        params: { page: 1, limit: 10 }
                    });
                    setLogs(res.data.data || []);
                } catch (err) {
                    console.error("Failed to fetch audit logs:", err);
                } finally {
                    setWidgetLoading(false);
                }
            };
            fetchLogs();
        }, []);

        return (
            <div className={`p-6 md:p-8 rounded-[2.5rem] border overflow-hidden relative ${layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' :
                layoutStyle === 'grid' ? 'bg-white dark:bg-[#141414] border-slate-100 dark:border-[#222]' :
                    'bg-white dark:bg-[#141414] border-gray-100 dark:border-white/5 shadow-sm'
                }`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/10 flex items-center justify-center text-violet-500">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Audit Logs</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Users Log</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/setup/audit-logs')} className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-1">
                        See All <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="space-y-4">
                    {widgetLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-xs text-center font-bold text-gray-400 uppercase tracking-widest py-8">No audit logs found</p>
                    ) : (
                        <div className="space-y-3">
                            {logs.map(log => (
                                <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-white/10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-gray-400 shrink-0 overflow-hidden">
                                            {log.user?.avatar ? (
                                                <img src={getAssetUrl(log.user?.avatar, "?width=80&height=80&fit=cover")} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <User className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {log.user_name || 'System'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-mono font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded truncate">
                                                    {log.ip_address}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 pl-2">
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="text-[9px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest">
                                            {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                </div>
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
                {/* 1. Group and Status Cards (SideWidgets) on top */}
                <SideWidgets />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    {/* Main Content - Recent Work */}
                    <div className="lg:col-span-2 space-y-8">
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

                        {/* Audit Logs Widget */}
                        <AuditLogsWidget />

                        {/* Quick Actions */}
                        <div className={`p-8 rounded-[2.5rem] border bg-white dark:bg-[#141414] border-gray-100 dark:border-white/5 shadow-sm`}>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {canQuickNewLetter && (
                                    <button onClick={() => navigate('/new-letter')} className="group flex flex-col items-center justify-center p-6 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-50/50 dark:border-blue-900/20 hover:bg-blue-500 hover:border-blue-500 transition-all duration-300">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300 group-hover:text-white transition-colors">New Letter</span>
                                    </button>
                                )}
                                {canQuickTrays && (
                                    <button onClick={() => navigate('/setup/trays')} className="group flex flex-col items-center justify-center p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-indigo-50/50 dark:border-indigo-900/20 hover:bg-indigo-500 hover:border-indigo-500 transition-all duration-300">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                            <Inbox className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 group-hover:text-white transition-colors">Digital Tray</span>
                                    </button>
                                )}
                                {canQuickSetup && (
                                    <>
                                        <button onClick={() => navigate('/setup/statuses')} className="group flex flex-col items-center justify-center p-6 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border border-emerald-50/50 dark:border-emerald-900/20 hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-300">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 group-hover:text-white transition-colors">Statuses</span>
                                        </button>
                                        <button onClick={() => navigate('/setup/process-steps')} className="group flex flex-col items-center justify-center p-6 bg-orange-50/30 dark:bg-orange-900/10 rounded-2xl border border-orange-50/50 dark:border-orange-900/20 hover:bg-orange-500 hover:border-orange-500 transition-all duration-300">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                <ArrowRightLeft className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300 group-hover:text-white transition-colors">Workflow</span>
                                        </button>
                                        <button onClick={() => navigate('/setup/letter-kinds')} className="group flex flex-col items-center justify-center p-6 bg-purple-50/30 dark:bg-purple-900/10 rounded-2xl border border-purple-50/50 dark:border-purple-900/20 hover:bg-purple-500 hover:border-purple-500 transition-all duration-300">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                <Layers className="w-5 h-5 text-purple-500" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300 group-hover:text-white transition-colors">Categories</span>
                                        </button>
                                        <button onClick={() => navigate('/setup/departments')} className="group flex flex-col items-center justify-center p-6 bg-teal-50/30 dark:bg-teal-900/10 rounded-2xl border border-teal-50/50 dark:border-teal-900/20 hover:bg-teal-500 hover:border-teal-500 transition-all duration-300">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                <Building2 className="w-5 h-5 text-teal-500" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300 group-hover:text-white transition-colors">Dept Setup</span>
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
                                        <AuditLogsWidget />
                                    </div>

                                    <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-[#E5E5E5] dark:border-[#222] shadow-sm">
                                        <h3 className="text-[10px] font-black text-[#1A1A1B] dark:text-white uppercase tracking-[0.3em] mb-8 text-center">Quick Actions</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {canQuickNewLetter && (
                                                <button onClick={() => navigate('/new-letter')} className="group flex flex-col items-center justify-center p-6 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-50/50 dark:border-blue-900/20 hover:bg-blue-500 hover:border-blue-500 transition-all duration-300">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                        <FileText className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300 group-hover:text-white transition-colors">New Letter</span>
                                                </button>
                                            )}
                                            {canQuickTrays && (
                                                <button onClick={() => navigate('/setup/trays')} className="group flex flex-col items-center justify-center p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-indigo-50/50 dark:border-indigo-900/20 hover:bg-indigo-500 hover:border-indigo-500 transition-all duration-300">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                        <Inbox className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 group-hover:text-white transition-colors">Trays</span>
                                                </button>
                                            )}
                                            {canQuickSetup && (
                                                <>
                                                    <button onClick={() => navigate('/setup/statuses')} className="group flex flex-col items-center justify-center p-6 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border border-emerald-50/50 dark:border-emerald-900/20 hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-300">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 group-hover:text-white transition-colors">Statuses</span>
                                                    </button>
                                                    <button onClick={() => navigate('/setup/process-steps')} className="group flex flex-col items-center justify-center p-6 bg-orange-50/30 dark:bg-orange-900/10 rounded-2xl border border-orange-50/50 dark:border-orange-900/20 hover:bg-orange-500 hover:border-orange-500 transition-all duration-300">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                            <ArrowRightLeft className="w-5 h-5 text-orange-500" />
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300 group-hover:text-white transition-colors">Workflow</span>
                                                    </button>
                                                    <button onClick={() => navigate('/setup/letter-kinds')} className="group flex flex-col items-center justify-center p-6 bg-purple-50/30 dark:bg-purple-900/10 rounded-2xl border border-purple-50/50 dark:border-purple-900/20 hover:bg-purple-500 hover:border-purple-500 transition-all duration-300">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                            <Layers className="w-5 h-5 text-purple-500" />
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300 group-hover:text-white transition-colors">Categories</span>
                                                    </button>
                                                    <button onClick={() => navigate('/setup/departments')} className="group flex flex-col items-center justify-center p-6 bg-teal-50/30 dark:bg-teal-900/10 rounded-2xl border border-teal-50/50 dark:border-teal-900/20 hover:bg-teal-500 hover:border-teal-500 transition-all duration-300">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                                            <Building2 className="w-5 h-5 text-teal-500" />
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300 group-hover:text-white transition-colors">Dept Setup</span>
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
