
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    User,
    Building2,
    ShieldCheck,
    Bell,
    Palette,
    Save,
    Loader2,
    Lock,
    Mail,
    Menu,
    Camera,
    Upload,
    UserCircle,
    ToggleLeft,
    ToggleRight
} from "lucide-react";
import { directus, directusUrl, getAssetUrl } from "../../hooks/useDirectus";
import { uploadFiles } from "@directus/sdk";
import axios from "axios";
import API_BASE from "../../config/apiConfig";
import useAccess from "../../hooks/useAccess";

const getAuthToken = () => {
    try {
        const directusStored = localStorage.getItem('directus_auth');
        if (!directusStored) return "";
        const directusJson = JSON.parse(directusStored);
        return directusJson?.access_token ||
               directusJson?.token ||
               directusJson?.data?.access_token ||
               directusJson?.data?.token || "";
    } catch (e) {
        return "";
    }
};

export default function Settings() {
    const { user, login, layoutStyle, toggleLayoutStyle, fontFamily, changeFontFamily, fontSize, changeFontSize, setIsMobileMenuOpen, appSettings, fetchAppSettings } = useAuth();
    const access = useAccess();
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(user?.avatar ? getAssetUrl(user.avatar) : null);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        avatar: user?.avatar || null
    });
    const canField = access?.canField || (() => true);
    const canSave = canField("settings", "save_button");
    const canLayoutSelector = canField("settings", "layout_selector");
    const canFontSelector = canField("settings", "font_selector");
    const canAppCustomization = canField("settings", "app_customization");
    const canSystemTheme = canField("settings", "system_theme");
    const canReferenceCodePrefix = canField("settings", "reference_code_prefix");
    const canReferenceCodeMode = canField("settings", "reference_code_mode");
    const canFaviconUpload = canField("settings", "favicon_upload");
    const canSidebarLogoUpload = canField("settings", "sidebar_logo_upload");
    const canLoginLogoUpload = canField("settings", "login_logo_upload");
    const canApplySystemSettings = canField("settings", "apply_system_settings_button");
    const canSaveSystemSettings = canAppCustomization || canApplySystemSettings;

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F9FAFB] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-gray-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

    const [selectedTheme, setSelectedTheme] = useState(appSettings?.system_theme || 'default');
    const [referenceCodePrefix, setReferenceCodePrefix] = useState(appSettings?.reference_code_prefix || 'LMS');
    const [referenceCodeDepartmentMode, setReferenceCodeDepartmentMode] = useState(appSettings?.reference_code_department_mode !== false);
    const [faviconFile, setFaviconFile] = useState(null);
    const [sidebarLogoFile, setSidebarLogoFile] = useState(null);
    const [loginLogoFile, setLoginLogoFile] = useState(null);
    
    const [faviconPreview, setFaviconPreview] = useState(null);
    const [sidebarLogoPreview, setSidebarLogoPreview] = useState(null);
    const [loginLogoPreview, setLoginLogoPreview] = useState(null);

    const [resetFavicon, setResetFavicon] = useState(false);
    const [resetSidebarLogo, setResetSidebarLogo] = useState(false);
    const [resetLoginLogo, setResetLoginLogo] = useState(false);

    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (appSettings) {
            setSelectedTheme(appSettings.system_theme || 'default');
            setReferenceCodePrefix((appSettings.reference_code_prefix || 'LMS').toString().trim() || 'LMS');
            setReferenceCodeDepartmentMode(appSettings.reference_code_department_mode !== false);
            const backendBase = API_BASE.replace('/api', '');
            setFaviconPreview(appSettings.favicon ? `${backendBase}${appSettings.favicon}` : null);
            setSidebarLogoPreview(appSettings.sidebar_logo ? `${backendBase}${appSettings.sidebar_logo}` : null);
            setLoginLogoPreview(appSettings.login_logo ? `${backendBase}${appSettings.login_logo}` : null);
        }
    }, [appSettings]);

    const handleThemeChange = (themeName) => {
        setSelectedTheme(themeName);
        const themeClass = `theme-${themeName}`;
        const themes = ['theme-default', 'theme-blue', 'theme-emerald', 'theme-indigo', 'theme-violet', 'theme-rose', 'theme-amber'];
        themes.forEach(t => document.documentElement.classList.remove(t));
        document.documentElement.classList.add(themeClass);
    };

    const handleReferencePrefixChange = (value) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        setReferenceCodePrefix(cleaned);
    };

    const handleSaveSystemSettings = async () => {
        if (!canSaveSystemSettings) {
            alert("You don't have permission to update system settings.");
            return;
        }
        setSavingSettings(true);
        try {
            const formData = new FormData();
            formData.append('system_theme', selectedTheme);
            formData.append('reference_code_prefix', referenceCodePrefix);
            formData.append('reference_code_department_mode', String(referenceCodeDepartmentMode));
            if (faviconFile) formData.append('favicon', faviconFile);
            if (sidebarLogoFile) formData.append('sidebar_logo', sidebarLogoFile);
            if (loginLogoFile) formData.append('login_logo', loginLogoFile);

            formData.append('reset_favicon', resetFavicon);
            formData.append('reset_sidebar_logo', resetSidebarLogo);
            formData.append('reset_login_logo', resetLoginLogo);

            const token = getAuthToken();
            await axios.post(`${API_BASE}/app-settings`, formData, {
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            });

            if (fetchAppSettings) {
                await fetchAppSettings();
            }
            
            setFaviconFile(null);
            setSidebarLogoFile(null);
            setLoginLogoFile(null);
            setResetFavicon(false);
            setResetSidebarLogo(false);
            setResetLoginLogo(false);
            
            alert("App settings updated successfully!");
        } catch (err) {
            console.error("Failed to save app settings", err);
            alert("Failed to update app settings");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleFileUpload = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        setUploadingPhoto(true);

        try {
            const form = new FormData();
            form.append("file", file);
            const res = await directus.request(uploadFiles(form));
            setFormData(prev => ({ ...prev, avatar: res.id }));
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.put(`${API_BASE}/users/${user.id}`, formData);
            // Re-fetch or update context user
            window.location.reload(); // Quickest way to sync all profile pics
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden transition-colors duration-300`}>
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-4 md:px-8 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Palette className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-blue-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Workspace</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Settings</h2>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar">
                    <div className="w-full">


                        <div className="space-y-8" key={user?.id}>
                            {/* Layout Customization */}
                            <section className={`${cardBg} rounded-2xl border p-8 shadow-sm`}>
                                <div className={`flex items-center gap-2 mb-6 ${textColor}`}>
                                    <Palette className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-bold">Layout</h3>
                                </div>

                                {canLayoutSelector && (
                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => {
                                                toggleLayoutStyle('minimalist');
                                                changeFontFamily('Inter');
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${layoutStyle === 'minimalist' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 dark:border-[#333] hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${textColor}`}>Minimalist</span>
                                                {layoutStyle === 'minimalist' && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
                                            </div>
                                            <p className="text-[9px] text-gray-500 uppercase font-black">Active Style</p>
                                        </button>
                                    </div>
                                )}

                                {/* Typography Selection */}
                                {canFontSelector && <div className="mt-10 mb-6 pt-10 border-t border-gray-100 dark:border-white/5">
                                    <h4 className={`text-sm font-bold flex items-center gap-2 mb-6 ${textColor}`}>
                                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                        Font Style
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { name: 'Inter', family: 'Inter' },
                                            { name: 'Public Sans', family: 'Public Sans' },
                                            { name: 'Geist', family: 'Geist, system-ui' },
                                            { name: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans' },
                                            { name: 'Outfit', family: 'Outfit' }
                                        ].map((font) => (
                                            <button
                                                key={font.name}
                                                onClick={() => changeFontFamily(font.name)}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${fontFamily === font.name ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 dark:border-[#333] hover:border-gray-200'}`}
                                                style={{ fontFamily: font.family }}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-sm font-bold ${textColor}`}>{font.name}</span>
                                                    {fontFamily === font.name && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                                                </div>
                                                <p className="text-[10px] text-gray-400">Abc 123</p>
                                            </button>
                                        ))}
                                    </div>

                                    <h4 className={`text-sm font-bold flex items-center gap-2 mt-10 mb-6 ${textColor}`}>
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Font Size
                                    </h4>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['12px', '14px', '16px', '18px'].map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => changeFontSize(size)}
                                                className={`p-4 rounded-xl border-2 transition-all text-center ${fontSize === size ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 dark:border-[#333] hover:border-gray-200'}`}
                                            >
                                                <span className={`text-sm font-bold ${textColor}`} style={{ fontSize: size }}>{size}</span>
                                                {fontSize === size && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-2"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </div>}
                            </section>

                            {/* App Settings Customization */}
                            {canAppCustomization && (
                            <section className={`${cardBg} rounded-2xl border p-8 shadow-sm`}>
                                <div className={`flex items-center gap-2 mb-6 ${textColor}`}>
                                    <Palette className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-bold">App Customization (Branding & Reference Codes)</h3>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {canReferenceCodePrefix && (
                                            <label className="block">
                                                <span className={`text-sm font-bold flex items-center gap-2 mb-3 ${textColor}`}>
                                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                                    Reference Code Prefix
                                                </span>
                                                <input
                                                    type="text"
                                                    value={referenceCodePrefix}
                                                    onChange={(e) => handleReferencePrefixChange(e.target.value)}
                                                    maxLength={12}
                                                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 dark:border-[#333] bg-white dark:bg-[#111] text-slate-900 dark:text-white text-sm font-black uppercase tracking-[0.15em] outline-none focus:border-brand-primary transition-colors"
                                                    placeholder="LMS"
                                                />
                                                <p className="mt-2 text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-widest">
                                                    Letters and numbers only. This prefix updates the sidebar and login branding.
                                                </p>
                                            </label>
                                        )}

                                        {canReferenceCodeMode && (
                                            <div className="rounded-2xl border border-gray-100 dark:border-[#333] bg-white dark:bg-[#111] p-4 flex flex-col justify-between">
                                                <div>
                                                    <span className={`text-sm font-bold flex items-center gap-2 mb-3 ${textColor}`}>
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                        Reference Code Mode
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-widest">
                                                        Department-based numbering is the default.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={!canReferenceCodeMode}
                                                    onClick={() => canReferenceCodeMode && setReferenceCodeDepartmentMode((prev) => !prev)}
                                                    className={`mt-4 w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${referenceCodeDepartmentMode ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10' : 'border-gray-100 dark:border-[#333] bg-white dark:bg-[#111]'} ${!canReferenceCodeMode ? 'opacity-40 pointer-events-none' : ''}`}
                                                >
                                                    <div className="text-left">
                                                        <p className={`text-sm font-black uppercase tracking-widest ${textColor}`}>
                                                            {referenceCodeDepartmentMode ? "Enabled" : "Disabled"}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400 uppercase font-black">
                                                            {referenceCodeDepartmentMode ? "Use department selection" : "Auto-generate from latest code"}
                                                        </p>
                                                    </div>
                                                    {referenceCodeDepartmentMode ? (
                                                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                                                    ) : (
                                                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                                                    )}
                                                </button>

                                                <p className="mt-3 text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-widest">
                                                    When disabled, the reference code is generated automatically from the latest saved ID.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* System Theme Selection */}
                                    <div>
                                        <h4 className={`text-sm font-bold flex items-center gap-2 mb-4 ${textColor}`}>
                                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full"></span>
                                            System Theme Color
                                        </h4>
                                        <div className="flex flex-wrap gap-4">
                                            {[
                                                { id: 'default', name: 'Default Black', colorClass: 'bg-black' },
                                                { id: 'emerald', name: 'Emerald', colorClass: 'bg-emerald-500' },
                                                { id: 'indigo', name: 'Indigo', colorClass: 'bg-indigo-600' },
                                                { id: 'violet', name: 'Violet', colorClass: 'bg-violet-500' },
                                                { id: 'rose', name: 'Rose', colorClass: 'bg-rose-500' },
                                                { id: 'amber', name: 'Amber', colorClass: 'bg-amber-500' },
                                            ].map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    disabled={!canSystemTheme}
                                                    onClick={() => canSystemTheme && handleThemeChange(t.id)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${selectedTheme === t.id ? 'border-brand-primary bg-brand-light font-bold' : 'border-gray-100 dark:border-[#333] hover:border-gray-200'} ${!canSystemTheme ? 'opacity-40 pointer-events-none' : ''}`}
                                                >
                                                    <span className={`w-4 h-4 rounded-full ${t.colorClass} shrink-0`} />
                                                    <span className={`text-xs ${textColor}`}>{t.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Logo / Favicon Uploaders */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                        
                                        {/* Favicon */}
                                        <div className="flex flex-col gap-3">
                                            <span className={`text-xs font-bold ${textColor}`}>Browser Favicon</span>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10">
                                                    {faviconPreview ? (
                                                        <img src={faviconPreview} className="w-6 h-6 object-contain" alt="Favicon Preview" />
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Default</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className={`px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black rounded-lg cursor-pointer uppercase text-center ${!canFaviconUpload ? 'opacity-40 pointer-events-none' : ''}`}>
                                                        Upload
                                                        <input 
                                                            type="file" 
                                                            disabled={!canFaviconUpload}
                                                            accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon" 
                                                            className="hidden" 
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setFaviconFile(file);
                                                                    setFaviconPreview(URL.createObjectURL(file));
                                                                    setResetFavicon(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {faviconPreview && (
                                                        <button 
                                                            type="button" 
                                                            disabled={!canApplySystemSettings}
                                                            onClick={() => {
                                                                setFaviconFile(null);
                                                                setFaviconPreview(null);
                                                                setResetFavicon(true);
                                                            }}
                                                            className={`text-[9px] font-bold text-red-500 uppercase ${!canApplySystemSettings ? 'opacity-40 pointer-events-none' : 'hover:underline'}`}
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-gray-400">16x16 or 32x32 PNG/ICO format.</p>
                                        </div>

                                        {/* Sidebar Logo */}
                                        <div className="flex flex-col gap-3">
                                            <span className={`text-xs font-bold ${textColor}`}>Sidebar Logo</span>
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 p-1">
                                                    {sidebarLogoPreview ? (
                                                        <img src={sidebarLogoPreview} className="max-h-full max-w-full object-contain" alt="Sidebar Logo Preview" />
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Default</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className={`px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black rounded-lg cursor-pointer uppercase text-center ${!canSidebarLogoUpload ? 'opacity-40 pointer-events-none' : ''}`}>
                                                        Upload
                                                        <input 
                                                            type="file" 
                                                            disabled={!canSidebarLogoUpload}
                                                            accept="image/*" 
                                                            className="hidden" 
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setSidebarLogoFile(file);
                                                                    setSidebarLogoPreview(URL.createObjectURL(file));
                                                                    setResetSidebarLogo(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {sidebarLogoPreview && (
                                                        <button 
                                                            type="button" 
                                                            disabled={!canApplySystemSettings}
                                                            onClick={() => {
                                                                setSidebarLogoFile(null);
                                                                setSidebarLogoPreview(null);
                                                                setResetSidebarLogo(true);
                                                            }}
                                                            className={`text-[9px] font-bold text-red-500 uppercase ${!canApplySystemSettings ? 'opacity-40 pointer-events-none' : 'hover:underline'}`}
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-gray-400">Constrained dimensions (max 32px height).</p>
                                        </div>

                                        {/* Login Logo */}
                                        <div className="flex flex-col gap-3">
                                            <span className={`text-xs font-bold ${textColor}`}>Login Logo</span>
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 p-1">
                                                    {loginLogoPreview ? (
                                                        <img src={loginLogoPreview} className="max-h-full max-w-full object-contain" alt="Login Logo Preview" />
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Default</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className={`px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black rounded-lg cursor-pointer uppercase text-center ${!canLoginLogoUpload ? 'opacity-40 pointer-events-none' : ''}`}>
                                                        Upload
                                                        <input 
                                                            type="file" 
                                                            disabled={!canLoginLogoUpload}
                                                            accept="image/*" 
                                                            className="hidden" 
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setLoginLogoFile(file);
                                                                    setLoginLogoPreview(URL.createObjectURL(file));
                                                                    setResetLoginLogo(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {loginLogoPreview && (
                                                        <button 
                                                            type="button" 
                                                            disabled={!canApplySystemSettings}
                                                            onClick={() => {
                                                                setLoginLogoFile(null);
                                                                setLoginLogoPreview(null);
                                                                setResetLoginLogo(true);
                                                            }}
                                                            className={`text-[9px] font-bold text-red-500 uppercase ${!canApplySystemSettings ? 'opacity-40 pointer-events-none' : 'hover:underline'}`}
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-gray-400">Constrained dimensions (max 64px height).</p>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5">
                                        <button
                                            type="button"
                                            onClick={handleSaveSystemSettings}
                                            disabled={savingSettings || !canSaveSystemSettings}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                                        >
                                            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Apply System Settings
                                        </button>
                                    </div>
                                </div>
                            </section>
                            )}

                            {canSave && (
                                <div className="flex justify-end pt-4 pb-12">
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className={`flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md bg-orange-500 hover:bg-orange-600 shadow-orange-100 dark:shadow-none active:scale-95 disabled:opacity-50`}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
