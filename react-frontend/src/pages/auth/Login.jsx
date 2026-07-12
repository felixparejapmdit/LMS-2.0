import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, User, FileStack, ArrowRight, ShieldCheck, Activity, X } from "lucide-react";
import { useUI } from "../../context/AuthContext";
import letterService from "../../services/letterService";
import LetterTrackingDrawer from "../../components/LetterTrackingDrawer";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [referenceCode, setReferenceCode] = useState("");
  const [trackError, setTrackError] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackingLetter, setTrackingLetter] = useState(null);
  const [isTrackDrawerOpen, setIsTrackDrawerOpen] = useState(false);
  const trackInputRef = useRef(null);

  const { login, loginGuest } = useAuth();
  const navigate = useNavigate();
  const { appSettings } = useUI();
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
  const loginLogoUrl = appSettings?.login_logo ? `${backendBase}${appSettings.login_logo}` : null;
  const brandPrefix = (appSettings?.reference_code_prefix || "LMS").toString().trim() || "LMS";

  const normalizedReferenceCode = useMemo(
    () => referenceCode.trim().toUpperCase(),
    [referenceCode],
  );

  useEffect(() => {
    if (!isTrackModalOpen) return;
    const t = setTimeout(() => trackInputRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [isTrackModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      const user = result.user;
      const roleName = (user?.roleData?.name || user?.roleName || '').toString().toUpperCase();

      console.log(`[AUTH] Login success. Role: ${roleName}`);

      let targetPath = '/inbox'; // Default
      if (roleName.includes('USER')) targetPath = '/letter-tracker';
      else if (roleName.includes('VIP')) targetPath = '/vip-view';
      else if (roleName.includes('ADMIN') || roleName.includes('MANAGER')) targetPath = '/inbox';

      console.log(`[NAV] Redirecting to ${targetPath}...`);
      navigate(targetPath);
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  const handleTrackLookup = async (e) => {
    e?.preventDefault?.();
    setTrackError("");

    const ref = normalizedReferenceCode;
    if (!ref) {
      setTrackError("Please enter a Reference Code.");
      return;
    }

    try {
      setTrackLoading(true);
      const tracked = await letterService.trackPublicByLmsId(ref);
      setTrackingLetter(tracked);
      setIsTrackModalOpen(false);
      setIsTrackDrawerOpen(true);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message;
      if (status === 404) setTrackError("Reference Code not found.");
      else if (status === 403)
        setTrackError(msg || "Access restricted for this Reference Code.");
      else setTrackError(msg || "Failed to fetch tracking details.");
    } finally {
      setTrackLoading(false);
    }
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
              {loginLogoUrl ? (
                <img src={loginLogoUrl} alt={`${brandPrefix} Logo`} className="h-16 max-w-[200px] object-contain" />
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 transition-transform group-hover:scale-110 duration-500">
                    <FileStack className="text-white dark:text-black w-6 h-6" />
                  </div>
                  <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                    {brandPrefix} <span className="text-orange-500 tracking-normal">2.0</span>
                  </h1>
                </>
              )}
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
              className="w-full py-5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-black rounded-[20px] transition-all shadow-xl shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 mt-10 group"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <button
                type="button"
                onClick={() => {
                  setTrackError("");
                  setReferenceCode("");
                  setIsTrackModalOpen(true);
                }}
                className="w-full py-4 bg-transparent border border-slate-100 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-[20px] flex items-center justify-center gap-3 group"
              >
                <Activity className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                Track Letter
              </button>
            </div>
          </form>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest">
            {brandPrefix} 2.0
          </span>
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] opacity-60">
            Developed by PMD-IT
          </p>
        </div>
      </div>

      <LetterTrackingDrawer
        open={isTrackDrawerOpen}
        letter={trackingLetter}
        onClose={() => setIsTrackDrawerOpen(false)}
        side="left"
      />

      {isTrackModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsTrackModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white/80 dark:bg-black/50 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-[36px] shadow-[0px_40px_100px_rgba(0,0,0,0.10)] p-7 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest">
                  Public Tracking
                </p>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Track Letter
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsTrackModalOpen(false)}
                className="p-2 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              Enter your Reference Code to view the activity tracking timeline and PDF preview (if available).
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  ref={trackInputRef}
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleTrackLookup();
                    }
                  }}
                  placeholder="Reference Code"
                  className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-white/10 outline-none font-bold text-xs text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-700 focus:ring-2 focus:ring-orange-500/20"
                  autoComplete="off"
                  inputMode="text"
                />
                <button
                  type="button"
                  onClick={handleTrackLookup}
                  disabled={trackLoading}
                  className="px-4 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[110px]"
                >
                  {trackLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>

              {trackError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest border border-red-100 dark:border-red-900/20">
                  {trackError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
