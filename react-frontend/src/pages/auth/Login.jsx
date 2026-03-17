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
      setError(result.error || "Login failed. Please check your username and password.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] dark:bg-[#080808] flex items-center justify-center p-6 transition-colors duration-500 font-sans relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-orange-400/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] bg-amber-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl shadow-[0px_20px_50px_rgba(0,0,0,0.1)] dark:shadow-none border border-white/40 dark:border-white/10 rounded-[40px] p-10 md:p-12 transition-all duration-500">

          {/* Logo & Header Section */}
          <div className="flex flex-col items-center text-center space-y-5 mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[22px] flex items-center justify-center shadow-xl shadow-slate-900/20 transform transition-transform hover:scale-110 duration-500 group">
              <FileStack className="text-white w-8 h-8 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                LMS <span className="text-orange-600">2.0</span>
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-in shake-in duration-300">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest ml-1">Username</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-[#f8fafc] dark:bg-white/[0.03] border-none rounded-2xl focus:ring-2 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-[#151515] transition-all outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out group-focus-within:left-[calc(100%-36px)]">
                  <Lock className="w-4 h-4 text-slate-300" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-[#f8fafc] dark:bg-white/[0.03] border-none rounded-2xl focus:ring-2 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-[#151515] transition-all outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white text-[11px] font-black rounded-2xl transition-all shadow-xl shadow-slate-900/30 uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => {
                  loginGuest();
                  window.location.href = "/guest/send-letter";
                }}
                className="w-full py-4 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-slate-400 hover:text-orange-500 text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-3 group"
              >
                <ShieldCheck className="w-4 h-4 text-orange-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                Guest Access
              </button>
            </div>
          </form>
        </div>

        <p className="mt-12 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} LMS 2.0
        </p>
      </div>
    </div>
  );
}
