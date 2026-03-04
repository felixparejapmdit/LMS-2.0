
import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, referenceNo, title = "Letter Sent Successfully", message = "The letter has been registered in the system." }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#141414] rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-orange-400 to-orange-600 opacity-10" />

                <div className="p-8 md:p-12 flex flex-col items-center text-center relative z-10">
                    {/* Success Icon */}
                    <div className="w-24 h-24 mb-8 relative">
                        <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20" />
                        <div className="relative w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <Check className="w-12 h-12 text-white" strokeWidth={3} />
                        </div>
                    </div>

                    {/* Text Content */}
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
                        {title}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                        {message}
                    </p>

                    {/* Reference Card */}
                    {referenceNo && (
                        <div className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 mb-8">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Reference Number</span>
                            <span className="text-xl font-black text-orange-600 dark:text-orange-500 tracking-tighter uppercase">{referenceNo}</span>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                    >
                        Continue to Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
