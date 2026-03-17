
import React, { createContext, useContext, useState, useEffect, useReducer, useMemo, useCallback } from "react";
import { directus } from "../hooks/useDirectus";
import { readMe } from "@directus/sdk";
import axios from "axios";

// --- HELPERS ---

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
const LAST_REFRESH_KEY = "auth_last_refresh";
const REFRESH_THROTTLE_MS = 300000; // 5 minutes

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

// --- CONTEXTS ---

const AuthContext = createContext();
const UIContext = createContext();

// --- REDUCERS ---

const authReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'INIT_SESSION':
            return {
                ...state,
                user: action.payload.user,
                permissions: action.payload.permissions || [],
                permissionsLoaded: action.payload.permissionsLoaded,
                isGuest: action.payload.isGuest || false,
                loading: false
            };
        case 'UPDATE_USER':
            return { ...state, user: action.payload };
        case 'SET_PERMISSIONS':
            return { ...state, permissions: action.payload, permissionsLoaded: true };
        case 'LOGIN':
        case 'LOGIN_GUEST':
            return {
                ...state,
                user: action.payload.user,
                permissions: action.payload.permissions || [],
                permissionsLoaded: true,
                isGuest: action.type === 'LOGIN_GUEST',
                loading: false
            };
        case 'LOGOUT':
            return {
                user: null,
                isGuest: false,
                loading: false,
                permissions: [],
                permissionsLoaded: false
            };
        default:
            return state;
    }
};

// --- PROVIDER ---

