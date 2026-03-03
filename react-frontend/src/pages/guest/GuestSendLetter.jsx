
import React, { useState, useRef, useEffect } from "react";
import {
    FileText,
    Send,
    Trash2,
    Upload,
    Calendar as CalendarIcon,
    User,
    Hash,
    MessageSquare,
    Check,
    Plus,
    X as XIcon,
    AlertCircle,
    Menu
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import attachmentService from "../../services/attachmentService";
import letterService from "../../services/letterService";
import axios from "axios";

export default function GuestSendLetter() {
    const { user, logout, layoutStyle, isMobileMenuOpen, setIsMobileMenuOpen } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        senders: [""],
        regarding: "",
        requestedDateFrom: "",
        requestedDateTo: "",
        hasDeadline: false,
        encoder: "GUEST, USER",
        refAttachmentId: ""
    });
    const [attachments, setAttachments] = useState([]);
    const [refAttachments, setRefAttachments] = useState([]);
    const [referenceNo, setReferenceNo] = useState("Generating...");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSenderIndex, setActiveSenderIndex] = useState(null); // numeric for senders, 'encoder' for encoder
    const fileInputRef = useRef(null);
    const suggestionRef = useRef(null);
    const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const data = await attachmentService.getAll();
                setRefAttachments(data);

                // Fetch next Reference No
                const preview = await letterService.getPreviewIds();
                if (preview && preview.lms_id) {
                    setReferenceNo(preview.lms_id);
                }
            } catch (err) {
                console.error("Failed to fetch ref attachments or IDs:", err);
            }
        };
        fetchRefs();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons/search?query=${query}`);
            setSuggestions(response.data);
            setShowSuggestions(response.data.length > 0);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };

    const validateFormat = (text) => {
        if (!text) return true; // Let required validator handle empty
        const regex = /^[A-Z,\s.]+$/i; // Allowing characters, spaces, dots, and COMMA
        return regex.test(text) && text.includes(',');
    };

    const handleClear = () => {
        setFormData({
            senders: [""],
            regarding: "",
            requestedDateFrom: "",
            requestedDateTo: "",
            hasDeadline: false,
            encoder: "GUEST, USER",
            refAttachmentId: ""
        });
        setAttachments([]);
    };

    const handleSend = async () => {
        const invalidSender = formData.senders.find(s => !s || !validateFormat(s));
        if (invalidSender !== undefined) {
            alert("All Senders must follow the format: LASTNAME, FIRSTNAME");
            return;
        }

        if (!validateFormat(formData.encoder)) {
            alert("Encoder name must follow the format: LASTNAME, FIRSTNAME");
            return;
        }

        if (!formData.regarding) {
            alert("Please enter a summary of the correspondence.");
            return;
        }

        try {
            setLoading(true);
            let scannedCopyPath = null;

            // 1. If there's a scanned file, upload the first one as primary scan
            if (attachments.length > 0) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', attachments[0]);
                formDataUpload.append('no_record', 'true');

                const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/upload`, formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                scannedCopyPath = response.data.file_path;
            }

            // 2. Format the date range for the summary if present
            let dateInfo = "";
            if (formData.hasDeadline) {
                dateInfo = `\n(Schedule: ${formData.requestedDateFrom} to ${formData.requestedDateTo})`;
            }

            // 3. Save the letter
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letters`, {
                sender: formData.senders.join('; '),
                encoder: formData.encoder, // Pass typed encoder name for syncing to Persons
                summary: formData.regarding + dateInfo,
                date_received: new Date(),
                global_status: 1, // Incoming
                encoder_id: user?.id,
                letter_type: 'Non-Confidential',
                attachment_id: formData.refAttachmentId || null,
                scanned_copy: scannedCopyPath,
                direction: 'Incoming',
                assigned_dept: "" // No initial process step
            });

            alert(`Letter registered successfully!`);
            handleClear();
            navigate("/letter-tracker");
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Failed to send letter. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...selectedFiles]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setAttachments(prev => [...prev, ...files]);
        }
    };

    const handlePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        const files = [];
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                if (blob) files.push(blob);
            }
        }
        if (files.length > 0) {
            setAttachments(prev => [...prev, ...files]);
        }
    };

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const addSender = () => {
        setFormData(prev => ({ ...prev, senders: [...prev.senders, ""] }));
    };

    const removeSender = (index) => {
        if (formData.senders.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            senders: prev.senders.filter((_, i) => i !== index)
        }));
    };

    const updateSender = (index, value) => {
        const newSenders = [...formData.senders];
        newSenders[index] = value;
        setFormData(prev => ({ ...prev, senders: newSenders }));

        setActiveSenderIndex(index);
        fetchSuggestions(value.split(',').pop().trim());
    };

    const selectSuggestion = (name) => {
        if (activeSenderIndex === null) return;

        if (activeSenderIndex === 'encoder') {
            setFormData(prev => ({ ...prev, encoder: name + ', ' }));
        } else {
            const newSenders = [...formData.senders];
            const val = newSenders[activeSenderIndex];
            const parts = val.split(',').map(p => p.trim());
            parts[parts.length - 1] = name;
            newSenders[activeSenderIndex] = parts.filter(p => p !== "").join(', ') + ', ';
            setFormData(prev => ({ ...prev, senders: newSenders }));
        }
        setShowSuggestions(false);
    };

    // Layout-specific styling
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-100' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const accentColor = layoutStyle === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F6A17B] hover:bg-[#e8946e]';
    const textColor = 'text-slate-900 dark:text-white';
    const subTextColor = 'text-blue-600';
    const inputBg = 'bg-slate-50 dark:bg-white/5 border-slate-50 dark:border-[#333] text-slate-800 dark:text-white';

    const isRegularUser = String(user?.roleData?.name || '').trim().toUpperCase() === 'USER';

    return (
        <div className={`flex min-h-screen ${pageBg} font-sans transition-colors duration-300`}>
            {isRegularUser && <Sidebar />}

            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header / Status Bar */}
                <header className={`h-auto md:h-24 py-4 md:py-0 ${headerBg} border-b px-4 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm sticky top-0 z-50`}>
                    <div className="flex items-center gap-4 md:gap-6">
                        {isRegularUser && (
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className={`lg:hidden p-2 rounded-xl border ${'border-slate-100 text-slate-600'}`}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${subTextColor}`}>Letter Management</span>
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-slate-300" />
                                <h1 className={`text-xl font-black tracking-tighter ${textColor}`}>{referenceNo}</h1>
                            </div>
                        </div>
                        <div className={`h-8 w-[1px] ${'bg-slate-100'}`}></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Date</span>
                            <span className={`text-sm font-bold ${textColor}`}>{today}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!isRegularUser && (
                            <>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${'bg-orange-600/10 text-orange-600 border border-orange-600/20'}`}>
                                    Guest Mode
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to exit guest mode? Your unsaved progress will be lost.")) {
                                            logout();
                                            navigate("/login");
                                        }
                                    }}
                                    className={`text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-2`}
                                >
                                    Exit
                                </button>
                            </>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 lg:p-16 overflow-y-auto custom-scrollbar">
                    <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16">

                        {/* Metadata Section */}
                        <div className="lg:col-span-8 space-y-8 md:space-y-12">
                            <section className={`${cardBg} p-8 md:p-16 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-2xl shadow-slate-200/5 space-y-8 md:space-y-12`}>
                                <div className={`flex items-center gap-4 border-b pb-8 ${'border-slate-50 dark:border-[#222]'}`}>
                                    <FileText className={`w-6 h-6 ${subTextColor}`} />
                                    <h2 className={`text-lg font-black uppercase tracking-tight ${textColor}`}>Letter Metadata</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    {/* Sender */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <User className={`w-3 h-3 ${subTextColor}`} /> Sender Name(LASTNAME, FIRSTNAME)
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[9px] text-red-500 font-black tracking-widest">REQUIRED</span>
                                            </div>
                                        </label>

                                        <div className="space-y-3">
                                            {formData.senders.map((sender, index) => {
                                                const isValid = validateFormat(sender);
                                                return (
                                                    <div key={index} className="relative group">
                                                        <input
                                                            type="text"
                                                            placeholder="Dela Cruz, Juan M."
                                                            value={sender}
                                                            onChange={(e) => updateSender(index, e.target.value)}
                                                            onFocus={() => {
                                                                setActiveSenderIndex(index);
                                                                if (sender.length >= 2) fetchSuggestions(sender.split(',').pop().trim());
                                                            }}
                                                            className={`w-full px-6 py-4 ${inputBg} border-2 rounded-2xl focus:border-orange-500 transition-all text-lg font-bold outline-none ${!isValid && sender ? 'border-red-500/50' : ''}`}
                                                        />

                                                        {showSuggestions && activeSenderIndex === index && (
                                                            <div
                                                                ref={suggestionRef}
                                                                className={`absolute z-[100] w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-1 ${'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}
                                                            >
                                                                {suggestions.map((person) => (
                                                                    <div
                                                                        key={person.id}
                                                                        onClick={() => selectSuggestion(person.name)}
                                                                        className="px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-orange-600 transition-colors border-b last:border-0 border-gray-50 dark:border-white/5 flex items-center gap-3"
                                                                    >
                                                                        <User className="w-3 h-3 text-orange-400" />
                                                                        <span>{person.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {!isValid && sender && (
                                                            <div className="absolute right-12 top-1/2 -translate-y-1/2 text-red-500 flex items-center gap-1 animate-in fade-in zoom-in">
                                                                <AlertCircle className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        {formData.senders.length > 1 && (
                                                            <button
                                                                onClick={() => removeSender(index)}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={addSender}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed ${'border-slate-100 dark:border-[#333] text-slate-400 hover:border-orange-500/30 hover:text-orange-600'} transition-all`}
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Add another sender</span>
                                        </button>
                                    </div>

                                    {/* Regarding */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className={`w-3 h-3 ${subTextColor}`} /> Regarding (Re:)
                                            </div>
                                            <span className="text-[9px] text-red-500 font-black tracking-widest">REQUIRED</span>
                                        </label>
                                        <textarea
                                            rows={4}
                                            placeholder="Enter letter summary"
                                            value={formData.regarding}
                                            onChange={(e) => setFormData({ ...formData, regarding: e.target.value })}
                                            className={`w-full px-6 py-4 ${inputBg} border-2 rounded-2xl focus:border-orange-500 focus:bg-white dark:focus:bg-white/10 transition-all text-lg font-medium outline-none resize-none`}
                                        />
                                    </div>

                                    <div className="space-y-10">
                                        {/* Requested Date */}
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <CalendarIcon className={`w-3 h-3 ${subTextColor}`} /> Requested Date , If any
                                            </label>
                                            <div className="flex flex-col gap-6">
                                                <div className="flex items-center gap-6">
                                                    <button
                                                        onClick={() => setFormData({ ...formData, hasDeadline: !formData.hasDeadline })}
                                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 shrink-0 ${formData.hasDeadline ? 'bg-orange-600 border-orange-600 shadow-lg shadow-orange-600/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333]'}`}
                                                    >
                                                        {formData.hasDeadline ? <Check className="w-8 h-8 text-white" /> : <CalendarIcon className="w-6 h-6 text-slate-300" />}
                                                    </button>
                                                    <div className="flex flex-col">

                                                        <p className="text-[10px] text-slate-400 font-medium">{formData.hasDeadline ? 'Schedule is active and required' : 'Click the icon to enable date range'}</p>
                                                    </div>
                                                </div>

                                                {formData.hasDeadline && (
                                                    <div className="flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                                                        <div className="flex-1 relative">
                                                            <span className="absolute left-3 top-0 -translate-y-1/2 px-1 text-[8px] font-black uppercase tracking-widest bg-white dark:bg-[#141414] text-slate-400 z-10">From</span>
                                                            <input
                                                                type="date"
                                                                value={formData.requestedDateFrom}
                                                                onChange={(e) => setFormData({ ...formData, requestedDateFrom: e.target.value })}
                                                                className={`w-full px-4 py-4 border-2 rounded-2xl font-bold transition-all outline-none bg-white dark:bg-white/10 border-orange-100 dark:border-orange-900/40 text-orange-900 dark:text-orange-400 focus:border-orange-500`}
                                                            />
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <span className="absolute left-3 top-0 -translate-y-1/2 px-1 text-[8px] font-black uppercase tracking-widest bg-white dark:bg-[#141414] text-slate-400 z-10">To</span>
                                                            <input
                                                                type="date"
                                                                value={formData.requestedDateTo}
                                                                onChange={(e) => setFormData({ ...formData, requestedDateTo: e.target.value })}
                                                                className={`w-full px-4 py-4 border-2 rounded-2xl font-bold transition-all outline-none bg-white dark:bg-white/10 border-orange-100 dark:border-orange-900/40 text-orange-900 dark:text-orange-400 focus:border-orange-500`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Encoder */}
                                        <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-white/5">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <User className={`w-3 h-3 ${subTextColor}`} /> Encoder Name (LASTNAME, FIRSTNAME)
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[9px] text-red-500 font-black tracking-widest">REQUIRED</span>
                                                </div>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.encoder}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, encoder: val });
                                                        setActiveSenderIndex('encoder');
                                                        fetchSuggestions(val.split(',').pop().trim());
                                                    }}
                                                    onFocus={() => {
                                                        setActiveSenderIndex('encoder');
                                                        if (formData.encoder.length >= 2) fetchSuggestions(formData.encoder.split(',').pop().trim());
                                                    }}
                                                    className={`w-full px-6 py-4 border-2 rounded-2xl focus:border-orange-500 focus:bg-white dark:focus:bg-white/10 transition-all text-sm font-black uppercase tracking-wider outline-none ${!validateFormat(formData.encoder) ? 'border-red-500/50' : ''} ${'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333] text-slate-600 dark:text-slate-200'}`}
                                                />

                                                {showSuggestions && activeSenderIndex === 'encoder' && (
                                                    <div
                                                        ref={suggestionRef}
                                                        className={`absolute z-[100] w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-1 ${'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}
                                                    >
                                                        {suggestions.map((person) => (
                                                            <div
                                                                key={person.id}
                                                                onClick={() => selectSuggestion(person.name)}
                                                                className="px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-orange-600 transition-colors border-b last:border-0 border-gray-50 dark:border-white/5 flex items-center gap-3"
                                                            >
                                                                <User className="w-3 h-3 text-orange-400" />
                                                                <span>{person.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {!validateFormat(formData.encoder) && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Attachment Section */}
                        <div className="lg:col-span-4 space-y-8 md:space-y-12">
                            <section className={`${cardBg} p-8 md:p-16 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-2xl flex flex-col`}>
                                <div className={`flex items-center gap-4 border-b pb-8 mb-10 ${'border-slate-50 dark:border-[#222]'}`}>
                                    <Upload className={`w-6 h-6 ${subTextColor}`} />
                                    <h2 className={`text-lg font-black uppercase tracking-tight ${textColor}`}>Attachments</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            Attachment
                                        </label>
                                        <select
                                            value={formData.refAttachmentId}
                                            onChange={(e) => setFormData({ ...formData, refAttachmentId: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-2xl border-2 transition-all outline-none text-sm font-bold ${'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333] focus:border-orange-500'}`}
                                        >
                                            <option value="">-- None --</option>
                                            {refAttachments.map(att => (
                                                <option key={att.id} value={att.id}>
                                                    {att.attachment_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                        className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-8 md:p-12 transition-all cursor-pointer group ${'border-slate-100 dark:border-[#333] bg-slate-50/50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-900/5'}`}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                        />
                                        <div className={`w-20 h-20 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                                            <Upload className={`w-8 h-8 ${subTextColor}`} />
                                        </div>
                                        <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${textColor}`}>Click to Upload</h3>
                                        <p className="text-xs text-slate-400 font-medium">or drag and drop files here</p>
                                    </div>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="mt-8 space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attached Files ({attachments.length})</h4>
                                        <div className="max-h-40 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                            {attachments.map((file, index) => (
                                                <div key={index} className={`flex items-center justify-between p-3 rounded-xl border group ${'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333]'}`}>
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className={`w-8 h-8 bg-white dark:bg-white/10 border rounded-lg flex items-center justify-center ${subTextColor} ${'border-slate-100'}`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className={`text-xs font-bold truncate ${textColor}`}>{file.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeAttachment(index);
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-12 space-y-4">
                                    <button
                                        onClick={handleSend}
                                        className={`w-full py-5 ${accentColor} text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${'shadow-orange-100'}`}
                                    >
                                        <Send className="w-4 h-4" /> Send Letter
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        className={`w-full py-5 bg-transparent border-2 font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all ${'border-slate-100 dark:border-[#333] text-slate-400 hover:border-red-100 dark:hover:border-red-900/20 hover:text-red-500'}`}
                                    >
                                        <Trash2 className="w-4 h-4" /> Clear All Fields
                                    </button>
                                </div>
                            </section>
                        </div>

                    </div>
                </main>

                {/* Modern Footer Branding */}
                <footer className={`h-auto md:h-16 py-6 md:py-0 ${headerBg} border-t px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest`}>
                    <span>&copy; 2026 PMD Letter Management System</span>
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                        <span className="hover:text-blue-600 cursor-pointer">Security Policy</span>
                        <span className="hover:text-blue-600 cursor-pointer">Encryption Protocol</span>
                        <span className={`px-3 py-1 rounded ${'bg-slate-50 text-slate-300'}`}>Build 2.0.4-Guest</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
