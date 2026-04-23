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
      const targetPath = roleName === 'USER' ? '/letter-tracker' : (roleName === 'VIP' ? '/vip-view' : '/inbox');
      console.log(`[NAV] Starting navigation to ${targetPath} for ${username}...`);
      navigate(targetPath);
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f0f4ff] to-[#fff5f0] dark:from-[#080808] dark:via-[#0c0c0c] dark:to-[#080808] flex items-center justify-center p-4 sm:p-6 transition-colors duration-500 font-sans relative overflow-hidden">
      {/* Abstract Background Decoration - Softer approach */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] sm:w-[60%] h-[60%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[120%] sm:w-[60%] h-[60%] bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 sm:px-0">
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-3xl shadow-[0px_40px_100px_rgba(0,0,0,0.06)] dark:shadow-none border border-white/50 dark:border-white/10 rounded-[48px] p-10 sm:p-14 transition-all duration-500">

          {/* Logo & Header Section - Combined & Minimalist */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 transition-transform group-hover:scale-110 duration-500">
                <FileStack className="text-white dark:text-black w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                LMS <span className="text-orange-500 tracking-normal">2026</span>
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-in shake-in duration-300 border border-red-100 dark:border-red-900/20">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Username Input - Implicit Label */}
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 transition-all duration-300 transform group-focus-within:scale-110 group-focus-within:left-5">
                  <User className="w-4 h-4 text-slate-300 group-focus-within:text-slate-900 dark:group-focus-within:text-white" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-14 pr-8 py-4 bg-[#f8fafc]/50 dark:bg-white/[0.02] border border-transparent rounded-[20px] focus:border-slate-900/10 dark:focus:border-white/10 focus:bg-white dark:focus:bg-white/[0.05] transition-all outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600 shadow-sm"
                  placeholder="Username"
                  required
                />
              </div>

              {/* Password Input - Implicit Label */}
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 transition-all duration-300 transform group-focus-within:scale-110 group-focus-within:left-5">
                  <Lock className="w-4 h-4 text-slate-300 group-focus-within:text-slate-900 dark:group-focus-within:text-white" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-8 py-4 bg-[#f8fafc]/50 dark:bg-white/[0.02] border border-transparent rounded-[20px] focus:border-slate-900/10 dark:focus:border-white/10 focus:bg-white dark:focus:bg-white/[0.05] transition-all outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600 shadow-sm"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black text-[11px] font-black rounded-[20px] transition-all shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 mt-10 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-8 flex items-center gap-4">
              <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
              <span className="text-[8px] font-black text-slate-300 dark:text-gray-600 uppercase tracking-widest">or</span>
              <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
            </div>

            <button
              type="button"
              onClick={() => {
                loginGuest();
                window.location.href = "/guest/send-letter";
              }}
              className="w-full py-4 bg-transparent border border-slate-100 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-[20px] flex items-center justify-center gap-3 group"
            >
              <ShieldCheck className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              Guest Access
            </button>
          </form>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest">
            LMS 2026
          </span>
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] opacity-60">
            Developed by PMD-IT
          </p>
        </div>
      </div>
    </div>
  );
}
