import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, MailQuestion, User, ShieldCheck, ArrowRight } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginGuest, layoutStyle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Invalid credentials");
    }
    setLoading(false);
  };

  // Layout-specific styling mapping
  const pageBg = layoutStyle === 'linear' ? 'bg-[#080808]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50 text-slate-900' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
  const cardBg = layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
  const accentColor = layoutStyle === 'linear' ? 'bg-indigo-600 hover:bg-indigo-500' : layoutStyle === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F6A17B] hover:bg-[#e8946e]';
  const textColor = layoutStyle === 'linear' ? 'text-[#eee]' : 'text-slate-900 dark:text-white';
  const inputBg = layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-[#333] text-slate-900 dark:text-white';
  const ringColor = layoutStyle === 'linear' ? 'focus:ring-indigo-500' : layoutStyle === 'grid' ? 'focus:ring-blue-500' : 'focus:ring-orange-500';

  const frameBorder = layoutStyle === 'linear' ? 'border-[#1a1a1a]' : 'border-slate-200 dark:border-white/10';

  return (
    <div className={`flex min-h-screen ${pageBg} transition-colors duration-500 font-sans`}>
      {/* Left Panel: The Authentication Module */}
      <div className="w-full lg:w-[30%] flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 z-10 border-r border-slate-100 dark:border-white/5 bg-inherit">
        <div className="w-full max-w-sm space-y-10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`inline-flex p-3 ${accentColor} rounded-2xl shadow-2xl shadow-blue-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500`}>
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className={`text-4xl font-black tracking-tighter uppercase ${textColor}`}>
                LMS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">2.0</span>
              </h1>
            </div>
          </div>

          {/* Form Module */}
          <div className={`p-1 pt-0 rounded-[2.5rem] bg-gradient-to-b from-transparent to-slate-200/20 dark:to-white/5`}>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-14 pr-8 py-4 ${inputBg} border border-slate-200 dark:border-white/10 rounded-3xl focus:ring-2 ${ringColor} focus:border-transparent transition-all outline-none font-bold text-sm tracking-tight`}
                    placeholder="enter username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-14 pr-8 py-4 ${inputBg} border border-slate-200 dark:border-white/10 rounded-3xl focus:ring-2 ${ringColor} focus:border-transparent transition-all outline-none font-bold text-sm tracking-tight`}
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 ${accentColor} text-white text-[10px] font-black rounded-3xl transition-all shadow-2xl shadow-blue-500/20 uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 hover:translate-y-[-2px] active:translate-y-0`}
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

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${layoutStyle === 'linear' ? 'border-[#1a1a1a]' : 'border-slate-100 dark:border-white/5'}`}></div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  loginGuest();
                  navigate("/guest/send-letter");
                }}
                className={`w-full py-4 bg-transparent border-2 ${layoutStyle === 'linear' ? 'border-[#1a1a1a] text-[#666] hover:text-white hover:border-[#333]' : 'border-slate-100 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-200'} rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3`}
              >
                <User className="w-4 h-4" />
                Login as Guest
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Panel: Immersion Layer */}
      <div className="hidden lg:flex w-[70%] relative overflow-hidden bg-slate-900 border-l border-inherit">
        <img
          src="/login.jpg"
          alt="LMS Interface"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 hover:scale-110 transition-transform duration-[10s] ease-linear"
        />

        {/* Artistic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/80 via-transparent to-indigo-900/40 backdrop-blur-[2px]"></div>
      </div>
    </div>
  );
}
