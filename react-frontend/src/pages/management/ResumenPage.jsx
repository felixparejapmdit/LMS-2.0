import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
import letterService from "../../services/letterService";
import statusService from "../../services/statusService";
import axios from "axios";
import API_BASE from "../../config/apiConfig";
import {
    FileText,
    Inbox,
    Trash2,
    X,
    Loader2,
    Plus,
    Printer,
    ArrowLeft,
    ArrowRight,
    QrCode,
    Camera,
    RefreshCw,
    Paperclip,
    ExternalLink,
    User as UserIcon,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Menu,
    CheckSquare,
    Square
} from "lucide-react";
import jsQR from "jsqr";

export default function ResumenPage({ embedded = false, onClose = null } = {}) {
    const { user } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isFromInbox = searchParams.get('source') === 'inbox';
    const category = searchParams.get('category');

    const [lmsIdInput, setLmsIdInput] = useState("");
    const [modalLetters, setModalLetters] = useState(() => {
        const saved = localStorage.getItem('resumen_letters');
        return saved ? JSON.parse(saved) : [];
    });
    const [isAddingLetter, setIsAddingLetter] = useState(false);
    const [modalError, setModalError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pdfPanel, setPdfPanel] = useState({ isOpen: false, url: null, name: null });
    const [steps, setSteps] = useState([]);
    const [selectedStepId, setSelectedStepId] = useState("");
    const [preparedBy, setPreparedBy] = useState(() => {
        const saved = localStorage.getItem('resumen_prepared_by');
        if (saved) return saved;
        return `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [sentBy, setSentBy] = useState("");
    const [timeframe, setTimeframe] = useState("all");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [isFetching, setIsFetching] = useState(false);
    const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification(n => ({ ...n, show: false }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    // QR Scanner States
    const [showScanner, setShowScanner] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [showAddLetterModal, setShowAddLetterModal] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const lastAutoSubmitRef = useRef(null);

    // Global Esc listener for closing modals
    useEffect(() => {
        const handleClose = () => {
            if (typeof onClose === 'function') onClose();
            setPdfPanel({ isOpen: false, url: null, name: null });
            setShowAddLetterModal(false);
            setShowScanner(false);
        };
        window.addEventListener('close_modals', handleClose);
        return () => window.removeEventListener('close_modals', handleClose);
    }, [onClose]);

    // Fetch "Incoming" letters based on timeframe and filters
    const fetchIncomingLetters = async () => {
        setIsFetching(true);
        try {
            const statuses = await statusService.getAll();
            const incomingStatus = statuses.find(s => s.status_name.toLowerCase().trim() === 'incoming');
            const targetStatusId = incomingStatus ? incomingStatus.id : 1;

            const params = {
                user_id: user?.id,
                role: user?.roleData?.name || user?.role || '',
                department_id: user?.dept_id?.id ?? user?.dept_id,
                full_name: `${user?.first_name} ${user?.last_name}`.trim(),
                global_status: targetStatusId,
                limit: 500
            };

            const now = new Date();
            let start = null;

            if (timeframe === 'today') {
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                start = todayStart.toISOString();

                const todayEnd = new Date(now);
                todayEnd.setHours(23, 59, 59, 999);
                params.end_date = todayEnd.toISOString();
            } else if (timeframe === 'weekly') {
                const weeklyStart = new Date(now);
                weeklyStart.setDate(weeklyStart.getDate() - 7);
                weeklyStart.setHours(0, 0, 0, 0);
                start = weeklyStart.toISOString();
            } else if (timeframe === 'monthly') {
                const monthlyStart = new Date(now);
                monthlyStart.setMonth(monthlyStart.getMonth() - 1);
                monthlyStart.setHours(0, 0, 0, 0);
                start = monthlyStart.toISOString();
            } else if (timeframe === 'yearly') {
                const yearlyStart = new Date(now);
                yearlyStart.setFullYear(yearlyStart.getFullYear() - 1);
                yearlyStart.setHours(0, 0, 0, 0);
                start = yearlyStart.toISOString();
            } else if (timeframe === 'range' && dateRange.start) {
                const rangeStart = new Date(dateRange.start);
                rangeStart.setHours(0, 0, 0, 0);
                start = rangeStart.toISOString();
                if (dateRange.end) {
                    const rangeEnd = new Date(dateRange.end);
                    rangeEnd.setHours(23, 59, 59, 999);
                    params.end_date = rangeEnd.toISOString();
                }
            }

            if (start && timeframe !== 'all') {
                params.start_date = start;
            }

            console.log("[RESUMEN] Fetching with params:", params);
            const response = await letterService.getAll(params);
            console.log("[RESUMEN] API Response:", response);

            // Handle both { data: [...] } and [...] response formats
            let letterArray = [];
            if (response && Array.isArray(response.data)) {
                letterArray = response.data;
            } else if (Array.isArray(response)) {
                letterArray = response;
            } else if (response && typeof response === 'object' && response.data && Array.isArray(response.data)) {
                letterArray = response.data;
            }

            console.log("[RESUMEN] Setting letters count:", letterArray.length);
            setModalLetters(letterArray);
        } catch (err) {
            console.error("Failed to fetch incoming letters:", err);
            setModalLetters([]);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        if (!embedded && !isFromInbox) {
            fetchIncomingLetters();
        }
    }, [timeframe, dateRange.start, dateRange.end, embedded, isFromInbox]);

    // Initial sync removed in favor of timeframe-based fetch
    useEffect(() => {
        const fetchSteps = async () => {
            try {
                const res = await axios.get(`${API_BASE}/process-steps`);
                setSteps(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error("Failed to fetch process steps:", err);
                setSteps([]);
            }
        };
        fetchSteps();
    }, []);

    useEffect(() => {
        localStorage.setItem('resumen_letters', JSON.stringify(modalLetters));
    }, [modalLetters]);

    useEffect(() => {
        localStorage.setItem('resumen_prepared_by', preparedBy);
    }, [preparedBy]);

    // Appearance Tokens
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = 'text-slate-900 dark:text-white';
    const rootLayoutClass = embedded ? `min-h-0 h-full ${pageBg} flex font-sans` : `min-h-screen ${pageBg} flex font-sans`;

    const normalizeAtgId = (value) => {
        return (value || "").toString().trim().toUpperCase().replace(/\s+/g, "");
    };

    const extractAtgId = (value) => {
        const normalized = normalizeAtgId(value);
        const match = normalized.match(/[A-Z]+\d{2}-\d{5}/);
        return match ? match[0] : normalized;
    };

    const isCompleteAtgId = (value) => {
        const extracted = extractAtgId(value);
        return /^[A-Z]+\d{2}-\d{5}$/.test(extracted);
    };

    const handleAddLetter = async (id) => {
        const targetId = extractAtgId(id || lmsIdInput);
        if (!targetId) return false;

        setIsAddingLetter(true);
        setModalError("");
        try {
            const letter = await letterService.getByLmsId(targetId, {
                user_id: user?.id,
                role: user?.roleData?.name || user?.role || "",
                full_name: `${user?.first_name} ${user?.last_name}`.trim(),
            });

            if (modalLetters.find(l => l.id === letter.id)) {
                setModalError("Letter already in the list.");
                return false;
            } else {
                setModalLetters(prev => [letter, ...prev]);
                setLmsIdInput("");
                if (showScanner) stopScanner();
                return true;
            }
        } catch (err) {
            setModalError("Letter not found.");
            return false;
        } finally {
            setIsAddingLetter(false);
        }
    };

    const maybeAutoSubmitAtg = async (rawValue) => {
        const extracted = extractAtgId(rawValue);
        if (!isCompleteAtgId(extracted)) return;
        if (lastAutoSubmitRef.current === extracted) return;
        if (isAddingLetter) return;

        lastAutoSubmitRef.current = extracted;
        setLmsIdInput(extracted);

        const added = await handleAddLetter(extracted);
    };

    const handleAtgInputChange = (e) => {
        const val = e.target.value;
        setLmsIdInput(val);
        setModalError("");
        void maybeAutoSubmitAtg(val);
    };

    const handleDeleteLetter = (id) => {
        setModalLetters(prev => prev.filter(l => l.id !== id));
        setSelectedIds(prev => prev.filter(i => i !== id));
    };

    const handleSummaryEdit = (id, newSummary) => {
        setModalLetters(prev => prev.map(l => l.id === id ? { ...l, summary: newSummary } : l));
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredLetters.length && filteredLetters.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredLetters.map((l) => l.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.setData("index", index);
        e.target.style.opacity = "0.4";
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = "1";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("index"));
        if (sourceIndex === targetIndex) return;

        setModalLetters(prev => {
            const next = [...prev];
            const [movedItem] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, movedItem);
            return next;
        });
    };

    const handleAtgNoteBulk = async () => {
        if (selectedIds.length === 0) return;
        setLoading(true);
        try {
            const statuses = await statusService.getAll();
            const noteStatus = statuses.find(s => s.status_name.toLowerCase().trim() === 'atg note');
            const targetStatusId = noteStatus ? noteStatus.id : 2;

            let succeeded = 0;
            let failed = [];

            for (const id of selectedIds) {
                try {
                    await letterService.update(id, {
                        global_status: targetStatusId,
                        tray_id: null,
                        user_id: user?.id,
                        full_name: `${user?.first_name} ${user?.last_name}`.trim(),
                        role: user?.roleData?.name || user?.role || ""
                    });
                    succeeded++;
                } catch (err) {
                    console.error(`Failed to update letter ${id}:`, err);
                    failed.push(id);
                }
            }

            setModalLetters(prev => prev.filter(l => !selectedIds.includes(l.id) || failed.includes(l.id)));
            setSelectedIds(failed); // Keep failed ones selected

            if (failed.length === 0) {
                setNotification({
                    show: true,
                    type: 'success',
                    message: `Successfully transitioned ${succeeded} letters to ATG Note.`
                });
            } else {
                setNotification({
                    show: true,
                    type: 'warning',
                    message: `${succeeded} succeeded, ${failed.length} failed. See console for details.`
                });
            }
        } catch (err) {
            console.error("ATG Note bulk process failed:", err);
            setNotification({
                show: true,
                type: 'error',
                message: "Bulk process failed. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBeingReviewedBulk = async () => {
        if (selectedIds.length === 0) return;
        setLoading(true);
        try {
            const statuses = await statusService.getAll();
            const reviewStatus = statuses.find(s => s.status_name.toLowerCase().trim() === 'being reviewed');
            if (!reviewStatus) {
                alert("'Being Reviewed' status not found in system. Please create it first.");
                return;
            }

            let succeeded = 0;
            let failed = [];

            for (const id of selectedIds) {
                try {
                    await letterService.update(id, {
                        global_status: reviewStatus.id,
                        tray_id: null,
                        user_id: user?.id,
                        full_name: `${user?.first_name} ${user?.last_name}`.trim(),
                        role: user?.roleData?.name || user?.role || ""
                    });
                    succeeded++;
                } catch (err) {
                    console.error(`Failed to update letter ${id}:`, err);
                    failed.push(id);
                }
            }

            setModalLetters(prev => prev.filter(l => !selectedIds.includes(l.id) || failed.includes(l.id)));
            setSelectedIds(failed); // Keep failed ones selected

            if (failed.length === 0) {
                setNotification({
                    show: true,
                    type: 'success',
                    message: `Successfully transitioned ${succeeded} letters to Being Reviewed.`
                });
            } else {
                setNotification({
                    show: true,
                    type: 'warning',
                    message: `${succeeded} succeeded, ${failed.length} failed. See console for details.`
                });
            }
        } catch (err) {
            console.error("Being Reviewed bulk process failed:", err);
            setNotification({
                show: true,
                type: 'error',
                message: "Bulk process failed. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    // QR SCANNER LOGIC
    const startScanner = async () => {
        setCameraError("");
        setShowScanner(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(tick);
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("Unable to access camera. Please check permissions.");
            setShowScanner(false);
        }
    };

    const stopScanner = () => {
        setShowScanner(false);
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                });
                if (code) {
                    console.log("Found QR code", code.data);
                    const scanned = extractAtgId(code.data);
                    setShowAddLetterModal(true);
                    setLmsIdInput(scanned);
                    void maybeAutoSubmitAtg(scanned);
                    return; // Stop scanning once found
                }
            }
        }
        requestRef.current = requestAnimationFrame(tick);
    };

    // Local component for the PDF Preview Panel
    const PdfPanel = ({ pdfPanel, setPdfPanel }) => {
        if (!pdfPanel.isOpen) return null;
        return (
            <>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]" onClick={() => setPdfPanel({ isOpen: false, url: null, name: null })} />
                <div className="fixed right-0 top-0 h-full w-full max-w-3xl z-[110] flex flex-col bg-white dark:bg-[#111] shadow-2xl border-l border-gray-100 dark:border-[#222] animate-in slide-in-from-right duration-500">
                    <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-[#222] shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Scanned Copy</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[400px]">{pdfPanel.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href={pdfPanel.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors flex items-center gap-1.5">
                                <ExternalLink className="w-3 h-3" /> Open Tab
                            </a>
                            <button
                                onClick={() => setPdfPanel({ isOpen: false, url: null, name: null })}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-900">
                        <iframe
                            src={`${pdfPanel.url}#toolbar=0`}
                            className="w-full h-full"
                            style={{ border: 'none' }}
                            title="PDF Preview"
                        />
                    </div>
                </div>
            </>
        );
    };

    const handleViewPDF = (letter) => {
        const filePath = letter.scanned_copy ||
            (letter.attachment_id ? letter.attachment_id : null) ||
            letter.attachment?.file_path;

        if (!filePath) {
            alert("No attachment available for this letter.");
            return;
        }

        // Helper: build browser-accessible URL from a stored file path
        const buildFileUrl = (rawPath) => {
            if (!rawPath) return null;
            const normalized = rawPath.replace(/\\/g, '/');
            const filename = normalized.split('/uploads/').pop();
            const baseUrl = (API_BASE).replace('/api', '');
            return `${baseUrl}/uploads/${filename}`;
        };

        const fileUrl = buildFileUrl(filePath);
        const fileName = filePath.split(/[/\\]/).pop() || "Document.pdf";

        if (fileUrl) {
            setPdfPanel({ isOpen: true, url: fileUrl, name: fileName });
        }
    };

    const getLatestStepId = (letter) => {
        const assignments = Array.isArray(letter?.assignments) ? letter.assignments : [];
        if (assignments.length === 0) return null;
        const latest = [...assignments].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        return latest?.step_id ?? latest?.step?.id ?? null;
    };

    const getStepName = (letter) => {
        const stepId = getLatestStepId(letter);
        if (!stepId) return "No Group";
        const step = steps.find(s => String(s.id) === String(stepId));
        return step?.step_name || "Unknown";
    };

    const hasSortedRef = useRef(false);

    useEffect(() => {
        if (isFromInbox && !hasSortedRef.current && steps.length > 0 && modalLetters.length > 0) {
            const getStepPriority = (letter) => {
                const stepId = getLatestStepId(letter);
                if (!stepId) return 99; // No Group

                const step = steps.find(s => String(s.id) === String(stepId));
                const stepName = (step?.step_name || "").toLowerCase();

                if (stepName.includes('signature')) return 1;
                if (stepName.includes('review')) return 2;
                if (stepName.includes('vem')) return 3;
                if (stepName.includes('aevm')) return 4;
                return 5;
            };

            const sorted = [...modalLetters].sort((a, b) => {
                const priorityA = getStepPriority(a);
                const priorityB = getStepPriority(b);
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                const refA = a.lms_id || "";
                const refB = b.lms_id || "";
                return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
            });

            setModalLetters(sorted);
            hasSortedRef.current = true;
        }
    }, [isFromInbox, steps, modalLetters]);

    const selectedStepLabel = (() => {
        if (!selectedStepId) return "All";
        const step = steps.find((s) => String(s.id) === String(selectedStepId));
        return step?.step_name || "Selected";
    })();

    const filteredLetters = selectedStepId
        ? modalLetters.filter((l) => String(getLatestStepId(l) || "") === String(selectedStepId))
        : modalLetters;

    const printHeaderTitle = (() => {
        if (isFromInbox && category) {
            const cat = category.toLowerCase();
            if (cat.includes('signature')) return "Incoming Letters - For Signature";
            if (cat.includes('review')) return "Incoming Letters - For Review";
        }
        return `INCOMING LETTERS - ${selectedStepLabel}`;
    })();

    const printHeaderStyle = (() => {
        if (isFromInbox && category) {
            const cat = category.toLowerCase();
            if (cat.includes('signature')) return { bg: '#e2efda', text: 'text-slate-900' };
            if (cat.includes('review')) return { bg: '#b7b7b7', text: 'text-slate-900' };
        }

        if (!selectedStepId) return { bg: 'transparent', text: 'text-slate-900' };
        const label = selectedStepLabel.toLowerCase();
        if (label.includes('signature')) return { bg: '#e2efda', text: 'text-slate-900' };
        if (label.includes('review')) return { bg: '#b7b7b7', text: 'text-slate-900' };
        return { bg: 'transparent', text: 'text-slate-900' };
    })();

    return (
        <>
            {/* Notification Toast */}
            {notification.show && (
                <div className="fixed top-8 right-8 z-[200] animate-in slide-in-from-right duration-500">
                    <div className={`flex items-center gap-4 p-4 rounded-2xl shadow-2xl border ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                        notification.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                            'bg-amber-50 border-amber-100 text-amber-800'
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notification.type === 'success' ? 'bg-emerald-500 text-white' :
                            notification.type === 'error' ? 'bg-red-500 text-white' :
                                'bg-amber-500 text-white'
                            }`}>
                            {notification.type === 'success' ? <CheckSquare className="w-5 h-5" /> :
                                notification.type === 'error' ? <X className="w-5 h-5" /> :
                                    <RefreshCw className="w-5 h-5" />}
                        </div>
                        <div className="pr-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">System Notification</h4>
                            <p className="text-xs font-bold leading-relaxed">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification(n => ({ ...n, show: false }))}
                            className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            <PdfPanel pdfPanel={pdfPanel} setPdfPanel={setPdfPanel} />

            {/* Add Letter Modal */}
            {showAddLetterModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/10"
                        onClick={() => { setShowAddLetterModal(false); setLmsIdInput(""); setModalError(""); lastAutoSubmitRef.current = null; if (showScanner) stopScanner(); }}
                    />
                    <div className={`${cardBg} w-full max-w-xs rounded-[2rem] border shadow-2xl relative z-10 overflow-hidden`}>
                        <button
                            onClick={() => { setShowAddLetterModal(false); setLmsIdInput(""); setModalError(""); lastAutoSubmitRef.current = null; if (showScanner) stopScanner(); }}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="p-8 pt-14">

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                await handleAddLetter();
                            }} className="space-y-4">
                                <div className="space-y-1.5">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Type ATG No."
                                        value={lmsIdInput}
                                        onChange={handleAtgInputChange}
                                        className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    />
                                    {modalError && <p className="text-[10px] text-red-500 font-black uppercase">{modalError}</p>}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={showScanner ? stopScanner : startScanner}
                                        className={`flex-1 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${showScanner ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-600' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                                    >
                                        {showScanner ? <X className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                                        {showScanner ? 'Cancel' : 'Scan QR'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAddingLetter || !lmsIdInput.trim()}
                                        className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        {isAddingLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Add
                                    </button>
                                </div>

                                {cameraError && <p className="text-[10px] text-red-500 font-black uppercase">{cameraError}</p>}

                                {showScanner && (
                                    <div className="pt-2">
                                        <div className="relative w-full h-44 bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500/30">
                                            <video ref={videoRef} className="w-full h-full object-cover" />
                                            <canvas ref={canvasRef} className="hidden" />
                                            <div className="absolute inset-0 border-2 border-blue-500/50 rounded-xl animate-pulse flex items-center justify-center">
                                                <div className="w-48 h-0.5 bg-blue-500 opacity-50 relative top-0 animate-bounce" />
                                            </div>
                                        </div>
                                        <div className="mt-3 px-4 py-2 bg-white dark:bg-[#141414] rounded-full shadow-sm border border-slate-100 dark:border-white/10 flex items-center justify-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Scanning…</span>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className={rootLayoutClass}>
                {!embedded && <Sidebar />}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                    {/* Fixed Header */}
                    <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0 print:hidden`}>
                        <div className="flex items-center gap-4">
                            {!embedded && (
                                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-gray-500">
                                    <FileText className="w-5 h-5" />
                                </button>
                            )}
                            {embedded && typeof onClose === "function" && (
                                <button
                                    onClick={onClose}
                                    className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all text-gray-500 hover:text-red-500 border border-slate-100 dark:border-white/5"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                            {isFromInbox && (
                                <button
                                    onClick={() => navigate('/inbox')}
                                    className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all text-blue-600 border border-blue-100 dark:border-blue-500/20 flex items-center gap-2"
                                    title="Back to Inbox"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Inbox</span>
                                </button>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mailroom Operations</h1>
                                    <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Letter Summary</h2>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-gray-400">
                            <button
                                onClick={() => {
                                    const sync = async () => {
                                        setLoading(true);
                                        const updated = await Promise.all(
                                            modalLetters.map(async (l) => {
                                                try {
                                                    return await letterService.getByLmsId(l.lms_id, {
                                                        user_id: user?.id,
                                                        role: user?.roleData?.name || user?.role || "",
                                                        full_name: `${user?.first_name} ${user?.last_name}`.trim(),
                                                    });
                                                } catch { return l; }

                                            })
                                        );
                                        setModalLetters(updated);
                                        setLoading(false);
                                    };
                                    sync();
                                }}
                                className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-500 border border-slate-100 dark:border-white/5"
                                title="Sync Data"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar print:p-0 print:overflow-visible relative">

                        {/* QR Scanner Display */}
                        {showScanner && !showAddLetterModal && (
                            <div className="fixed inset-x-0 bottom-8 lg:absolute lg:top-8 lg:left-1/2 lg:-translate-x-1/2 lg:bottom-auto z-20 flex flex-col items-center">
                                <div className="relative w-64 h-48 bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-blue-500/30">
                                    <video ref={videoRef} className="w-full h-full object-cover" />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute inset-0 border-2 border-blue-500/50 rounded-2xl animate-pulse flex items-center justify-center">
                                        <div className="w-48 h-0.5 bg-blue-500 opacity-50 relative top-0 animate-bounce" />
                                    </div>
                                </div>
                                <div className="mt-4 px-4 py-2 bg-white dark:bg-[#141414] rounded-full shadow-lg border border-slate-100 dark:border-white/10 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Scanning for QR code...</span>
                                    <button onClick={stopScanner} className="p-1 hover:bg-red-50 text-red-500 rounded-md ml-2"><X className="w-3 h-3" /></button>
                                </div>
                            </div>
                        )}

                        <div className="w-full space-y-8">
                            {/* Summary Content */}
                            <div className={`${cardBg} rounded-[2rem] border shadow-sm flex flex-col overflow-hidden print:overflow-visible min-h-[calc(100vh-12rem)] print:min-h-0 print:shadow-none print:border-none print:rounded-none print:bg-white`}>

                                {/* Print Header */}
                                <div className="hidden print:flex flex-col mb-1 border-b border-slate-900 pb-0.5">
                                    <div className="flex justify-between items-end">
                                        <h2 className={`text-sm font-bold text-slate-900 ${isFromInbox && category && (category.toLowerCase().includes('signature') || category.toLowerCase().includes('review')) ? "" : "uppercase"}`}>
                                            {printHeaderTitle}
                                        </h2>
                                        <span className="text-[11px] font-medium text-slate-900">
                                            Printed:{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </span>
                                    </div>
                                </div>

                                <div id="print-root" className="flex-1 p-8 lg:p-12 flex flex-col print:p-0">
                                    {/* Dashboard Info Section */}
                                    {!isFromInbox && (
                                        <div className="mb-8 print:hidden flex items-end justify-between gap-6 flex-wrap bg-slate-50/50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/10">
                                            <div className="flex flex-col gap-2 min-w-[150px]">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeframe:</label>
                                                <select
                                                    value={timeframe}
                                                    onChange={(e) => setTimeframe(e.target.value)}
                                                    className="px-6 py-2.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[1rem] text-xs font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase text-slate-600 dark:text-slate-300"
                                                >
                                                    <option value="today">Today</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="yearly">Yearly</option>
                                                    <option value="all">All Time</option>
                                                    <option value="range">Date Range</option>
                                                </select>
                                            </div>

                                            {timeframe === 'range' && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date:</label>
                                                        <input
                                                            type="date"
                                                            value={dateRange.start}
                                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                            className="px-4 py-2.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[1rem] text-xs font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-600 dark:text-slate-300"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date:</label>
                                                        <input
                                                            type="date"
                                                            value={dateRange.end}
                                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                            className="px-4 py-2.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[1rem] text-xs font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-600 dark:text-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Letter Type (Step):</label>
                                                <select
                                                    value={selectedStepId}
                                                    onChange={(e) => setSelectedStepId(e.target.value)}
                                                    className="px-6 py-2.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[1rem] text-xs font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase text-slate-600 dark:text-slate-300"
                                                >
                                                    <option value="">All Types</option>
                                                    {steps.map((s) => (
                                                        <option key={s.id} value={s.id}>{s.step_name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-2 min-w-[150px]">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prepared by:</label>
                                                <input
                                                    type="text"
                                                    value={preparedBy}
                                                    onChange={(e) => setPreparedBy(e.target.value)}
                                                    placeholder="Enter name..."
                                                    className="px-6 py-2.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-[1rem] text-xs font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-600 dark:text-slate-300 normal-case"
                                                />
                                            </div>


                                            <div className="text-right flex flex-col items-end gap-1 ml-auto">
                                                <button
                                                    onClick={fetchIncomingLetters}
                                                    disabled={isFetching}
                                                    className="mb-2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                                    title="Refresh Results"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                                                </button>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">Printed:</span>
                                                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <table className="w-full text-left border-collapse print:border print:border-slate-300">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100 dark:border-white/10 print:border-slate-300" style={{ backgroundColor: printHeaderStyle.bg }}>
                                                <th className="py-6 px-4 print:hidden text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-12">
                                                    <button onClick={toggleSelectAll} className="text-slate-300 hover:text-blue-500 transition-colors">
                                                        {selectedIds.length === filteredLetters.length && filteredLetters.length > 0 ? (
                                                            <CheckSquare className="w-5 h-5 text-blue-500" />
                                                        ) : (
                                                            <Square className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 print:border-r print:border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-12 print:text-slate-900 whitespace-nowrap">No.</th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 print:border-r print:border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24 print:text-slate-900">Date/Time</th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 print:border-r print:border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-28 print:text-slate-900">ATG No.</th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 print:border-r print:border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-16 print:text-slate-900">PDF</th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 print:border-r print:border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[30%] print:text-slate-900">Sender/District</th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 print:border-r print:border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[40%] print:text-slate-900">Summary</th>
                                                <th className="py-6 px-4 print:hidden text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Group</th>
                                                <th className="py-6 px-4 print:py-2 print:px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24 print:hidden">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLetters.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="py-32 text-center">
                                                        <div className="flex flex-col items-center gap-4 text-slate-200 dark:text-gray-800">
                                                            <Inbox className="w-20 h-20" />
                                                            <span className="text-base font-black uppercase tracking-widest">No letters listed</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredLetters.map((l, idx) => (
                                                    <tr
                                                        key={l.id}
                                                        className={`border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors print:border-slate-300 cursor-move ${selectedIds.includes(l.id) ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, idx)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, idx)}
                                                    >
                                                        <td className="py-6 px-4 print:hidden text-center">
                                                            <button onClick={() => toggleSelect(l.id)} className="text-slate-300 hover:text-blue-500 transition-colors">
                                                                {selectedIds.includes(l.id) ? (
                                                                    <CheckSquare className="w-5 h-5 text-blue-500" />
                                                                ) : (
                                                                    <Square className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="py-6 px-4 print:py-1.5 print:px-2 print:border-r print:border-slate-300 text-xs font-black text-slate-400 print:text-slate-900">{idx + 1}</td>
                                                        <td className="py-6 px-4 print:py-1.5 print:px-2 print:border-r print:border-slate-300 whitespace-nowrap">
                                                            <div className="flex flex-col text-[10px] font-bold text-slate-500 print:text-slate-900">
                                                                <span>{new Date(l.date_received || l.createdAt).toLocaleDateString()}</span>
                                                                <span className="text-orange-500 font-black">{new Date(l.date_received || l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-4 print:py-1.5 print:px-2 print:border-r print:border-slate-300 text-xs font-black text-blue-600 uppercase print:text-slate-900">{l.lms_id}</td>
                                                        <td className="py-6 px-4 print:py-1.5 print:px-2 print:border-r print:border-slate-300">
                                                            {(() => {
                                                                const hasFile = l.scanned_copy || l.attachment_id || l.attachment?.file_path;
                                                                if (!hasFile) return <span className="text-[10px] font-bold text-slate-300 uppercase">None</span>;

                                                                return (
                                                                    <button
                                                                        onClick={() => handleViewPDF(l)}
                                                                        className="w-10 h-10 bg-red-50 dark:bg-red-600/10 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all print:hidden"
                                                                        title="View PDF Attachment"
                                                                    >
                                                                        <FileText className="w-4 h-4" />
                                                                    </button>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-6 px-4 print:py-1.5 print:px-2 print:border-r print:border-slate-300">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase print:text-slate-900">{l.sender}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold print:hidden">{l.locale || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-4 print:py-1.5 print:px-2">
                                                            <div
                                                                className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg print:text-slate-900 italic focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] hover:bg-slate-100 dark:hover:bg-white/5 p-1 -m-1 rounded transition-colors"
                                                                contentEditable
                                                                suppressContentEditableWarning
                                                                onBlur={(e) => handleSummaryEdit(l.id, e.target.innerHTML)}
                                                                dangerouslySetInnerHTML={{ __html: l.summary || 'No summary available' }}
                                                            />
                                                        </td>
                                                        <td className="py-6 px-4 print:hidden text-[10px] font-black uppercase text-indigo-500 whitespace-nowrap">
                                                            {getStepName(l)}
                                                        </td>
                                                        <td className="py-6 px-4 print:hidden text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <div className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors" title="Drag to reorder">
                                                                    <Menu className="w-4 h-4" />
                                                                </div>
                                                                <button onClick={() => handleDeleteLetter(l.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Action Buttons Below Table */}
                                    <div className="mt-12 flex items-center gap-4 print:hidden">
                                        {/* 1. Print */}
                                        <button
                                            onClick={() => window.print()}
                                            className="px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 group"
                                        >
                                            <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Print</span>
                                        </button>

                                        {/* 2. Add Letter Button → opens modal */}
                                        <button
                                            onClick={() => { setShowAddLetterModal(true); setModalError(""); setLmsIdInput(""); lastAutoSubmitRef.current = null; if (showScanner) stopScanner(); }}
                                            className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-2 group"
                                        >
                                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Add Letter</span>
                                        </button>

                                        {/* 3. Scan QR - Hidden */}
                                        <button
                                            onClick={showScanner ? stopScanner : startScanner}
                                            className={`hidden px-6 py-3 rounded-2xl border transition-all flex items-center gap-2 ${showScanner ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 group'}`}
                                        >
                                            {showScanner ? <X className="w-4 h-4" /> : <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{showScanner ? 'Cancel' : 'Scan QR'}</span>
                                        </button>

                                        {/* 4. ATG Note */}
                                        <button
                                            onClick={handleAtgNoteBulk}
                                            disabled={selectedIds.length === 0 || loading}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-3 group"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                            ATG NOTE
                                        </button>

                                        {/* 5. Being Reviewed */}
                                        <button
                                            onClick={handleBeingReviewedBulk}
                                            disabled={selectedIds.length === 0 || loading}
                                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3 group"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />}
                                            BEING REVIEWED
                                        </button>
                                    </div>

                                    {/* Spacer — pushes footer to very bottom of last page */}
                                    <div id="print-spacer" className="hidden print:block" style={{flexGrow: 1}} />

                                    {/* Print Footer */}
                                    <div id="print-footer" className="hidden print:flex items-center justify-between w-full">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-slate-900 normal-case">Prepared by: {preparedBy}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900">Page 1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @media print {
                        /* ── Reset ── */
                        html, body, #root {
                            height: auto !important;
                            overflow: visible !important;
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        /* ── Hide chrome ── */
                        aside, header, nav, .print-hidden, [role="navigation"] {
                            display: none !important;
                            width: 0 !important;
                            height: 0 !important;
                            position: absolute !important;
                            left: -9999px !important;
                        }

                        main {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            min-height: 0 !important;
                            overflow: visible !important;
                            display: block !important;
                            position: static !important;
                        }

                        /* ── Page settings ── */
                        @page {
                            margin: 0.8cm;
                            size: letter portrait;
                        }

                        /* ── Color accuracy ── */
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        #print-footer, #print-footer *, table, th, td, span, div, h2, h1 { color: black !important; }
                        .text-blue-600, .text-orange-500 { color: black !important; }

                        /* ── Card container: be a full-page-tall flex column ── */
                        /* The inner flex-col + print:p-0 wrapper must stretch to fill */
                        .overflow-hidden {
                            min-height: 0 !important;
                            height: auto !important;
                            border: none !important;
                            box-shadow: none !important;
                            background: white !important;
                            overflow: visible !important;
                        }

                        /* The actual card that wraps everything must fill the page */
                        #print-root {
                            display: flex !important;
                            flex-direction: column !important;
                            min-height: calc(100vh - 1.6cm) !important;
                            background: white !important;
                        }

                        /* Spacer grows to push footer to the bottom */
                        #print-spacer {
                            display: block !important;
                            flex: 1 1 auto !important;
                        }

                        /* ── Footer: bottom of last page, no background, no extra space ── */
                        #print-footer {
                            display: flex !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                            background: transparent !important;
                            border-top: 1px solid #000000 !important;
                            padding-top: 0.2cm !important;
                            width: 100% !important;
                            page-break-inside: avoid !important;
                            page-break-before: avoid !important;
                            margin-top: 0 !important;
                        }
                    }
                `}</style>
                </main>
            </div>
        </>
    );
}
