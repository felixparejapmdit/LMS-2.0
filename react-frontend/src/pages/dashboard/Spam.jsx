import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    Users,
    Search,
    MapPin,
    Send,
    Loader2,
    Mail,
    User as UserIcon,
    MessageSquare
} from "lucide-react";

export default function Spam() {
    const { theme, layoutStyle } = useAuth();
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [formName, setFormName] = useState("");
    const [formTelegram, setFormTelegram] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPeople();
    }, []);

    const fetchPeople = async () => {
        setLoading(true);
        try {
            const res = await axios.get("`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons");
            setPeople(res.data);
        } catch (error) {
            console.error("Error fetching people:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTelegram = async () => {
        if (!formName || !formTelegram) {
            alert("Please fill in both name and telegram fields");
            return;
        }

        // Validate name format: "Lastname, Firstname"
        const nameRegex = /^[A-Za-zÀ-ÿ\s-]+,\s[A-Za-zÀ-ÿ\s-]+$/;
        if (!nameRegex.test(formName.trim())) {
            alert("Please enter the name in the exact format: Lastname, Firstname (e.g., Doe, John)");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post("`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons", {
                name: formName,
                telegram: formTelegram,
                name_id: null,
                area: null
            });
            handleClearTelegram();
            fetchPeople(); // Refresh the list
        } catch (error) {
            console.error("Error saving contact:", error);
            alert("Failed to save contact");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClearTelegram = () => {
        setFormName("");
        setFormTelegram("");
    };

    const filteredPeople = people
        .filter(p => !!p.telegram) // strictly require a telegram ID
        .filter(p =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.telegram?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const pageBg = theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-slate-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${layoutStyle === 'linear' ? 'bg-[#080808] border-[#1a1a1a]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]'} border-b px-8 flex items-center justify-between z-10 shrink-0`}>
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-orange-500" />
                        <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Directory / Spam</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar w-full">
                    <div className="w-full space-y-8">
                        <div>
                            <h2 className={`text-4xl font-black uppercase tracking-tighter ${textColor} mb-2`}>SPAM</h2>
                        </div>

                        <div className="relative group max-w-md">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name, area or ID..."
                                className={`w-full pl-12 pr-6 py-4 rounded-[2rem] border outline-none transition-all ${theme === 'dark' ? 'bg-[#111] border-[#222] text-white focus:border-orange-500/50' : 'bg-white border-gray-100 text-slate-900 focus:border-orange-500/50 focus:shadow-xl focus:shadow-orange-500/5 shadow-sm'}`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center pt-20">
                                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Loading Directory...</p>
                            </div>
                        ) : filteredPeople.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-gray-100 dark:border-white/5">
                                <UserIcon className="w-16 h-16 text-gray-200 dark:text-white/5 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No contacts found matching your criteria</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPeople.map((person) => (
                                    <div
                                        key={person.id}
                                        className={`p-6 rounded-[2.5rem] border transition-all hover:scale-[1.02] hover:-translate-y-1 ${theme === 'dark' ? 'bg-[#111] border-[#222] hover:border-orange-500/30' : 'bg-white border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-xl hover:shadow-orange-500/5'}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-500 mb-4 shadow-sm">
                                                <UserIcon className="w-7 h-7" />
                                            </div>
                                            {person.telegram && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 border border-blue-100 dark:border-blue-900/30">
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Active Telegram</span>
                                                </div>
                                            )}
                                        </div>

                                        <h3 className={`text-xl font-black uppercase tracking-tight ${textColor} mb-1 truncate`}>{person.name}</h3>
                                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-4">
                                            <MapPin className="w-3 h-3" />
                                            {person.area || "No Area Assigned"}
                                        </div>

                                        <div className="pt-4 border-t border-gray-50 dark:border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System ID</span>
                                                <span className={`text-[10px] font-black font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>{person.name_id || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram ID</span>
                                                <span className={`text-[10px] font-black font-mono ${person.telegram ? 'text-blue-500' : 'text-gray-300'}`}>
                                                    {person.telegram || "Not Integrated"}
                                                </span>
                                            </div>
                                        </div>

                                        {person.telegram && (
                                            <a
                                                href={`https://t.me/${person.telegram.replace('@', '')}?text=${encodeURIComponent('This message is from LMS 2.0')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full mt-6 py-3 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                            >
                                                <Send className="w-3 h-3" />
                                                Direct Message
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Telegram Info Form Section */}
                        <div className={`mt-12 p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-100 shadow-xl shadow-orange-500/5'}`}>
                            <div className="mb-6">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor} mb-2`}>Add Telegram Info</h3>
                                <p className="text-sm text-gray-400 font-medium">Register a new contact for direct messaging.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Name: (Lastname, FirstName)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Doe, John"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className={`w-full px-6 py-4 rounded-[1.5rem] border outline-none transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-orange-500/50' : 'bg-slate-50 border-gray-200 text-slate-900 focus:border-orange-500/50'}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Telegram: (Number or Username)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. @username or +123456789"
                                        value={formTelegram}
                                        onChange={(e) => setFormTelegram(e.target.value)}
                                        className={`w-full px-6 py-4 rounded-[1.5rem] border outline-none transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-orange-500/50' : 'bg-slate-50 border-gray-200 text-slate-900 focus:border-orange-500/50'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleSaveTelegram}
                                    disabled={submitting}
                                    className="px-8 py-4 rounded-2xl bg-orange-500 text-white text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                </button>
                                <button
                                    onClick={handleClearTelegram}
                                    disabled={submitting}
                                    className={`px-8 py-4 rounded-2xl text-[12px] border font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-[#333] text-gray-400 hover:bg-[#222]' : 'border-gray-200 text-gray-500 hover:bg-slate-50'}`}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
