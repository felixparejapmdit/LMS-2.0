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
  FileUp,
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
  ShieldCheck,
  CloudDownload,
  UserCircle
} from "lucide-react";
import { directusUrl } from "../hooks/useDirectus";

export default function Sidebar() {
  const { user, logout, theme, toggleTheme, layoutStyle, isSidebarExpanded, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded_menus');
    return saved ? JSON.parse(saved) : {};
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { hasPermission } = useAuth();

  useEffect(() => {
    localStorage.setItem('sidebar_expanded_menus', JSON.stringify(expandedMenus));
  }, [expandedMenus]);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/count`);
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

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Inbox, label: "VIP View", path: "/vip-view" },
    { icon: Plus, label: "New Letter", path: "/new-letter" },
    { icon: Inbox, label: "Inbox", path: "/inbox" },
    { icon: Send, label: "Outbox", path: "/outbox" },
    { icon: AlertCircle, label: "Spam", path: "/spam" },
    { icon: TableIcon, label: "Master Table", path: "/master-table" },
    { icon: MessageSquare, label: "Letters with Comment", path: "/letters-with-comments" },
    { icon: Search, label: "Letter Tracker", path: "/letter-tracker" },
    { icon: FileUp, label: "Upload PDF Files", path: "/upload-pdf" },
    { icon: Send, label: "Send A Letter", path: "/guest/send-letter" },
    {
      icon: Settings,
      label: "Settings",
      path: "#",
      children: [
        { icon: Settings, label: "Access Matrix", path: "/setup/role-matrix" },
        { icon: Settings, label: "App Settings", path: "/settings" },
        { icon: Settings, label: "Attachments", path: "/setup/attachments" },
        { icon: Settings, label: "Contacts", path: "/setup/persons" },
        { icon: Settings, label: "Data Import", path: "/setup/data-import" },
        { icon: Settings, label: "Departments", path: "/setup/departments" },
        { icon: Settings, label: "Kinds", path: "/setup/letter-kinds" },
        { icon: Settings, label: "Statuses", path: "/setup/statuses" },
        { icon: Settings, label: "Steps", path: "/setup/process-steps" },
        { icon: Settings, label: "Trays", path: "/setup/trays" },
        { icon: Settings, label: "Users", path: "/setup/users" },
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
    if (path === "/" || path === "/dashboard") return "home";
    if (path === "/guest/send-letter") return "guest-send-letter";
    if (path.startsWith("/setup/")) return path.split("/").pop();
    if (path.startsWith("/letter/")) return "letter-detail";
    return path.replace("/", "");
  };

  const filteredNavItems = navItems.filter(item => {
    const key = getPageKey(item.path);
    if (item.children) {
      item.children = item.children
        .filter(child => hasPermission(getPageKey(child.path)))
        .sort((a, b) => a.label.localeCompare(b.label)); // Sort children alphabetically
      return item.children.length > 0;
    }
    if (item.path === "#") return true;
    return hasPermission(key);
  });

  const renderSidebarContent = () => {
    if (layoutStyle === 'grid') {
      return (
        <>
          <div className={`h-20 flex items-center border-b border-slate-50 dark:border-[#222] shrink-0 relative overflow-visible transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-between px-5'}`}>
            <div className="flex items-center gap-3 overflow-visible z-50">
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
                  <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tighter leading-none">LMS 2.0</span>

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
                      // setIsMobileMenuOpen(false);
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
                    <span className="text-xs font-black tracking-widest">{item.label}</span>
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
                        <span className="text-[10px] font-black tracking-widest">{child.label}</span>
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
              {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-xs font-black tracking-widest">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>}
            </button>

            {/* Combined Profile & Logout Section - Bottom */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className={`flex items-center gap-1 ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col' : 'flex-row'}`}>
                <button
                  onClick={() => navigate('/profile')}
                  title={!isSidebarExpanded && !isMobileMenuOpen ? "View Profile" : ""}
                  className={`
                    flex-1 flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 group/prof
                    hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/20
                    ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center p-2' : 'justify-start'}
                  `}
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/10 transition-all overflow-hidden group-hover/prof:scale-110">
                    {user?.avatar ? (
                      <img
                        src={`${directusUrl}/assets/${user.avatar}?width=100&height=100&fit=cover`}
                        className="w-full h-full object-cover"
                        alt="Profile"
                        onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + user.first_name + '+' + user.last_name + '&background=0066FF&color=fff'; }}
                      />
                    ) : (
                      <UserCircle className="w-5 h-5" />
                    )}
                  </div>
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white truncate tracking-tight group-hover/prof:text-blue-600">
                        {user?.first_name} {user?.last_name}
                      </span>
                      <span className="text-[9px] font-bold text-blue-500 truncate tracking-widest leading-none mt-1">
                        View Profile
                      </span>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }


    if (layoutStyle === 'notion') {
      return (
        <>
          <div className={`p-4 mb-4 flex items-center shrink-0 overflow-visible transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3 overflow-visible z-50">
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
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tight leading-none truncate">LMS 2.0</span>

                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">

            {(isSidebarExpanded || isMobileMenuOpen) && <div className="text-[11px] font-bold text-gray-400 px-3 py-2 tracking-wider">Navigation</div>}
            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  to={item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleSubmenu(item.label);
                    } else {
                      // setIsMobileMenuOpen(false);
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
              <div className={`flex items-center gap-1 ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col' : 'flex-row'}`}>
                <button
                  onClick={() => navigate('/profile')}
                  className={`
                    flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group/prof
                    hover:bg-gray-100 dark:hover:bg-white/5
                    ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : 'justify-start'}
                  `}
                >
                  <div className="w-7 h-7 bg-orange-500 rounded flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover/prof:scale-110 overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={`${directusUrl}/assets/${user.avatar}?width=80&height=80&fit=cover`}
                        className="w-full h-full object-cover"
                        alt="Profile"
                        onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + user.first_name + '+' + user.last_name + '&background=F97316&color=fff'; }}
                      />
                    ) : (
                      <UserCircle className="w-4 h-4" />
                    )}
                  </div>
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                      <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 truncate leading-tight group-hover/prof:text-orange-600">
                        {user?.first_name} {user?.last_name}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate lowercase mt-0.5">
                        View Profile
                      </span>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Default (Modern)
    return (
      <>
        <div className={`h-16 flex items-center border-b border-gray-100 dark:border-[#222] shrink-0 transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : 'justify-between px-8'}`}>
          <div className="flex items-center gap-3 overflow-visible z-50">
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
                <span className="text-sm font-bold text-slate-800 dark:text-white tracking-tighter leading-none">LMS 2.0</span>

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
                    // setIsMobileMenuOpen(false);
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
                  <span className="text-xs font-bold tracking-wide">
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
                      <span className="text-[10px] font-bold tracking-wide">{child.label}</span>
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
            {(isSidebarExpanded || isMobileMenuOpen) && <span className="text-xs font-bold tracking-wide">{theme === 'light' ? 'Dark' : 'Light'}</span>}
          </button>

          {/* Combined Profile & Logout Section - Bottom */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#222]">
            <div className={`flex items-center gap-1 ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col' : 'flex-row'}`}>
              <button
                onClick={() => navigate('/profile')}
                className={`
                  flex-1 flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 group/prof
                  hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/20
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center p-2' : 'justify-start'}
                `}
              >
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/20 transition-all group-hover/prof:scale-110 overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={`${directusUrl}/assets/${user.avatar}?width=100&height=100&fit=cover`}
                      className="w-full h-full object-cover"
                      alt="Profile"
                      onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + user.first_name + '+' + user.last_name + '&background=F97316&color=fff'; }}
                    />
                  ) : (
                    <UserCircle className="w-5 h-5" />
                  )}
                </div>
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white truncate tracking-tight group-hover/prof:text-orange-600">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-[9px] font-bold text-orange-500 truncate tracking-wider mt-1">
                      View Profile
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative w-full max-w-[340px] bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 mx-auto mb-6">
              <LogOut className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Confirm Logout</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
              Are you sure you want to sign out?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="py-3 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl font-bold text-xs transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
