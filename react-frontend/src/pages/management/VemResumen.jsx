
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Printer, 
    ArrowLeft, 
    ArrowRight, 
    Search,
    Loader2,
    X,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import letterService from '../../services/letterService';
import Sidebar from '../../components/Sidebar';

export default function VemResumen() {
    const navigate = useNavigate();
    const { user, layoutStyle } = useAuth();
    const [letters, setLetters] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [lmsIdInput, setLmsIdInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Signatories State
    const [courierName, setCourierName] = useState('');
    const [notation, setNotation] = useState('');

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const format12h = (date) => {
        return date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });
    };

    const handleAddLetter = async (e) => {
        e.preventDefault();
        if (!lmsIdInput.trim()) return;
        
        setLoading(true);
        setError('');
        try {
            const letter = await letterService.getByLmsId(lmsIdInput.trim());
            if (letters.find(l => l.id === letter.id)) {
                setError('Letter already in the list.');
            } else {
                setLetters([...letters, letter]);
                setLmsIdInput('');
                setIsAddModalOpen(false);
            }
        } catch (err) {
            setError('Letter not found. Please check the LMS ID.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        setLetters(letters.filter(l => l.id !== id));
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleForward = () => {
        navigate('/vip-view');
    };

    const handlePrint = () => {
        window.print();
    };

    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';

    return (
        <div className="min-h-screen bg-[#F7F7F7] dark:bg-[#0D0D0D] flex overflow-hidden font-sans print:bg-white">
            <div className="print:hidden">
                <Sidebar />
            </div>

            <main className="flex-1 overflow-y-auto print:overflow-visible">
                <div className="max-w-6xl mx-auto p-4 md:p-12 print:p-0 print:max-w-none">
                    
                    {/* Header: Action Buttons */}
                    <div className="flex items-center justify-between mb-8 print:hidden">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleBack}
                                className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                                title="Back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>VEM Resumen</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-black rounded-2xl transition-all shadow-sm hover:shadow-md uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" />
                                Add Letter
                            </button>
                            <button 
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 hover:bg-blue-700 uppercase tracking-widest"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                            <button 
                                onClick={handleForward}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 uppercase tracking-widest"
                            >
                                Forward
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* The Report Document View */}
                    <div className={`${cardBg} shadow-2xl rounded-[3rem] p-12 border min-h-[1000px] flex flex-col print:shadow-none print:border-none print:p-0 print:rounded-none`}>
                        
                        {/* Document Header */}
                        <div className="flex justify-between items-start mb-12 pb-8 border-b dark:border-white/10">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                                    <span className="text-2xl font-black">L</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">LMS 2.0 RESUMEN</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Correspondence Summary Report</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="space-y-1">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Petsa ipinadala</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    <div className="flex flex-col mt-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oras ipinadala</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{format12h(currentTime)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Letter Table */}
                        <div className="flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-slate-900 dark:border-white">
                                        <th className="py-6 px-4 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest w-16">Row #</th>
                                        <th className="py-6 px-4 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Pangalan ng sumulat / Lokal / Distrito</th>
                                        <th className="py-6 px-4 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">NILALAMAN</th>
                                        <th className="py-6 px-4 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest print:hidden w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {letters.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-32 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-700">
                                                    <AlertCircle className="w-16 h-16" />
                                                    <p className="text-lg font-bold uppercase tracking-widest italic">No letters added yet. Click 'Add Letter' to start.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        letters.map((letter, index) => (
                                            <tr key={letter.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                                <td className="py-8 px-4 text-sm font-black text-slate-400">{index + 1}</td>
                                                <td className="py-8 px-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white uppercase">{letter.sender}</span>
                                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">{letter.lms_id}</span>
                                                    </div>
                                                </td>
                                                <td className="py-8 px-4">
                                                    <div 
                                                        className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl"
                                                        dangerouslySetInnerHTML={{ __html: letter.summary }}
                                                    />
                                                </td>
                                                <td className="py-8 px-4 print:hidden">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => navigate(`/letter/${letter.id}`)}
                                                            className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl text-slate-400 hover:text-blue-500 transition-all border border-transparent hover:border-blue-100 shadow-sm"
                                                            title="Edit/View"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(letter.id)}
                                                            className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100 shadow-sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Signature and Meta Section */}
                        <div className="mt-16 pt-12 border-t-2 border-slate-900 dark:border-white">
                            <div className="flex items-center justify-between mb-20">
                                <div className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-4">
                                    <span>Kabuuang bilang ng sulat:</span>
                                    <span className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center text-xl">
                                        {letters.length}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
                                <div className="flex flex-col gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Naghanda</span>
                                        <div className="border-b-2 border-slate-200 dark:border-white/20 pb-2">
                                            <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                {user?.first_name} {user?.last_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pangalan ng nagdala</span>
                                        <input 
                                            type="text"
                                            value={courierName}
                                            onChange={(e) => setCourierName(e.target.value)}
                                            placeholder="Full Name"
                                            className="bg-transparent border-b-2 border-slate-200 dark:border-white/20 pb-2 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all uppercase placeholder:italic placeholder:text-slate-300 print:placeholder:text-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Notasyon</span>
                                        <textarea 
                                            value={notation}
                                            onChange={(e) => setNotation(e.target.value)}
                                            placeholder="Write notations here..."
                                            rows={1}
                                            className="bg-transparent border-b-2 border-slate-200 dark:border-white/20 pb-1 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all uppercase placeholder:italic placeholder:text-slate-300 resize-none print:placeholder:text-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-20 text-center">
                                <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">LMS 2.0 OFFICIAL DOCUMENT</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Letter Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
                    <div className="bg-white dark:bg-[#141414] w-full max-w-md rounded-[3rem] border border-white/20 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-6">
                                <Search className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Quick Add</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Enter the LMS ID to fetch details</p>
                            
                            <form onSubmit={handleAddLetter} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold uppercase border border-red-100 dark:border-red-500/20">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}
                                
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="LMS26-00000"
                                    value={lmsIdInput}
                                    onChange={(e) => setLmsIdInput(e.target.value)}
                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl text-lg font-black uppercase text-center focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:italic"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-blue-500/20 hover:bg-blue-700 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Add
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    @page {
                        size: portrait;
                        margin: 20mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    .print-hidden, .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

