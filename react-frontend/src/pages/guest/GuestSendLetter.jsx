
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
    Menu,
    ChevronDown,
    Search
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import attachmentService from "../../services/attachmentService";
import departmentService from "../../services/departmentService";
import letterKindService from "../../services/letterKindService";
import letterService from "../../services/letterService";
import axios from "axios";
import SuccessModal from "../../components/SuccessModal";
import useAccess from "../../hooks/useAccess";

export default function GuestSendLetter() {
    const { user, logout, layoutStyle, isMobileMenuOpen, setIsMobileMenuOpen, isGuest } = useAuth();
    const access = useAccess();
    const navigate = useNavigate();

    // isLoggedIn means a real authenticated user (not a guest)
    const isLoggedIn = !!user?.id && !isGuest;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        regarding: "",
        encoder: "",
        senders: [""],
        selectedRefIds: [],
        kind: "",
    });
    const [attachmentSearch, setAttachmentSearch] = useState("");
    const [showAttachmentResults, setShowAttachmentResults] = useState(false);
    const attachmentSearchRef = useRef(null);
    const [attachments, setAttachments] = useState([]);
    const [refAttachments, setRefAttachments] = useState([]);
    const [referenceNo, setReferenceNo] = useState("Select Department");
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState("");
    const [kinds, setKinds] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSenderIndex, setActiveSenderIndex] = useState(null); // numeric for senders, 'encoder' for encoder
    const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const fileInputRef = useRef(null);
    const suggestionRef = useRef(null);
    const canField = access?.canField || (() => true);
    const canSenderField = canField("guest-send-letter", "sender_field");
    const canEncoderField = canField("guest-send-letter", "encoder_field");
    const canSummaryField = canField("guest-send-letter", "summary_field");
    const canAttachmentSelector = canField("guest-send-letter", "attachment_selector");
    const canAttachmentUpload = canField("guest-send-letter", "attachment_upload");
    const canKindDropdown = canField("guest-send-letter", "kind_dropdown");
    const canSubmit = canField("guest-send-letter", "submit_button");
    const canClear = canField("guest-send-letter", "clear_button");
    const canPrintQR = canField("guest-send-letter", "print_qr_button");
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
            } catch (err) {
                console.error("Failed to fetch ref attachments:", err);
            }
        };
        fetchRefs();
    }, []);

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const data = await departmentService.getAll();
                setDepartments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch departments:", err);
            }
        };
        fetchDepts();
    }, []);

    useEffect(() => {
        const fetchKinds = async () => {
            try {
                // If not logged in (guest), or no department is selected, fetch all kinds
                const params = (isLoggedIn && selectedDeptId) ? { dept_id: selectedDeptId } : {};
                const data = await letterKindService.getAll(params);
                setKinds(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch kinds:", err);
                setKinds([]);
            }
        };
        fetchKinds();
    }, [isLoggedIn, selectedDeptId]);

    useEffect(() => {
        const syncPreview = async () => {
            try {
                // Determine prefix and deptId for preview
                const prefix = isLoggedIn ? "ATG" : "LMS";
                const targetDeptId = isLoggedIn ? selectedDeptId : null;

                if (isLoggedIn && !selectedDeptId) {
                    setReferenceNo("Select Department");
                    return;
                }

                setReferenceNo("Generating...");
                const preview = await letterService.getPreviewIds(prefix, targetDeptId);
                if (preview?.lms_id) setReferenceNo(preview.lms_id);
            } catch (err) {
                console.error("Failed to fetch next Reference No:", err);
                setReferenceNo("Check Connection");
            }
        };
        syncPreview();
    }, [isLoggedIn, selectedDeptId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (attachmentSearchRef.current && !attachmentSearchRef.current.contains(event.target)) {
                setShowAttachmentResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            setHighlightedSuggestionIndex(-1);
            return;
        }
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons/search?query=${query}`);
            
            // Deduplicate and clean names in suggestions to handle existing DB inconsistencies
            const seen = new Set();
            const cleaned = response.data
                .map(p => ({ ...p, name: p.name.replace(/,+$/, '').trim() }))
                .filter(p => {
                    if (seen.has(p.name)) return false;
                    seen.add(p.name);
                    return true;
                });

            setSuggestions(cleaned);
            setShowSuggestions(cleaned.length > 0);
            setHighlightedSuggestionIndex(cleaned.length > 0 ? 0 : -1);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };

    useEffect(() => {
        setHighlightedSuggestionIndex(-1);
    }, [activeSenderIndex]);

    useEffect(() => {
        if (!showSuggestions) setHighlightedSuggestionIndex(-1);
    }, [showSuggestions]);

    const validateFormat = (text) => {
        if (!text) return true; // Let required validator handle empty
        const regex = /^[A-Z,\s.]+$/i; // Allowing characters, spaces, dots, and COMMA
        return regex.test(text) && text.includes(',');
    };

    const handleClear = () => {
        setFormData({
            regarding: "",
            encoder: "",
            senders: [""],
            selectedRefIds: [],
            kind: "",
        });
        setAttachments([]);
        setSelectedDeptId("");
        setReferenceNo("Select Department");
    };

    const handleSend = async () => {
        // Department is now optional for everyone on this page.

        // Only validate format if senders are provided
        const filledSenders = formData.senders.filter(s => s && s.trim());
        if (filledSenders.length === 0) {
            alert("At least one sender name is required.");
            return;
        }

        // Encoder is optional for guest submissions
        if (formData.encoder && !validateFormat(formData.encoder)) {
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

            // Filter out any blank sender entries before joining
            const validSenders = formData.senders.filter(s => s && s.trim());
            const senderStr = validSenders.join('; ').trim();
            if (!senderStr) {
                alert("At least one sender name is required.");
                setLoading(false);
                return;
            }

            if (!formData.regarding.trim()) {
                alert("Letter summary/regarding field is required.");
                setLoading(false);
                return;
            }

            // 1. If there's a scanned file, upload the first one as primary scan
            if (attachments.length > 0) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', attachments[0]);
                formDataUpload.append('no_record', 'true');
                formDataUpload.append('purpose', 'scanned_copy');

                const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/upload`, formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                scannedCopyPath = response.data.file_path;
            }

            let lmsIdToUse = referenceNo;
            const normalizedRef = (referenceNo || '').trim();
            const isValidRef = isLoggedIn 
                ? /^ATG\d{2}-[A-Z0-9]+-\d{5}$/.test(normalizedRef)
                : /^LMS\d{2}-\d{5}$/.test(normalizedRef);

            if (!isValidRef) {
                const prefix = isLoggedIn ? "ATG" : "LMS";
                const preview = await letterService.getPreviewIds(prefix, selectedDeptId || null);
                if (preview?.lms_id) {
                    lmsIdToUse = preview.lms_id;
                    setReferenceNo(preview.lms_id);
                }
            }

            // 3. Save the letter
            const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letters`, {
                lms_id: lmsIdToUse,
                sender: senderStr,
                encoder: formData.encoder,
                summary: formData.regarding,
                date_received: new Date().toISOString(),
                global_status: 8,
                encoder_id: user?.id,
                letter_type: 'Non-Confidential',
                attachment_id: (formData.selectedRefIds && formData.selectedRefIds.length > 0) ? parseInt(formData.selectedRefIds[0]) : null,
                scanned_copy: scannedCopyPath,
                direction: 'Incoming',
                kind: formData.kind ? parseInt(formData.kind) : null,
                assigned_dept: parseInt(selectedDeptId),
                dept_id: parseInt(selectedDeptId)
            });

            if (response.data?.lms_id) {
                setReferenceNo(response.data.lms_id);
            }

            setIsSuccessModalOpen(true);
        } catch (err) {
            console.error("Submission failed:", err);
            const backendError = err.response?.data?.error || err.message;
            alert(`Failed to send letter. Reason: ${backendError}`);
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

        // Clean up name from any trailing punctuation (commas)
        const cleanName = name.replace(/,+$/, '').trim();

        if (activeSenderIndex === 'encoder') {
            setFormData(prev => ({ ...prev, encoder: cleanName }));
        } else {
            const newSenders = [...formData.senders];
            // Replace the entire field content with the selected name 
            // to avoid "doubling" caused by splitting by commas in the name
            newSenders[activeSenderIndex] = cleanName;
            setFormData(prev => ({ ...prev, senders: newSenders }));
        }
        setShowSuggestions(false);
        setHighlightedSuggestionIndex(-1);
    };

    const scrollHighlightedSuggestionIntoView = (index) => {
        if (!suggestionRef.current) return;
        const el = suggestionRef.current.querySelector(`[data-suggestion-index="${index}"]`);
        if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ block: "nearest" });
        }
    };

    const handleSuggestionKeyDown = (e, fieldKey) => {
        if (activeSenderIndex !== fieldKey) return;
        if (!suggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!showSuggestions) setShowSuggestions(true);
            setHighlightedSuggestionIndex(prev => {
                const next = Math.min(prev < 0 ? 0 : prev + 1, suggestions.length - 1);
                scrollHighlightedSuggestionIntoView(next);
                return next;
            });
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!showSuggestions) setShowSuggestions(true);
            setHighlightedSuggestionIndex(prev => {
                const next = Math.max(prev < 0 ? 0 : prev - 1, 0);
                scrollHighlightedSuggestionIntoView(next);
                return next;
            });
            return;
        }

        if (e.key === "Enter" && showSuggestions) {
            const idx = highlightedSuggestionIndex < 0 ? 0 : highlightedSuggestionIndex;
            const picked = suggestions[idx];
            if (picked) {
                e.preventDefault();
                selectSuggestion(picked.name);
            }
            return;
        }

        if (e.key === "Escape" && showSuggestions) {
            e.preventDefault();
            setShowSuggestions(false);
            setHighlightedSuggestionIndex(-1);
        }
    };

    // Layout-specific styling
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-100' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';
    const accentColor = layoutStyle === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#F6A17B] hover:bg-[#e8946e]';
    const textColor = 'text-slate-900 dark:text-white';
    const subTextColor = 'text-blue-600';
    const inputBg = 'bg-slate-50 dark:bg-white/5 border-slate-50 dark:border-[#333] text-slate-800 dark:text-white';

    useEffect(() => {
        if (!isLoggedIn) return;
        setFormData(prev => {
            if ((prev.encoder || "").trim()) return prev;
            const first = (user?.first_name || "").trim();
            const last = (user?.last_name || "").trim();
            const fullName = `${first} ${last}`.trim();
            if (!fullName) return prev;
            return { ...prev, encoder: fullName };
        });
    }, [isLoggedIn, user?.first_name, user?.last_name]);

    return (
        <div className={`flex min-h-screen ${pageBg} font-sans transition-colors duration-300`}>
            {isLoggedIn && <Sidebar />}

            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header / Status Bar */}
                <header className={`h-16 ${headerBg} border-b px-4 md:px-6 flex items-center justify-between sticky top-0 z-50 shrink-0`}>
                    <div className="flex items-center gap-4">
                        {isLoggedIn && (
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-gray-400"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-blue-500'}`} />
                            <div>
                                <h2 className={`text-sm font-bold uppercase tracking-tight ${textColor}`}>{referenceNo}</h2>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</span>
                            <span className={`text-xs font-bold ${textColor}`}>{today}</span>
                        </div>
                        {!isLoggedIn && (
                            <div className="flex items-center gap-4">
                                <div className="px-3 py-1 bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-orange-500/20">
                                    Guest Mode
                                </div>
                                <button
                                    onClick={() => setIsExitModalOpen(true)}
                                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                                >
                                    Exit
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Metadata Section */}
                        <div className="lg:col-span-12 xl:col-span-8 space-y-4">
                            <section className={`${cardBg} p-6 md:p-6 rounded-2xl border space-y-4 md:space-y-6`}>
                                <div className={`flex items-center gap-4 border-b pb-6 ${'border-slate-50 dark:border-[#222]'}`}>
                                    <FileText className={`w-5 h-5 ${subTextColor}`} />
                                    <h2 className={`text-lg font-bold uppercase tracking-tight ${textColor}`}>Letter</h2>
                                </div>

                                 <div className="grid grid-cols-1 gap-6">
                                     {/* Department - Optional for everyone */}
                                     <div className="space-y-3">
                                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                             <div className="flex items-center gap-2">
                                                 <Hash className={`w-3 h-3 ${subTextColor}`} /> Department
                                             </div>
                                             <span className="text-[9px] text-gray-400 font-bold tracking-widest">OPTIONAL</span>
                                         </label>
                                         <select
                                             value={selectedDeptId}
                                             onChange={(e) => setSelectedDeptId(e.target.value)}
                                             className={`w-full px-5 py-3 ${inputBg} border-2 rounded-xl focus:border-orange-500 transition-all text-base font-semibold outline-none`}
                                         >
                                             <option value="">Select department...</option>
                                             {departments.map((d) => (
                                                 <option key={d.id} value={d.id}>
                                                     {d.dept_name || d.name || d.department_name || `Department ${d.id}`}
                                                 </option>
                                             ))}
                                         </select>
                                     </div>

                                     {/* Sender */}
                                     {canSenderField && <div className="space-y-3">
                                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                             <div className="flex items-center gap-2">
                                                 <User className={`w-3 h-3 ${subTextColor}`} /> Sender
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[9px] text-red-500 font-bold tracking-widest">REQUIRED</span>
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
                                                             onKeyDown={(e) => handleSuggestionKeyDown(e, index)}
                                                             onFocus={() => {
                                                                 setActiveSenderIndex(index);
                                                                 if (sender.length >= 2) fetchSuggestions(sender.split(',').pop().trim());
                                                             }}
                                                             className={`w-full px-5 py-3 ${inputBg} border-2 rounded-xl focus:border-orange-500 transition-all text-base font-semibold outline-none ${!isValid && sender ? 'border-red-500/50' : ''}`}
                                                         />

                                                        {showSuggestions && activeSenderIndex === index && (
                                                            <div
                                                                ref={suggestionRef}
                                                                className={`absolute z-[100] w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-1 ${'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}
                                                            >
                                                                 {suggestions.map((person, idx) => (
                                                                     <div
                                                                         key={person.id}
                                                                         onClick={() => selectSuggestion(person.name)}
                                                                         onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                                                                         data-suggestion-index={idx}
                                                                         className={`px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border-b last:border-0 border-gray-50 dark:border-white/5 flex items-center gap-3 ${
                                                                             idx === highlightedSuggestionIndex
                                                                                 ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600"
                                                                                 : "hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-orange-600"
                                                                         }`}
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
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Add Name</span>
                                        </button>
                                    </div>}

                                    {/* Regarding */}
                                    {canSummaryField && <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className={`w-3 h-3 ${subTextColor}`} /> RE
                                            </div>
                                            <span className="text-[9px] text-red-500 font-bold tracking-widest">REQUIRED</span>
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={formData.regarding}
                                            onChange={(e) => setFormData({ ...formData, regarding: e.target.value })}
                                            className={`w-full px-5 py-3 ${inputBg} border-2 rounded-xl focus:border-orange-500 focus:bg-white dark:focus:bg-white/10 transition-all text-base font-medium outline-none resize-none`}
                                        />
                                    </div>}

                                    <div className="space-y-6">
                                        {/* Encoder */}
                                        {canEncoderField && <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-white/5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <User className={`w-3 h-3 ${subTextColor}`} /> Encoded By (Lastname, Firstname)
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[9px] text-red-500 font-bold tracking-widest">REQUIRED</span>
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
                                                     onKeyDown={(e) => handleSuggestionKeyDown(e, 'encoder')}
                                                     onFocus={() => {
                                                         setActiveSenderIndex('encoder');
                                                         if (formData.encoder.length >= 2) fetchSuggestions(formData.encoder.split(',').pop().trim());
                                                     }}
                                                     className={`w-full px-5 py-3 border-2 rounded-xl focus:border-orange-500 focus:bg-white dark:focus:bg-white/10 transition-all text-sm font-bold uppercase tracking-wider outline-none ${!validateFormat(formData.encoder) ? 'border-red-500/50' : ''} ${'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333] text-slate-600 dark:text-slate-200'}`}
                                                 />

                                                {showSuggestions && activeSenderIndex === 'encoder' && (
                                                    <div
                                                        ref={suggestionRef}
                                                        className={`absolute z-[100] w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-1 ${'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}
                                                    >
                                                         {suggestions.map((person, idx) => (
                                                             <div
                                                                 key={person.id}
                                                                 onClick={() => selectSuggestion(person.name)}
                                                                 onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                                                                 data-suggestion-index={idx}
                                                                 className={`px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border-b last:border-0 border-gray-50 dark:border-white/5 flex items-center gap-3 ${
                                                                     idx === highlightedSuggestionIndex
                                                                         ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600"
                                                                         : "hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-orange-600"
                                                                 }`}
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
                                        </div>}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Attachment Section */}
                        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
                            <section className={`${cardBg} p-6 md:p-6 rounded-2xl border flex flex-col`}>
                                <div className={`flex items-center gap-4 border-b pb-4 mb-8 ${'border-slate-50 dark:border-[#222]'}`}>
                                    <Upload className={`w-5 h-5 ${subTextColor}`} />
                                    <h2 className={`text-lg font-bold uppercase tracking-tight ${textColor}`}>Files</h2>
                                </div>

                                {(() => {
                                    return (
                                        <div className="space-y-8">
                                            {/* Physical Attachment Selection */}
                                            {canAttachmentSelector && (
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        Attachment
                                                    </label>
                                                    <div className="space-y-3" ref={attachmentSearchRef}>
                                                        <div className="relative">
                                                            {/* Custom Searchable Dropdown Toggle */}
                                                            <div
                                                                onClick={() => setShowAttachmentResults(!showAttachmentResults)}
                                                                className={`w-full px-5 py-3 rounded-xl border-2 transition-all outline-none text-sm font-bold flex items-center justify-between cursor-pointer ${'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333] hover:border-orange-500/50'}`}
                                                            >
                                                                <span className="truncate max-w-[85%] uppercase tracking-wider">
                                                                    {formData.selectedRefIds.length > 0
                                                                        ? refAttachments.find(a => String(a.id) === String(formData.selectedRefIds[0]))?.attachment_name || "Attachment Selected"
                                                                        : "None"}
                                                                </span>
                                                                <ChevronDown className={`w-4 h-4 transition-transform ${showAttachmentResults ? 'rotate-180' : ''}`} />
                                                            </div>

                                                            {/* Dropdown Menu */}
                                                            {showAttachmentResults && (
                                                                <div className={`absolute z-[110] w-full mt-1 max-h-60 overflow-y-auto rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-1 overflow-hidden ${'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}>
                                                                    {/* Internal Search Input */}
                                                                    <div className="p-2 border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/10">
                                                                        <div className="relative">
                                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Search attachments..."
                                                                                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-black/20 border border-gray-100 dark:border-[#333] rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
                                                                                value={attachmentSearch}
                                                                                onChange={(e) => setAttachmentSearch(e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Options List */}
                                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                                        {/* Explicit 'None' Option */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData(prev => ({ ...prev, selectedRefIds: [] }));
                                                                                setShowAttachmentResults(false);
                                                                                setAttachmentSearch("");
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2.5 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${formData.selectedRefIds.length === 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 uppercase'}`}
                                                                        >
                                                                            <span>NONE (NO ATTACHMENT)</span>
                                                                            {formData.selectedRefIds.length === 0 && <Check className="w-3 h-3" />}
                                                                        </button>

                                                                        {refAttachments
                                                                            .filter(att => att.attachment_name.toLowerCase().includes(attachmentSearch.toLowerCase()))
                                                                            .map(att => (
                                                                                <button
                                                                                    key={att.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        // Toggle behavior or single select? Let's go with single for now as per management pattern
                                                                                        if (formData.selectedRefIds.includes(String(att.id))) {
                                                                                            setFormData(prev => ({ ...prev, selectedRefIds: [] }));
                                                                                        } else {
                                                                                            setFormData(prev => ({ ...prev, selectedRefIds: [String(att.id)] }));
                                                                                        }
                                                                                        setAttachmentSearch("");
                                                                                        setShowAttachmentResults(false);
                                                                                    }}
                                                                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between uppercase ${formData.selectedRefIds.includes(String(att.id)) ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                                                >
                                                                                    <span className="truncate">{att.attachment_name}</span>
                                                                                    {formData.selectedRefIds.includes(String(att.id)) && <Check className="w-3 h-3" />}
                                                                                </button>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Selected Pills (Optional now that we have a label, but good for clarity if we want to allow removal) */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {formData.selectedRefIds.length > 0 ? (
                                                                formData.selectedRefIds.map(id => {
                                                                    const att = refAttachments.find(a => String(a.id) === String(id));
                                                                    return (
                                                                        <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest animate-in zoom-in-95 duration-200">
                                                                            <span className="truncate max-w-[200px]">{att?.attachment_name || id}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFormData(prev => ({
                                                                                    ...prev,
                                                                                    selectedRefIds: prev.selectedRefIds.filter(i => i !== id)
                                                                                }))}
                                                                                className="hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                                                                            >
                                                                                <XIcon className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#333] rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    None Selected
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Kind Dropdown (below Attachment dropdown) */}
                                            {canKindDropdown && (
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        Kind
                                                    </label>
                                                    <select
                                                        value={formData.kind}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, kind: e.target.value }))}
                                                        className={`w-full px-5 py-3 ${inputBg} border-2 rounded-xl focus:border-orange-500 transition-all text-sm font-bold outline-none`}
                                                        disabled={isLoggedIn && !selectedDeptId}
                                                    >
                                                        <option value="">{isLoggedIn && !selectedDeptId ? "Select department first..." : "None"}</option>
                                                        {kinds.map((k) => (
                                                            <option key={k.id} value={k.id}>
                                                                {k.kind_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Digital Upload */}
                                            {canAttachmentUpload && <div className={`space-y-6 transition-all duration-300`}>
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Letter Image/PDF</h4>
                                                </div>
                                                <div
                                                    onClick={() => fileInputRef.current.click()}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => handleDrop(e)}
                                                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 md:p-8 transition-all group cursor-pointer border-slate-100 dark:border-[#333] bg-slate-50/50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-900/5`}
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
                                                    <h3 className={`text-sm font-bold uppercase tracking-widest mb-1 ${textColor}`}>
                                                        Upload
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        or drag and drop files here
                                                    </p>
                                                </div>

                                                {attachments.length > 0 && (
                                                    <div className="mt-8 space-y-2">
                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attached ({attachments.length})</h4>
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
                                            </div>}
                                        </div>
                                    );
                                })()}

                                <div className="mt-8 space-y-3">
                                    {canSubmit && (
                                        <button
                                            onClick={handleSend}
                                            className={`w-full py-4 ${accentColor} text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98] ${'shadow-orange-100'}`}
                                        >
                                            <Send className="w-4 h-4" /> Submit
                                        </button>
                                    )}
                                    {canClear && (
                                        <button
                                            onClick={handleClear}
                                            className={`w-full py-4 bg-transparent border-2 font-bold text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 transition-all ${'border-slate-100 dark:border-[#333] text-slate-400 hover:border-red-100 dark:hover:border-red-900/20 hover:text-red-500'}`}
                                        >
                                            <Trash2 className="w-4 h-4" /> Clear
                                        </button>
                                    )}
                                </div>
                            </section>
                        </div>

                    </div>
                </main>

                {/* Modern Footer Branding */}
                <footer className={`h-auto md:h-16 py-6 md:py-0 ${headerBg} border-t px-4 md:px-12 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest`}>
                    <span>&copy; 2026 LMS 2026</span>
                </footer>
            </div>

            <SuccessModal
                isOpen={isSuccessModalOpen}
                isGuest={isGuest}
                canPrintQr={canPrintQR}
                onClose={async () => {
                    setIsSuccessModalOpen(false);
                    try {
                        setFormData(prev => ({
                            regarding: "",
                            encoder: prev.encoder || "",
                            senders: [""],
                            selectedRefIds: [],
                        }));
                        setAttachments([]);

                        if (!selectedDeptId) {
                            setReferenceNo("Select Department");
                            return;
                        }
                        const preview = await letterService.getPreviewIds("ATG", selectedDeptId);
                        if (preview?.lms_id) setReferenceNo(preview.lms_id);
                    } catch { }
                }}
                referenceNo={referenceNo}
            />

            {/* Exit Confirmation Modal */}
            <SuccessModal
                variant="confirm"
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                title="Exit Guest Mode?"
                message="Your unsaved letter will be discarded. You will be returned to the login page."
                confirmLabel="Exit"
                cancelLabel="Stay"
                onConfirm={() => {
                    setIsExitModalOpen(false);
                    logout();
                    navigate('/login');
                }}
            />
        </div>
    );
}
