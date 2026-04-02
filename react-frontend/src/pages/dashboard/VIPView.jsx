import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
import {
    FileText,
    LogOut,
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    Loader2,
    X,
    Maximize2,
    CheckCircle2,
    RefreshCw,
    LayoutDashboard,
    Edit2,
    Trash2
} from "lucide-react";
import useAccess from "../../hooks/useAccess";

export default function VIPView() {
    const { user, logout } = useSession();
    const { layoutStyle } = useUI();
    const access = useAccess();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Helper: Map Step Name to VIP-Friendly Labels
    const getStepLabel = (name = "") => {
        const up = name.toUpperCase();
        if (up.includes("REVIEW")) return "FOR REVIEW";
        if (up.includes("SIGNATURE")) return "FOR SIGNATURE";
        if (up.includes("VEM") && !up.includes("AVEM") && !up.includes("AEVM")) return "VEM LETTER";
        if (up.includes("AEVM") || up.includes("AVEM")) return "AEVM LETTER";
        return name.toUpperCase();
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    const [steps, setSteps] = useState([]);
    const [selectedStepId, setSelectedStepId] = useState(null);
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [newCommentText, setNewCommentText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [comments, setComments] = useState([]);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentBody, setEditingCommentBody] = useState("");
    const canField = access?.canField || (() => true);
    const canStepSelector = canField("vip-view", "step_selector");
    const canPdfButton = canField("vip-view", "pdf_button");
    const canCommentBox = canField("vip-view", "comment_box");
    const canSubmit = canField("vip-view", "submit_button");
    const canEdit = canField("vip-view", "edit_button");
    const canDelete = canField("vip-view", "delete_button");
    const canLogout = canField("vip-view", "logout_button");

    // PDF States
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState("");

    // Live Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchSteps = async () => {
        try {
            const response = await axios.get(`${API_URL}/process-steps?vip=true`);
            setSteps(response.data);
            if (!selectedStepId && response.data.length > 0) {
                setSelectedStepId(response.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching steps:", error);
        }
    };

    // Check Page-Level Access
    useEffect(() => {
        if (!access.canView("vip-view")) {
            navigate("/");
        }
    }, [access, navigate]);

    // Fetch Steps on mount
    useEffect(() => {
        if (access.canView("vip-view")) {
            fetchSteps();
        }
    }, [access]);

    // Fetch Letters for Selected Step
    useEffect(() => {
        if (!selectedStepId) return;

        const fetchLetters = async () => {
            setLoading(true);
            try {
                // Get assignments for this step to see which letters are here
                // Note: Removed status_id=8 to allow ATG Note (Vips) to show up correctly
                const response = await axios.get(`${API_URL}/letter-assignments?step_id=${selectedStepId}&vip=true`);

                // Support both flat array and paginated object formats
                const assignments = Array.isArray(response.data) ? response.data : (response.data.data || []);

                // Extract letters from assignments with safer mapping
                const letterList = assignments
                    .filter(a => a.letter) // Ensure letter data exists
                    .map(a => ({
                        ...a.letter,
                        assignment_id: a.id,
                        step_id: a.step_id,
                        step_name: a.step?.step_name || 'N/A'
                    }));

                setLetters(letterList);
            } catch (error) {
                console.error("Error fetching letters for step:", selectedStepId, error);
                setLetters([]);
            } finally {
                setLoading(false);
            }
        };
        fetchLetters();
    }, [selectedStepId]);

    const handleLogout = () => {
        setIsLogoutModalOpen(true);
    };

    const confirmLogout = () => {
        logout();
        navigate("/login");
    };

    const fetchComments = async (letterId, options = {}) => {
        const { silent = false } = options;
        if (!silent) setIsCommentsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/comments/letter/${letterId}`);
            setComments(response.data);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            if (!silent) setIsCommentsLoading(false);
        }
    };

    const openLetter = (letter, index) => {
        setSelectedLetter(letter);
        setCurrentIndex(index);
        setNewCommentText("");
        setEditingCommentId(null);
        setEditingCommentBody("");
        setIsModalOpen(true);
        fetchComments(letter.id);
        loadPdfForLetter(letter);
    };

    // Live refresh comments while modal is open (Telegram comments appear without reopen)
    useEffect(() => {
        if (!isModalOpen || !selectedLetter?.id) return;
        const interval = setInterval(() => {
            fetchComments(selectedLetter.id, { silent: true });
        }, 5000);
        return () => clearInterval(interval);
    }, [isModalOpen, selectedLetter?.id]);

    const loadPdfForLetter = async (letter) => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
        setPdfError("");
        if (!letter.scanned_copy && !letter.attachment_id) return;

        setIsPdfLoading(true);
        const url = letter.scanned_copy
            ? `${API_URL}/attachments/view-path?path=${btoa(letter.scanned_copy)}`
            : `${API_URL}/attachments/view/${letter.attachment_id}`;

        try {
            const res = await axios.get(url, { responseType: 'blob' });
            const objectUrl = URL.createObjectURL(res.data);
            setPdfUrl(objectUrl);
        } catch (err) {
            console.error("PDF Load Error:", err);
            setPdfUrl(null);
            setPdfError("This document's physical file is missing or inaccessible.");
        } finally {
            setIsPdfLoading(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            const nextIdx = currentIndex - 1;
            openLetter(letters[nextIdx], nextIdx);
        }
    };

    const handleNext = () => {
        if (currentIndex < letters.length - 1) {
            const nextIdx = currentIndex + 1;
            openLetter(letters[nextIdx], nextIdx);
        }
    };

    const handleAddComment = async () => {
        if (!selectedLetter || !newCommentText.trim()) return;
        setIsSaving(true);
        try {
            await axios.post(`${API_URL}/comments`, {
                letter_id: selectedLetter.id,
                user_id: user.id,
                comment_body: newCommentText
            });
            alert("Comment submitted and recorded in history.");

            await fetchComments(selectedLetter.id);
            setNewCommentText("");
        } catch (error) {
            console.error("Error saving comment:", error);
            alert("Failed to save Comment.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentBody(comment.comment_body || "");
    };

    const handleUpdateComment = async (commentId) => {
        if (!editingCommentBody.trim()) return;
        setIsSaving(true);
        try {
            await axios.put(`${API_URL}/comments/${commentId}`, {
                comment_body: editingCommentBody
            });
            await fetchComments(selectedLetter.id);
            setEditingCommentId(null);
            setEditingCommentBody("");
        } catch (error) {
            console.error("Error updating comment:", error);
            alert("Failed to update Comment.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this Comment?")) return;
        try {
            await axios.delete(`${API_URL}/comments/${commentId}`);
            fetchComments(selectedLetter.id);
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("Failed to delete Comment.");
        }
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditingCommentBody("");
    };

    const textColor = 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'grid' ? 'bg-white dark:bg-[#141414] border-slate-200 dark:border-[#222]' :
        layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-200 dark:border-[#333]' :
            'bg-white dark:bg-[#141414] border-slate-200 dark:border-[#222] shadow-sm';

    const renderVIPContent = () => (
        <div className="space-y-6">
            {/* Header section (Custom for VIP) */}
            <div className={`p-6 md:p-8 rounded-3xl border ${cardBg}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                            <FileText className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className={`text-2xl md:text-3xl font-black tracking-tighter uppercase ${textColor}`}>
                                LMS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">2026</span>
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mt-1">
                                <Clock className="w-3 h-3 text-blue-500" />
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} •
                                {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-left md:text-right">
                            <p className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Hi, {user?.first_name}</p>
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 mt-1 rounded text-blue-600 dark:text-blue-400 border border-blue-500/20 bg-blue-500/5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="text-[9px] font-black uppercase tracking-widest">VIP</span>
                            </div>
                        </div>
                        {canLogout && (
                            <button
                                onClick={handleLogout}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-500/30 transition-all group shrink-0"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Horizontal Steps Selection */}
            {canStepSelector && (
                <div className="overflow-x-auto pb-2 custom-scrollbar -mx-2 px-2">
                    <div className="flex items-center gap-3 min-w-max">
                        {steps.map(step => (
                            <button
                                key={step.id}
                                onClick={() => {
                                    setSelectedStepId(step.id);
                                    fetchSteps(); // Refresh counts on click
                                }}
                                className={`px-5 py-3.5 rounded-[1.25rem] border transition-all flex items-center gap-3 ${selectedStepId === step.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white dark:bg-[#111] border-slate-200 dark:border-[#333] text-slate-500 hover:border-blue-500/30 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedStepId === step.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                    }`}>
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[11px] font-black uppercase tracking-wider">
                                        {getStepLabel(step.step_name)}
                                    </span>
                                    {step.count !== undefined && (
                                        <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${selectedStepId === step.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {step.count} {step.count === 1 ? 'Record' : 'Records'}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Letters Table */}
            <div className={`rounded-3xl border overflow-hidden ${cardBg}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-[#1A1A1A] border-b border-slate-200 dark:border-[#333]">
                                <th className="px-5 py-4 w-16 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">#</th>
                                <th className="px-5 py-4 w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">Action</th>
                                <th className="px-5 py-4 w-1/5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Sender</th>
                                <th className="px-5 py-4 w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</th>
                                <th className="px-5 py-4 w-40 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Process</th>
                                <th className="px-5 py-4 w-20 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">Tray</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Topics</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4">Loading...</p>
                                    </td>
                                </tr>
                            ) : letters.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center text-slate-400">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-white/5 mx-auto mb-3 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest">No records</p>
                                    </td>
                                </tr>
                            ) : (
                                letters.map((letter, idx) => (
                                    <tr key={letter.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-4 text-xs font-black text-slate-400">{idx + 1}</td>
                                        <td className="px-5 py-4 text-center">
                                            {canPdfButton && (letter.attachment_id || letter.scanned_copy) ? (
                                                <button
                                                    onClick={() => openLetter(letter, idx)}
                                                    className="w-10 h-10 mx-auto rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all transform group-hover:scale-105 group-hover:shadow-md group-hover:shadow-blue-500/20"
                                                    title="Review"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600 flex items-center justify-center cursor-not-allowed" title="No Attachment">
                                                    <X className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className={`text-[11px] font-black uppercase tracking-tight line-clamp-2 ${letter.comments?.length > 0 ? 'text-slate-400' : textColor}`}>
                                                {letter.sender}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                {letter.status?.status_name || "ATG Note"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                {getStepLabel(letter.step_name)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                {letter.tray_id ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 max-w-xl">
                                            <p className={`text-[11px] font-medium leading-relaxed italic line-clamp-2 ${letter.comments?.length > 0 ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {letter.summary}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderLayout = () => {
        if (layoutStyle === 'grid') {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-[#0D0D0D] font-sans flex flex-col">
                    <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-slate-200 dark:border-[#222] px-4 md:px-6 flex items-center shadow-sm sticky top-0 z-20 shrink-0">
                        <div className="w-full flex items-center">
                            <h1 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                <LayoutDashboard className="w-3 h-3 text-blue-600" />
                                VIP View
                            </h1>
                        </div>
                    </header>
                    <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                        <div className="w-full">
                            {renderVIPContent()}
                        </div>
                    </main>
                </div>
            );
        }

        if (layoutStyle === 'notion') {
            return (
                <div className="min-h-screen bg-white dark:bg-[#191919] font-sans flex flex-col">
                    <main className="flex-1 w-full px-4 md:px-8 py-6 md:py-10">
                        {renderVIPContent()}
                    </main>
                </div>
            );
        }

        // Modern / Default Layout
        return (
            <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0D0D0D] font-sans flex flex-col">
                <main className="flex-1 w-full px-4 md:px-6 py-6 border-b border-slate-200 dark:border-[#222]">
                    {renderVIPContent()}
                </main>
            </div>
        );
    };

    return (
        <div className="relative font-sans">
            {renderLayout()}

            {/* VIP SIDE PANEL (Converted from Modal to allow table interaction) */}
            {isModalOpen && selectedLetter && (
                <div className="fixed inset-y-0 right-0 z-[1000] flex justify-end pointer-events-none w-full">
                    {/* Note: No backdrop here to allow clicking the table on the left */}

                    <div className="relative w-full md:w-[80vw] lg:w-[70vw] xl:w-[65vw] h-full bg-white dark:bg-[#0c0c0c] flex flex-col lg:flex-row shadow-[-40px_0_80px_rgba(0,0,0,0.1)] dark:shadow-[-40px_0_80px_rgba(0,0,0,0.7)] animate-in slide-in-from-right duration-500 pointer-events-auto border-l border-slate-200 dark:border-[#222]">
                        {/* LEFT COLUMN: INFO & COMMENTS */}
                        <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-[#222] bg-slate-50/50 dark:bg-[#0A0A0A] shrink-0 h-1/2 lg:h-full">
                            {/* Modal Header */}
                            <div className="p-5 md:p-6 border-b border-slate-100 dark:border-[#222] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[0.7rem] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                                        <Maximize2 className="w-5 h-5" />
                                    </div>
                                    <h2 className={`text-lg font-black uppercase tracking-tighter ${textColor}`}>Review</h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Sender</label>
                                        <p className={`text-sm font-black uppercase ${textColor}`}>{selectedLetter.sender}</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Status</label>
                                            <p className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                {selectedLetter.status?.status_name || "ATG Note"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Process</label>
                                            <p className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                {getStepLabel(selectedLetter.step_name)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Tray</label>
                                            <p className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                                                {selectedLetter.tray_id ?? 0}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Summary</label>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic bg-white dark:bg-[#111] border border-slate-100 dark:border-[#222] p-3 rounded-xl">{selectedLetter.summary}</p>
                                    </div>
                                </div>

                                {/* Comment History Section */}
                                <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Notes</label>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {isCommentsLoading ? (
                                        <div className="flex justify-center p-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-slate-200 dark:border-[#333] rounded-xl bg-white dark:bg-transparent">
                                            <X className="w-6 h-6 text-slate-300 dark:text-[#444] mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No notes yet.</p>
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="p-3.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-slate-100 dark:border-[#333] shadow-sm space-y-2 group/comment">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {new Date(comment.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}
                                                    </span>
                                                    {(canEdit || canDelete) && (
                                                        <div className="opacity-0 group-hover/comment:opacity-100 flex items-center gap-1 transition-opacity">
                                                            {canEdit && <button onClick={() => handleEditComment(comment)} className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors" title="Edit">
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>}
                                                            {canDelete && <button onClick={() => handleDeleteComment(comment.id)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors" title="Delete">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>}
                                                        </div>
                                                    )}
                                                </div>
                                                {canEdit && editingCommentId === comment.id ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            rows="3"
                                                            className="w-full p-2 rounded-lg bg-gray-50 dark:bg-black/20 border border-blue-200 dark:border-blue-900/30 text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none text-slate-900 dark:text-slate-200"
                                                            value={editingCommentBody}
                                                            onChange={(e) => setEditingCommentBody(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleUpdateComment(comment.id)}
                                                                disabled={isSaving || !editingCommentBody.trim()}
                                                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug whitespace-pre-wrap">
                                                        {comment.comment_body}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>


                            <div className="p-6 border-t border-slate-100 dark:border-[#222] bg-white dark:bg-[#0c0c0c]">
                                <div className="space-y-4">
                                    {canCommentBox && (
                                        <div>
                                            <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1.5 block">Add Note</label>
                                            <textarea
                                                rows="4"
                                                placeholder="Write something..."
                                                className="w-full p-4 rounded-xl bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-slate-900 dark:text-slate-200"
                                                value={newCommentText}
                                                onChange={(e) => setNewCommentText(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {canSubmit && (
                                        <button
                                            onClick={handleAddComment}
                                            disabled={isSaving || !newCommentText.trim()}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[0.85rem] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {isSaving ? "Sending..." : "Submit"}
                                        </button>
                                    )}

                                    {/* Navigation Buttons (Moved Below Submit) */}
                                    <div className="flex items-center gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-[#222]">
                                        <button
                                            onClick={handlePrev}
                                            disabled={currentIndex === 0}
                                            className="flex-1 py-3 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded-[0.85rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Prev
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 mx-1 min-w-[40px] text-center">{currentIndex + 1} / {letters.length}</span>
                                        <button
                                            onClick={handleNext}
                                            disabled={currentIndex === letters.length - 1}
                                            className="flex-1 py-3 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded-[0.85rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all disabled:opacity-40"
                                        >
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: PDF VIEWER */}
                        <div className="flex-1 bg-slate-100 dark:bg-black/40 relative overflow-hidden h-1/2 lg:h-full">
                            {isPdfLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                                    <p className="font-black uppercase tracking-widest text-[9px]">Loading Document...</p>
                                </div>
                            ) : pdfError ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-red-50/50 dark:bg-red-900/10">
                                    <X className="w-12 h-12 mb-3 text-red-500 opacity-60" />
                                    <p className="font-black uppercase tracking-widest text-[10px] text-red-500">{pdfError}</p>
                                </div>
                            ) : pdfUrl ? (
                                <iframe
                                    src={`${pdfUrl}#view=FitH`}
                                    className="w-full h-full border-none"
                                    title="PDF Content"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                    <FileText className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="font-black uppercase tracking-widest text-[9px]">No Attached Document</p>
                                </div>
                            )}
                        </div>
                    </div >
                </div >
            )
            }

            {/* LOGOUT CONFIRMATION MODAL */}
            {
                isLogoutModalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                            onClick={() => setIsLogoutModalOpen(false)}
                        />
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 rounded-[2rem] bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 mx-auto mb-8">
                                <LogOut className="w-10 h-10" />
                            </div>
                            <h3 className={`text-2xl font-black uppercase tracking-tighter mb-4 ${textColor}`}>Sign Out</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-10">
                                Exit now?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={confirmLogout}
                                    className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 transition-all active:scale-95"
                                >
                                    Sign Out
                                </button>
                                <button
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    className="w-full py-5 bg-slate-50 dark:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
