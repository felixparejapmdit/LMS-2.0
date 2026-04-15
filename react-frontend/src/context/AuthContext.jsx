
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
const normalizeLayoutStyle = (style) => {
    return "minimalist";
};
import { AUTH_USER_KEY, AUTH_PERMS_KEY, LAST_REFRESH_KEY, REFRESH_THROTTLE_MS } from "./authConstants";
// REMOVED RE-EXPORT TO IMPROVE HMR


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
        case 'SET_SETUP_STATUS':
            return {
                ...state,
                isSetupComplete: action.payload
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
        isSetupComplete: true, // Default to true for everyone else
    });

    // 2. UI STATE (Preferences, Sidebar)
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    const [layoutStyle, setLayoutStyle] = useState("minimalist");
    const [fontFamily, setFontFamily] = useState(localStorage.getItem("fontFamily") || "Outfit");
    const [fontSize, setFontSize] = useState(localStorage.getItem("fontSize") || "14px");
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
        const checkStartTime = Date.now();
        console.log(`[BOOT] checkAuth triggered...`);

        if (authState.isGuest) {
            try {
                const response = await axios.get(`${BACKEND_URL}/auth/guest-config`);
                const perms = response.data.permissions || [];
                dispatch({
                    type: 'INIT_SESSION',
                    payload: {
                        user: { first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true },
                        permissions: perms,
                        permissionsLoaded: true,
                        isGuest: true
                    }
                });
            } catch (error) {
                dispatch({
                    type: 'INIT_SESSION',
                    payload: {
                        user: { first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true },
                        permissions: [],
                        permissionsLoaded: true,
                        isGuest: true
                    }
                });
            }
            return;
        }

        const directusStored = localStorage.getItem('directus_auth');
        if (!directusStored) {
            dispatch({ type: 'LOGOUT' });
            return;
        }

        const directusJson = JSON.parse(directusStored);
        const isPending = directusJson?.pending === true;

        const cachedUser = readCachedJson(AUTH_USER_KEY, null);
        const cachedPermsRaw = localStorage.getItem(AUTH_PERMS_KEY);
        const cachedPerms = cachedPermsRaw ? readCachedJson(AUTH_PERMS_KEY, []) : null;

        if (isPending) {
            console.log("AuthContext: Token is still pending in background, using cached user if available.");
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
                return; // Continue using the cached user while token resolves
            }
        }

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

            // Sync Grace: Reduce to 100ms for high performance
            const cachedAuth = localStorage.getItem('directus_auth');
            if (cachedAuth && cachedAuth.includes('"pending":true')) {
                console.log("AuthContext: Token is pending, fast-syncing (100ms)...");
                await new Promise(r => setTimeout(r, 100));
            }

            // Parallelize critical auth resolution
            const meId = await directus.request(readMe({ fields: ['id'] })).then(r => r.id).catch(() => cachedUser?.id);
            const configRes = await axios.get(`${BACKEND_URL}/auth/access-config?userId=${meId}`);
            
            console.log(`[BOOT] Auth parallel resolve in ${Date.now() - checkStartTime}ms`);
            const { user: me, permissions: perms } = configRes.data;

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

            // If Access Manager, check setup status - NON-BLOCKING
            const roleName = (me.roleData?.name || me.role || '').toString().toUpperCase();
            if (roleName === 'ACCESS MANAGER') {
                const deptId = me.dept_id?.id || me.dept_id;
                axios.get(`${BACKEND_URL}/role-permissions/setup-status?dept_id=${deptId}`)
                    .then(setup => dispatch({ type: 'SET_SETUP_STATUS', payload: !!setup.data?.isSetupComplete }))
                    .catch(e => console.error("Failed to check setup status", e));
            } else {
                dispatch({ type: 'SET_SETUP_STATUS', payload: true });
            }
        } catch (error) {
            const status = error.status || error.response?.status;
            if (status === 401 || error.message?.includes('401')) {
                logout();
            }
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [authState.isGuest, logout]);

    const login = async (username, password, provider = null) => {
        const loginStartTime = Date.now();
        try {
            const res = await axios.post(`${BACKEND_URL}/auth/login`, { username, password, provider });
            if (!res.data.success) throw new Error(res.data.error || "Login failed");

            const { user: me, permissions: perms, directus_auth: directusAuth, token_pending, timings } = res.data;

            if (timings) {
                console.group(`[LOGIN Performance] ${username}`);
                Object.entries(timings).forEach(([step, duration]) => {
                    console.log(`${step.padEnd(30)}: ${duration}ms`);
                });
                console.log(`Directus Token: ${token_pending ? 'PENDING' : 'READY'}`);
                console.groupEnd();
            }

            if (directusAuth) {
                localStorage.setItem('directus_auth', JSON.stringify(directusAuth));
            } else if (token_pending) {
                // If the token is slow, we set a temporary pending status to prevent checkAuth from logging us out immediately
                localStorage.setItem('directus_auth', JSON.stringify({ pending: true, timestamp: Date.now() }));
            }
            localStorage.removeItem("isGuest");

            writeCachedJson(AUTH_USER_KEY, me);
            writeCachedJson(AUTH_PERMS_KEY, perms);

            console.log(`[AUTH] Dispatching LOGIN state for ${username}...`);
            dispatch({
                type: 'LOGIN',
                payload: { user: me, permissions: perms }
            });
            console.log(`[AUTH] LOGIN state dispatched in ${Date.now() - loginStartTime}ms.`);

            localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());

            // Check setup status - NON-BLOCKING
            const roleName = (me.roleData?.name || me.role || '').toString().toUpperCase();
            if (roleName === 'ACCESS MANAGER') {
                const deptId = me.dept_id?.id || me.dept_id;
                axios.get(`${BACKEND_URL}/role-permissions/setup-status?dept_id=${deptId}`)
                    .then(setup => dispatch({ type: 'SET_SETUP_STATUS', payload: !!setup.data?.isSetupComplete }))
                    .catch(e => console.error("Failed to check setup status", e));
            } else {
                dispatch({ type: 'SET_SETUP_STATUS', payload: true });
            }

            setLayoutStyle('minimalist');
            if (me.theme_preference) setTheme(me.theme_preference);
            if (me.font_family) setFontFamily(me.font_family);

            return { success: true, user: me };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, error: error.response?.data?.error || error.message };
        }
    };

    const loginGuest = async () => {
        localStorage.setItem("isGuest", "true");
        let perms = [];
        try {
            const response = await axios.get(`${BACKEND_URL}/auth/guest-config`);
            perms = response.data.permissions || [];
        } catch (e) {
            console.error("Failed to load guest permissions", e);
        }

        setLayoutStyle('minimalist');
        dispatch({
            type: 'LOGIN_GUEST',
            payload: {
                user: { first_name: "Guest", last_name: "User", email: "guest@example.com", isGuest: true },
                permissions: perms
            }
        });
    };

    // --- PERMISSION LOGIC (Memoized) ---
    const hasPermission = useCallback((pageId, action = 'can_view') => {
        if (authState.isGuest) return pageId === 'guest-send-letter';

        const roleName = (authState.user?.roleData?.name || authState.user?.role || '').toString().toUpperCase();
        const SUPER_ADMIN_ROLES = ['ADMINISTRATOR'];
        const isSuperAdmin = SUPER_ADMIN_ROLES.includes(roleName) ||
            authState.user?.email === 'felixpareja07@gmail.com';

        // Access Manager Role (Previously bypassed, now follows matrix)
        const isAccessManager = roleName === 'ACCESS MANAGER';

        if (!authState.permissions || authState.permissions.length === 0) return false;

        const normalizePageId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
        const perm = authState.permissions.find(p =>
            p.page_name === pageId ||
            normalizePageId(p.page_name) === normalizePageId(pageId)
        );
        return perm ? !!perm[action] : false;
    }, [authState.permissions, authState.isGuest, authState.user]);

    // --- UI ACTIONS ---
    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (authState.user?.id && !authState.isGuest) {
            axios.put(`${BACKEND_URL}/users/${authState.user.id}`, { theme_preference: newTheme }).catch(() => { });
        }
    };

    const toggleLayoutStyle = (style) => {
        const normalized = "minimalist";
        setLayoutStyle(normalized);
    };

    const changeFontFamily = (font) => {
        setFontFamily(font);
        if (authState.user?.id && !authState.isGuest) {
            axios.put(`${BACKEND_URL}/users/${authState.user.id}`, { font_family: font }).catch(() => { });
        }
    };

    const changeFontSize = (size) => {
        setFontSize(size);
        if (authState.user?.id && !authState.isGuest) {
            axios.put(`${BACKEND_URL}/users/${authState.user.id}`, { font_size: size }).catch(() => { });
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
        document.body.style.fontSize = fontSize;
        localStorage.setItem("fontSize", fontSize);
    }, [fontSize]);

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
                if (me.theme_preference && me.theme_preference !== theme) setTheme(me.theme_preference);
                if (me.font_family && me.font_family !== fontFamily) setFontFamily(me.font_family);
                if (me.font_size && me.font_size !== fontSize) setFontSize(me.font_size);
            } catch (error) { /* silence */ }
        };
        const interval = setInterval(syncPrefs, 60000);
        return () => clearInterval(interval);
    }, [authState.user?.id, authState.isGuest, layoutStyle, theme]);

    const refreshSetupStatus = useCallback(async () => {
        if (!authState.user) return;
        try {
            const roleName = (authState.user.roleData?.name || authState.user.role || '').toString().toUpperCase();
            if (roleName === 'ACCESS MANAGER') {
                const deptId = authState.user.dept_id?.id || authState.user.dept_id;
                const setup = await axios.get(`${BACKEND_URL}/role-permissions/setup-status?dept_id=${deptId}`);
                dispatch({ type: 'SET_SETUP_STATUS', payload: !!setup.data?.isSetupComplete });
            } else {
                dispatch({ type: 'SET_SETUP_STATUS', payload: true });
            }
        } catch (e) {
            console.error("Failed to refresh setup status", e);
        }
    }, [authState.user]);

    // --- MEMOIZED VALUES ---
    const authContextValue = useMemo(() => ({
        ...authState,
        login,
        logout,
        loginGuest,
        hasPermission,
        refreshSetupStatus
    }), [authState, hasPermission, logout, refreshSetupStatus]);

    const uiContextValue = useMemo(() => ({
        theme, toggleTheme,
        layoutStyle, toggleLayoutStyle,
        fontFamily, changeFontFamily,
        fontSize, changeFontSize,
        isSidebarExpanded, toggleSidebar,
        isMobileMenuOpen, setIsMobileMenuOpen
    }), [theme, layoutStyle, fontFamily, fontSize, isSidebarExpanded, isMobileMenuOpen]);

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
    const isSuperAdmin = ['ADMINISTRATOR'].includes(roleName) ||
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
        const SUPER_ADMIN_ROLES = ['ADMINISTRATOR'];
        return SUPER_ADMIN_ROLES.includes(roleName) ||
            context.user?.email === 'felixpareja07@gmail.com';
    }, [context.user]);

    return { ...context, isSuperAdmin };
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within AuthProvider");
    return context;
};
