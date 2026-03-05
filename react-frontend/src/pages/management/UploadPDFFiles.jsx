
import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
    FileText,
    Upload,
    X,
    Loader2,
    FileSearch,
    CheckCircle2,
    AlertCircle,
    Eye,
    Zap,
    Clipboard,
    LayoutGrid,
    List,
    Maximize2,
    ExternalLink
} from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import jsQR from "jsqr";

// Configure PDF.js worker locally for Vite reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function UploadPDFFiles() {
    const { layoutStyle, setIsMobileMenuOpen } = useAuth();
    const [files, setFiles] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // Default to 'list'
    const [selectedPreview, setSelectedPreview] = useState(null);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: "" });
    const fileInputRef = useRef(null);

    // Layout Styling
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
    };

    const addFiles = (selectedFiles) => {
        const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
        if (pdfFiles.length < selectedFiles.length) {
            alert("Only PDF files are supported.");
        }

        const newFiles = pdfFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            qrValue: null,
            status: 'pending', // pending, scanning, success, error
            previewUrl: URL.createObjectURL(file)
        }));

        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const removeFile = (id) => {
        setFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
            return prev.filter(f => f.id !== id);
        });
    };

    // Paste handling
    useEffect(() => {
        const handlePaste = (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            const pastedFiles = [];
            for (const item of items) {
                if (item.type === "application/pdf") {
                    pastedFiles.push(item.getAsFile());
                }
            }
            if (pastedFiles.length > 0) {
                addFiles(pastedFiles);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);

    const scanQRCode = async (fileObj) => {
        try {
            const arrayBuffer = await fileObj.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);

            // Pass 1: Ultra-high resolution (4.0) for standard scan
            const scale = 4.0;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // Full page initial scan
            const fullImageData = context.getImageData(0, 0, canvas.width, canvas.height);
            let code = jsQR(fullImageData.data, fullImageData.width, fullImageData.height, { inversionAttempts: "attemptBoth" });

            // Pass 2: Focused Bottom Scan (entire bottom 40%)
            if (!code) {
                const startY = Math.floor(canvas.height * 0.6);
                const focusImageData = context.getImageData(0, startY, canvas.width, canvas.height - startY);
                code = jsQR(focusImageData.data, focusImageData.width, focusImageData.height, { inversionAttempts: "attemptBoth" });
            }

            // Pass 3: Deep Scan (Digital Sharpening/Thresholding for BLURRY codes)
            if (!code) {
                // Focus on bottom 50% for deep processing
                const startY = Math.floor(canvas.height * 0.5);
                const imageData = context.getImageData(0, startY, canvas.width, canvas.height - startY);
                const data = imageData.data;

                // Thresholding Algorithm: Forces blurry/gray pixels to hard black/white
                // This 'cleans up' the modules so the QR library can see the edges more clearly
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const val = avg < 150 ? 0 : 255; // Adjust threshold based on common scan density
                    data[i] = data[i + 1] = data[i + 2] = val;
                }

                code = jsQR(data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
            }

            return code ? code.data : "No QR code found";
        } catch (error) {
            console.error("QR Scan Error:", error);
            return "Scanning failed";
        }
    };

    const handleSync = async (validFiles) => {
        setSyncing(true);
        setSyncProgress({ current: 0, total: validFiles.length, message: "Preparing to sync documents..." });

        const updatedFiles = [...files];

        for (let i = 0; i < validFiles.length; i++) {
            const fileItem = validFiles[i];
            const fileIndex = updatedFiles.findIndex(f => f.id === fileItem.id);

            if (fileIndex !== -1) {
                updatedFiles[fileIndex].status = 'syncing';
                setFiles([...updatedFiles]);
                setSyncProgress({
                    current: i + 1,
                    total: validFiles.length,
                    message: `Merging ${fileItem.name} to Letter ${fileItem.qrValue}...`
                });

                try {
                    const formData = new FormData();
                    formData.append('pdfFile', fileItem.file);
                    formData.append('lms_id', fileItem.qrValue);

                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/pdf-sync/merge`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (response.data.success) {
                        updatedFiles[fileIndex].status = 'synced';
                    } else {
                        updatedFiles[fileIndex].status = 'error';
                    }
                } catch (error) {
                    console.error("Sync Error for file:", fileItem.name, error.response?.data || error.message);
                    updatedFiles[fileIndex].status = 'error';
                }
                setFiles([...updatedFiles]);
            }
        }

        setSyncProgress(prev => ({ ...prev, message: "Sync Process Finished!" }));
        setTimeout(() => setSyncing(false), 3000);
    };

    const handleGenerate = async () => {
        setScanning(true);
        const updatedFiles = [...files];
        const successfulExtractions = [];

        for (let i = 0; i < updatedFiles.length; i++) {
            if (updatedFiles[i].status === 'pending' || updatedFiles[i].status === 'error') {
                updatedFiles[i].status = 'scanning';
                setFiles([...updatedFiles]);

                const qrValue = await scanQRCode(updatedFiles[i]);
                updatedFiles[i].qrValue = qrValue?.toString()?.trim() || qrValue;

                const isSuccess = qrValue !== "No QR code found" && qrValue !== "Scanning failed";
                updatedFiles[i].status = isSuccess ? 'success' : 'error';

                if (isSuccess) {
                    successfulExtractions.push(updatedFiles[i]);
                }

                setFiles([...updatedFiles]);
            } else if (updatedFiles[i].status === 'success') {
                successfulExtractions.push(updatedFiles[i]);
            }
        }

        setScanning(false);

        // Automatically proceed to syncing if there are valid results
        if (successfulExtractions.length > 0) {
            handleSync(successfulExtractions);
        }
    };

    return (
        <div className={`min-h-screen ${pageBg} flex font-sans`}>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <FileText className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-blue-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Management</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>PDF Scanner</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                        {files.length > 0 && !scanning && !syncing && (
                            <button
                                onClick={handleGenerate}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                <Zap className="w-3 h-3" />
                                {files.some(f => f.status === 'success') ? "Re-sync All" : "Generate & Sync"}
                            </button>
                        )}
                        {(scanning || syncing) && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                    {scanning ? "Extracting QR..." : "Syncing to Database..."}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto space-y-8">

                        {/* Drop Zone */}
                        <div
                            className={`relative border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-300 flex flex-col items-center justify-center text-center
                                ${dragActive ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 hover:border-blue-400'}
                                ${cardBg}
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input
                                type="file"
                                className="hidden"
                                multiple
                                accept="application/pdf"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                            />
                            <div className="w-20 h-20 rounded-[2rem] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                <Upload className="w-10 h-10" />
                            </div>
                            <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${textColor}`}>Drop PDF Files Here</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6">Or click to browse, or just <span className="text-blue-500 font-bold">Paste (Ctrl+V)</span></p>
                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Multiple Files</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> First Page QR</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-Sync & Merge</span>
                            </div>
                        </div>

                        {/* Sync Progress Bar */}
                        {syncing && (
                            <div className={`${cardBg} rounded-3xl border p-8 shadow-xl animate-in slide-in-from-top-4 duration-500`}>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                                <Zap className="w-6 h-6 animate-pulse" />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Syncing Documents</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{syncProgress.message}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-black ${textColor}`}>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{syncProgress.current} of {syncProgress.total} Files</p>
                                        </div>
                                    </div>

                                    <div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 relative">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out flex items-center justify-end px-2"
                                            style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                        >
                                            <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* File Listing and Results */}
                        {files.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-4">
                                    <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] text-gray-400`}>Ready to process ({files.length})</h4>
                                    <button onClick={() => setFiles([])} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600">Clear All</button>
                                </div>
                                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-3"}>
                                    {files.map((f) => (
                                        viewMode === 'grid' ? (
                                            <div key={f.id} className={`${cardBg} rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col`}>
                                                {/* Preview/PDF Content */}
                                                <div className="h-48 bg-slate-100 dark:bg-[#1a1a1a] relative group overflow-hidden">
                                                    <iframe
                                                        src={f.previewUrl}
                                                        className="w-full h-full border-none opacity-80 group-hover:opacity-100 transition-opacity"
                                                        title={f.name}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                                                        className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Info */}
                                                <div className="p-6 space-y-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <h5 className={`text-xs font-black uppercase tracking-tight truncate ${textColor}`}>{f.name}</h5>
                                                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{(f.file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                                                        </div>
                                                        <div className="shrink-0">
                                                            {f.status === 'scanning' || f.status === 'syncing' ? (
                                                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                                            ) : f.status === 'success' ? (
                                                                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                                            ) : f.status === 'synced' ? (
                                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white scale-110 drop-shadow-lg shadow-emerald-500/50 animate-in zoom-in-50 duration-300">
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </div>
                                                            ) : f.status === 'error' ? (
                                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-white/10" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* QR Result */}
                                                    <div className="pt-2">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Extracted QR Value</label>
                                                        <div className={`p-3 rounded-xl border font-mono text-xs flex items-center justify-between gap-3 ${f.qrValue ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-gray-400 italic'
                                                            }`}>
                                                            <span className="truncate">{f.qrValue || (f.status === 'pending' ? 'Waiting for extract...' : 'Processing...')}</span>
                                                            {f.qrValue && (
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(f.qrValue)}
                                                                    className="hover:text-blue-700 transition-colors"
                                                                >
                                                                    <Zap className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div key={f.id} className={`${cardBg} rounded-2xl border p-4 flex items-center gap-6 group hover:border-blue-500/50 hover:shadow-lg transition-all`}>
                                                <button
                                                    onClick={() => setSelectedPreview(f)}
                                                    className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center shrink-0 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all group/icon"
                                                    title="Click to preview PDF"
                                                >
                                                    <FileText className="w-6 h-6 text-red-500 group-hover/icon:scale-110 transition-transform" />
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <h5 className={`text-xs font-black uppercase tracking-tight truncate ${textColor}`}>{f.name}</h5>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{(f.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                </div>

                                                <div className="w-64">
                                                    <div className={`px-4 py-2.5 rounded-xl border font-mono text-[10px] flex items-center justify-between gap-3 ${f.qrValue ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-gray-400 italic'}`}>
                                                        <span className="truncate">{f.qrValue || 'Waiting...'}</span>
                                                        {f.qrValue && (
                                                            <button onClick={() => navigator.clipboard.writeText(f.qrValue)} className="hover:text-blue-700">
                                                                <Clipboard className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    {f.status === 'scanning' || f.status === 'syncing' ? (
                                                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                                    ) : f.status === 'success' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                                    ) : f.status === 'synced' ? (
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white scale-110 shadow-lg shadow-emerald-500/20 animate-in zoom-in-50 duration-300">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </div>
                                                    ) : f.status === 'error' ? (
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-white/10" />
                                                    )}

                                                    <button
                                                        onClick={() => removeFile(f.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {files.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                <FileSearch className="w-16 h-16 text-gray-300" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Inventory Empty</p>
                                    <p className="text-xs font-medium text-gray-500">Add documents to begin the extraction process.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* PDF Preview Modal */}
            {selectedPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedPreview(null)}
                    />
                    <div className={`${cardBg} w-full max-w-6xl h-full rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col animate-in zoom-in-95 duration-300`}>
                        <header className="px-8 h-20 border-b flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-xs font-black uppercase tracking-tight ${textColor}`}>{selectedPreview.name}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Interactive Preview</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={selectedPreview.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                                <button
                                    onClick={() => setSelectedPreview(null)}
                                    className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </header>
                        <div className="flex-1 bg-slate-100 dark:bg-black/40 p-4 overflow-hidden relative flex items-center justify-center">
                            <iframe
                                src={selectedPreview.previewUrl}
                                className="w-full h-full rounded-2xl border-none bg-white shadow-inner"
                                title="Full PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
