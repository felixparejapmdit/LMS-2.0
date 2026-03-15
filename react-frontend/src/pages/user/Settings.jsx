
import React, { useState } from "react";
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
    UserCircle
} from "lucide-react";
import { directus, directusUrl, getAssetUrl } from "../../hooks/useDirectus";
import { uploadFiles } from "@directus/sdk";
import axios from "axios";
import API_BASE from "../../config/apiConfig";
import useAccess from "../../hooks/useAccess";

export default function Settings() {
    const { user, login, layoutStyle, toggleLayoutStyle, fontFamily, changeFontFamily, setIsMobileMenuOpen } = useAuth();
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

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F9FAFB] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-gray-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

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
                        <div className="mb-8">
                            <h2 className={`text-3xl font-bold ${textColor}`}>Settings</h2>
                            <p className="text-gray-500 mt-2">Customize layout and font.</p>
                        </div>

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
                                            { name: 'Geist', family: 'system-ui' },
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
                                </div>}
                            </section>

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
