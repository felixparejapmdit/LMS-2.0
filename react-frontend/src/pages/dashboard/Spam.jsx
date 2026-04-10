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
    MessageSquare,
    Menu,
    RefreshCw,
    Edit3,
    ShieldCheck
} from "lucide-react";
import useAccess from "../../hooks/useAccess";

export default function Spam() {
    const { theme, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const access = useAccess();
    const [people, setPeople] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [formName, setFormName] = useState("");
    const [formTelegram, setFormTelegram] = useState("");
    const [formChatId, setFormChatId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editingType, setEditingType] = useState('person'); // 'person' or 'user'
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const canField = access?.canField || (() => true);
    const canSearch = canField("spam", "search");
    const canSubmit = canField("spam", "submit_button");
    const canClear = canField("spam", "clear_button");
    const canSave = canField("spam", "save_button");
    const canRefresh = canField("spam", "refresh_button");

    useEffect(() => {
        fetchPeople();
    }, []);

    const fetchPeople = async () => {
        setLoading(true);
        try {
            const [resPersons, resUsers] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons`),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`)
            ]);
            setPeople(resPersons.data || []);
            setUsers(resUsers.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTelegram = async () => {
        if (!formName || !formTelegram) {
            alert("Please fill in both name and telegram fields");
            return;
        }

        // Validate name format: "Lastname, Firstname" if it's a person
        if (editingType === 'person') {
            const nameRegex = /^[A-Za-zÀ-ÿ\s-]+,\s[A-Za-zÀ-ÿ\s-]+$/;
            if (!nameRegex.test(formName.trim())) {
                alert("Please enter the name in the exact format: Lastname, Firstname (e.g., Doe, John)");
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                telegram: formTelegram,
                telegram_chat_id: formChatId,
            };

            if (editingType === 'person') {
                payload.name = formName;
            }

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const endpoint = editingType === 'user' ? `/users/${editingId}` : editingId ? `/persons/${editingId}` : '/persons';

            if (editingId) {
                await axios.put(`${apiBase}${endpoint}`, payload);
            } else {
                await axios.post(`${apiBase}${endpoint}`, {
                    ...payload,
                    name_id: null,
                    area: null
                });
            }

            handleClearTelegram();
            fetchPeople(); // Refresh the list
        } catch (error) {
            console.error("Error saving contact:", error);
            alert("Failed to save contact");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item, type) => {
        setEditingId(item.id);
        setEditingType(type);
        if (type === 'person') {
            setFormName(item.name || "");
        } else {
            setFormName(`${item.last_name}, ${item.first_name}`);
        }
        setFormTelegram(item.telegram || "");
        setFormChatId(item.telegram_chat_id || "");
        // Scroll to form
        document.getElementById('telegram-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleClearTelegram = () => {
        setFormName("");
        setFormTelegram("");
        setFormChatId("");
        setEditingId(null);
        setEditingType('person');
        setShowSuggestions(false);
    };

    const handleNameChange = (val) => {
        setFormName(val);
        if (val.length > 1) {
            const suggestionsList = [];
            const seenNames = new Set();

            // Match in Persons
            people.forEach(p => {
                if (p.name?.toLowerCase().includes(val.toLowerCase())) {
                    const cleanName = p.name.replace(/,+$/, '').trim();
                    if (!seenNames.has(cleanName)) {
                        suggestionsList.push({ id: p.id, name: cleanName, type: 'person', data: p });
                        seenNames.add(cleanName);
                    }
                }
            });

            // Match in Users
            users.forEach(u => {
                const fullName = `${u.last_name}, ${u.first_name}`;
                const cleanName = fullName.replace(/,+$/, '').trim();
                if (cleanName.toLowerCase().includes(val.toLowerCase())) {
                    if (!seenNames.has(cleanName)) {
                        suggestionsList.push({ id: u.id, name: cleanName, type: 'user', data: u });
                        seenNames.add(cleanName);
                    }
                }
            });
            setSuggestions(suggestionsList.slice(0, 10));
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (s) => {
        setFormName(s.name);
        setEditingId(s.id);
        setEditingType(s.type);
        setFormTelegram(s.data.telegram || "");
        setFormChatId(s.data.telegram_chat_id || "");
        setShowSuggestions(false);
    };

    const allDirectory = [
        ...people.map(p => ({ ...p, _type: 'person', _sortName: p.name })),
        ...users.map(u => ({ ...u, _type: 'user', _sortName: `${u.last_name}, ${u.first_name}`, name: `${u.last_name}, ${u.first_name}` }))
    ];

    const filteredPeople = allDirectory
        .filter(p => !!p.telegram) // strictly require a telegram ID
        .filter(p =>
            p._sortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.area || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.telegram?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.telegram_chat_id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a._sortName?.localeCompare(b._sortName));

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-4 md:px-12 flex items-center justify-between sticky top-0 z-30 shrink-0 transition-colors duration-500`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"><Menu className="w-6 h-6" /></button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Directory</span>
                            <h1 className={`text-xl font-black tracking-tighter uppercase font-outfit ${textColor}`}>Contacts</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {canRefresh && <button onClick={() => fetchPeople()} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar w-full">
                    <div className="w-full space-y-8">
                        <div>
                            <h2 className={`text-4xl font-black uppercase tracking-tighter ${textColor} mb-2`}>SPAM</h2>
                        </div>

                        {canSearch && <div className="relative group max-w-md">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className={`w-full pl-12 pr-6 py-4 rounded-[2rem] border outline-none transition-all ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222] text-[#1A1A1B] dark:text-white focus:border-orange-500/50' : 'bg-white border-gray-100 text-slate-900 focus:border-orange-500/50 focus:shadow-xl focus:shadow-orange-500/5 shadow-sm'}`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center pt-20">
                                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Loading...</p>
                            </div>
                        ) : filteredPeople.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-gray-100 dark:border-white/5">
                                <UserIcon className="w-16 h-16 text-gray-200 dark:text-white/5 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No contacts</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPeople.map((person) => (
                                    <div
                                        key={person.id}
                                        className={`p-6 rounded-[2.5rem] border transition-all hover:scale-[1.02] hover:-translate-y-1 ${cardBg} hover:border-orange-200 dark:hover:border-orange-900/40 shadow-sm hover:shadow-xl hover:shadow-orange-500/5`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-500 shadow-sm">
                                                <UserIcon className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {person._type === 'user' && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                                                        <ShieldCheck className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">User</span>
                                                    </div>
                                                )}
                                                {person.telegram && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 border border-blue-100 dark:border-blue-900/30">
                                                        <MessageSquare className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Telegram</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`text-xl font-black uppercase tracking-tight ${textColor} truncate pr-2`}>{person.name}</h3>
                                            <button
                                                onClick={() => handleEdit(person, person._type)}
                                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-gray-400 hover:text-orange-500 transition-all active:scale-95"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-4">
                                            <MapPin className="w-3 h-3" />
                                            {person.area || (person._type === 'user' ? (person.dept_id?.dept_name || "LMS Staff") : "External")}
                                        </div>

                                        <div className="pt-4 border-t border-gray-50 dark:border-white/5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID</span>
                                                <span className={`text-[9px] font-black font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>{person.name_id || person.id.toString().slice(0, 8)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Telegram</span>
                                                <span className={`text-[9px] font-black font-mono ${person.telegram ? 'text-blue-500' : 'text-gray-300'}`}>
                                                    {person.telegram || "None"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Chat ID</span>
                                                <span className={`text-[9px] font-black font-mono ${person.telegram_chat_id ? 'text-green-500' : 'text-gray-300'}`}>
                                                    {person.telegram_chat_id || "None"}
                                                </span>
                                            </div>
                                        </div>

                                        {canSubmit && person.telegram && (
                                            <a
                                                href={`https://t.me/${person.telegram.replace('@', '')}?text=${encodeURIComponent('Hello, I am contacting you from LMS 2026')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full mt-6 py-3 rounded-[1.25rem] bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                            >
                                                <Send className="w-3 h-3" />
                                                Send
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Update / Add Telegram Info Form Section */}
                        <div id="telegram-form" className={`mt-12 p-8 rounded-[2.5rem] border ${cardBg} shadow-xl shadow-orange-500/5`}>
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${textColor} mb-2`}>{editingId ? "Edit" : "Add"}</h3>
                                    <p className="text-sm text-gray-400 font-medium">{editingId ? `Editing.` : "Add contact."}</p>
                                </div>
                                {editingId && (
                                    <div className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Edit3 className="w-3 h-3" /> Editing
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Doe, John"
                                        value={formName}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className={`w-full px-6 py-4 rounded-[1.5rem] border outline-none transition-all ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#1a1a1a] border-[#E5E5E5] dark:border-[#333] text-[#1A1A1B] dark:text-white focus:border-orange-500/50' : 'bg-slate-50 border-gray-200 text-slate-900 focus:border-orange-500/50'}`}
                                    />
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => selectSuggestion(s)}
                                                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors border-b last:border-0 border-gray-50 dark:border-white/5"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black uppercase text-slate-900 dark:text-white">{s.name}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.type === 'user' ? 'User' : 'Contact'}</span>
                                                    </div>
                                                    {s.data.telegram && <span className="text-[9px] font-black text-blue-500 uppercase">Linked</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Telegram</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. @username"
                                        value={formTelegram}
                                        onChange={(e) => setFormTelegram(e.target.value)}
                                        className={`w-full px-6 py-4 rounded-[1.5rem] border outline-none transition-all ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#1a1a1a] border-[#E5E5E5] dark:border-[#333] text-[#1A1A1B] dark:text-white focus:border-orange-500/50' : 'bg-slate-50 border-gray-200 text-slate-900 focus:border-orange-500/50'}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Chat ID</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 12345678"
                                        value={formChatId}
                                        onChange={(e) => setFormChatId(e.target.value)}
                                        className={`w-full px-6 py-4 rounded-[1.5rem] border outline-none transition-all ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#1a1a1a] border-[#E5E5E5] dark:border-[#333] text-[#1A1A1B] dark:text-white focus:border-orange-500/50' : 'bg-slate-50 border-gray-200 text-slate-900 focus:border-orange-500/50'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {canSave && <button
                                    onClick={handleSaveTelegram}
                                    disabled={submitting}
                                    className="px-8 py-4 rounded-[1.25rem] bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Save" : "Save"}
                                </button>}
                                <button
                                    onClick={handleClearTelegram}
                                    disabled={submitting}
                                    className={`px-8 py-4 rounded-[1.25rem] text-[10px] border font-black uppercase tracking-widest transition-all ${layoutStyle === 'minimalist' ? 'border-[#E5E5E5] dark:border-[#333] text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]' : 'border-gray-200 text-gray-500 hover:bg-slate-50'}`}
                                >
                                    {editingId ? "Cancel" : "Clear"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
