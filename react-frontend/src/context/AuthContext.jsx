
import React, { createContext, useContext, useState, useEffect, useReducer, useMemo, useCallback } from "react";
import { directus } from "../hooks/useDirectus";
import { readMe } from "@directus/sdk";
import axios from "axios";
import API_BASE from "../config/apiConfig";

// --- HELPERS ---

const BACKEND_URL = API_BASE;
const normalizeLayoutStyle = (style) => {
    return "minimalist";
};
import { AUTH_USER_KEY, AUTH_PERMS_KEY, LAST_REFRESH_KEY, REFRESH_THROTTLE_MS } from "./authConstants";
// REMOVED RE-EXPORT TO IMPROVE HMR

// RBAC should be governed by the Access Matrix (role_permissions).
// Avoid hard-coded permission bypasses; grant special access via the matrix instead.


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
                loading: typeof action.payload.loading === 'boolean' ? action.payload.loading : false
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
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState(() => {
        const saved = localStorage.getItem('sidebar_expanded_menus');
        return saved ? JSON.parse(saved) : {};
    });

    const toggleSubmenu = useCallback((label) => {
        setExpandedMenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
        if (!isSidebarExpanded) {
            setIsSidebarExpanded(true);
            localStorage.setItem("isSidebarExpanded", "true");
        }
    }, [isSidebarExpanded]);

    useEffect(() => {
        localStorage.setItem('sidebar_expanded_menus', JSON.stringify(expandedMenus));
    }, [expandedMenus]);

    const startTutorial = useCallback(() => {
        setIsTutorialOpen(true);
    }, []);

    const closeTutorial = useCallback(() => {
        setIsTutorialOpen(false);
    }, []);

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
    
    // --- IDLE LOGOUT LOGIC ---
    useEffect(() => {
        if (!authState.user) return;

        const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        let idleTimer;

        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                console.log("Inactivity detected. Logging out...");
                logout();
            }, IDLE_TIMEOUT);
        };

        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer(); // Initialize timer

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            clearTimeout(idleTimer);
        };
    }, [authState.user, logout]);


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

        let directusJson = null;
        try {
            directusJson = JSON.parse(directusStored);
        } catch {
            dispatch({ type: 'LOGOUT' });
            return;
        }

        if (directusJson?.pending === true) {
            dispatch({ type: 'LOGOUT' });
            return;
        }

        const accessToken =
            directusJson?.access_token ||
            directusJson?.token ||
            directusJson?.data?.access_token ||
            directusJson?.data?.token;

        if (!accessToken) {
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
                    isGuest: false,
                    loading: true
                }
            });
        }

        try {
            // Parallelize critical auth resolution
            const meId = await directus.request(readMe({ fields: ['id'] })).then(r => r.id);
            const configRes = await axios.get(`${BACKEND_URL}/auth/access-config?userId=${meId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            
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

    const refreshPermissions = useCallback(async () => {
        if (!authState.user || authState.isGuest) return;
        const directusStored = localStorage.getItem('directus_auth');
        if (!directusStored) return;

        let directusJson = null;
        try {
            directusJson = JSON.parse(directusStored);
        } catch {
            return;
        }

        const accessToken =
            directusJson?.access_token ||
            directusJson?.token ||
            directusJson?.data?.access_token ||
            directusJson?.data?.token;

        if (!accessToken) return;

        try {
            const configRes = await axios.get(`${BACKEND_URL}/auth/access-config`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const { user: me, permissions: perms } = configRes.data || {};
            if (!me || !Array.isArray(perms)) return;

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
        } catch (e) {
            console.warn("Failed to refresh permissions", e?.response?.data?.error || e?.message || e);
        }
    }, [authState.user, authState.isGuest]);

    const login = async (username, password, provider = null) => {
        const loginStartTime = Date.now();
        try {
            const res = await axios.post(`${BACKEND_URL}/auth/login`, { username, password, provider });
            if (!res.data.success) throw new Error(res.data.error || "Login failed");

            const { user: me, permissions: perms, directus_auth: directusAuth, directus_deferred: directusDeferred, timings } = res.data;

            if (timings) {
                console.group(`[LOGIN Performance] ${username}`);
                Object.entries(timings).forEach(([step, duration]) => {
                    console.log(`${step.padEnd(30)}: ${duration}ms`);
                });
                console.log(`Directus Token: READY`);
                console.groupEnd();
            }

            if (directusAuth) {
                localStorage.setItem('directus_auth', JSON.stringify(directusAuth));
            } else if (directusDeferred) {
                console.log(`[AUTH] Directus session deferred. Continuing login and syncing in background...`);
                axios.post(`${BACKEND_URL}/auth/directus-login`, { username, password, provider })
                    .then((dRes) => {
                        if (dRes?.data?.directus_auth) {
                            localStorage.setItem('directus_auth', JSON.stringify(dRes.data.directus_auth));
                            console.log(`[AUTH] Directus session synced.`);
                        } else {
                            console.warn(`[AUTH] Directus sync completed without a session.`);
                        }
                    })
                    .catch((e) => {
                        console.warn(`[AUTH] Directus session sync failed:`, e?.response?.data?.error || e?.message || e);
                    });
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

            // --- Tutorial Orchestration ---
            try {
                const count = parseInt(localStorage.getItem('lms_tutorial_auto_count') || "0");
                // Reset dismissed flag for the first 3 sessions to ensure the walkthrough persists as requested
                if (count < 3) {
                    localStorage.setItem('lms_tutorial_auto_count', (count + 1).toString());
                    sessionStorage.setItem('lms_tutorial_pending', 'true');
                    console.log(`[AUTH] Tutorial session #${count + 1} primed (Ignoring dismissal during intro phase).`);
                }
            } catch (e) { console.error("Tutorial storage error:", e); }

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
        
        // ROOT and DEVELOPER are the only absolute bypasses for the matrix.
        // ADMINISTRATOR and SUPER ADMIN must now follow the matrix rules as requested.
        const roleName = (authState.user?.roleData?.name || authState.user?.role || '').toString().toUpperCase();
        const IS_ROOT = ['DEVELOPER', 'ROOT'].includes(roleName);
        if (IS_ROOT) return true; 

        // If permissions haven't loaded yet:
        // - For navigation visibility (Sidebar), we prefer "hide until proven allowed"
        // - ProtectedRoute already blocks rendering until permissionsLoaded = true
        if (!authState.permissionsLoaded) return false;
        if (!authState.permissions || authState.permissions.length === 0) return false;

        const normalizePageId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");

        // Prefer exact matches to avoid accidentally hitting "legacy"/variant page_name records.
        let perm = authState.permissions.find((p) => p.page_name === pageId);
        if (!perm) {
            const normalizedNeedle = normalizePageId(pageId);
            perm = authState.permissions.find((p) => normalizePageId(p.page_name) === normalizedNeedle);
        }

        // No record in the DB for this page → deny by default.
        // This keeps the Access Matrix as the single source of truth.
        if (!perm) return false;
        return !!perm[action];
    }, [authState.permissions, authState.permissionsLoaded, authState.isGuest, authState.user]);

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
        refreshSetupStatus,
        refreshPermissions
    }), [authState, hasPermission, logout, refreshSetupStatus, refreshPermissions]);

    const uiContextValue = useMemo(() => ({
        theme, toggleTheme,
        layoutStyle, toggleLayoutStyle,
        fontFamily, changeFontFamily,
        fontSize, changeFontSize,
        isSidebarExpanded, toggleSidebar,
        isMobileMenuOpen, setIsMobileMenuOpen,
        isTutorialOpen, startTutorial, closeTutorial,
        expandedMenus, setExpandedMenus, toggleSubmenu
    }), [theme, layoutStyle, fontFamily, fontSize, isSidebarExpanded, isMobileMenuOpen, isTutorialOpen, startTutorial, closeTutorial, expandedMenus, toggleSubmenu]);

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

    const roleName = (auth.user?.roleData?.name || auth.user?.role || '').toString().toUpperCase();
    const isSuperAdmin = ['ADMINISTRATOR', 'ADMIN', 'DEVELOPER', 'ROOT', 'SUPER ADMIN'].includes(roleName);

    // Return combined object for backward compatibility, but it will trigger re-renders
    // on ANY change. We should encourage using useSession() and useUI()
    return { ...auth, ...ui, isSuperAdmin };
};

export const useSession = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useSession must be used within AuthProvider");

    // Memoize the super admin calculation so it doesn't change on every useSession call
    const isSuperAdmin = useMemo(() => {
        const rData = context.user?.roleData;
        const roleName = (rData?.name || context.user?.role || '').toString().toUpperCase();
        return ['ADMINISTRATOR', 'ADMIN', 'DEVELOPER', 'ROOT', 'SUPER ADMIN'].includes(roleName);
    }, [context.user]);

    const roleName = useMemo(() => {
        return (context.user?.roleData?.name || context.user?.role || '').toString().toUpperCase();
    }, [context.user]);

    return { ...context, isSuperAdmin, roleName };
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within AuthProvider");
    return context;
};
