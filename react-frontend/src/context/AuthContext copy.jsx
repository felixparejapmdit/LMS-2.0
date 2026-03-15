
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
const normalizeLayoutStyle = (style) => (style === "minimalist" ? "minimalist" : "minimalist");
const AUTH_USER_KEY = "auth_user";
const AUTH_PERMS_KEY = "auth_permissions";

const readCachedJson = (key, fallback = null) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeCachedJson = (key, value) => {
    try {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch {
        // Ignore storage errors
    }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(localStorage.getItem("isGuest") === "true");
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    const [layoutStyle, setLayoutStyle] = useState(normalizeLayoutStyle(localStorage.getItem("layoutStyle") || "minimalist"));
    const [fontFamily, setFontFamily] = useState(localStorage.getItem("fontFamily") || "Outfit"); // Inter, Public Sans, Geist, Plus Jakarta Sans, Outfit
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(localStorage.getItem("isSidebarExpanded") !== "false");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [permissions, setPermissions] = useState([]);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);

    const fetchUserPermissions = async (roleId) => {
        if (!roleId) return [];
        try {
            const res = await axios.get(`${BACKEND_URL}/role-permissions/role/${roleId}`);
            const perms = res.data || [];
            setPermissions(perms);
            writeCachedJson(AUTH_PERMS_KEY, perms);
            setPermissionsLoaded(true);
            return perms;
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
            setPermissions([]);
            writeCachedJson(AUTH_PERMS_KEY, null);
            setPermissionsLoaded(true);
            return [];
        }
    };

    const hasPermission = (pageId, action = 'can_view') => {
        if (isGuest) {
            return pageId === 'guest-send-letter';
        }

        // Deny-by-default once authenticated if no permission records are present.
        if (!permissions || permissions.length === 0) return false;

        const normalizePageId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
        const perm = permissions.find(p =>
            p.page_name === pageId ||
            normalizePageId(p.page_name) === normalizePageId(pageId)
        );
        // If we have permissions records but NONE for this specific page, deny by default (secure)
        if (!perm) return false;
        return !!perm[action];
    };

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e) => {
            // Only auto-switch if the user hasn't explicitly set a preference in this session
            // or if we want to strictly follow system.
            // For now, let's make it follow system if no override is in localStorage
            if (!localStorage.getItem("theme")) {
                setTheme(e.matches ? "dark" : "light");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const normalized = normalizeLayoutStyle(layoutStyle);
        if (normalized !== layoutStyle) {
            setLayoutStyle(normalized);
            return;
        }
        localStorage.setItem("layoutStyle", normalized);
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
        const normalized = normalizeLayoutStyle(style);
        setLayoutStyle(normalized);
        if (user?.id && !isGuest) {
            try {
                await axios.put(`${BACKEND_URL}/users/${user.id}`, { layout_style: normalized });
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
        setPermissionsLoaded(true);
        writeCachedJson(AUTH_USER_KEY, null);
        writeCachedJson(AUTH_PERMS_KEY, null);
    };

    const login = async (username, password) => {
        try {
            // Find user by username in our backend with strict matching
            const userRes = await axios.get(`${BACKEND_URL}/users?username=${username}`);
            const foundUsers = userRes.data;

            // Strictly find the user that matches the typed username (case-insensitive)
            const userFetch = foundUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

            if (!userFetch) throw new Error("User not found in local database");

            // Authenticate and fetch permissions in parallel to reduce login latency
            const [, perms] = await Promise.all([
                directus.login(userFetch.email, password),
                fetchUserPermissions(userFetch.role)
            ]);

            const updatedMe = { ...userFetch, islogin: true };

            // Fire-and-forget: mark user online without blocking UI transition
            axios.put(`${BACKEND_URL}/users/${userFetch.id}`, { islogin: true }).catch(() => { });

            setIsGuest(false);
            localStorage.removeItem("isGuest");
            setUser(updatedMe);
            writeCachedJson(AUTH_USER_KEY, updatedMe);
            if (Array.isArray(perms)) {
                writeCachedJson(AUTH_PERMS_KEY, perms);
            }
            if (userFetch.layout_style) setLayoutStyle(normalizeLayoutStyle(userFetch.layout_style));
            if (userFetch.theme_preference) setTheme(userFetch.theme_preference);
            if (userFetch.font_family) setFontFamily(userFetch.font_family);
            return { success: true, user: updatedMe };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        const userId = user?.id;
        const wasGuest = isGuest;

        console.log("AuthContext: Performing logout and clearing cache...");

        // Clear local state immediately for fast transitions
        setUser(null);
        setIsGuest(false);
        setPermissions([]);
        setPermissionsLoaded(false);

        // Remove ALL auth related items
        localStorage.removeItem("isGuest");
        localStorage.removeItem("directus_auth");
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_PERMS_KEY);
        writeCachedJson(AUTH_USER_KEY, null);
        writeCachedJson(AUTH_PERMS_KEY, null);

        try {
            if (userId && !wasGuest) {
                // Notify backend user is offline (non-blocking)
                axios.put(`${BACKEND_URL}/users/${userId}`, { islogin: false }).catch(() => { });
            }

            // Try SDK logout (only if we have something to log out of)
            await directus.logout().catch((err) => {
                console.warn("AuthContext: SDK logout failed (expected if token expired):", err.message);
            });
        } catch (error) {
            console.error("Logout process encountered an error:", error);
        } finally {
            // Final safety clear
            localStorage.removeItem("directus_auth");
            window.location.href = "/login"; // Force redirect to break any internal state loops
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
            setPermissions([]);
            setPermissionsLoaded(false);
            writeCachedJson(AUTH_USER_KEY, null);
            writeCachedJson(AUTH_PERMS_KEY, null);
            return;
        }

        const cachedUser = readCachedJson(AUTH_USER_KEY, null);
        const cachedPermsRaw = localStorage.getItem(AUTH_PERMS_KEY);
        const cachedPerms = cachedPermsRaw ? readCachedJson(AUTH_PERMS_KEY, []) : null;
        const hasCachedUser = !!cachedUser;

        if (hasCachedUser) {
            setUser(cachedUser);
            setPermissions(Array.isArray(cachedPerms) ? cachedPerms : []);
            setPermissionsLoaded(cachedPermsRaw !== null);
            setLoading(false);
        }

        try {
            const meId = await directus.request(readMe({ fields: ['id'] }));

            // Bypass Directus field permissions by fetching full details from our backend
            const response = await axios.get(`${BACKEND_URL}/users/${meId.id}`);
            const me = response.data;

            console.log("AuthContext: checkAuth successful (via backend):", me);

            // Fetch Permissions
            const perms = await fetchUserPermissions(me.role);

            // Ensure islogin is true if they are successfully authed
            if (!me.islogin) {
                // Fire-and-forget to avoid blocking transition
                axios.put(`${BACKEND_URL}/users/${me.id}`, { islogin: true }).catch(() => { });
                me.islogin = true;
            }

            setUser(me);
            writeCachedJson(AUTH_USER_KEY, me);
            if (Array.isArray(perms)) {
                writeCachedJson(AUTH_PERMS_KEY, perms);
            }
            if (me.layout_style) setLayoutStyle(normalizeLayoutStyle(me.layout_style));
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
            if (!hasCachedUser) setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.id || isGuest) return;

        const syncPrefs = async () => {
            try {
                const response = await axios.get(`${BACKEND_URL}/users/${user.id}`);
                const me = response.data;
                if (me.layout_style && normalizeLayoutStyle(me.layout_style) !== layoutStyle) {
                    setLayoutStyle(normalizeLayoutStyle(me.layout_style));
                }
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
            isMobileMenuOpen, setIsMobileMenuOpen, permissions, hasPermission, permissionsLoaded
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
