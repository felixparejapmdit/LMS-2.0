import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Inbox,
  Settings,
  LogOut,
  Mail,
  Home,
  FileText,
  User as UserIcon,
  Search,
  Moon,
  Sun,
  CalendarClock,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  ExternalLink,
  Paperclip,
  Box,
  Building2,
  Tags,
  GitMerge,
  Activity,
  Table as TableIcon,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Plus,
  Bell,
  MessageSquare,
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const { user, logout, theme, toggleTheme, layoutStyle, isSidebarExpanded, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { hasPermission } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const res = await fetch('`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/count');
        const data = await res.json();
        setNotificationCount(data.count || 0);
      } catch { }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
  };

  const toggleSubmenu = (label) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    if (!isSidebarExpanded && !isMobileMenuOpen) {
      toggleSidebar();
    }
  };

  const roleId = user?.role || user?.roleData?.id || '';
  const roleName = String(user?.roleData?.name || '').trim().toUpperCase();
  const isVIP = String(roleId).toLowerCase() === 'ac74f61c-344d-4648-9bcf-0ed4d2330b37' || roleName === 'VIP';
  const isRegularUser = roleName === 'USER';

  const navItems = isRegularUser ? [
    { icon: Search, label: "Letter Tracker", path: "/letter-tracker" },
    { icon: Send, label: "Send A Letter", path: "/guest/send-letter" },
  ] : [
    { icon: Home, label: "Home", path: "/" },
    ...(isVIP ? [
      { icon: Inbox, label: "VIP View", path: "/vip-view" }
    ] : [
      { icon: Plus, label: "New Letter", path: "/new-letter" },
      { icon: Inbox, label: "Inbox", path: "/inbox" },
      { icon: Send, label: "Outbox", path: "/outbox" }
    ]),
    { icon: AlertCircle, label: "Spam", path: "/spam" },
    { icon: TableIcon, label: "Master Table", path: "/master-table" },
    { icon: MessageSquare, label: "Letters with Comment", path: "/letters-with-comments" },
    { icon: Search, label: "Letter Tracker", path: "/letter-tracker" },
    {
      icon: Settings,
      label: "Settings",
      path: "#",
      children: [
        { icon: Settings, label: "App Settings", path: "/settings" },
        { icon: Box, label: "Trays", path: "/setup/trays" },
        { icon: UserIcon, label: "Users", path: "/setup/users" },
        { icon: UserIcon, label: "Contacts", path: "/setup/persons" },
        { icon: Building2, label: "Departments", path: "/setup/departments" },
        { icon: Tags, label: "Kinds", path: "/setup/letter-kinds" },
        { icon: GitMerge, label: "Steps", path: "/setup/process-steps" },
        { icon: Activity, label: "Statuses", path: "/setup/statuses" },
        { icon: Paperclip, label: "Attachments", path: "/setup/attachments" },
        { icon: ShieldCheck, label: "Access Matrix", path: "/setup/role-matrix" },
      ]
    },
    ...(isSuperAdmin ? [
      {
        icon: Sparkles,
        label: "Developer DNA",
        path: "#",
        children: [
          { icon: Zap, label: "Setup Wizard", path: "/setup" },
        ]
      }
    ] : []),
  ];

  // Helper to get permission key from path
  const getPageKey = (path) => {
    if (path === "/") return "home";
    if (path.startsWith("/setup/")) return path.split("/").pop();
    return path.replace("/", "");
  };

  const filteredNavItems = navItems.filter(item => {
    const key = getPageKey(item.path);
    if (item.children) {
      item.children = item.children.filter(child => hasPermission(getPageKey(child.path)));
      return item.children.length > 0;
    }
    if (item.path === "#") return true;
    return hasPermission(key);
  });

  const renderSidebarContent = () => {
    if (layoutStyle === 'grid') {
      return (
        <>
          <div className="h-20 flex items-center justify-between px-5 border-b border-slate-50 dark:border-[#222] relative overflow-hidden shrink-0">
            <div className="flex items-center gap-3">
              <div
                onClick={() => navigate('/endorsements')}
                className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-blue-600/20 shrink-0 group/bell cursor-pointer relative transition-all hover:scale-105 active:scale-95"
              >
                <Bell className="w-5 h-5 transition-transform group-hover/bell:rotate-12" />
                {notificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white dark:border-[#111] rounded-full flex items-center justify-center text-[8px] font-black animate-bounce shadow-sm">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
                )}
              </div>
              {(isSidebarExpanded || isMobileMenuOpen) && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 transition-all">
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">LMS 2.0</span>
                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-1 opacity-80">Correspondence</span>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">

            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  to={item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleSubmenu(item.label);
                    } else {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  title={!isSidebarExpanded ? item.label : ""}
                  className={({ isActive }) => `
                  flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group/item relative
                  ${isActive && !item.children && item.path !== "#"
                      ? "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-white/5"}
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
                `}
                >
                  <item.icon className="w-6 h-6 transition-transform group-hover/item:scale-110 shrink-0" />
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                  )}
                  {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                  )}
                </NavLink>

                {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="pl-4 pr-1 mt-1 space-y-1 animate-in slide-in-from-top-2 opacity-100 fade-in duration-200">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => `
                        flex items-center gap-3 p-2 rounded-xl transition-all duration-300
                        ${isActive
                            ? "bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-white/5"}
                        `}
                      >
                        <child.icon className="w-5 h-5 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-50 dark:border-[#222] space-y-2 shrink-0">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-4 p-3 text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}`}
            >
              {theme === 'light' ? <Moon className="w-6 h-6 shrink-0" /> : <Sun className="w-6 h-6 shrink-0" />}
              {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-xs font-black uppercase tracking-widest">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>}
            </button>

            {/* Combined Profile & Logout Section - Bottom */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={handleLogout}
                title={!isSidebarExpanded && !isMobileMenuOpen ? "Click to Logout" : ""}
                className={`
                  w-full flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 group/logout
                  hover:bg-red-50 dark:hover:bg-red-900/10 border border-transparent hover:border-red-100 dark:hover:border-red-900/20
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center p-2' : 'justify-start'}
                `}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/10 group-hover/logout:bg-red-500 group-hover/logout:shadow-red-500/20 transition-all">
                  <UserIcon className="w-5 h-5 group-hover/logout:hidden" />
                  <LogOut className="w-5 h-5 hidden group-hover/logout:block animate-pulse" />
                </div>
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tight group-hover/logout:text-red-600 dark:group-hover/logout:text-red-400 text-ellipsis overflow-hidden">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-[9px] font-bold text-blue-500 uppercase truncate tracking-widest leading-none mt-1 group-hover/logout:text-red-500/70">
                      Click to Logout • {user?.roleData?.name || user?.role || 'User'}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </>
      );
    }

    if (layoutStyle === 'linear') {
      return (
        <>
          <div className="h-16 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div
                onClick={() => navigate('/endorsements')}
                className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 group/bell cursor-pointer relative transition-all hover:scale-105 active:scale-95"
              >
                <Bell className="w-5 h-5 transition-transform group-hover/bell:rotate-12" />
                {notificationCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-600 border-2 border-white dark:border-[#080808] rounded-full flex items-center justify-center text-[8px] font-black animate-bounce shadow-sm">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
                )}
              </div>
              {(isSidebarExpanded || isMobileMenuOpen) && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 transition-all">
                  <span className="text-xs font-black text-[#eee] uppercase tracking-tighter leading-none">LMS 2.0</span>
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1 opacity-70">Linear Hub</span>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">

            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  to={item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleSubmenu(item.label);
                    } else {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  title={!isSidebarExpanded ? item.label : ""}
                  className={({ isActive }) => `
                  flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group/nav relative
                  ${isActive && !item.children && item.path !== "#"
                      ? "bg-[#161616] text-indigo-400 border border-[#222] shadow-[0_0_15px_-5px_rgba(79,70,229,0.3)]"
                      : "text-[#666] hover:text-[#eee] hover:bg-[#111]"}
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
                `}
                >
                  <item.icon className="w-5 h-5 transition-transform group-hover/nav:scale-110 shrink-0" />
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] shrink-0">{item.label}</span>
                  )}
                  {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                    <ChevronRight className={`w-3 h-3 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                  )}
                </NavLink>

                {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="pl-4 mt-1 space-y-1 border-l border-[#222] ml-4">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => `
                        flex items-center gap-3 p-2 rounded-lg transition-all duration-200
                        ${isActive
                            ? "bg-[#161616] text-indigo-400 border border-[#222]"
                            : "text-[#555] hover:text-[#ddd] hover:bg-[#111]"}
                        `}
                      >
                        <child.icon className="w-4 h-4 shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em]">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-2 border-t border-[#1a1a1a] space-y-1 shrink-0">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 p-2 text-[#666] hover:text-[#eee] hover:bg-[#111] rounded-lg transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
              {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-[10px] font-black uppercase tracking-[0.15em]">{theme === 'light' ? 'Dark' : 'Light'}</span>}
            </button>

            {/* Combined Profile & Logout Section - Bottom */}
            <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
              <button
                onClick={handleLogout}
                className={`
                  w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group/logout
                  hover:bg-red-500/10 border border-transparent hover:border-red-500/20
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
                `}
              >
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shrink-0 shadow-[0_0_8px_-2px_rgba(79,70,229,0.5)] group-hover/logout:bg-red-600 transition-colors">
                  <UserIcon className="w-4 h-4 group-hover/logout:hidden" />
                  <LogOut className="w-4 h-4 hidden group-hover/logout:block" />
                </div>
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                    <span className="text-[9px] font-black text-[#eee] uppercase truncate tracking-[0.1em] group-hover/logout:text-red-500">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-[8px] font-bold text-indigo-400 uppercase truncate tracking-widest leading-none mt-1 group-hover/logout:text-red-400/70">
                      Eject • {user?.roleData?.name || user?.role || 'User'}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </>
      );
    }

    if (layoutStyle === 'notion') {
      return (
        <>
          <div className="p-4 mb-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                onClick={() => navigate('/endorsements')}
                className="w-7 h-7 bg-orange-500 rounded flex items-center justify-center text-white shrink-0 group/bell cursor-pointer relative transition-all hover:scale-110 active:scale-95 shadow-sm"
              >
                <Bell className="w-4 h-4 transition-transform group-hover/bell:rotate-12" />
                {notificationCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[16px] h-[16px] bg-red-600 border-2 border-white dark:border-[#141414] rounded-full flex items-center justify-center text-[7px] font-black animate-bounce shadow-sm">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
                )}
              </div>
              {(isSidebarExpanded || isMobileMenuOpen) && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 transition-all">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tight leading-none truncate">LMS 2.0 Workspace</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Endorsements Hub</span>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">

            {(isSidebarExpanded || isMobileMenuOpen) && <div className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Navigation</div>}
            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  to={item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleSubmenu(item.label);
                    } else {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  title={!isSidebarExpanded ? item.label : ""}
                  className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                  ${isActive && !item.children && item.path !== "#"
                      ? "bg-gray-200/60 dark:bg-white/10 text-gray-900 dark:text-white font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-200/40 dark:hover:bg-white/5"}
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}
                `}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-sm truncate">{item.label}</span>}
                  {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                    <ChevronRight className={`w-3 h-3 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                  )}
                </NavLink>

                {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="pl-6 mt-0.5 space-y-0.5 relative before:absolute before:left-[17px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200 dark:before:bg-gray-800">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                        ${isActive
                            ? "bg-gray-200/40 dark:bg-white/10 text-gray-900 dark:text-white font-semibold"
                            : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}
                        `}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-sm truncate">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-gray-100 dark:border-[#222] space-y-2 shrink-0">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200/40 dark:hover:bg-white/5 rounded-lg transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
              {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-sm font-medium">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>}
            </button>

            {/* Combined Profile & Logout Section - Bottom */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#222]">
              <button
                onClick={handleLogout}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group/logout
                  hover:bg-red-50 dark:hover:bg-red-900/10
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : 'justify-start'}
                `}
              >
                <div className="w-7 h-7 bg-orange-500 rounded flex items-center justify-center text-white shrink-0 shadow-sm group-hover/logout:bg-red-500 transition-colors">
                  <UserIcon className="w-4 h-4 group-hover/logout:hidden" />
                  <LogOut className="w-4 h-4 hidden group-hover/logout:block" />
                </div>
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 truncate leading-tight group-hover/logout:text-red-600">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate lowercase mt-0.5 group-hover/logout:text-red-400">
                      Logout • {user?.roleData?.name || user?.role || 'User'}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </>
      );
    }

    // Default (Modern)
    return (
      <>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-[#222] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              onClick={() => navigate('/endorsements')}
              className="w-10 h-10 bg-orange-50 dark:bg-orange-900/10 rounded-xl flex items-center justify-center group/bell cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all shrink-0 relative"
            >
              <Bell className="text-orange-600 w-5 h-5 transition-transform group-hover/bell:rotate-12" />
              {notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-orange-500 border-2 border-white dark:border-[#141414] rounded-full flex items-center justify-center text-[7px] font-black animate-bounce shadow-sm text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </div>
              )}
            </div>
            {(isSidebarExpanded || isMobileMenuOpen) && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 transition-all">
                <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">LMS 2.0</span>
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.15em] mt-1 opacity-80">Correspondence</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-2 py-6 space-y-2 overflow-y-auto custom-scrollbar">

          {filteredNavItems.map((item) => (
            <div key={item.label} className="flex flex-col">
              <NavLink
                to={item.path}
                onClick={(e) => {
                  if (item.children) {
                    e.preventDefault();
                    toggleSubmenu(item.label);
                  } else {
                    setIsMobileMenuOpen(false);
                  }
                }}
                title={!isSidebarExpanded ? item.label : ""}
                className={({ isActive }) => `
                flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative
                ${isActive && !item.children && item.path !== "#"
                    ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600 border border-orange-100 dark:border-orange-900/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5"}
                ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
              `}
              >
                <item.icon className="w-5 h-5 transition-transform shrink-0" />
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {item.label}
                  </span>
                )}
                {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                )}
              </NavLink>

              {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                <div className="pl-4 mt-1 space-y-1">
                  {item.children.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => `
                      flex items-center gap-3 p-2 rounded-xl transition-all duration-200
                      ${isActive
                          ? "bg-orange-50/50 dark:bg-orange-900/10 text-orange-600"
                          : "text-slate-400 hover:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"}
                      `}
                    >
                      <child.icon className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100 dark:border-[#222] space-y-2 shrink-0">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 p-3 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-white/5 rounded-xl transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}`}
          >
            {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
            {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-xs font-bold uppercase tracking-wide">{theme === 'light' ? 'Dark' : 'Light'}</span>}
          </button>

          {/* Combined Profile & Logout Section - Bottom */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#222]">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 group/logout
                hover:bg-red-50 dark:hover:bg-red-900/10 border border-transparent hover:border-red-100 dark:hover:border-red-900/20
                ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center p-2' : 'justify-start'}
              `}
            >
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/20 group-hover/logout:bg-red-500 transition-all">
                <UserIcon className="w-5 h-5 group-hover/logout:hidden" />
                <LogOut className="w-5 h-5 hidden group-hover/logout:block" />
              </div>
              {(isSidebarExpanded || isMobileMenuOpen) && (
                <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                  <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tight group-hover/logout:text-red-600">
                    {user?.first_name} {user?.last_name}
                  </span>
                  <span className="text-[9px] font-bold text-orange-500 uppercase truncate tracking-wider mt-1 group-hover/logout:text-red-400">
                    Click to Logout • {user?.roleData?.name || user?.role || 'User'}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>
      </>
    );
  };

  const getSidebarWidth = () => {
    if (isMobileMenuOpen) return "w-64";
    if (layoutStyle === 'grid') return isSidebarExpanded ? "w-64" : "w-20";
    return isSidebarExpanded ? "w-64" : "w-16 md:w-20";
  };

  const getSidebarBg = () => {
    switch (layoutStyle) {
      case 'linear': return "bg-[#0c0c0c] border-[#1a1a1a]";
      case 'notion': return "bg-[#FBFBFA] dark:bg-[#141414] border-gray-100 dark:border-[#222]";
      default: return "bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]";
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`
        ${getSidebarWidth()} 
        ${getSidebarBg()}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:sticky md:flex top-0 left-0 h-screen z-[70] md:z-50
        border-r flex flex-col transition-all duration-300 group
      `}>
        {/* Toggle Button (Desktop Only) */}
        {!isMobileMenuOpen && (
          <button
            onClick={toggleSidebar}
            className={`
              hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-[#0D0D0D] 
              border border-slate-200 dark:border-[#333] rounded-full 
              items-center justify-center text-slate-400 hover:text-blue-600 
              shadow-sm z-50 transition-all transform
              ${!isSidebarExpanded ? 'rotate-180 opacity-0 group-hover:opacity-100' : ''}
            `}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}

        {/* Close Button (Mobile Only) */}
        {isMobileMenuOpen && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 md:hidden z-[80]"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {renderSidebarContent()}
      </aside>

      {/* BEATIFUL LOGOUT MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto"
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300 pointer-events-auto overflow-hidden">
            {/* Background design element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="w-20 h-20 rounded-[2rem] bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 mx-auto mb-8 relative">
              <LogOut className="w-10 h-10" />
              <div className="absolute inset-0 rounded-[2rem] border-2 border-red-500/20 animate-ping opacity-20" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Confirm Logout</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-10">
              Are you sure you want to sign out of your account? Any unsaved changes may be lost.
            </p>

            <div className="space-y-3">
              <button
                onClick={confirmLogout}
                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Now
              </button>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-5 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
