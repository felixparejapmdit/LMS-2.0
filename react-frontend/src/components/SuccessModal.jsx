
import React from 'react';
import { Check, LogOut, AlertTriangle } from 'lucide-react';

/**
 * SuccessModal — dual-purpose modal component
 *
 * variant="success" (default) — shows letter-sent confirmation
 * variant="confirm"           — shows a destructive confirm/cancel dialog
 */
export default function SuccessModal({
    isOpen,
    onClose,
    referenceNo,
    isGuest = false,
    // Confirm variant props
    variant = 'success',
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
}) {
    if (!isOpen) return null;

    if (variant === 'confirm') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />
                {/* Modal */}
                <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 overflow-hidden">
                    <div className="p-8 flex flex-col items-center text-center gap-4">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                            <LogOut className="w-6 h-6 text-orange-500" />
                        </div>
                        {/* Title & message */}
                        <div>
                            <p className="text-lg font-black text-slate-900 tracking-tight">
                                {title || 'Are you sure?'}
                            </p>
                            {message && (
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {message}
                                </p>
                            )}
                        </div>
                        {/* Buttons */}
                        <div className="w-full flex gap-3 mt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:bg-slate-200 active:scale-[0.98]"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-500/20"
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: success variant
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                        <Check className="w-7 h-7 text-white" strokeWidth={3} />
                    </div>
                    {/* Message */}
                    <div>
                        <p className="text-lg font-black text-slate-900 tracking-tight">
                            Letter sent.
                        </p>
                        {referenceNo && (
                            <p className="text-xs text-slate-400 mt-1 font-mono">
                                Ref: <span className="text-green-600 font-bold">{referenceNo}</span>
                            </p>
                        )}
                    </div>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="mt-2 w-full py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                        {isGuest ? 'Send Another' : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
}
