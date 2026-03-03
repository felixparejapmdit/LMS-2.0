
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
    Menu
} from "lucide-react";

export default function Settings() {
    const { user, layoutStyle, toggleLayoutStyle, setIsMobileMenuOpen } = useAuth();
    const [loading, setLoading] = useState(false);

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'notion' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

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
                            {/* Profile Section */}
                            <section className={`${cardBg} rounded-2xl border p-8 shadow-sm`}>
                                <div className={`flex items-center gap-2 mb-6 ${textColor}`}>
                                    <User className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-bold">Profile Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                                        <input
                                            type="text"
                                            defaultValue={user?.first_name}
                                            className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                                        <input
                                            type="text"
                                            defaultValue={user?.last_name}
                                            className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300`}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="email"
                                                readOnly
                                                value={user?.email}
                                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm cursor-not-allowed outline-none bg-gray-100 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-500`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Department Section */}
                            <section className={`${cardBg} rounded-2xl border p-8 shadow-sm`}>
                                <div className={`flex items-center gap-2 mb-6 ${textColor}`}>
                                    <Building2 className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-bold">Organization</h3>
                                </div>

                                <div className={`p-4 rounded-xl border flex items-center justify-between bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20`}>
                                    <div>
                                        <p className={`text-xs font-bold uppercase text-orange-900 dark:text-orange-400`}>Assigned Department</p>
                                        <p className={`text-sm font-medium mt-1 text-orange-700 dark:text-orange-300`}>
                                            {user?.department?.dept_name || user?.dept_id?.dept_name || 'No department assigned'}
                                        </p>
                                    </div>
                                    <Lock className={`w-5 h-5 text-orange-200`} />
                                </div>
                            </section>

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
                            </section>

                            <div className="flex justify-end pt-4 pb-12">
                                <button
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md bg-[#F6A17B] hover:bg-[#e8946e] shadow-orange-100 dark:shadow-none`}
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