export const AuthProvider = ({ children }) => {
    // 1. AUTH STATE (Session, Permissions)
    const [authState, dispatch] = useReducer(authReducer, {
        user: null,
        isGuest: localStorage.getItem("isGuest") === "true",
        loading: true,
        permissions: [],
        permissionsLoaded: false,
    });

    // 2. UI STATE (Preferences, Sidebar)
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    const [layoutStyle, setLayoutStyle] = useState(normalizeLayoutStyle(localStorage.getItem("layoutStyle") || "minimalist"));
    const [fontFamily, setFontFamily] = useState(localStorage.getItem("fontFamily") || "Outfit");
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(localStorage.getItem("isSidebarExpanded") !== "false");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- HELPER ACTIONS ---

    const logout = useCallback(async () => {
        const userId = authState.user?.id;
        const wasGuest = authState.isGuest;

        console.log("AuthContext: Performing logout...");

        dispatch({ type: 'LOGOUT' });

        localStorage.removeItem("isGuest");
        localStorage.removeItem("directus_auth");
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_PERMS_KEY);

        try {
            if (userId && !wasGuest) {
                axios.put(`${BACKEND_URL}/users/${userId}`, { islogin: false }).catch(() => { });
            }
            await directus.logout().catch(() => { });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            window.location.href = "/login";
        }
    }, [authState.user?.id, authState.isGuest]);


    const checkAuth = useCallback(async () => {
        if (authState.isGuest) {
            dispatch({
                type: 'INIT_SESSION',
                payload: {
                    user: { first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true },
                    permissions: [],
                    permissionsLoaded: true,
                    isGuest: true
                }
            });
            return;
        }

        const directusStored = localStorage.getItem('directus_auth');
        if (!directusStored) {
            dispatch({ type: 'LOGOUT' });
            return;
        }

        const cachedUser = readCachedJson(AUTH_USER_KEY, null);
        const cachedPermsRaw = localStorage.getItem(AUTH_PERMS_KEY);
        const cachedPerms = cachedPermsRaw ? readCachedJson(AUTH_PERMS_KEY, []) : null;

        // Fast Load: Use Cache first
        if (cachedUser) {
            dispatch({
                type: 'INIT_SESSION',
                payload: {
                    user: cachedUser,
                    permissions: Array.isArray(cachedPerms) ? cachedPerms : [],
                    permissionsLoaded: cachedPermsRaw !== null,
                    isGuest: false
                }
            });
        }

        try {
            // Throttle: Don't refresh if we did it recently
            const lastRefresh = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
            const isFresh = (Date.now() - lastRefresh) < REFRESH_THROTTLE_MS;

            if (cachedUser && cachedPerms && isFresh) {
                console.log("AuthContext: Using fresh cached session, skipping network refresh.");
                return;
            }

            const meId = await directus.request(readMe({ fields: ['id'] }));
            const response = await axios.get(`${BACKEND_URL}/auth/access-config?userId=${meId.id}`);
            const { user: me, permissions: perms } = response.data;

            console.log("AuthContext: session refresh successful:", me.username);
            localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());

            // Sync prefs from backend
            if (me.layout_style) setLayoutStyle(normalizeLayoutStyle(me.layout_style));
            if (me.theme_preference) setTheme(me.theme_preference);
            if (me.font_family) setFontFamily(me.font_family);

            // Update state and cache
            writeCachedJson(AUTH_USER_KEY, me);
            writeCachedJson(AUTH_PERMS_KEY, perms);

            dispatch({
                type: 'INIT_SESSION',
                payload: {
                    user: me,
                    permissions: perms,
                    permissionsLoaded: true,
                    isGuest: false
                }
            });
        } catch (error) {
            const status = error.status || error.response?.status;
            if (status === 401 || error.message?.includes('401')) {
                logout();
            }
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [authState.isGuest, logout]);

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${BACKEND_URL}/auth/login`, { username, password });
            if (!res.data.success) throw new Error(res.data.error || "Login failed");

            const { user: me, permissions: perms, directus_auth: directusAuth } = res.data;

            if (directusAuth) localStorage.setItem('directus_auth', JSON.stringify(directusAuth));
            localStorage.removeItem("isGuest");

            writeCachedJson(AUTH_USER_KEY, me);
            writeCachedJson(AUTH_PERMS_KEY, perms);

            dispatch({
                type: 'LOGIN',
                payload: { user: me, permissions: perms }
            });

            localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());

            if (me.layout_style) setLayoutStyle(normalizeLayoutStyle(me.layout_style));
            if (me.theme_preference) setTheme(me.theme_preference);
            if (me.font_family) setFontFamily(me.font_family);

            return { success: true, user: me };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: error.response?.data?.error || error.message };
        }
    };

    const loginGuest = () => {
        localStorage.setItem("isGuest", "true");
        dispatch({
            type: 'LOGIN_GUEST',
            payload: { user: { first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true } }
        });
    };

    // --- PERMISSION LOGIC (Memoized) ---
    const hasPermission = useCallback((pageId, action = 'can_view') => {
        if (authState.isGuest) return pageId === 'guest-send-letter';
        if (!authState.permissions || authState.permissions.length === 0) return false;

        const normalizePageId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
        const perm = authState.permissions.find(p =>
            p.page_name === pageId ||
            normalizePageId(p.page_name) === normalizePageId(pageId)
        );
        return perm ? !!perm[action] : false;
    }, [authState.permissions, authState.isGuest]);

    // --- UI ACTIONS ---
    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (authState.user?.id && !authState.isGuest) {
            axios.put(`${BACKEND_URL}/users/${authState.user.id}`, { theme_preference: newTheme }).catch(() => { });
        }
    };

    const toggleLayoutStyle = (style) => {
        const normalized = normalizeLayoutStyle(style);
        setLayoutStyle(normalized);
        if (authState.user?.id && !authState.isGuest) {
            axios.put(`${BACKEND_URL}/users/${authState.user.id}`, { layout_style: normalized }).catch(() => { });
        }
    };

    const changeFontFamily = (font) => {
        setFontFamily(font);
        if (authState.user?.id && !authState.isGuest) {
            axios.put(`${BACKEND_URL}/users/${authState.user.id}`, { font_family: font }).catch(() => { });
        }
    };

    const toggleSidebar = () => setIsSidebarExpanded(prev => !prev);

    // --- EFFECTS ---
    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e) => {
            if (!localStorage.getItem("theme")) setTheme(e.matches ? "dark" : "light");
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (theme === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
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

    // Background preferences sync
    useEffect(() => {
        if (!authState.user?.id || authState.isGuest) return;
        const syncPrefs = async () => {
            try {
                const response = await axios.get(`${BACKEND_URL}/users/${authState.user.id}`);
                const me = response.data;
                if (me.layout_style && normalizeLayoutStyle(me.layout_style) !== layoutStyle) setLayoutStyle(normalizeLayoutStyle(me.layout_style));
                if (me.theme_preference && me.theme_preference !== theme) setTheme(me.theme_preference);
                if (me.font_family && me.font_family !== fontFamily) setFontFamily(me.font_family);
            } catch (error) { /* silence */ }
        };
        const interval = setInterval(syncPrefs, 60000);
        return () => clearInterval(interval);
    }, [authState.user?.id, authState.isGuest, layoutStyle, theme]);

    // --- MEMOIZED VALUES ---
    const authContextValue = useMemo(() => ({
        ...authState,
        login,
        logout,
        loginGuest,
        hasPermission
    }), [authState, hasPermission, logout]);

    const uiContextValue = useMemo(() => ({
        theme, toggleTheme,
        layoutStyle, toggleLayoutStyle,
        fontFamily, changeFontFamily,
        isSidebarExpanded, toggleSidebar,
        isMobileMenuOpen, setIsMobileMenuOpen
    }), [theme, layoutStyle, fontFamily, isSidebarExpanded, isMobileMenuOpen]);

    return (
        <AuthContext.Provider value={authContextValue}>
            <UIContext.Provider value={uiContextValue}>
                {children}
            </UIContext.Provider>
        </AuthContext.Provider>
    );
};

// --- HOOKS ---

export const useAuth = () => {
    const auth = useContext(AuthContext);
    const ui = useContext(UIContext);
    if (!auth || !ui) return null;

    const { user } = auth;
    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    const isSuperAdmin = roleName === 'ADMIN' ||
        roleName === 'ADMINISTRATOR' ||
        roleName === 'SYSTEM ADMIN' ||
        roleName === 'SUPER ADMIN' ||
        roleName === 'DEVELOPER' ||
        roleName === 'ROOT' ||
        user?.email === 'felixpareja07@gmail.com';

    // Return combined object for backward compatibility, but it will trigger re-renders
    // on ANY change. We should encourage using useSession() and useUI()
    return { ...auth, ...ui, isSuperAdmin };
};

export const useSession = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useSession must be used within AuthProvider");
    
    // Memoize the super admin calculation so it doesn't change on every useSession call
    const isSuperAdmin = useMemo(() => {
        const roleName = (context.user?.roleData?.name || context.user?.role || '').toString().toUpperCase();
        return roleName === 'ADMIN' || 
               roleName === 'ADMINISTRATOR' || 
               roleName === 'SYSTEM ADMIN' || 
               roleName === 'SUPER ADMIN' || 
               roleName === 'DEVELOPER' || 
               roleName === 'ROOT' ||
               context.user?.email === 'felixpareja07@gmail.com';
    }, [context.user]);

    return { ...context, isSuperAdmin };
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within AuthProvider");
    return context;
};
