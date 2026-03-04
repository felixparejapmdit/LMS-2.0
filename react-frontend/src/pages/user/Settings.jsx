
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
import { directus, directusUrl } from "../../hooks/useDirectus";
import { uploadFiles } from "@directus/sdk";
import axios from "axios";
import API_BASE from "../../config/apiConfig";

export default function Settings() {
    const { user, login, layoutStyle, toggleLayoutStyle, fontFamily, changeFontFamily, setIsMobileMenuOpen } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(user?.avatar ? `${directusUrl}/assets/${user.avatar}` : null);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        avatar: user?.avatar || null
    });

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'notion' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

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
                        <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Workspace / Settings</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
                    <div className="w-full">
                        <div className="mb-12">
                            <h2 className={`text-3xl font-bold ${textColor}`}>Settings</h2>
                            <p className="text-gray-500 mt-2">Manage your account preferences and system configuration.</p>
                        </div>

                        <div className="space-y-8" key={user?.id}>
                            {/* Layout Customization */}
                            <section className={`${cardBg} rounded-2xl border p-8 shadow-sm`}>
                                <div className={`flex items-center gap-2 mb-6 ${textColor}`}>
                                    <Palette className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-bold">Layout System</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <button
                                        onClick={() => toggleLayoutStyle('notion')}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${layoutStyle === 'notion' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 dark:border-[#333] hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold uppercase tracking-widest ${textColor}`}>Notion</span>
                                            {layoutStyle === 'notion' && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                                        </div>
                                        <p className="text-[9px] text-gray-500 uppercase font-black">Canvas System</p>
                                    </button>

                                    <button
                                        onClick={() => toggleLayoutStyle('grid')}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${layoutStyle === 'grid' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 dark:border-[#333] hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold uppercase tracking-widest ${textColor}`}>3-Col Grid</span>
                                            {layoutStyle === 'grid' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                        </div>
                                        <p className="text-[9px] text-gray-500 uppercase font-black">Standard Grid</p>
                                    </button>
                                </div>

                                {/* Typography Selection */}
                                <div className="mt-10 mb-6 pt-10 border-t border-gray-100 dark:border-white/5">
                                    <h4 className={`text-sm font-bold flex items-center gap-2 mb-6 ${textColor}`}>
                                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                        Typography System
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
                                                <p className="text-[10px] text-gray-400">The quick brown fox jumps over the lazy dog</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <div className="flex justify-end pt-4 pb-12">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md bg-orange-500 hover:bg-orange-600 shadow-orange-100 dark:shadow-none active:scale-95 disabled:opacity-50`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    SAVE CHANGES
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
