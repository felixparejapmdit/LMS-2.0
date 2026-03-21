import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, User, FileStack, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, loginGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      const roleName = (result.user?.roleData?.name || result.user?.role || '').toString().toUpperCase();
      if (roleName === 'USER') {
        window.location.href = "/letter-tracker";
      } else if (roleName === 'VIP') {
        window.location.href = "/vip-view";
      } else {
        window.location.href = "/";
      }
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] dark:bg-[#080808] flex items-center justify-center p-4 sm:p-6 transition-colors duration-500 font-sans relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] sm:w-[60%] h-[60%] bg-orange-400/10 sm:bg-orange-400/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] sm:w-[60%] h-[60%] bg-amber-400/10 sm:bg-amber-400/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 sm:px-0">
        <div className="bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-[0px_20px_50px_rgba(0,0,0,0.08)] dark:shadow-none border border-white/40 dark:border-white/10 rounded-[32px] sm:rounded-[40px] p-8 sm:p-12 transition-all duration-500 hover:shadow-[0px_30px_60px_rgba(0,0,0,0.12)] dark:hover:border-white/20">

          {/* Logo & Header Section */}
          <div className="flex flex-col items-center text-center space-y-4 mb-10 sm:mb-12">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[20px] sm:rounded-[22px] flex items-center justify-center shadow-xl shadow-slate-900/20 transform transition-transform hover:scale-105 duration-500 group">
              <FileStack className="text-white w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                LMS <span className="text-orange-600">2026</span>
              </h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Management System Portal</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {error && (
              <div className="p-3.5 sm:p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[9px] sm:text-[10px] font-black text-center uppercase tracking-widest animate-in shake-in duration-300 border border-red-100 dark:border-red-900/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest ml-1 opacity-70">Username</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300">
                  <User className="w-4 h-4 text-slate-300 group-focus-within:text-orange-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 sm:py-4 bg-[#f8fafc] dark:bg-white/[0.03] border-2 border-transparent rounded-2xl focus:border-orange-500/20 focus:bg-white dark:focus:bg-[#111] transition-all outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600 shadow-sm"
                  placeholder="Your user ID"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest ml-1 opacity-70">Password</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300">
                  <Lock className="w-4 h-4 text-slate-300 group-focus-within:text-orange-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 sm:py-4 bg-[#f8fafc] dark:bg-white/[0.03] border-2 border-transparent rounded-2xl focus:border-orange-500/20 focus:bg-white dark:focus:bg-[#111] transition-all outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600 shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 sm:py-4.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white text-[10px] sm:text-[11px] font-black rounded-2xl transition-all shadow-xl shadow-slate-900/30 uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] mt-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Secure Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-2 flex items-center gap-4">
              <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
              <span className="text-[8px] font-black text-slate-300 dark:text-gray-600 uppercase tracking-widest">or</span>
              <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
            </div>

            <div className="">
              <button
                type="button"
                onClick={() => {
                  loginGuest();
                  window.location.href = "/guest/send-letter";
                }}
                className="w-full py-4 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-slate-400 hover:text-orange-600 hover:bg-orange-50/10 dark:hover:bg-orange-950/10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-3 group"
              >
                <ShieldCheck className="w-4 h-4 text-orange-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                Public Tracking Access
              </button>
            </div>
          </form>
        </div>

        <p className="mt-10 sm:mt-12 text-center text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] opacity-60">
          &copy; {new Date().getFullYear()} LMS SOFTWARE INFRASTRUCTURE
        </p>
      </div>
    </div>
  );
}
