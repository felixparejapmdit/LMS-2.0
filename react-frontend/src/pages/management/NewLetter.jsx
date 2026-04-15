
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
    X as XIcon,
    FileText,
    MessageSquare,
    Send,
    ChevronDown,
    Search
} from "lucide-react";
import letterKindService from "../../services/letterKindService";
import departmentService from "../../services/departmentService";
import statusService from "../../services/statusService";
import trayService from "../../services/trayService";
import attachmentService from "../../services/attachmentService";
import letterService from "../../services/letterService";
import axios from "axios";
import processStepService from "../../services/processStepService";
import SuccessModal from "../../components/SuccessModal";
import useAccess from "../../hooks/useAccess";

export default function NewLetter() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const refCode = searchParams.get('ref_code');
    const { user, layoutStyle, setIsMobileMenuOpen, isSetupComplete } = useAuth();
    const access = useAccess();

    const [loading, setLoading] = useState(false);
    const [kinds, setKinds] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [trays, setTrays] = useState([]);
    const [steps, setSteps] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [persons, setPersons] = useState([]);
    const [isAttachmentDropdownOpen, setIsAttachmentDropdownOpen] = useState(false);
    const [predictedLmsId, setPredictedLmsId] = useState("Generating...");
    const [selectedDept, setSelectedDept] = useState("");
    const [formData, setFormData] = useState({
        date_received: new Date().toISOString().slice(0, 16), // Use datetime-local format
        sender: "",
        summary: "",
        kind: "",
        global_status: "",
        direction: "Incoming",
        letter_type: "Non-Confidential",
        vemcode: "",
        aevm_number: "",
        evemnote: "",
        aevmnote: "",
        atgnote: "",
        assigned_dept: "",
        tray_id: "",
        selectedRefIds: [],
        step_ids: []
    });
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [attachmentSearch, setAttachmentSearch] = useState("");
    const [showAttachmentResults, setShowAttachmentResults] = useState(false);
    const attachmentSearchRef = useRef(null);

    const [scannedFiles, setScannedFiles] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const fileInputRef = useRef(null);
    const suggestionRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const [error, setError] = useState("");
    const canField = access?.canField || (() => true);
    const canSenderField = canField("new-letter", "sender_field");
    const canSummaryField = canField("new-letter", "summary_field");
    const canStatusDropdown = canField("new-letter", "status_dropdown");
    const canAttachmentSelector = canField("new-letter", "attachment_selector");
    const canAttachmentUpload = canField("new-letter", "attachment_upload");
    const canKindDropdown = canField("new-letter", "kind_dropdown");
    const canTraySelector = canField("new-letter", "tray_selector");
    const canSave = canField("new-letter", "save_button");
    const canEncoderField = canField("new-letter", "encoder_field");

    const [activeField, setActiveField] = useState(null);

    const validateFormat = (text) => {
        if (!text) return true;
        const regex = /^[A-Z,\s.]+$/i;
        return regex.test(text) && text.includes(',');
    };

    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const userDeptId = user?.dept_id?.id ?? user?.dept_id;
                const kindsData = await letterKindService.getAll({ dept_id: userDeptId });
                const deptsData = await departmentService.getAll();
                const statusesData = await statusService.getAll({ dept_id: userDeptId });
                const traysData = await trayService.getAllTrays({ dept_id: userDeptId }).catch(() => []);
                const stepsData = await processStepService.getAll().catch(() => []);
                const attachmentsData = await attachmentService.getAll({ dept_id: userDeptId }).catch(() => []);
                const previews = await letterService.getPreviewIds().catch(() => null);

                setKinds(kindsData);
                setDepartments(deptsData);
                setStatuses(statusesData);
                setTrays(traysData);

                const filteredSteps = stepsData.filter(s => ['For Signature', 'For Review', 'VEM Letter', 'AEVM Letter'].includes(s.step_name));
                setSteps(filteredSteps);
                setAttachments(attachmentsData);

                if (refCode) {
                    setPredictedLmsId(refCode);
                    // Optionally fetch existing data if it's an "Empty Entry"
                    const existing = await letterService.getByLmsId(refCode).catch(() => null);
                    if (existing) {
                        setFormData(prev => ({
                            ...prev,
                            sender: existing.sender || "",
                            summary: existing.summary || "",
                            kind: existing.kind || prev.kind,
                            global_status: existing.global_status || prev.global_status,
                            direction: existing.direction || "Incoming",
                            letter_type: existing.letter_type || "Non-Confidential",
                            tray_id: existing.tray_id || "",
                            dept_id: existing.dept_id || prev.dept_id
                        }));
                    }
                } else if (previews) {
                    setPredictedLmsId(previews.lms_id);
                }

                // Set defaults
                const letterKind = kindsData.find(k => k.kind_name.toLowerCase() === 'letter');
                if (letterKind) {
                    setFormData(prev => ({ ...prev, kind: letterKind.id }));
                } else {
                    setFormData(prev => ({ ...prev, kind: "" })); 
                }

                // No default group selection - user must select manually
                setFormData(prev => ({ ...prev, step_ids: [] }));

                if (statusesData.length > 0) {
                    const received = statusesData.find(s => s.status_name === 'Received' || s.status_name === 'Incoming');
                    setFormData(prev => ({ ...prev, global_status: received?.id || statusesData[0].id }));
                }

                // Default to user's department
                if (userDeptId) {
                    setFormData(prev => ({ ...prev, assigned_dept: userDeptId }));
                }
            } catch (err) {
                console.error("Refs fetch failed:", err);
            }
        };
        fetchRefs();
    }, [user]);

    useEffect(() => {
        const fetchNextId = async () => {
            let prefix = 'LMS';
            if (selectedDept && selectedDept.toUpperCase() === "ATG'S OFFICE") {
                prefix = 'ATG';
            }
            
            try {
                const previews = await letterService.getPreviewIds(prefix);
                if (previews) {
                    setPredictedLmsId(previews.lms_id);
                }
            } catch (err) {
                console.error("Failed to fetch next ID for prefix:", prefix, err);
            }
        };
        
        fetchNextId();
    }, [selectedDept]);

    // Inaccessibility check for Access Manager
    useEffect(() => {
        if (!user) return;
        const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
        if (roleName === 'ACCESS MANAGER' && !isSetupComplete) {
            alert("Please complete your department setup (Attachments, Kinds, Roles, Statuses, Steps, and Trays) before creating new letters.");
            navigate('/');
        }
    }, [user, isSetupComplete, navigate]);

    // Handle outside clicks to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (attachmentSearchRef.current && !attachmentSearchRef.current.contains(event.target)) {
                setIsAttachmentDropdownOpen(false);
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
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };

    const toggleStep = (stepId) => {
        const step = steps.find(s => String(s.id) === String(stepId));
        if (!step) return;

        const isPrimary = ['For Signature', 'For Review'].includes(step.step_name);

        setFormData(prev => {
            let current = (prev.step_ids || []).map(id => String(id));
            const target = String(stepId);

            if (isPrimary) {
                // Radio behavior: Remove other primary steps
                const primaryStepIds = steps.filter(s => ['For Signature', 'For Review'].includes(s.step_name)).map(s => String(s.id));
                const secondaryStepIds = steps.filter(s => ['VEM Letter', 'AEVM Letter'].includes(s.step_name)).map(s => String(s.id));
                
                let filtered = current.filter(id => !primaryStepIds.includes(id));
                
                // If we are selecting 'For Signature', we must ALSO clear VEM/AEVM letters
                if (step.step_name === 'For Signature') {
                    filtered = filtered.filter(id => !secondaryStepIds.includes(id));
                }

                if (current.includes(target)) {
                    // Clicking the already selected radio: unselect it (and clear secondaries just in case)
                    const fullyFiltered = current.filter(id => !primaryStepIds.includes(id) && !secondaryStepIds.includes(id));
                    return { ...prev, step_ids: fullyFiltered };
                }
                return { ...prev, step_ids: [...filtered, target] };
            } else {
                // Checkbox behavior for VEM/AEVM
                if (current.includes(target)) {
                    return { ...prev, step_ids: current.filter(id => id !== target) };
                } else {
                    return { ...prev, step_ids: [...current, target] };
                }
            }
        });
    };

    const isStepSelected = (stepId) => (formData.step_ids || []).map(id => String(id)).includes(String(stepId));

    const hasReviewStep = () => {
        const reviewStep = steps.find(s => s.step_name === 'For Review');
        if (!reviewStep) return false;
        return (formData.step_ids || []).some(id => String(id) === String(reviewStep.id));
    };



    const handleSenderChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, sender: val });
        setActiveField('sender');

        const parts = val.split(';');
        const lastPart = parts[parts.length - 1].trim();
        const query = lastPart.includes(',') ? lastPart.split(',').pop().trim() : lastPart.trim();
        fetchSuggestions(query);
    };

    const selectSuggestion = (name) => {
        if (activeField === 'sender') {
            const cleanName = name.replace(/,+$/, '').trim();
            const parts = formData.sender.split(';').map(p => p.trim());
            parts[parts.length - 1] = cleanName;
            const newValue = parts.filter(p => p !== "").join('; ');
            // We append a semicolon to allow easy addition of multiple names if needed
            setFormData({ ...formData, sender: newValue + '; ' });
        }
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

        const senderParts = formData.sender.split(';').map(s => s.trim()).filter(s => s !== "");
        const invalidSender = senderParts.find(s => !validateFormat(s));
        if (invalidSender) {
            alert("Each sender/recipient name must follow the format: LASTNAME, FIRSTNAME");
            return;
        }

        setLoading(true);
        setError("");

        // 1. Validate Group Selection (Mandatory Signature or Review)
        const primarySteps = steps.filter(s => ['For Signature', 'For Review'].includes(s.step_name)).map(s => String(s.id));
        const hasPrimarySelection = formData.step_ids.some(id => primarySteps.includes(String(id)));

        if (!hasPrimarySelection) {
            setError("Submission Failed: Either 'For Signature' or 'For Review' must be selected in the Group section.");
            setLoading(false);
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        // 2. Validate VEM/AEVM numbers if corresponding steps are selected
        const vemStep = steps.find(s => s.step_name === 'VEM Letter');
        const aevmStep = steps.find(s => s.step_name === 'AEVM Letter');
        
        const isVemSelected = formData.step_ids.some(id => String(id) === String(vemStep?.id));
        const isAevmSelected = formData.step_ids.some(id => String(id) === String(aevmStep?.id));

        if (isVemSelected && !formData.vemcode.trim()) {
            setError("Submission Failed: VEM Number is required when 'VEM Letter' is selected.");
            setLoading(false);
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }
        if (isAevmSelected && !formData.aevm_number.trim()) {
            setError("Submission Failed: AEVM Number is required when 'AEVM Letter' is selected.");
            setLoading(false);
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        try {
            let scannedCopyPath = null;

            // If there's a scanned file, upload it - store path only (no DB record)
            if (scannedFiles.length > 0) {
                const fileToUpload = scannedFiles[0];
                const formDataUpload = new FormData();
                formDataUpload.append('file', fileToUpload);
                formDataUpload.append('no_record', 'true');
                formDataUpload.append('purpose', 'scanned_copy');
                formDataUpload.append('description', `Scanned copy for ${formData.sender}`);

                const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/upload`, formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                scannedCopyPath = response.data.file_path;
            }

            if (formData.selectedRefIds.length > 1) {
                setError("Please select only one physical attachment for now.");
                setLoading(false);
                return;
            }

            const attachmentId = formData.selectedRefIds.length > 0
                ? parseInt(formData.selectedRefIds[0])
                : null;

            const submissionData = {
                ...formData,
                attachment_id: Number.isNaN(attachmentId) ? null : attachmentId,
                lms_id: predictedLmsId,
                scanned_copy: scannedCopyPath,
                encoder_id: user.id,
                dept_id: user.dept_id?.id || user.dept_id
            };

            let created;
            if (refCode) {
                // If we have a refCode, we find the letter by LMS ID and update it
                const existing = await letterService.getByLmsId(refCode);
                if (existing) {
                    created = await letterService.update(existing.id, submissionData);
                } else {
                    created = await letterService.create(submissionData);
                }
            } else {
                created = await letterService.create(submissionData);
            }

            if (created?.lms_id) {
                setPredictedLmsId(created.lms_id);
            }

            setIsSuccessModalOpen(true);
        } catch (err) {
            console.error("Creation failed:", err);
            const backendError = err.response?.data?.error;
            const backendDetails = err.response?.data?.details;
            const backendStack = err.response?.data?.stack;

            let fullMsg = backendError || "Failed to create letter.";
            if (backendDetails) {
                const detailsStr = Array.isArray(backendDetails) ? backendDetails.join(", ") : backendDetails;
                fullMsg += ` (${detailsStr})`;
            }
            if (backendStack) {
                fullMsg += `\n\n[DEBUG STACK]: ${backendStack}`;
            }

            setError(fullMsg);
        } finally {
            setLoading(false);
        }
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    return (
        <div className={`h-screen ${pageBg} flex overflow-hidden transition-colors duration-300`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <FilePlus className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2 rounded-lg transition-colors ${'hover:bg-slate-50 text-slate-500'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <FilePlus className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-orange-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Workspace</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>New Letter</h2>
                            </div>
                        </div>
                    </div>
                </header>

                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar"
                >
                    <form onSubmit={handleSubmit} className="w-full space-y-8">
                        <div className="mb-8">
                            <h2 className={`text-3xl font-bold ${textColor}`}>New Letter</h2>

                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-400 text-sm whitespace-pre-wrap overflow-hidden">
                                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <div className="break-all">
                                    {error}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                            {/* Core Details */}
                            <section className={`${cardBg} rounded-3xl border p-4 sm:p-6 md:p-8 shadow-sm space-y-6`}>
                                <div className={`flex items-center gap-2 mb-2 ${textColor}`}>
                                    <Clipboard className="w-5 h-5 text-orange-400" />
                                    <h3 className="font-bold">Info</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                            <Building2 className="w-3 h-3 text-blue-400" />
                                            Departments
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                            <select
                                                value={selectedDept}
                                                onChange={(e) => setSelectedDept(e.target.value)}
                                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-orange-500 transition-all ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300 uppercase'}`}
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.dept_name}>{d.dept_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reference Code</label>
                                        <div className="p-2.5 bg-orange-50/50 dark:bg-orange-950/20 border border-dashed border-orange-200 dark:border-orange-800/40 rounded-xl text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center justify-between h-[42px]">
                                            <span>Reference Code: {predictedLmsId}</span>
                                            <span className="text-[8px] bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">(ID)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dashed border-gray-100 dark:border-[#222]">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-orange-400" />
                                            Group
                                        </div>
                                        <span className="text-[9px] text-red-500 font-black tracking-widest uppercase">Required</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {steps.filter(s => ['For Signature', 'For Review'].includes(s.step_name)).map(step => (
                                            <label
                                                key={step.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group ${isStepSelected(step.id) ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' : 'bg-gray-50 border-transparent dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    checked={isStepSelected(step.id)}
                                                    onChange={() => toggleStep(step.id)}
                                                    onClick={(e) => {
                                                        // This allows unselecting the radio by clicking it again
                                                        if (isStepSelected(step.id)) {
                                                            toggleStep(step.id);
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300 dark:bg-black/40"
                                                />
                                                <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${isStepSelected(step.id) ? 'text-orange-600' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                                                    {step.step_name}
                                                </span>
                                            </label>
                                        ))}

                                        {hasReviewStep() && steps.filter(s => ['VEM Letter', 'AEVM Letter'].includes(s.step_name)).map(step => (
                                            <label
                                                key={step.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group ${isStepSelected(step.id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-transparent dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isStepSelected(step.id)}
                                                    onChange={() => toggleStep(step.id)}
                                                    className="w-4 h-4 text-blue-500 focus:ring-blue-500 border-gray-300 dark:bg-black/40 rounded shadow-sm"
                                                />
                                                <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${isStepSelected(step.id) ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                                                    {step.step_name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dashed border-gray-100 dark:border-[#222]">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <User className="w-3 h-3 text-blue-400" />
                                        Encoded By
                                    </label>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-3 shadow-sm">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                                            <User className="w-3 h-3" />
                                        </div>
                                        <span>{user?.first_name} {user?.last_name}</span>
                                        <span className="ml-auto text-[8px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 px-2 py-0.5 rounded-full">Active User</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Date
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.date_received}
                                            onChange={e => setFormData({ ...formData, date_received: e.target.value })}
                                            className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>

                                    {canKindDropdown && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                                <Tag className="w-3 h-3 text-blue-400" />
                                                Kind
                                            </label>
                                            <select
                                                value={formData.kind}
                                                onChange={e => setFormData({ ...formData, kind: e.target.value })}
                                                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <option value="">None</option>
                                                {kinds.map(k => <option key={k.id} value={k.id}>{k.kind_name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {canSenderField && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                            <span>Sender</span>
                                            <span className="text-[10px] text-red-500 font-black">REQUIRED</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Name"
                                                value={formData.sender}
                                                onChange={handleSenderChange}
                                                onFocus={() => {
                                                    setActiveField('sender');
                                                    if (suggestions.length > 0) setShowSuggestions(true);
                                                }}
                                                autoComplete="off"
                                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all ${!validateFormat(formData.sender) && formData.sender ? 'border-red-500/50' : ''} ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                            />

                                            {showSuggestions && activeField === 'sender' && (
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
                                        </div>
                                    </div>
                                )}

                                {/* Summary / Regarding - Grouped under Sender */}
                                {canSummaryField && (
                                    <div className="space-y-2 pt-4 border-t border-dashed border-gray-100 dark:border-[#222]">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${'text-gray-500 dark:text-gray-400'}`}>
                                                <MessageSquare className="w-3 h-3 text-orange-400" />
                                                Re
                                            </label>
                                            <span className="text-[9px] text-red-500 font-black tracking-widest uppercase">Required</span>
                                        </div>
                                        <textarea
                                            rows="3"
                                            required
                                            value={formData.summary}
                                            onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                            placeholder="Subject"
                                            className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-all ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>
                                )}


                            </section>

                            {/* Classification */}
                            <section className={`${cardBg} rounded-3xl border p-4 sm:p-6 md:p-8 shadow-sm space-y-6`}>
                                <div className={`flex items-center gap-2 mb-2 ${textColor}`}>
                                    <Tag className="w-5 h-5 text-blue-400" />
                                    <h3 className="font-bold">Classification</h3>
                                </div>


                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                        <AlertCircle className="w-3 h-3 text-red-400" />
                                        Letter Type
                                    </label>
                                    <select
                                        value={formData.letter_type}
                                        onChange={e => setFormData({ ...formData, letter_type: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <option value="Non-Confidential">Non-Confidential</option>
                                        <option value="Confidential">Confidential</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">VEM Number</label>
                                    <input
                                        type="text"
                                        placeholder="VEM Number"
                                        value={formData.vemcode}
                                        onChange={e => setFormData({ ...formData, vemcode: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">AEVM Number</label>
                                    <input
                                        type="text"
                                        placeholder="AEVM Number"
                                        value={formData.aevm_number}
                                        onChange={e => setFormData({ ...formData, aevm_number: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                    />
                                </div>

                                {/* Moved Authority Notes here */}
                                <div className="space-y-4 pt-4 border-t border-dashed border-gray-100 dark:border-[#222]">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">EVM Note</label>
                                        <textarea
                                            rows="2"
                                            value={formData.evemnote}
                                            onChange={e => setFormData({ ...formData, evemnote: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">AEVM Note</label>
                                        <textarea
                                            rows="2"
                                            value={formData.aevmnote}
                                            onChange={e => setFormData({ ...formData, aevmnote: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ATG Note</label>
                                        <textarea
                                            rows="2"
                                            value={formData.atgnote}
                                            onChange={e => setFormData({ ...formData, atgnote: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none ${'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300'}`}
                                        />
                                    </div>
                                </div>
                            </section>


                            {/* Physical Attachment Selection */}
                            {canAttachmentSelector && (
                                <section className={`md:col-span-2 ${cardBg} rounded-3xl border p-4 sm:p-6 md:p-8 shadow-sm`}>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                                            <FilePlus className="w-3 h-3" />
                                            Attachments
                                        </label>
                                        <div className="space-y-3" ref={attachmentSearchRef}>
                                            <div className="relative">
                                                {/* Custom Searchable Dropdown Toggle */}
                                                <div
                                                    onClick={() => setIsAttachmentDropdownOpen(!isAttachmentDropdownOpen)}
                                                    className={`w-full px-4 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border outline-none ${'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-gray-700 dark:text-gray-300 hover:border-blue-400/50'}`}
                                                >
                                                    <span className="truncate max-w-[85%] font-bold">
                                                        {formData.selectedRefIds.length > 0
                                                            ? attachments.find(a => a.id === formData.selectedRefIds[0])?.attachment_name || "Attachment Selected"
                                                            : "None"}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isAttachmentDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>

                                                {/* Dropdown Menu */}
                                                {isAttachmentDropdownOpen && (
                                                    <div className="absolute z-[120] left-0 right-0 top-full mt-1 bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#333] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                        {/* Internal Search Input */}
                                                        <div className="p-2 border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search attachments..."
                                                                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-black/20 border border-gray-100 dark:border-[#333] rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                    value={attachmentSearch}
                                                                    onChange={(e) => setAttachmentSearch(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Options List */}
                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                            {attachments
                                                                .filter(att => att.attachment_name.toLowerCase().includes(attachmentSearch.toLowerCase()))
                                                                .map(att => (
                                                                    <button
                                                                        key={att.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (!formData.selectedRefIds.includes(att.id)) {
                                                                                setFormData(prev => ({ ...prev, selectedRefIds: [att.id] })); // User requested one for now based on prev sessions
                                                                            }
                                                                            setIsAttachmentDropdownOpen(false);
                                                                            setAttachmentSearch("");
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-between ${formData.selectedRefIds.includes(att.id) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                                    >
                                                                        <span className="truncate">{att.attachment_name}</span>
                                                                        {formData.selectedRefIds.includes(att.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                                                                    </button>
                                                                ))}
                                                            {attachments.filter(att => att.attachment_name.toLowerCase().includes(attachmentSearch.toLowerCase())).length === 0 && (
                                                                <div className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                    No matches found
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selected Pills */}
                                            <div className="flex flex-wrap gap-2">
                                                {formData.selectedRefIds.map(id => {
                                                    const att = attachments.find(a => a.id === id);
                                                    return (
                                                        <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase border border-blue-100 dark:border-blue-900/30">
                                                            <span className="truncate max-w-[150px]">{att?.attachment_name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, selectedRefIds: prev.selectedRefIds.filter(i => i !== id) }))}
                                                                className="hover:text-blue-800"
                                                            >
                                                                <XIcon className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Digital Attachment (Scanned Copy) */}
                            {canAttachmentUpload && (
                                <section className={`md:col-span-2 ${cardBg} rounded-3xl border p-4 sm:p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden transition-all duration-300`}>
                                    <div className={`flex items-center justify-between border-b pb-6 mb-2 ${'border-slate-50 dark:border-[#222]'}`}>
                                        <div className="flex items-center gap-3">
                                            <Upload className={`w-5 h-5 text-indigo-400`} />
                                            <h3 className={`font-bold ${textColor}`}>Upload</h3>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e)}
                                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-8 md:p-12 transition-all group cursor-pointer border-slate-100 dark:border-[#333] bg-slate-50/50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-900/5`}
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
                                        <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${textColor}`}>
                                            Upload
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium">
                                            Select PDF or scanned copies of the letter
                                        </p>
                                    </div>

                                    {scannedFiles.length > 0 && (
                                        <div className="mt-8 space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Files ({scannedFiles.length})</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {scannedFiles.map((file, index) => (
                                                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl border group animate-in fade-in slide-in-from-bottom-2 duration-300 ${'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-[#333]'}`}>
                                                        <div className="flex items-center gap-3 truncate">
                                                            <div className={`w-8 h-8 bg-white dark:bg-white/10 border rounded-lg flex items-center justify-center text-orange-400 ${'border-slate-100'}`}>
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
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-6 pb-12">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className={`px-8 py-3 text-sm font-bold transition-colors ${'text-gray-500 hover:text-gray-900'}`}
                            >
                                Cancel
                            </button>
                            {canSave && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-10 py-3 text-white text-sm font-bold rounded-2xl transition-all shadow-xl disabled:opacity-50 ${'bg-[#F6A17B] hover:bg-[#e8946e] shadow-orange-100 dark:shadow-none'}`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </main>

            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => {
                    setIsSuccessModalOpen(false);
                    navigate("/master-table");
                }}
                referenceNo={predictedLmsId}
            />
        </div>
    );
}
