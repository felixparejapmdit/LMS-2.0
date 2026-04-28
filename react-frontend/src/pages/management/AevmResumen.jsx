
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Trash2, Edit2, Printer, ArrowLeft, ArrowRight,
    Search, Loader2, X, CheckCircle2, AlertCircle, QrCode, Camera
} from 'lucide-react';
import { useAuth, useSession, useUI } from '../../context/AuthContext';
import letterService from '../../services/letterService';
import Sidebar from '../../components/Sidebar';
import jsQR from 'jsqr';

export default function AevmResumen() {
    const navigate = useNavigate();
    const { user } = useSession();
    const { layoutStyle } = useUI();
    const [letters, setLetters] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [lmsIdInput, setLmsIdInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Signatories State
    const [courierName, setCourierName] = useState('');
    const [lobbyName, setLobbyName] = useState('c/o Patrol');
    const [preparerName, setPreparerName] = useState(() => user ? `${user.first_name} ${user.last_name}` : '');
    const [notation, setNotation] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    // QR Scanner States
    const [showScanner, setShowScanner] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const lastAutoSubmitRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const format12h = (date) => date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

    const normalizeAtgId = (value) => (value || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    const extractAtgId = (value) => {
        const normalized = normalizeAtgId(value);
        const match = normalized.match(/[A-Z]+\d{2}-\d{5}/);
        return match ? match[0] : normalized;
    };
    const isCompleteAtgId = (value) => /^[A-Z]+\d{2}-\d{5}$/.test(extractAtgId(value));

    const handleAddLetter = async (id) => {
        const targetId = extractAtgId(id || lmsIdInput);
        if (!targetId) return false;

        setLoading(true);
        setError('');
        try {
            const letter = await letterService.getByLmsId(targetId);
            if (letters.find(l => l.id === letter.id)) {
                setError('Letter already in the list.');
                return false;
            } else {
                setLetters(prev => [...prev, letter]);
                setLmsIdInput('');
                if (showScanner) stopScanner();
                return true;
            }
        } catch (err) {
            setError('Letter not found. Please check the LMS ID.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const maybeAutoSubmitAtg = async (rawValue) => {
        const extracted = extractAtgId(rawValue);
        if (!isCompleteAtgId(extracted)) return;
        if (lastAutoSubmitRef.current === extracted) return;
        if (loading) return;
        lastAutoSubmitRef.current = extracted;
        setLmsIdInput(extracted);
        const added = await handleAddLetter(extracted);
        if (added) setIsAddModalOpen(false);
    };

    const handleAtgInputChange = (e) => {
        const val = e.target.value;
        setLmsIdInput(val);
        setError('');
        void maybeAutoSubmitAtg(val);
    };

    // QR SCANNER
    const startScanner = async () => {
        setCameraError('');
        setShowScanner(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(tick);
            }
        } catch (err) {
            setCameraError('Unable to access camera.');
            setShowScanner(false);
        }
    };

    const stopScanner = () => {
        setShowScanner(false);
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const tick = () => {
        if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
                if (code) {
                    const scanned = extractAtgId(code.data);
                    setLmsIdInput(scanned);
                    void maybeAutoSubmitAtg(scanned);
                    return;
                }
            }
        }
        requestRef.current = requestAnimationFrame(tick);
    };

    const handleDelete = (id) => setLetters(letters.filter(l => l.id !== id));
    const handleBack = () => navigate(-1);
    const handleForward = () => navigate('/vip-view');
    const handlePrint = () => window.print();

    return (
        <div className="flex h-screen bg-[#F7F7F7] dark:bg-[#0D0D0D] overflow-hidden font-sans print:bg-white print:h-auto print:overflow-visible">
            <div className="print:hidden"><Sidebar /></div>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0 print:overflow-visible">

                    {/* Document */}
                    <div className="bg-white border border-gray-300 p-6 md:p-10 print:border-none print:p-0 print:shadow-none">
                        {/* Header */}
                        <div className="text-center mb-4">
                            <h1 className="text-xl font-black text-[#1B2A4A] uppercase tracking-tight">ATG Office</h1>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Kagawaran/Seksyon</p>
                            <h2 className="text-sm font-black text-gray-900 uppercase mt-2 tracking-tight">Resumen ng Nilalaman ng mga Ipinadalang Sulat</h2>
                        </div>

                        {/* Date/Time/Envelope Row */}
                        <table className="w-full border-collapse border border-gray-900 text-xs mb-0">
                            <tbody>
                                <tr>
                                    <td className="border border-gray-900 p-1.5 w-1/3">
                                        <span className="italic text-gray-600 text-[10px]">Petsa ipinadala:</span><br />
                                        <span className="font-bold text-gray-900">{currentTime.toLocaleDateString('en-CA')}</span>
                                    </td>
                                    <td className="border border-gray-900 p-1.5 w-1/3">
                                        <span className="italic text-gray-600 text-[10px]">Oras ipinadala:</span><br />
                                        <span className="font-bold text-gray-900">{format12h(currentTime)}</span>
                                    </td>
                                    <td className="border border-gray-900 p-1.5 w-1/3">
                                        <span className="italic text-gray-600 text-[10px]">Black Envelope No.</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Letter Table */}
                        <table className="w-full border-collapse border border-gray-900 text-xs">
                            <thead>
                                <tr className="border border-gray-900">
                                    <th className="border border-gray-900 p-1.5 text-center text-[10px] font-bold uppercase w-2/3">Pangalan ng sumulat /Lokal/Distrito</th>
                                    <th className="border border-gray-900 p-1.5 text-center text-[10px] font-bold uppercase w-1/3">NILALAMAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {letters.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" className="border border-gray-900 p-6 text-center text-gray-400 italic text-[10px]">
                                            No letters added yet
                                        </td>
                                    </tr>
                                ) : (
                                    letters.map((letter, index) => (
                                        <tr key={letter.id} className="group">
                                            <td className="border border-gray-900 p-1.5 relative">
                                                <span className="text-xs font-bold text-gray-900 uppercase">{letter.sender}</span>
                                                <span className="text-[9px] text-blue-600 ml-2">{letter.lms_id}</span>
                                                <button
                                                    onClick={() => handleDelete(letter.id)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-0.5 rounded transition-all print:hidden"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </td>
                                            <td className="border border-gray-900 p-1.5">
                                                <div className="text-xs text-gray-700 leading-snug" dangerouslySetInnerHTML={{ __html: letter.summary }} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <table className="w-full border-collapse border border-gray-900 text-xs mb-4">
                            <tbody>
                                <tr>
                                    <td className="border border-gray-900 p-1.5 text-right font-bold w-2/3">Kabuuang bilang ng sulat:</td>
                                    <td className="border border-gray-900 p-1.5 text-center font-bold w-1/3">{letters.length}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Signatories */}
                        <div className="space-y-4 text-xs mt-6">
                            <div>
                                <span className="font-bold text-gray-900">Naghanda:</span>
                                <div className="mt-2 text-center border-b border-gray-400 pb-1 max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        value={preparerName}
                                        onChange={(e) => setPreparerName(e.target.value)}
                                        className="bg-transparent text-center font-bold outline-none w-full print:border-none"
                                        placeholder="Enter name"
                                    />
                                </div>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Pangalan ng nagdala sa Lobby:</span>
                                <div className="mt-2 text-center border-b border-gray-400 pb-1 max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        value={lobbyName}
                                        onChange={(e) => setLobbyName(e.target.value)}
                                        className="bg-transparent text-center font-bold outline-none w-full print:border-none"
                                        placeholder="Enter name"
                                    />
                                </div>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Notasyon ng Tumanggap:</span>
                                <div className="mt-8 text-center max-w-sm mx-auto">
                                    <div className="border-b border-gray-900 mb-1" />
                                    <span className="text-[10px] text-gray-600">Tumanggap</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - Below Document */}
                    <div className="flex items-center gap-2 mt-4 print:hidden flex-wrap">
                        <button onClick={handlePrint} className="px-4 py-2 bg-[#1B2A4A] text-white text-[10px] font-black rounded uppercase tracking-widest hover:bg-[#263B6A] transition-all">Print</button>
                        <button onClick={() => { setIsAddModalOpen(true); setError(''); setLmsIdInput(''); lastAutoSubmitRef.current = null; }} className="px-4 py-2 bg-[#1B2A4A] text-white text-[10px] font-black rounded uppercase tracking-widest hover:bg-[#263B6A] transition-all">Add Letter</button>
                        <button onClick={handleBack} className="px-4 py-2 bg-[#1B2A4A] text-white text-[10px] font-black rounded uppercase tracking-widest hover:bg-[#263B6A] transition-all">Back</button>
                        <button onClick={handleForward} className="px-4 py-2 bg-[#1B2A4A] text-white text-[10px] font-black rounded uppercase tracking-widest hover:bg-[#263B6A] transition-all">Forward</button>
                    </div>
                </div>
            </main>

            {/* Add Letter Modal with QR */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/10" onClick={() => { setIsAddModalOpen(false); if (showScanner) stopScanner(); }} />
                    <div className="bg-white dark:bg-[#141414] w-full max-w-xs rounded-[2rem] border border-gray-100 dark:border-[#222] shadow-2xl relative z-10 overflow-hidden">
                        <button
                            onClick={() => { setIsAddModalOpen(false); if (showScanner) stopScanner(); }}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="p-8 pt-14">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const added = await handleAddLetter();
                                if (added) setIsAddModalOpen(false);
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
                                    {error && <p className="text-[10px] text-red-500 font-black uppercase">{error}</p>}
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
                                        disabled={loading || !lmsIdInput.trim()}
                                        className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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
                                                <div className="w-48 h-0.5 bg-blue-500 opacity-50 animate-bounce" />
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

            <style>{`
                @media print {
                    @page { size: portrait; margin: 15mm; }
                    body { background: white !important; color: black !important; }
                    aside, nav, header, .print-hidden, [role="navigation"] {
                        display: none !important;
                        width: 0 !important; height: 0 !important;
                        position: absolute !important; left: -9999px !important;
                    }
                    main { margin: 0 !important; padding: 0 !important; width: 100% !important; overflow: visible !important; }
                    * { background: transparent !important; color: black !important; -webkit-print-color-adjust: exact !important; }
                    input, textarea { border: none !important; outline: none !important; }
                }
            `}</style>
        </div>
    );
}
