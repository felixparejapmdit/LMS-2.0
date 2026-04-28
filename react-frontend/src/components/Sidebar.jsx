import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth, useSession, useUI } from "../context/AuthContext";
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
  Shield,
  Sparkles,
  Plus,
  Bell,
  MessageSquare,
  ShieldCheck,
  CloudDownload,
  UserCircle,
  LayoutDashboard,
  LayoutGrid,
  Users,
  Eye,
  Settings2
} from "lucide-react";
import { directusUrl, getAssetUrl } from "../hooks/useDirectus";
import systemPageService from "../services/systemPageService";
import { getPageKeyFromPath, humanizePageId } from "../utils/pageAccess";

export default function Sidebar() {
  const { user, logout, isSuperAdmin, hasPermission, isSetupComplete } = useSession();
  const { theme, toggleTheme, layoutStyle, isSidebarExpanded, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen, expandedMenus, setExpandedMenus, toggleSubmenu } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const navScrollRef = useRef(null);
  const NAV_SCROLL_KEY = "sidebar_nav_scroll";
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const roleName = user?.roleData?.name || user?.role || '';
        const deptId = user?.dept_id?.id || user?.dept_id || '';
        const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
        const isUserRole = roleName.toString().toUpperCase() === 'USER';
        const params = new URLSearchParams({
          user_id: user.id || '',
          department_id: deptId || '',
          role: roleName || '',
          full_name: fullName,
          ...(isUserRole ? { mine: 'true' } : {})
        });
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/count?${params.toString()}`);
        const data = await res.json();
        setNotificationCount(data.count || 0);
      } catch { }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleNotificationClick = () => {
    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    const isUserRole = roleName === 'USER';
    navigate(isUserRole ? '/endorsements?mine=1' : '/endorsements');
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    navigate("/login", { replace: true });
  };



  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Plus, label: "New Letter", path: "/new-letter" },
    { icon: Inbox, label: "Inbox", path: "/inbox" },
    { icon: FileText, label: "Resumen", path: "/resumen" },
    { icon: Send, label: "Outbox", path: "/outbox" },
    { icon: TableIcon, label: "Master Table", path: "/master-table" },
    { icon: Eye, label: "Dept Viewer", path: "/dept-viewer", hidden: !user?.interdepartment && !hasPermission('dept-viewer') },
    { icon: MessageSquare, label: "Letters with Comment", path: "/letters-with-comments" },
    { icon: Search, label: "Letter Tracker", path: "/letter-tracker" },
    { icon: TableIcon, label: "Legacy Data", path: "/legacy-data" },
    { icon: FileUp, label: "Upload PDF Files", path: "/upload-pdf" },
    { icon: Send, label: "Send A Letter", path: "/guest/send-letter" },
    {
      icon: Settings,
      label: "Settings",
      path: "#",
      children: [
        { icon: Settings, label: "Access Matrix", path: "/setup/role-matrix" },
        { icon: ShieldCheck, label: "Unit Access Matrix", path: "/setup/dept-matrix", hidden: (user?.roleData?.name || user?.role || '').toString().toUpperCase() !== 'ACCESS MANAGER' },
        { icon: LayoutDashboard, label: "App Settings", path: "/settings" },
        { icon: Paperclip, label: "Attachments", path: "/setup/attachments" },
        { icon: UserIcon, label: "Contacts", path: "/setup/persons" },
        { icon: CloudDownload, label: "Data Import", path: "/setup/data-import" },
        { icon: Building2, label: "Departments", path: "/setup/departments" },
        { icon: Tags, label: "Kinds", path: "/setup/letter-kinds" },
        { icon: ShieldCheck, label: "Roles", path: "/setup/roles" },
        { icon: Activity, label: "Statuses", path: "/setup/statuses" },
        { icon: GitMerge, label: "Steps", path: "/setup/process-steps" },
        { icon: Box, label: "Trays", path: "/setup/trays" },
        { icon: Users, label: "Users", path: "/setup/users" },
        { icon: LayoutGrid, label: "Section Registry", path: "/setup/sections" },
        { icon: Settings2, label: "Inter-Dept Management", path: "/setup/inter-dept", hidden: !hasPermission('inter-dept') },
        { icon: Shield, label: "Audit Logs", path: "/setup/audit-logs" },
      ]
    },

  ];

  useEffect(() => {
    const parent = navItems.find(item => item.children?.some(child => child.path === location.pathname));
    if (parent && !expandedMenus[parent.label]) {
      setExpandedMenus(prev => ({ ...prev, [parent.label]: true }));
    }
  }, [location.pathname, expandedMenus]);

  useEffect(() => {
    if (!user) return;
    const flatPages = [];
    const collectPages = (items) => {
      items.forEach((item) => {
        if (item.path && item.path !== "#") {
          const pageId = getPageKeyFromPath(item.path);
          if (pageId) {
            flatPages.push({
              page_id: pageId,
              page_name: item.label || humanizePageId(pageId),
              description: `Auto-discovered from sidebar path: ${item.path}`
            });
          }
        }
        if (Array.isArray(item.children) && item.children.length > 0) {
          collectPages(item.children);
        }
      });
    };
    collectPages(navItems);
    systemPageService.syncPages(flatPages).catch(() => { });
  }, [user?.id]);

  const filteredNavItems = navItems
    .map(item => {
      if (item.children) {
        const children = item.children
          .filter(child => hasPermission(getPageKeyFromPath(child.path)))
          .sort((a, b) => a.label.localeCompare(b.label)); // Sort children alphabetically
        if (children.length === 0) return null;
        return { ...item, children };
      }
      if (item.path === "#") return item;
      const key = getPageKeyFromPath(item.path);
      
      const isAccessManager = (user?.roleData?.name || user?.role || '').toString().toUpperCase() === 'ACCESS MANAGER';
      const isDisabled = (item.label === "New Letter" && isAccessManager && !isSetupComplete);

      return hasPermission(key) ? { ...item, isDisabled } : null;
    })
    .filter(Boolean);

  const handleNavScroll = () => {
    const el = navScrollRef.current;
    if (!el) return;
    sessionStorage.setItem(NAV_SCROLL_KEY, String(el.scrollTop));
  };

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(NAV_SCROLL_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!Number.isNaN(parsed)) {
        el.scrollTop = parsed;
      }
    }
  }, [layoutStyle, isSidebarExpanded, isMobileMenuOpen]);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const active = el.querySelector('a[aria-current="page"]');
    if (active?.scrollIntoView) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [location.pathname, layoutStyle]);

  const renderSidebarContent = () => {
    if (layoutStyle === 'grid') {
      return (
        <>
          <div className={`h-20 flex items-center border-b border-slate-100 shrink-0 relative overflow-visible transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-between px-5'}`}>
            <div className="flex items-center gap-3 overflow-visible z-50">
              <div
                onClick={handleNotificationClick}
                className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0 group/bell cursor-pointer relative transition-all hover:scale-105 active:scale-95"
              >
                <Bell className="w-5 h-5 transition-transform group-hover/bell:rotate-12" />
                {notificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black animate-bounce shadow-sm">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
                )}
              </div>
              {(isSidebarExpanded || isMobileMenuOpen) && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 transition-all">
                  <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tighter leading-none">LMS 2026</span>
                </div>
              )}
            </div>
          </div>

          <nav
            ref={navScrollRef}
            onScroll={handleNavScroll}
            className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar"
          >

            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
                  className={({ isActive }) => {
                    const isAccessManager = (user?.roleData?.name || user?.role || '').toString().toUpperCase() === 'ACCESS MANAGER';
                    const activeBg = isAccessManager ? "bg-sky-500" : "bg-slate-700";
                    const hoverBg = isAccessManager ? "hover:bg-sky-600" : "hover:bg-slate-700";
                    
                    if (item.isDisabled) {
                        return `
                        flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group/item relative
                        opacity-40 grayscale cursor-not-allowed pointer-events-none select-none
                        ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
                        `;
                    }

                    return `
                    flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group/item relative
                    ${isActive && !item.children && item.path !== "#"
                        ? `${activeBg} text-white shadow-lg shadow-sky-500/20`
                        : `text-slate-500 hover:text-white ${hoverBg}`}
                    ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
                  `}}
                >
                  <item.icon className="w-6 h-6 transition-transform group-hover/item:scale-110 shrink-0" />
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <div className="flex flex-col">
                      <span className="text-xs font-black tracking-widest">{item.label}</span>
                      {item.isDisabled && <span className="text-[7px] font-black text-red-500 uppercase">Complete Setup First</span>}
                    </div>
                  )}
                  {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                  )}
                </NavLink>

                {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="pl-4 pr-1 mt-1 space-y-1 animate-in slide-in-from-top-2 opacity-100 fade-in duration-200">
                    {item.children.map(child => (
                      <NavLink
                        id={`nav-child-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => {
                          const isAccessManager = (user?.roleData?.name || user?.role || '').toString().toUpperCase() === 'ACCESS MANAGER';
                          const activeBg = isAccessManager ? "bg-sky-500" : "bg-slate-700";
                          const hoverBg = isAccessManager ? "hover:bg-sky-600" : "hover:bg-slate-700";
                          return `
                          flex items-center gap-3 p-2 rounded-xl transition-all duration-300
                          ${isActive
                              ? `${activeBg} text-white`
                              : `text-slate-400 hover:text-white ${hoverBg}`}
                          `
                        }}
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

          <div className="p-3 border-t border-slate-100 shrink-0">
            {/* Combined Profile & Logout Section - Bottom */}
            <div className={`flex items-center gap-1 ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col' : 'flex-row'}`}>
              <button
                onClick={() => navigate('/profile')}
                title={!isSidebarExpanded && !isMobileMenuOpen ? "View Profile" : ""}
                className={`
                    flex-1 flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 group/prof
                    hover:bg-slate-200 dark:hover:bg-white/10 border border-transparent
                    ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center p-2' : 'justify-start'}
                  `}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/10 transition-all overflow-hidden group-hover/prof:scale-110">
                  {user?.avatar ? (
                    <img
                      src={getAssetUrl(user.avatar, "?width=100&height=100&fit=cover")}
                      className="w-full h-full object-cover"
                      alt="Profile"
                      onError={(e) => {
                        const firstName = user.first_name || user.username || 'U';
                        const lastName = user.last_name || '';
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=0066FF&color=fff`;
                      }}
                    />
                  ) : (
                    <UserCircle className="w-5 h-5" />
                  )}
                </div>
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 text-left animate-in fade-in slide-in-from-bottom-2 transition-all">
                    <span className="text-[11px] font-black text-slate-900 dark:text-gray-100 truncate tracking-tight group-hover/prof:text-blue-600">
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
        </>
      );
    }


    if (layoutStyle === 'notion') {
      return (
        <>
          <div className={`p-4 mb-4 flex items-center shrink-0 overflow-visible transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3 overflow-visible z-50">
              <div
                onClick={handleNotificationClick}
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
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tight leading-none truncate">LMS 2026</span>

                </div>
              )}
            </div>
          </div>

          <nav
            ref={navScrollRef}
            onScroll={handleNavScroll}
            className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar"
          >

            {(isSidebarExpanded || isMobileMenuOpen) && <div className="text-[11px] font-bold text-gray-400 px-3 py-2 tracking-wider">Navigation</div>}
            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  to={item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleSubmenu(item.label);
                    } else if (item.isDisabled) {
                      e.preventDefault();
                    } else {
                      // setIsMobileMenuOpen(false);
                    }
                  }}
                  title={!isSidebarExpanded ? item.label : ""}
                  className={({ isActive }) => {
                    if (item.isDisabled) {
                        return `
                        flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                        opacity-40 grayscale cursor-not-allowed pointer-events-none select-none
                        ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}
                        `;
                    }
                    return `
                  flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                  ${isActive && !item.children && item.path !== "#"
                      ? "bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-white font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-white/5"}
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}
                `}}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <div className="flex flex-col truncate">
                        <span className="text-sm">{item.label}</span>
                        {item.isDisabled && <span className="text-[7px] font-black text-red-500 uppercase leading-none">Setup Required</span>}
                    </div>
                  )}
                  {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                    <ChevronRight className={`w-3 h-3 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                  )}
                </NavLink>

                {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="pl-6 mt-0.5 space-y-0.5 relative before:absolute before:left-[17px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
                    {item.children.map(child => (
                      <NavLink
                        id={`nav-child-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                        ${isActive
                            ? "bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-white font-semibold"
                            : "text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/5"}
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

          <div className="p-3 border-t border-gray-100 shrink-0">
            {/* Combined Profile & Logout Section - Bottom */}
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
                      src={getAssetUrl(user.avatar, "?width=80&height=80&fit=cover")}
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
        </>
      );
    }

    // Minimalist Professional (Clean, Airy, High-Contrast)
    if (layoutStyle === 'minimalist') {
      return (
        <>
          <div className={`h-20 flex items-center border-b border-[#E5E5E5] dark:border-[#222] shrink-0 transition-all ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0 flex-col gap-2 py-4 h-auto' : 'px-6'}`}>
            <div className={`flex items-center ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col gap-2' : 'gap-3'}`}>
              <div className="w-8 h-8 shrink-0 bg-[#1A1A1B] dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-[#1A1A1B] shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <button
                onClick={handleNotificationClick}
                className="w-8 h-8 shrink-0 rounded-lg border border-[#E5E5E5] dark:border-[#333] flex items-center justify-center text-[#1A1A1B] dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all relative"
                title="Open my endorsements"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white rounded-full text-[7px] font-black flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
                )}
              </button>
              {(isSidebarExpanded || isMobileMenuOpen) && (
                <span className="text-sm font-bold text-[#1A1A1B] dark:text-white uppercase tracking-[0.2em] truncate">LMS 2026</span>
              )}
            </div>
          </div>

          <nav
            ref={navScrollRef}
            onScroll={handleNavScroll}
            className="flex-1 px-4 py-8 space-y-1 overflow-y-auto no-scrollbar"
          >
            {filteredNavItems.map((item) => (
              <div key={item.label} className="flex flex-col">
                <NavLink
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  to={item.path}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleSubmenu(item.label);
                    } else if (item.isDisabled) {
                      e.preventDefault();
                    }
                  }}
                  className={({ isActive }) => {
                    const isAccessManager = (user?.roleData?.name || user?.role || '').toString().toUpperCase() === 'ACCESS MANAGER';
                    const activeBg = isAccessManager ? "bg-sky-500" : "bg-slate-700";
                    const hoverBg = isAccessManager ? "hover:bg-sky-100 dark:hover:bg-sky-900/20" : "hover:bg-slate-700";
                    const hoverText = isAccessManager ? "hover:text-sky-600 dark:hover:text-sky-400" : "hover:text-white";
                    
                    if (item.isDisabled) {
                        return `
                        flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
                        opacity-40 grayscale cursor-not-allowed pointer-events-none select-none
                        ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}
                        `;
                    }

                    return `
                    flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
                    ${isActive && !item.children && item.path !== "#"
                      ? `${activeBg} text-white font-medium shadow-sm`
                      : `text-[#737373] dark:text-[#A3A3A3] ${hoverBg} ${hoverText}`}
                    ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}
                  `}}
                >
                  <item.icon className={`w-4 h-4 shrink-0 transition-colors`} />
                  {(isSidebarExpanded || isMobileMenuOpen) && (
                    <div className="flex flex-col truncate">
                        <span className="text-sm">{item.label}</span>
                        {item.isDisabled && <span className="text-[7px] font-black text-red-500 uppercase leading-none">Setup Required</span>}
                    </div>
                  )}
                  {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                    <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                  )}
                </NavLink>

                {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="ml-6 border-l border-[#E5E5E5] mt-1 space-y-1">
                    {item.children.map(child => (
                       <NavLink
                        id={`nav-child-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => {
                          const isAccessManager = (user?.roleData?.name || user?.role || '').toString().toUpperCase() === 'ACCESS MANAGER';
                          const activeColor = isAccessManager ? "text-sky-600" : "text-[#1A1A1B]";
                          const hoverBg = isAccessManager ? "hover:bg-sky-50 dark:hover:bg-sky-900/10" : "hover:bg-gray-200";
                          return `flex items-center gap-3 px-4 py-1.5 text-xs transition-colors rounded-md ${
                            isActive ? `${activeColor} font-bold` : `text-[#A3A3A3] hover:text-sky-600 ${hoverBg}`
                          }`;
                        }}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-[#E5E5E5] shrink-0">

            <div className={`flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-white/5 border border-[#E5E5E5] dark:border-[#222] ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col' : 'flex-row'}`}>
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 flex items-center gap-3 min-w-0"
              >
                <div className="w-8 h-8 rounded bg-[#F1F1F1] dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img src={getAssetUrl(user.avatar)} className="w-full h-full object-cover" alt="" />
                  ) : <UserCircle className="w-4 h-4 text-[#A3A3A3]" />}
                </div>
                {(isSidebarExpanded || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-xs font-bold text-[#1A1A1B] dark:text-white truncate leading-tight">{user?.first_name}</span>
                    <span className="text-[10px] text-[#A3A3A3] truncate">Account</span>
                  </div>
                )}
              </button>
              <button onClick={handleLogout} className="p-2 text-[#A3A3A3] hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
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
              onClick={handleNotificationClick}
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
                <span className="text-sm font-bold text-slate-800 dark:text-white tracking-tighter leading-none">LMS 2026</span>

              </div>
            )}
          </div>
        </div>

        <nav
          ref={navScrollRef}
          onScroll={handleNavScroll}
          className="flex-1 px-2 py-6 space-y-2 overflow-y-auto custom-scrollbar"
        >
          {filteredNavItems.map((item) => (
            <div key={item.label} className="flex flex-col">
              <NavLink
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                to={item.path}
                onClick={(e) => {
                  if (item.children) {
                    e.preventDefault();
                    toggleSubmenu(item.label);
                  } else if (item.isDisabled) {
                    e.preventDefault();
                  }
                }}
                title={!isSidebarExpanded ? item.label : ""}
                className={({ isActive }) => {
                    if (item.isDisabled) {
                        return `
                        flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative
                        opacity-40 grayscale cursor-not-allowed pointer-events-none select-none
                        ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center px-0' : ''}
                        `;
                    }
                    return `
                flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative
                ${isActive && !item.children && item.path !== "#"
                    ? "bg-orange-100 text-orange-600 border border-orange-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}
                ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'}
              `}}
              >
                <item.icon className="w-5 h-5 transition-transform shrink-0" />
                {(isSidebarExpanded || isMobileMenuOpen) && (
                    <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-wide">{item.label}</span>
                        {item.isDisabled && <span className="text-[7px] font-black text-red-500 uppercase leading-none">Setup Required</span>}
                    </div>
                )}
                {item.children && (isSidebarExpanded || isMobileMenuOpen) && (
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-300 ${expandedMenus[item.label] ? 'rotate-90' : ''}`} />
                )}
              </NavLink>

              {item.children && expandedMenus[item.label] && (isSidebarExpanded || isMobileMenuOpen) && (
                <div className="pl-4 mt-1 space-y-1">
                  {item.children.map(child => (
                    <NavLink
                      id={`nav-child-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                      key={child.path}
                      to={child.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => `
                      flex items-center gap-3 p-2 rounded-xl transition-all duration-200
                      ${isActive
                          ? "bg-orange-100 text-orange-600"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"}
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

        <div className="p-2 border-t border-gray-100 shrink-0">
          {/* Combined Profile & Logout Section - Bottom */}
          <div className="pt-2">
            <div className={`flex items-center gap-1 ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'flex-col' : 'flex-row'}`}>
              <button
                onClick={() => navigate('/profile')}
                className={`
                  flex-1 flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 group/prof
                  hover:bg-slate-200 border border-transparent
                  ${(!isSidebarExpanded && !isMobileMenuOpen) ? 'justify-center p-2' : 'justify-start'}
                `}
              >
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/20 transition-all group-hover/prof:scale-110 overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={getAssetUrl(user.avatar, "?width=100&height=100&fit=cover")}
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
                    <span className="text-[11px] font-black text-slate-800 truncate tracking-tight group-hover/prof:text-orange-600">
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
      case 'notion': return "bg-[#FBFBFA] dark:bg-[#191919] border-gray-100 dark:border-[#333]";
      case 'minimalist': return "bg-[#F7F7F7] dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]";
      default: return "bg-white dark:bg-[#111] border-gray-100 dark:border-[#222]";
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
              hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white
              border border-slate-200 rounded-full
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
          <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-[#333] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 mx-auto mb-6">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Logout</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Are you sure you want to end your current session?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLogout}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold tracking-tight shadow-lg shadow-red-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Logout Now
              </button>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-4 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 rounded-2xl font-bold tracking-tight transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
