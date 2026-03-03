
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { directus } from "../../hooks/useDirectus";
import { readItems, createItem } from "@directus/sdk";
import { useAuth } from "../../context/AuthContext";
import {
    ArrowLeft,
    Save,
    Loader2,
    FilePlus,
    User,
    Tag,
    Building2,
    Calendar,
    Clipboard,
    AlertCircle,
    Menu,
    Clock,
    Upload,
    Trash2,
    Check,
    FileText
} from "lucide-react";
import letterKindService from "../../services/letterKindService";
import departmentService from "../../services/departmentService";
import statusService from "../../services/statusService";
import trayService from "../../services/trayService";
import attachmentService from "../../services/attachmentService";
import letterService from "../../services/letterService";
import axios from "axios";

export default function NewLetter() {
    const navigate = useNavigate();
    const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();

    const [loading, setLoading] = useState(false);
    const [kinds, setKinds] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [trays, setTrays] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [predictedLmsId, setPredictedLmsId] = useState("Generating...");

    const [formData, setFormData] = useState({
        date_received: new Date().toISOString().slice(0, 16), // Use datetime-local format
        sender: "",
        summary: "",
        kind: "",
        global_status: "",
        direction: "Incoming",
        letter_type: "Non-Confidential",
        vemcode: "",
        evemnote: "",
        aevmnote: "",
        atgnote: "",
        assigned_dept: "",
        tray_id: "",
        attachment_id: ""
    });

    const [scannedFiles, setScannedFiles] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const fileInputRef = useRef(null);
    const suggestionRef = useRef(null);

    const [error, setError] = useState("");

    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const kindsData = await letterKindService.getAll();
                const deptsData = await departmentService.getAll();
                const statusesData = await statusService.getAll();
                const traysData = await trayService.getAllTrays().catch(() => []);
                const attachmentsData = await attachmentService.getAll().catch(() => []);
                const previews = await letterService.getPreviewIds().catch(() => null);

                setKinds(kindsData);
                setDepartments(deptsData);
                setStatuses(statusesData);
                setTrays(traysData);
                setAttachments(attachmentsData);
                if (previews) setPredictedLmsId(previews.lms_id);

                // Set defaults
                if (kindsData.length > 0) setFormData(prev => ({ ...prev, kind: kindsData[0].id }));
                if (statusesData.length > 0) {
                    const received = statusesData.find(s => s.status_name === 'Received' || s.status_name === 'Incoming');
                    setFormData(prev => ({ ...prev, global_status: received?.id || statusesData[0].id }));
                }

                // Default to user's department
                const userDeptId = user?.dept_id?.id || user?.dept_id || "";
                if (userDeptId) {
                    setFormData(prev => ({ ...prev, assigned_dept: userDeptId }));
                }
            } catch (err) {
                console.error("Refs fetch failed:", err);
            }
        };
        fetchRefs();
    }, [user]);

    // Handle outside clicks to close suggestions
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
            const response = await axios.get(`http://localhost:5000/api/persons/search?query=${query}`);
            setSuggestions(response.data);
            setShowSuggestions(response.data.length > 0);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };

    const handleSenderChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, sender: val });

        // Split by semicolon to allow multiple "Last, First" entries
        const parts = val.split(';');
        const lastPart = parts[parts.length - 1].trim();

        // If the typing part has enough chars and looks like they are starting a name (after comma or fresh) 
        // e.g. "DOE, J" or just "DOE"
        const query = lastPart.includes(',') ? lastPart.split(',').pop().trim() : lastPart.trim();
        fetchSuggestions(query);
    };

    const selectSuggestion = (name) => {
        const parts = formData.sender.split(';').map(p => p.trim());
        // Replace the last part being typed with the full selected name
        parts[parts.length - 1] = name;
        const newValue = parts.filter(p => p !== "").join('; ');
        setFormData({ ...formData, sender: newValue + '; ' });
        setShowSuggestions(false);
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setScannedFiles(prev => [...prev, ...selectedFiles]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setScannedFiles(prev => [...prev, ...files]);
        }
    };

    const handlePaste = (e) => {
        // Prevent pasting into standard text inputs if it's a file
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
            setScannedFiles(prev => [...prev, ...files]);
        }
    };

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const removeAttachment = (index) => {
        setScannedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            let scannedCopyPath = null;

            // If there's a scanned file, upload it - store path only (no DB record)
            if (scannedFiles.length > 0) {
                const fileToUpload = scannedFiles[0];
                const formDataUpload = new FormData();
                formDataUpload.append('file', fileToUpload);
                formDataUpload.append('no_record', 'true');
                formDataUpload.append('description', `Scanned copy for ${formData.sender}`);

                const response = await axios.post('http://localhost:5000/api/attachments/upload', formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                scannedCopyPath = response.data.file_path;
            }

            await letterService.create({
                ...formData,
                scanned_copy: scannedCopyPath,
                encoder_id: user.id
            });

            navigate("/master-table");
        } catch (err) {
            console.error("Creation failed:", err);
            setError(err.response?.data?.error || "Failed to create letter.");
        } finally {
            setLoading(false);
        }
    };

    const pageBg = layoutStyle === 'linear' ? 'bg-[#080808]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'linear' ? 'bg-[#080808]/80 backdrop-blur-md border-[#1a1a1a]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'linear' ? 'text-[#eee]' : layoutStyle === 'notion' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white';
    const cardBg = layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' : layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

    return (
        <div className={`h-screen ${pageBg} flex overflow-hidden transition-colors duration-300`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-4 md:px-8 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2 rounded-lg transition-colors ${layoutStyle === 'linear' ? 'hover:bg-[#1a1a1a] text-[#666]' : 'hover:bg-slate-50 text-slate-500'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Workspace / New</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="w-full space-y-8">
                        <div className="mb-8">
                            <h2 className={`text-3xl font-bold ${textColor}`}>Add New Letter</h2>

                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Core Details */}
                            <section className={`${cardBg} rounded-3xl border p-8 shadow-sm space-y-6`}>
                                <div className={`flex items-center gap-2 mb-2 ${textColor}`}>
                                    <Clipboard className="w-5 h-5 text-orange-400" />
                                    <h3 className="font-bold">Core Details</h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entry Classification</label>
                                    <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20 border border-dashed border-orange-200 dark:border-orange-800/40 rounded-xl text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center justify-between">
                                        <span>Reference Code: {predictedLmsId}</span>
                                        <span className="text-[8px] bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">(ANNUAL SEQUENCE)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Date & Time Received
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.date_received}
                                            onChange={e => setFormData({ ...formData, date_received: e.target.value })}
                                            className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direction</label>
                                        <select
                                            value={formData.direction}
                                            onChange={e => setFormData({ ...formData, direction: e.target.value })}
                                            className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        >
                                            <option value="Incoming">Incoming</option>
                                            <option value="Outgoing">Outgoing</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>Sender / Recipient</span>
                                        <span className="text-[10px] text-red-500 font-black">REQUIRED</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Organization or Individual"
                                            value={formData.sender}
                                            onChange={handleSenderChange}
                                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                            autoComplete="off"
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />

                                        {showSuggestions && (
                                            <div
                                                ref={suggestionRef}
                                                className={`absolute z-[100] w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-1 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}
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
                                    </div>
                                </div>
                            </section>

                            {/* Classification */}
                            <section className={`${cardBg} rounded-3xl border p-8 shadow-sm space-y-6`}>
                                <div className={`flex items-center gap-2 mb-2 ${textColor}`}>
                                    <Tag className="w-5 h-5 text-blue-400" />
                                    <h3 className="font-bold">Classification</h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Letter Kind</label>
                                    <select
                                        required
                                        value={formData.kind}
                                        onChange={e => setFormData({ ...formData, kind: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    >
                                        {kinds.map(k => <option key={k.id} value={k.id}>{k.kind_name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Letter Type</label>
                                    <select
                                        value={formData.letter_type}
                                        onChange={e => setFormData({ ...formData, letter_type: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <option value="Non-Confidential">Non-Confidential</option>
                                        <option value="Confidential">Confidential</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">VEM Code</label>
                                    <input
                                        type="text"
                                        placeholder="Reference VEM Code"
                                        value={formData.vemcode}
                                        onChange={e => setFormData({ ...formData, vemcode: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Global Status</label>
                                    <select
                                        required
                                        value={formData.global_status}
                                        onChange={e => setFormData({ ...formData, global_status: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    >
                                        {statuses.map(s => <option key={s.id} value={s.id}>{s.status_name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Physical Attachment</label>
                                    <select
                                        value={formData.attachment_id}
                                        onChange={e => setFormData({ ...formData, attachment_id: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <option value="">-- No Physical Attachment --</option>
                                        {attachments.map(a => <option key={a.id} value={a.id}>{a.attachment_name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Storage Tray (Physical Location)</label>
                                    <select
                                        value={formData.tray_id}
                                        onChange={e => setFormData({ ...formData, tray_id: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <option value="">-- Select Tray (Optional) --</option>
                                        {trays.map(t => <option key={t.id} value={t.id}>{t.tray_no} - {t.description}</option>)}
                                    </select>
                                </div>

                                <div className={`space-y-2 pt-4 border-t ${layoutStyle === 'linear' ? 'border-[#1a1a1a]' : 'border-gray-50 dark:border-[#222]'}`}>
                                    <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${layoutStyle === 'linear' ? 'text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        <Building2 className="w-3 h-3" />
                                        Department
                                    </label>
                                    <select
                                        value={formData.assigned_dept}
                                        onChange={e => setFormData({ ...formData, assigned_dept: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${layoutStyle === 'linear' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-700 dark:text-blue-400'}`}
                                    >
                                        <option value="">No Department</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                                    </select>
                                </div>
                            </section>

                            {/* Authority Notes */}
                            <section className={`md:col-span-2 ${cardBg} rounded-3xl border p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6`}>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">EVM Note</label>
                                    <textarea
                                        rows="3"
                                        value={formData.evemnote}
                                        onChange={e => setFormData({ ...formData, evemnote: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">AEVM Note</label>
                                    <textarea
                                        rows="3"
                                        value={formData.aevmnote}
                                        onChange={e => setFormData({ ...formData, aevmnote: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ATG Note</label>
                                    <textarea
                                        rows="3"
                                        value={formData.atgnote}
                                        onChange={e => setFormData({ ...formData, atgnote: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    />
                                </div>
                            </section>

                            {/* Summary */}
                            <section className={`md:col-span-2 ${cardBg} rounded-3xl border p-8 shadow-sm space-y-4`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Letter Summary</label>
                                    <span className="text-[10px] text-red-500 font-black tracking-widest">REQUIRED FIELD</span>
                                </div>
                                <textarea
                                    rows="4"
                                    required
                                    value={formData.summary}
                                    onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                    placeholder="Enter Letter Summary"
                                    className={`w-full px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-all ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222] text-[#eee]' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                />
                            </section>

                            {/* Digital Attachment (Scanned Copy) */}
                            <section className={`md:col-span-2 ${cardBg} rounded-3xl border p-8 shadow-sm space-y-6`}>
                                <div className={`flex items-center gap-3 border-b pb-6 mb-2 ${layoutStyle === 'linear' ? 'border-[#1a1a1a]' : 'border-slate-50 dark:border-[#222]'}`}>
                                    <Upload className={`w-5 h-5 text-indigo-400`} />
                                    <h3 className={`font-bold ${textColor}`}>Attachments (Scanned Letter)</h3>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-8 md:p-12 transition-all cursor-pointer group ${layoutStyle === 'linear' ? 'border-[#222] bg-white/5 hover:bg-white/10' : 'border-slate-100 dark:border-[#333] bg-slate-50/50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-900/5'}`}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />
                                    <div className={`w-16 h-16 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                                        <Upload className={`w-6 h-6 text-orange-400`} />
                                    </div>
                                    <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${textColor}`}>Click to Upload</h3>
                                    <p className="text-xs text-slate-400 font-medium">Scanned copies of the letter or related documents</p>
                                </div>

                                {scannedFiles.length > 0 && (
                                    <div className="mt-8 space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Files ({scannedFiles.length})</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {scannedFiles.map((file, index) => (
                                                <div key={index} className={`flex items-center justify-between p-3 rounded-xl border group animate-in fade-in slide-in-from-bottom-2 duration-300 ${layoutStyle === 'linear' ? 'bg-[#111] border-[#222]' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333]'}`}>
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className={`w-8 h-8 bg-white dark:bg-white/10 border rounded-lg flex items-center justify-center text-orange-400 ${layoutStyle === 'linear' ? 'border-[#222]' : 'border-slate-100'}`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className={`text-xs font-bold truncate ${textColor}`}>{file.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
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
                            </section>
                        </div>

                        <div className="flex justify-end gap-4 pt-6 pb-12">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className={`px-8 py-3 text-sm font-bold transition-colors ${layoutStyle === 'linear' ? 'text-[#444] hover:text-[#eee]' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex items-center gap-2 px-10 py-3 text-white text-sm font-bold rounded-2xl transition-all shadow-xl disabled:opacity-50 ${layoutStyle === 'linear' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-[#F6A17B] hover:bg-[#e8946e] shadow-orange-100 dark:shadow-none'}`}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                SEND LETTER
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
