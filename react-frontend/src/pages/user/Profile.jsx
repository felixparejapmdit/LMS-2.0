import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    User,
    Building2,
    ShieldCheck,
    Mail,
    Camera,
    Upload,
    UserCircle,
    Lock,
    Eye,
    EyeOff,
    Save,
    Loader2,
    Key,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Menu
} from "lucide-react";
import { directus, directusUrl } from "../../hooks/useDirectus";
import { uploadFiles } from "@directus/sdk";
import axios from "axios";
import API_BASE from "../../config/apiConfig";

export default function Profile() {
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(user?.avatar ? `${directusUrl}/assets/${user.avatar}` : null);

    // Profile Data State
    const [profileData, setProfileData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        username: user?.username || "",
        avatar: user?.avatar || null
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordStatus, setPasswordStatus] = useState({ type: null, message: "" });

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
            setProfileData(prev => ({ ...prev, avatar: res.id }));
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await axios.put(`${API_BASE}/users/${user.id}`, profileData);
            window.location.reload();
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordStatus({ type: 'error', message: "Passwords do not match!" });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordStatus({ type: 'error', message: "Password must be at least 6 characters long." });
            return;
        }

        setLoading(true);
        setPasswordStatus({ type: null, message: "" });

        try {
            // In this specific implementation, we update the password in the local backend
            // which handles the argon2 hashing for us.
            await axios.put(`${API_BASE}/users/${user.id}`, {
                password: passwordData.newPassword
            });

            setPasswordStatus({ type: 'success', message: "Password updated successfully!" });
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            console.error("Password change failed", err);
            setPasswordStatus({ type: 'error', message: "Failed to update password. Please try again." });
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
                        <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Account / Profile</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h2 className={`text-4xl font-black ${textColor} tracking-tight`}>Your Profile</h2>
                            <p className="text-gray-500 mt-2">Personalize your identity and manage security settings.</p>
                        </div>

                        <div className="space-y-8">
                            {/* Profile Information Section */}
                            <section className={`${cardBg} rounded-[2.5rem] border p-10 shadow-sm relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                                <div className={`flex items-center gap-3 mb-10 ${textColor}`}>
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-bold">Personal Information</h3>
                                </div>

                                <div className="flex flex-col md:flex-row gap-12 items-start">
                                    {/* Photo Area */}
                                    <div className="flex flex-col items-center shrink-0">
                                        <div
                                            className={`relative group/avatar cursor-pointer transition-all ${isDragging ? 'scale-110' : ''}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const file = e.dataTransfer.files?.[0];
                                                if (file) handleFileUpload(file);
                                            }}
                                        >
                                            <div className={`w-40 h-40 rounded-[3rem] bg-slate-50 dark:bg-white/5 border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 group-hover/avatar:border-blue-500/50'}`}>
                                                {uploadingPhoto ? (
                                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                                ) : previewUrl ? (
                                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <Camera className="w-10 h-10" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center px-6">Upload identity</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileUpload(file);
                                                }}
                                            />
                                            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white dark:border-[#111] transition-transform group-hover/avatar:scale-110">
                                                <Upload className="w-5 h-5" />
                                            </div>
                                        </div>
                                        <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{uploadingPhoto ? 'Syncing...' : 'Identity Photo'}</p>
                                    </div>

                                    {/* Name Fields */}
                                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                value={profileData.first_name}
                                                onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
                                                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${textColor}`}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                value={profileData.last_name}
                                                onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
                                                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${textColor}`}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                Username
                                            </label>
                                            <div className="relative group/input">
                                                <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 transition-colors group-focus-within/input:text-blue-500" />
                                                <input
                                                    type="text"
                                                    value={profileData.username}
                                                    onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                                    className={`w-full pl-14 pr-5 py-4 rounded-2xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${textColor}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                                Email Address
                                            </label>
                                            <div className="relative group/input">
                                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 transition-colors group-focus-within/input:text-blue-500" />
                                                <input
                                                    type="email"
                                                    readOnly
                                                    value={user?.email}
                                                    className={`w-full pl-14 pr-5 py-4 rounded-2xl text-sm font-medium bg-slate-100/50 dark:bg-white/5 border border-transparent text-gray-500 cursor-not-allowed`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-50 dark:border-white/5 flex justify-end">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={loading}
                                        className="flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        UPDATE IDENTITY
                                    </button>
                                </div>
                            </section>

                            {/* Password Section */}
                            <section className={`${cardBg} rounded-[2.5rem] border p-10 shadow-sm relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full -ml-32 -mt-32 blur-3xl"></div>

                                <div className={`flex items-center gap-3 mb-10 ${textColor}`}>
                                    <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-bold">Security & Authentication</h3>
                                </div>

                                <form onSubmit={handlePasswordChange} className="space-y-8 max-w-2xl">
                                    {passwordStatus.message && (
                                        <div className={`p-5 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${passwordStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/20' : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/20'}`}>
                                            {passwordStatus.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <ShieldAlert className="w-6 h-6 shrink-0" />}
                                            <p className="text-sm font-bold">{passwordStatus.message}</p>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">New Password</label>
                                            <div className="relative group/input">
                                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 transition-colors group-focus-within/input:text-red-500" />
                                                <input
                                                    type={showPasswords.new ? "text" : "password"}
                                                    value={passwordData.newPassword}
                                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    required
                                                    placeholder="Enter your new password"
                                                    className={`w-full pl-14 pr-14 py-4 rounded-2xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${textColor}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">Confirm New Password</label>
                                            <div className="relative group/input">
                                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 transition-colors group-focus-within/input:text-red-500" />
                                                <input
                                                    type={showPasswords.confirm ? "text" : "password"}
                                                    value={passwordData.confirmPassword}
                                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    required
                                                    placeholder="Retype your new password"
                                                    className={`w-full pl-14 pr-14 py-4 rounded-2xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${textColor}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-red-500/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                            SECURE & CHANGE PASSWORD
                                        </button>
                                    </div>
                                </form>
                            </section>

                            <div className="h-20 md:h-0"></div> {/* Space for sticky mobile stuff if needed */}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
