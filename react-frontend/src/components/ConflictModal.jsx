
import React from 'react';
import { AlertTriangle, RefreshCw, Check } from 'lucide-react';

/**
 * ConflictModal — specialized modal for Reference Code collisions (Race Condition)
 */
export default function ConflictModal({
    isOpen,
    onClose,
    currentCode,
    nextCode,
    onConfirm,
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#333] animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 overflow-hidden">
                {/* Warning Header */}
                <div className="bg-amber-500 h-2 w-full" />
                
                <div className="p-8 flex flex-col items-center text-center gap-6">
                    {/* Icon Stack */}
                    <div className="relative">
                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
                            <AlertTriangle className="w-10 h-10 text-amber-500" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-lg">
                            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin-slow" />
                        </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Code Already Taken
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                            The code was just used by another user. We've updated your form to the next available code.
                        </p>
                    </div>

                    {/* Code Comparison Card */}
                    <div className="w-full flex flex-col gap-3 p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taken Code</span>
                            <span className="text-xs font-bold text-red-500 line-through opacity-60 font-mono">{currentCode}</span>
                        </div>
                        
                        {/* Divider */}
                        <div className="h-px bg-slate-200 dark:bg-white/10 w-full" />

                        <div className="flex items-center justify-between px-2 py-1">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Updated Code</span>
                            <div className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tighter">{nextCode}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Click save again to confirm.
                    </p>

                    {/* Buttons */}
                    <div className="w-full flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                        >
                            Confirm & Save
                            <Check className="w-4 h-4" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
