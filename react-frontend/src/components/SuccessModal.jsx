
import React from 'react';
import { Check, LogOut, AlertTriangle, Printer } from 'lucide-react';

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
    canPrintQr = true,
    // Confirm variant props
    variant = 'success',
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
}) {
    const normalizedRef = (referenceNo || '').toString().trim();
    const canShowQr = !!normalizedRef && normalizedRef !== 'Generating...' && normalizedRef !== 'Select Department';

    const handlePrintQR = () => {
        const printWindow = window.open('', '_blank');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${normalizedRef}`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reference QR - ${normalizedRef}</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: sans-serif; 
                            background: white; 
                            display: flex;
                            align-items: flex-start;
                        }
                        @page { size: auto; margin: 0mm; }
                        .container { 
                            display: flex; 
                            align-items: center; 
                            gap: 2mm; 
                            padding: 2mm; 
                        }
                        img { 
                            width: 9mm; 
                            height: 9mm; 
                            object-fit: contain;
                        }
                        .ref { 
                            font-size: 8pt; 
                            font-weight: 900; 
                            white-space: nowrap;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img src="${qrUrl}" />
                        <div class="ref">${normalizedRef}</div>
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

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
                <div className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#333] animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 overflow-hidden">
                    <div className="p-8 flex flex-col items-center text-center gap-4">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                            <LogOut className="w-6 h-6 text-orange-500" />
                        </div>
                        {/* Title & message */}
                        <div>
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {title || 'Are you sure?'}
                            </p>
                            {message && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                                    {message}
                                </p>
                            )}
                        </div>
                        {/* Buttons */}
                        <div className="w-full flex gap-3 mt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.98]"
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
            <div className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#333] animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                        <Check className="w-7 h-7 text-white" strokeWidth={3} />
                    </div>
                    {/* Message */}
                    <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            Letter sent.
                        </p>
                        {normalizedRef && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
                                Ref: <span className="text-green-600 dark:text-green-400 font-bold">{normalizedRef}</span>
                            </p>
                        )}
                    </div>

                    {/* QR Code Section */}
                    {canShowQr && (
                        <div className="w-full flex flex-col items-center gap-4 py-4 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${normalizedRef}`}
                                    alt="QR Code"
                                    className="w-28 h-28"
                                />
                            </div>
                            {canPrintQr && (
                                <button
                                    onClick={handlePrintQR}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:opacity-70 transition-all"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Print QR Sticker
                                </button>
                            )}
                        </div>
                    )}
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="mt-2 w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                        {isGuest ? 'Send Another' : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
}
