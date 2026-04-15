import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth, useSession, useUI } from "../../context/AuthContext";
import letterService from "../../services/letterService";
import axios from "axios";
import {
    FileText,
    Inbox,
    Trash2,
    X,
    Loader2,
    Plus,
    Printer,
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
    Maximize2
} from "lucide-react";
import jsQR from "jsqr";

export default function ResumenPage() {
    const { user } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useUI();

    const [lmsIdInput, setLmsIdInput] = useState("");
    const [modalLetters, setModalLetters] = useState(() => {
        const saved = localStorage.getItem('resumen_letters');
        return saved ? JSON.parse(saved) : [];
    });
    const [isAddingLetter, setIsAddingLetter] = useState(false);
    const [modalError, setModalError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pdfPanel, setPdfPanel] = useState({ isOpen: false, url: null, name: null });
    const [preparedBy, setPreparedBy] = useState(() => {
        const saved = localStorage.getItem('resumen_prepared_by');
        if (saved) return saved;
        return `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    });

    // QR Scanner States
    const [showScanner, setShowScanner] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef();

    // Sync modalLetters data from server on mount
    useEffect(() => {
        const syncLetters = async () => {
            if (modalLetters.length === 0) return;
            const updated = await Promise.all(
                modalLetters.map(async (l) => {
                    try {
                        // Re-fetch each letter by LMS_ID to get latest attachment/status
                        return await letterService.getByLmsId(l.lms_id);
                    } catch (err) {
                        return l; // Keep old if fetch fails
                    }
                })
            );
            setModalLetters(updated);
        };
        syncLetters();
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

    const handleAddLetter = async (id) => {
        const targetId = id || lmsIdInput.trim();
        if (!targetId) return;

        setIsAddingLetter(true);
        setModalError("");
        try {
            const letter = await letterService.getByLmsId(targetId);
            if (modalLetters.find(l => l.id === letter.id)) {
                setModalError("Letter already in the list.");
            } else {
                setModalLetters(prev => [letter, ...prev]);
                setLmsIdInput("");
                if (showScanner) stopScanner();
            }
        } catch (err) {
            setModalError("Letter not found.");
        } finally {
            setIsAddingLetter(false);
        }
    };

    const handleAtgViewBulk = async () => {
        if (modalLetters.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(modalLetters.map(l =>
                letterService.update(l.id, { global_status: 2, tray_id: null })
            ));
            // Success! Clear list or navigate
            setModalLetters([]);
            alert("Letters transitioned to ATG Note successfully.");
        } catch (err) {
            console.error("ATG View transition failed:", err);
            alert("Transition failed. Please try again.");
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
                    handleAddLetter(code.data);
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
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
            return `${baseUrl}/uploads/${filename}`;
        };

        const fileUrl = buildFileUrl(filePath);
        const fileName = filePath.split(/[/\\]/).pop() || "Document.pdf";

        if (fileUrl) {
            setPdfPanel({ isOpen: true, url: fileUrl, name: fileName });
        }
    };

    return (
        <>
            <PdfPanel pdfPanel={pdfPanel} setPdfPanel={setPdfPanel} />
            <div className={`min-h-screen ${pageBg} flex font-sans`}>
                <Sidebar />
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                    {/* Fixed Header */}
                    <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0 print:hidden`}>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-gray-500">
                                <FileText className="w-5 h-5" />
                            </button>
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
                                                try { return await letterService.getByLmsId(l.lms_id); } catch { return l; }
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
                        {showScanner && (
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
                            <div className={`${cardBg} rounded-[2rem] border shadow-sm flex flex-col overflow-hidden min-h-[calc(100vh - 12rem)] print:shadow-none print:border-none print:rounded-none`}>

                                {/* Print Header */}
                                <div className="hidden print:flex flex-col mb-8 border-b-2 border-slate-900 pb-4">
                                    <div className="flex justify-between items-end">
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Resumen</h2>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">Date:</span>
                                            <span className="text-xs font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 p-8 lg:p-12 flex flex-col">
                                    {/* Dashboard Info Section */}
                                    <div className="mb-8 print:hidden flex items-end justify-between">
                                        <div className="flex flex-col gap-2 max-w-xs">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prepared by:</label>
                                            <input
                                                type="text"
                                                value={preparedBy}
                                                onChange={(e) => setPreparedBy(e.target.value)}
                                                placeholder="Enter name..."
                                                className="px-6 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1rem] text-xs font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase text-slate-600 dark:text-slate-300"
                                            />
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">Printed:</span>
                                            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </span>
                                        </div>
                                    </div>

                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-100 dark:border-white/10 print:border-slate-900">
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-12 print:text-slate-900">No.</th>
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32 print:text-slate-900">Date & Time</th>
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24 print:text-slate-900">LMS No.</th>
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20 print:text-slate-900">Attachment</th>
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:text-slate-900">Sender</th>
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:text-slate-900">Letter Summary</th>
                                                <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:hidden text-right">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modalLetters.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="py-32 text-center">
                                                        <div className="flex flex-col items-center gap-4 text-slate-200 dark:text-gray-800">
                                                            <Inbox className="w-20 h-20" />
                                                            <span className="text-base font-black uppercase tracking-widest">No letters listed</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                modalLetters.map((l, idx) => (
                                                    <tr key={l.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors print:border-slate-200">
                                                        <td className="py-6 px-4 text-xs font-black text-slate-400 print:text-slate-900">{idx + 1}</td>
                                                        <td className="py-6 px-4">
                                                            <div className="flex flex-col text-[10px] font-bold text-slate-500 print:text-slate-900">
                                                                <span>{new Date(l.date_received || l.createdAt).toLocaleDateString()}</span>
                                                                <span className="text-orange-500 font-black">{new Date(l.date_received || l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-4 text-xs font-black text-blue-600 uppercase print:text-slate-900">{l.lms_id}</td>
                                                        <td className="py-6 px-4">
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
                                                            <span className="hidden print:inline text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                {(l.scanned_copy || l.attachment_id || l.attachment?.file_path) ? 'Available' : 'No File'}
                                                            </span>
                                                        </td>
                                                        <td className="py-6 px-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase print:text-slate-900">{l.sender}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold print:hidden">{l.locale || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-4">
                                                            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg print:text-slate-900 italic" dangerouslySetInnerHTML={{ __html: l.summary || 'No summary available' }}></div>
                                                        </td>
                                                        <td className="py-6 px-4 print:hidden text-right">
                                                            <button
                                                                onClick={() => setModalLetters(prev => prev.filter(x => x.id !== l.id))}
                                                                className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-300 transition-all border border-transparent hover:border-red-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
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

                                        {/* 2. Add LMS ID */}
                                        <div className="flex items-center gap-2">
                                            <form onSubmit={(e) => { e.preventDefault(); handleAddLetter(); }} className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    placeholder="LMS_ID..."
                                                    value={lmsIdInput}
                                                    onChange={(e) => setLmsIdInput(e.target.value)}
                                                    className="pl-4 pr-10 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48 transition-all uppercase"
                                                />
                                                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:scale-110 transition-transform">
                                                    {isAddingLetter ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                </button>
                                                {modalError && <span className="absolute -bottom-5 left-0 text-[8px] text-red-500 font-black uppercase whitespace-nowrap">{modalError}</span>}
                                            </form>
                                        </div>

                                        {/* 3. Scan QR */}
                                        <button
                                            onClick={showScanner ? stopScanner : startScanner}
                                            className={`px-6 py-3 rounded-2xl border transition-all flex items-center gap-2 ${showScanner ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 group'}`}
                                        >
                                            {showScanner ? <X className="w-4 h-4" /> : <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{showScanner ? 'Cancel' : 'Scan QR'}</span>
                                        </button>

                                        {/* 4. ATG Review */}
                                        <button
                                            onClick={handleAtgViewBulk}
                                            disabled={modalLetters.length === 0 || loading}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-3 group"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                            ATG Review
                                        </button>
                                    </div>

                                    {/* Print Footer / Signatures */}
                                    <div className="hidden print:block mt-20 pt-12 border-t-2 border-slate-900">
                                        <div className="grid grid-cols-3 gap-12">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Prepared By / Naghanda:</span>
                                                <div className="border-b border-slate-900 pb-2">
                                                    <span className="text-xs font-black uppercase text-slate-900">{preparedBy}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Delivered By / Nagdala:</span>
                                                <div className="border-b border-slate-900 h-6"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Remarks / Notasyon:</span>
                                                <div className="border-b border-slate-900 h-6"></div>
                                            </div>
                                        </div>
                                        <div className="mt-8 text-right">
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Letters: {modalLetters.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @media print {
                        /* Aggressive Reset */
                        html, body, #root { 
                            height: auto !important; 
                            overflow: visible !important; 
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        /* Hide Sidebar and Header COMPLETELY */
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
                        
                        /* Layout fixes for table container */
                        .min-h-\[calc\(100vh\ -\ 12rem\)\] { 
                            min-height: 0 !important; 
                            height: auto !important;
                            border: none !important;
                            box-shadow: none !important;
                            background: white !important;
                        }

                        /* Page settings */
                        @page { 
                            margin: 1cm; 
                            size: auto; 
                        }

                        /* Ensure clean text */
                        * { background: transparent !important; color: black !important; -webkit-print-color-adjust: exact !important; }
                        .text-blue-600 { color: black !important; }
                        .text-orange-500 { color: black !important; }
                    }
                `}</style>
                </main>
            </div>
        </>
    );
}
