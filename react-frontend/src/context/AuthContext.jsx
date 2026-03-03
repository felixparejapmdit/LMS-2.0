
import React, { createContext, useContext, useState, useEffect } from "react";
import { directus } from "../hooks/useDirectus";
import { readMe } from "@directus/sdk";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(localStorage.getItem("isGuest") === "true");
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
    const [layoutStyle, setLayoutStyle] = useState(localStorage.getItem("layoutStyle") || "modern"); // 'modern', 'notion', 'linear', 'grid'
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(localStorage.getItem("isSidebarExpanded") === "true");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [permissions, setPermissions] = useState([]);

    const fetchUserPermissions = async (roleId) => {
        if (!roleId) return;
        try {
            const res = await axios.get(`${BACKEND_URL}/role-permissions/role/${roleId}`);
            setPermissions(res.data);
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
            setPermissions([]);
        }
    };

    const hasPermission = (pageId, action = 'can_view') => {
        // Super Admin Bypass
        const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
        if (roleName === 'ADMIN' || roleName === 'SUPER ADMIN' || roleName === 'DEVELOPER') return true;

        // If permissions haven't loaded yet or no records exist, allow by default
        if (!permissions || permissions.length === 0) return true;

        const perm = permissions.find(p => p.page_name === pageId);
        // If no specific record for this page, allow by default (permissive)
        if (!perm) return true;
        return !!perm[action];
    };

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("layoutStyle", layoutStyle);
    }, [layoutStyle]);

    useEffect(() => {
        localStorage.setItem("isSidebarExpanded", isSidebarExpanded);
    }, [isSidebarExpanded]);

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

    const toggleLayoutStyle = (style) => {
        setLayoutStyle(style);
    };

    const toggleSidebar = () => {
        setIsSidebarExpanded(prev => !prev);
    };

    const loginGuest = () => {
        setIsGuest(true);
        localStorage.setItem("isGuest", "true");
        setUser({ first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true });
        setPermissions([]);
    };

    const login = async (username, password) => {
        try {
            // Find user by username in our backend to get their correct email
            const userRes = await axios.get(`${BACKEND_URL}/users?username=${username}`);
            const foundUsers = userRes.data;
            if (foundUsers.length === 0) throw new Error("User not found");
            const userFetch = foundUsers[0];

            await directus.login(userFetch.email, password);
            const meId = await directus.request(readMe({ fields: ['id'] }));

            // Bypass Directus field permissions by fetching full details from our backend
            const response = await axios.get(`${BACKEND_URL}/users/${meId.id}`);
            const me = response.data;

            console.log("AuthContext: User data fetched from backend:", me);

            // Fetch Permissions for this user's role
            await fetchUserPermissions(me.role);

            // Set user online
            await axios.put(`${BACKEND_URL}/users/${me.id}`, { islogin: true });
            const updatedMe = { ...me, islogin: true };

            setUser(updatedMe);
            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            if (user?.id && !isGuest) {
                await axios.put(`${BACKEND_URL}/users/${user.id}`, { islogin: false });
            }
            await directus.logout();
            setUser(null);
            setIsGuest(false);
            setPermissions([]);
            localStorage.removeItem("isGuest");
        } catch (error) {
            console.error("Logout failed:", error);
            setUser(null);
            setIsGuest(false);
            setPermissions([]);
            localStorage.removeItem("isGuest");
        }
    };

    const checkAuth = async () => {
        if (isGuest) {
            setUser({ first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true });
            setPermissions([]);
            setLoading(false);
            return;
        }
        try {
            const meId = await directus.request(readMe({ fields: ['id'] }));

            // Bypass Directus field permissions by fetching full details from our backend
            const response = await axios.get(`${BACKEND_URL}/users/${meId.id}`);
            const me = response.data;

            console.log("AuthContext: checkAuth successful (via backend):", me);

            // Fetch Permissions
            await fetchUserPermissions(me.role);

            // Ensure islogin is true if they are successfully authed
            if (!me.islogin) {
                await axios.put(`${BACKEND_URL}/users/${me.id}`, { islogin: true });
                me.islogin = true;
            }

            setUser(me);
        } catch (error) {
            setUser(null);
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            user, login, logout, loginGuest, isGuest, loading, theme, toggleTheme,
            layoutStyle, toggleLayoutStyle, isSidebarExpanded, toggleSidebar,
            isMobileMenuOpen, setIsMobileMenuOpen, permissions, hasPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) return null;

    const { user } = context;
    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();

    // Super Admin check: either role is Admin/Super Admin/Developer OR it's a specific developer email
    const isSuperAdmin = roleName === 'ADMIN' ||
        roleName === 'SUPER ADMIN' ||
        roleName === 'DEVELOPER' ||
        user?.email === 'felixpareja07@gmail.com'; // Placeholder for developer override

    return { ...context, isSuperAdmin };
};
