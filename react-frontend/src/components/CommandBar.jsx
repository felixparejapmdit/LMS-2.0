import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, X, FileText, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useSession } from '../context/AuthContext';
import axios from 'axios';
import API_BASE from '../config/apiConfig';

export default function CommandBar() {
    const { user, isSuperAdmin } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleKeyDown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE}/letters`, {
                    params: { 
                        search: query, 
                        limit: 8,
                        user_id: user?.id,
                        role: user?.roleData?.name || user?.role,
                        full_name: user ? `${user.first_name} ${user.last_name}` : ''
                    }
                });
                setResults(response.data.data || response.data || []);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 font-sans">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={() => setIsOpen(false)}
            />
            
            {/* Command Box */}
            <div className="relative w-full max-w-2xl bg-white/80 dark:bg-[#141414]/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 slide-in-from-top-10 duration-300">
                <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center gap-6">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                        <Search className="w-6 h-6 text-white" />
                    </div>
                    <input 
                        autoFocus
                        type="text"
                        placeholder="Search Reference Code, Sender, or Entry ID..."
                        className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                            <span className="text-[10px] font-black text-slate-400">ESC</span>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-6" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Searching global records...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="p-4 space-y-2">
                            <div className="px-4 py-2 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Search Results</span>
                                <span className="text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{results.length} Matches</span>
                            </div>
                            {results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        navigate(`/letter/${item.id}`);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-5 p-5 rounded-[1.5rem] hover:bg-white dark:hover:bg-white/5 transition-all group text-left border border-transparent hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-500/5"
                                >
                                    <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-300">
                                        <FileText className="w-7 h-7 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.1em]">{item.lms_id}</span>
                                            {item.entry_id && (
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                                    {item.entry_id}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-500 transition-colors">{item.sender}</h4>
                                        <p className="text-[11px] text-slate-400 truncate mt-1 font-medium leading-relaxed italic">{item.letsum || item.summary || 'No detailed summary available for this entry'}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                        <ArrowRight className="w-5 h-5 text-blue-500" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query.trim().length >= 2 ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center leading-relaxed">
                                No records found for <span className="text-slate-800 dark:text-white">"{query}"</span><br/>
                                <span className="mt-2 block opacity-50 font-bold">Try searching for a sender name or reference code</span>
                            </p>
                        </div>
                    ) : (
                        <div className="p-10">
                             <div className="flex flex-col gap-8">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Tips</h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="p-6 bg-slate-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex items-center gap-4 group cursor-default">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Sender Name</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">e.g., Felix Pareja</span>
                                        </div>
                                     </div>
                                     <div className="p-6 bg-slate-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex items-center gap-4 group cursor-default">
                                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                            <Command className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Reference ID</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">e.g., ATG26-0001</span>
                                        </div>
                                     </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-black/40 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 rotate-90" /> Select</div>
                        <div className="flex items-center gap-2 font-bold text-blue-500/50 tracking-normal hover:text-blue-500 transition-colors cursor-help">Press Cmd+K to summon</div>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Live System Search</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
