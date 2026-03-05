
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell } from "lucide-react";

export default function NotificationBell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [count, setCount] = useState(0);

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
                setCount(data.count || 0);
            } catch { }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const { hasPermission } = useAuth();
    const isHiddenPage = ['/login', '/setup/wizard', '/guest/send-letter', '/vip-view'].includes(location.pathname);

    // Instead of hardcoded USER role check, check if they have permission to view the endorsements page
    if (!user || isHiddenPage || !hasPermission('endorsements')) return null;

    return (
        <div className="fixed top-24 right-6 z-[99999] pointer-events-none sticky-notification">
            <button
                onClick={() => {
                    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
                    const isUserRole = roleName === 'USER';
                    navigate(isUserRole ? '/endorsements?mine=1' : '/endorsements');
                }}
                className="pointer-events-auto flex items-center justify-center p-3.5 bg-white dark:bg-[#111] border-2 border-orange-500 shadow-[0_0_25px_-5px_rgba(249,115,22,0.5)] rounded-2xl transition-all hover:scale-110 active:scale-95 group text-gray-500 hover:text-orange-500 hover:border-orange-600 focus:outline-none"
                title="Letter Endorsements"
            >
                <div className="relative">
                    <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
                    {count > 0 && (
                        <span className="absolute -top-3 -right-3 min-w-[20px] h-[20px] bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/40 animate-bounce">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
