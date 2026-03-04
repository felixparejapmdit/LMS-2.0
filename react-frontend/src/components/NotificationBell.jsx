
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
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements/count`);
                const data = await res.json();
                setCount(data.count || 0);
            } catch { }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const roleName = String(user?.roleData?.name || '').trim().toUpperCase();
    const isHiddenPage = ['/login', '/setup/wizard', '/guest/send-letter', '/vip-view'].includes(location.pathname);
    if (!user || isHiddenPage || roleName === 'USER') return null;

    return (
        <div className="fixed top-24 right-6 z-[99999] pointer-events-none sticky-notification">
            <button
                onClick={() => navigate('/endorsements')}
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
