import React from 'react';
import { Settings, Clock, ShieldCheck, RefreshCw } from 'lucide-react';

const Maintenance = () => {
    return (
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0D0D0D] flex items-center justify-center p-4 font-sans overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Glassmorphism Card */}
            <div className="max-w-2xl w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                
                <div className="relative bg-white/80 dark:bg-[#141414]/80 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center">
                    
                    {/* Animated Icon Container */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-ping" />
                        <div className="relative w-24 h-24 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                            <Settings className="w-12 h-12 text-white animate-spin-slow" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-[#1A1A1A] rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 dark:border-white/10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500 delay-75">
                            <RefreshCw className="w-5 h-5 text-emerald-500 animate-reverse-spin" />
                        </div>
                    </div>

                    {/* Content */}
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase">
                        System <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-600">Upgrade</span>
                    </h1>
                    
                    <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-medium max-w-lg mb-10 leading-relaxed">
                        We're currently optimizing the LMS environment to provide you with a smoother, faster experience. We'll be back shortly!
                    </p>

                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-10">
                        <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Time</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">~15 Minutes</p>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Data Protected</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-12 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 w-[65%] animate-shimmer" />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Deploying v2.0.4 Update</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">© 2026 Letter Management System • PMD-IT Team</p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes reverse-spin {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-reverse-spin {
                    animation: reverse-spin 4s linear infinite;
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite linear;
                }
            `}</style>
        </div>
    );
};

export default Maintenance;
