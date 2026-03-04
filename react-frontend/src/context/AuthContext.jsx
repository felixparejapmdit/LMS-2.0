
import React, { createContext, useContext, useState, useEffect } from "react";
import { directus } from "../hooks/useDirectus";
import { readMe } from "@directus/sdk";
import axios from "axios";

// Robust URL resolution: prioritize env var, then current hostname (port 5000), then fallback to localhost
const getBackendUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return `http://${window.location.hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
};

const BACKEND_URL = getBackendUrl();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(localStorage.getItem("isGuest") === "true");
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
    const [layoutStyle, setLayoutStyle] = useState(localStorage.getItem("layoutStyle") || "notion"); // 'notion', 'grid'
    const [fontFamily, setFontFamily] = useState(localStorage.getItem("fontFamily") || "Outfit"); // Inter, Public Sans, Geist, Plus Jakarta Sans, Outfit
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(localStorage.getItem("isSidebarExpanded") !== "false");
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
        const isAdmin = roleName === 'ADMIN' ||
            roleName === 'SUPER ADMIN' ||
            roleName === 'SUPERADMIN' ||
            roleName === 'ADMINISTRATOR' ||
            roleName === 'DEVELOPER';

        if (isAdmin || user?.email === 'felixpareja07@gmail.com') return true;

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
        document.body.style.fontFamily = `'${fontFamily}', system-ui, -apple-system, sans-serif`;
        localStorage.setItem("fontFamily", fontFamily);
    }, [fontFamily]);

    useEffect(() => {
        localStorage.setItem("isSidebarExpanded", isSidebarExpanded);
    }, [isSidebarExpanded]);

    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (user?.id && !isGuest) {
            try {
                await axios.put(`${BACKEND_URL}/users/${user.id}`, { theme_preference: newTheme });
            } catch (err) {
                console.error("Failed to sync theme to backend", err);
            }
        }
    };

    const toggleLayoutStyle = async (style) => {
        setLayoutStyle(style);
        if (user?.id && !isGuest) {
            try {
                await axios.put(`${BACKEND_URL}/users/${user.id}`, { layout_style: style });
            } catch (err) {
                console.error("Failed to sync layout to backend", err);
            }
        }
    };

    const changeFontFamily = async (font) => {
        setFontFamily(font);
        if (user?.id && !isGuest) {
            try {
                await axios.put(`${BACKEND_URL}/users/${user.id}`, { font_family: font });
            } catch (err) {
                console.error("Failed to sync font to backend", err);
            }
        }
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
            // Find user by username in our backend with strict matching
            const userRes = await axios.get(`${BACKEND_URL}/users?username=${username}`);
            const foundUsers = userRes.data;

            // Strictly find the user that matches the typed username (case-insensitive)
            const userFetch = foundUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

            if (!userFetch) throw new Error("User not found in local database");

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
            if (me.layout_style) setLayoutStyle(me.layout_style);
            if (me.theme_preference) setTheme(me.theme_preference);
            if (me.font_family) setFontFamily(me.font_family);
            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            if (user?.id && !isGuest) {
                // Try to notify our backend user is offline
                await axios.put(`${BACKEND_URL}/users/${user.id}`, { islogin: false }).catch(() => { });
            }

            // Try SDK logout (only if we have something to log out of)
            if (localStorage.getItem('directus_auth')) {
                await directus.logout().catch(() => { });
            }
        } catch (error) {
            console.error("Logout process encountered an error:", error);
        } finally {
            // ALWAYS clear everything locally regardless of server results
            localStorage.removeItem("directus_auth");
            localStorage.removeItem("isGuest");
            setUser(null);
            setIsGuest(false);
            setPermissions([]);
        }
    };

    const checkAuth = async () => {
        if (isGuest) {
            setUser({ first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true });
            setPermissions([]);
            setLoading(false);
            return;
        }

        // Before hitting Directus, check if we even have a session stored locally
        // This avoids the 401 Unauthorized log appearing in the console for every redirect to login
        const directusStored = localStorage.getItem('directus_auth');
        if (!directusStored) {
            setUser(null);
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
            if (me.layout_style) setLayoutStyle(me.layout_style);
            if (me.theme_preference) setTheme(me.theme_preference);
            if (me.font_family) setFontFamily(me.font_family);
        } catch (error) {
            const status = error.status || error.response?.status;
            console.warn("AuthContext: Token validation failed.", status);

            // If it's a 401 (Unauthorized) or similar identity error
            // Clean up everything so the user is forced back to a clean login state
            if (status === 401 || error.message?.includes('401') || (error.name === 'DirectusError' && !status)) {
                console.log("AuthContext: Session invalid, triggering logout.");
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.id || isGuest) return;

        const syncPrefs = async () => {
            try {
                const response = await axios.get(`${BACKEND_URL}/users/${user.id}`);
                const me = response.data;
                if (me.layout_style && me.layout_style !== layoutStyle) setLayoutStyle(me.layout_style);
                if (me.theme_preference && me.theme_preference !== theme) setTheme(me.theme_preference);
                if (me.font_family && me.font_family !== fontFamily) setFontFamily(me.font_family);
            } catch (error) {
                console.error("Failed to sync preferences:", error);
            }
        };

        const interval = setInterval(syncPrefs, 30000); // Sync every 30 seconds
        return () => clearInterval(interval);
    }, [user?.id, isGuest, layoutStyle, theme]);

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            user, login, logout, loginGuest, isGuest, loading, theme, toggleTheme,
            layoutStyle, toggleLayoutStyle, fontFamily, changeFontFamily, isSidebarExpanded, toggleSidebar,
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
