import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
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
    LayoutDashboard
} from "lucide-react";

export default function VIPView() {
    const { user, logout, layoutStyle, setIsMobileMenuOpen } = useAuth();
    const navigate = useNavigate();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [steps, setSteps] = useState([]);
    const [selectedStepId, setSelectedStepId] = useState(null);
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [marginalNote, setMarginalNote] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [comments, setComments] = useState([]);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Live Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchSteps = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/process-steps?vip=true`);
            setSteps(response.data);
            if (!selectedStepId && response.data.length > 0) {
                setSelectedStepId(response.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching steps:", error);
        }
    };

    // Fetch Steps on mount
    useEffect(() => {
        fetchSteps();
    }, []);

    // Fetch Letters for Selected Step
    useEffect(() => {
        if (!selectedStepId) return;

        const fetchLetters = async () => {
            setLoading(true);
            try {
                // Get assignments for this step to see which letters are here
                const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments?step_id=${selectedStepId}&status=Pending&vip=true`);

                // Extract letters from assignments with safer mapping
                const letterList = response.data
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

    const fetchComments = async (letterId) => {
        setIsCommentsLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/comments/letter/${letterId}`);
            setComments(response.data);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setIsCommentsLoading(false);
        }
    };

    const openLetter = (letter, index) => {
        setSelectedLetter(letter);
        setCurrentIndex(index);
        setMarginalNote(""); // Clear input when opening
        setIsModalOpen(true);
        fetchComments(letter.id);
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

    const handleSendAction = async () => {
        if (!selectedLetter || !marginalNote.trim()) return;
        setIsSaving(true);
        try {
            // Create a new comment entry in the collection
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/comments`, {
                letter_id: selectedLetter.id,
                user_id: user.id,
                comment_body: marginalNote
            });

            // Refetch comment history
            await fetchComments(selectedLetter.id);

            // Clear the input
            setMarginalNote("");

            alert("Directive submitted and recorded in history.");
        } catch (error) {
            console.error("Error saving comment:", error);
            alert("Failed to save directive.");
        } finally {
            setIsSaving(false);
        }
    };

    const textColor = layoutStyle === 'linear' ? 'text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'linear' ? 'bg-[#0c0c0c] border-[#1a1a1a]' :
        layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' :
            layoutStyle === 'grid' ? 'bg-white dark:bg-[#141414] border-slate-100 dark:border-[#222]' :
                'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm';

    const renderVIPContent = () => (
        <div className="space-y-8">
            {/* Header section (Custom for VIP) */}
            <div className={`p-8 rounded-[2.5rem] border ${layoutStyle === 'linear' ? 'bg-[#111] border-[#1a1a1a]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] shadow-sm'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className={`text-4xl font-black tracking-tighter uppercase ${textColor}`}>LMS 2.0</h1>
                            <div className="flex items-center gap-2 text-blue-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                                <Clock className="w-3 h-3" />
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} •
                                {currentTime.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block mr-4">
                            <p className={`text-sm font-black uppercase ${textColor}`}>Welcome, {user?.first_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">VIP Executive Access</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-red-500 hover:bg-red-500 hover:text-white transition-all group shrink-0"
                        >
                            <LogOut className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Horizontal Steps Selection */}
            <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex items-center gap-4 min-w-max px-2">
                    {steps.map(step => (
                        <button
                            key={step.id}
                            onClick={() => {
                                setSelectedStepId(step.id);
                                fetchSteps(); // Refresh counts on click
                            }}
                            className={`px-8 py-5 rounded-[2rem] border transition-all flex items-center gap-4 ${selectedStepId === step.id
                                ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-500/30 -translate-y-1'
                                : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-400 hover:border-blue-500/50 hover:text-blue-500'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${selectedStepId === step.id ? 'bg-white/20' : 'bg-slate-50 dark:bg-white/5'
                                }`}>
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-black uppercase tracking-widest">{step.step_name}</span>
                                {step.count !== undefined && (
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedStepId === step.id ? 'text-white/70' : 'text-blue-500'}`}>
                                        {step.count} {step.count === 1 ? 'Document' : 'Documents'}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Letters Table */}
            <div className={`rounded-[2.5rem] border overflow-hidden ${cardBg}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">#</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">PDF</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Sender Entity</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Subject / Summary</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-20 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Accessing Documents...</p>
                                    </td>
                                </tr>
                            ) : letters.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                        No documents found in this stage
                                    </td>
                                </tr>
                            ) : (
                                letters.map((letter, idx) => (
                                    <tr key={letter.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-6 text-xs font-black text-gray-400">{idx + 1}</td>
                                        <td className="p-6">
                                            {(letter.attachment_id || letter.scanned_copy) ? (
                                                <button
                                                    onClick={() => openLetter(letter, idx)}
                                                    className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform group-hover:scale-110"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-200 flex items-center justify-center">
                                                    <X className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <p className={`text-xs font-black uppercase tracking-tight ${letter.comments?.length > 0 ? 'text-gray-300 dark:text-gray-600' : textColor}`}>
                                                {letter.sender}
                                            </p>
                                        </td>
                                        <td className="p-6 max-w-xl">
                                            <p className={`text-[11px] font-medium line-clamp-2 leading-relaxed italic ${letter.comments?.length > 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'}`}>
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
                <div className="min-h-screen bg-slate-50 dark:bg-[#0D0D0D] font-sans text-slate-900">
                    <main className="flex-1 flex flex-col">
                        <header className="h-20 bg-white dark:bg-[#0D0D0D] border-b border-slate-200 dark:border-[#222] px-4 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Executive</span>
                                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">VIP Oversight</h1>
                                </div>
                            </div>
                        </header>
                        <div className="p-4 md:p-12">
                            <div className="max-w-7xl mx-auto">
                                {renderVIPContent()}
                            </div>
                        </div>
                    </main>
                </div>
            );
        }

        if (layoutStyle === 'linear') {
            return (
                <div className="min-h-screen bg-[#080808] text-[#eee] font-sans">
                    <main className="flex-1 flex flex-col">
                        <header className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-4 md:px-6 bg-[#080808]/80 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#666] uppercase tracking-widest">
                                <span className="text-indigo-400">EXECUTIVE</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-[#eee]">VIP VIEW</span>
                            </div>
                        </header>
                        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
                            {renderVIPContent()}
                        </div>
                    </main>
                </div>
            );
        }

        if (layoutStyle === 'notion') {
            return (
                <div className="min-h-screen bg-white dark:bg-[#191919] font-sans">
                    <main className="flex-1 bg-white dark:bg-[#191919]">
                        <div className="max-w-[100vw] px-4 md:px-12 pt-12 md:pt-24 pb-16">
                            <div className="group mb-12">
                                <div className="flex items-center gap-4 text-gray-400 mb-6">
                                    <span className="text-xs font-medium decoration-gray-200 underline-offset-4 flex items-center gap-1"><LayoutDashboard className="w-3 h-3" /> EXECUTIVE</span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tighter uppercase">VIP Oversight</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Access and review all critical documents across all workflow stages.</p>
                            </div>
                            {renderVIPContent()}
                        </div>
                    </main>
                </div>
            );
        }

        // Modern / Default Layout
        return (
            <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0D0D0D] font-sans">
                <main className="flex-1 flex flex-col">

                    <div className="p-4 md:p-12">
                        <div className="max-w-[100vw]">
                            {renderVIPContent()}
                        </div>
                    </div>
                </main>
            </div>
        );
    };

    return (
        <div className="relative font-sans">
            {renderLayout()}

            {/* VIP MODAL OVERLAY */}
            {isModalOpen && selectedLetter && (
                <div className="fixed inset-0 z-[1000] flex items-stretch justify-end pointer-events-none">
                    <div
                        className="absolute inset-0 bg-slate-900/10 animate-in fade-in duration-500 pointer-events-auto"
                        onClick={() => setIsModalOpen(false)}
                    />

                    <div className="relative w-full max-w-[90vw] md:max-w-7xl bg-white dark:bg-[#0c0c0c] flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-right duration-500 pointer-events-auto">
                        {/* LEFT COLUMN: INFO & COMMENTS */}
                        <div className="w-full md:w-1/3 flex flex-col border-r border-gray-100 dark:border-white/10">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <Maximize2 className="w-5 h-5" />
                                    </div>
                                    <h2 className={`text-xl font-black uppercase tracking-tighter ${textColor}`}>Review Module</h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 block">Sender</label>
                                    <p className={`text-sm font-black uppercase ${textColor}`}>{selectedLetter.sender}</p>

                                    <div className="mt-6">
                                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 block">Subject</label>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed italic">{selectedLetter.summary}</p>
                                    </div>
                                </div>

                                {/* Comment History Section */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        Comment History
                                    </label>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {isCommentsLoading ? (
                                            <div className="flex justify-center p-4">
                                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                                                No previous directives recorded
                                            </p>
                                        ) : (
                                            comments.map((comment) => (
                                                <div key={comment.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-2">
                                                    <div className="flex justify-between items-center">

                                                        <span className="text-[8px] font-bold text-gray-400 uppercase">
                                                            {new Date(comment.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                                        {comment.comment_body}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/10">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        New Comment
                                    </label>
                                    <textarea
                                        rows="8"
                                        placeholder="Enter your executive directive or comment here..."
                                        className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all resize-none dark:text-gray-200"
                                        value={marginalNote}
                                        onChange={(e) => setMarginalNote(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSendAction}
                                        disabled={isSaving}
                                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {isSaving ? "Submitting..." : "Submit Directive"}
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="p-8 border-t border-gray-100 dark:border-white/10 flex items-center gap-4">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="flex-1 py-4 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={currentIndex === letters.length - 1}
                                    className="flex-1 py-4 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-30"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: PDF VIEWER */}
                        <div className="flex-1 bg-slate-100 dark:bg-[#111] relative overflow-hidden">
                            {selectedLetter.scanned_copy || selectedLetter.attachment_id ? (
                                <iframe
                                    src={selectedLetter.scanned_copy
                                        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view-path?path=${btoa(selectedLetter.scanned_copy)}`
                                        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view/${selectedLetter.attachment_id}`
                                    }
                                    className="w-full h-full border-none shadow-inner"
                                    title="PDF Content"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <X className="w-16 h-16 mb-4 opacity-10" />
                                    <p className="font-black uppercase tracking-widest text-xs">No Document Available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LOGOUT CONFIRMATION MODAL */}
            {isLogoutModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setIsLogoutModalOpen(false)}
                    />
                    <div className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 rounded-[2rem] bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 mx-auto mb-8">
                            <LogOut className="w-10 h-10" />
                        </div>
                        <h3 className={`text-2xl font-black uppercase tracking-tighter mb-4 ${textColor}`}>Confirm Logout</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-10">
                            Are you sure you want to end your executive session?
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
            )}
        </div>
    );
}
