
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronRight, ChevronLeft, Mail, Inbox, Search, Send, FileText, ClipboardList, ShieldCheck, HelpCircle } from "lucide-react";
import { useUI, useSession } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const TUTORIAL_COUNT_KEY = "lms_tutorial_auto_count";
const TUTORIAL_DISMISSED_KEY = "lms_tutorial_dismissed";

const tutorialSteps = [
    {
        icon: <Inbox className="w-8 h-8 text-blue-500" />,
        title: "Welcome to LMS",
        content: "LMS is where your office handles all official letters. Your Inbox is where you'll find letters assigned to you — just open a letter to review, sign, or forward it."
    },
    {
        icon: <Send className="w-8 h-8 text-orange-500" />,
        title: "Sending & Tracking",
        content: "Create new letters using the New Letter button. Once you send or forward a letter, it moves to your Outbox, which maintains an audit trail of everyone who handles it."
    },
    {
        icon: <Search className="w-8 h-8 text-emerald-500" />,
        title: "Finding Letters",
        content: "Use the Master Table to search for any letter, or scan its QR code to see its status and full history. You're all set! Enjoy the new LMS."
    }
];

export default function TutorialGuide() {
    const { isTutorialOpen, closeTutorial, startTutorial } = useUI();
    const { user, permissionsLoaded } = useSession();
    const location = useLocation();

    const [currentStep, setCurrentStep] = useState(0);
    const [displayedContent, setDisplayedContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const steps = tutorialSteps;

    // --- Typing Animation (no voice) ---
    useEffect(() => {
        if (!isTutorialOpen || steps.length === 0) return;
        const currentData = steps[currentStep];
        if (!currentData) return;

        setDisplayedContent("");
        setIsTyping(true);

        const content = currentData.content;
        let index = 0;

        const timer = setTimeout(() => {
            const typingInterval = setInterval(() => {
                setDisplayedContent(content.substring(0, index + 1));
                index++;
                if (index >= content.length) {
                    setIsTyping(false);
                    clearInterval(typingInterval);
                }
            }, 28);
            return () => clearInterval(typingInterval);
        }, 120);

        return () => clearTimeout(timer);
    }, [currentStep, isTutorialOpen]);

    // Reset on open
    useEffect(() => {
        if (isTutorialOpen) setCurrentStep(0);
    }, [isTutorialOpen]);

    // --- DIAGNOSTIC & AUTO-TRIGGER ---
    useEffect(() => {
        const countRaw = localStorage.getItem(TUTORIAL_COUNT_KEY);
        const count = parseInt(countRaw || "0");
        const isDismissed = localStorage.getItem(TUTORIAL_DISMISSED_KEY);
        const isPending = sessionStorage.getItem("lms_tutorial_pending") === "true";

        const failureReasons = [];
        if (location.pathname === "/login") failureReasons.push("On Login page");
        if (!isPending) failureReasons.push("Not marked as Pending");
        if (count > 3) failureReasons.push(`Limit reached (Count: ${count})`);
        if (!user) failureReasons.push("User not authenticated");
        if (!permissionsLoaded) failureReasons.push("Permissions loading");
        if (isTutorialOpen) failureReasons.push("Already open");

        console.groupCollapsed(`%c[TUTORIAL] Path: ${location.pathname}`, "color: #ff6b6b; font-weight: bold;");
        console.log(`%cCount: ${count}/3 | Pending: ${isPending} | Open: ${isTutorialOpen}`, "color: #4dabf7;");
        if (failureReasons.length > 0) {
            console.log("%cStatus: BLOCKED", "color: #fab005; font-weight: bold;");
            failureReasons.forEach(r => console.log(` ⛔ ${r}`));
        } else {
            console.log("%cStatus: TRIGGERING ✓", "color: #40c057; font-weight: bold;");
        }
        console.groupEnd();

        window.LMS_TUTORIAL_STATE = { count, isPending, isTutorialOpen, permissionsLoaded, failureReasons };

        if (failureReasons.length === 0 && !isTutorialOpen) {
            const timer = setTimeout(() => {
                startTutorial();
                sessionStorage.setItem("lms_tutorial_pending", "false");
                console.log("%c[TUTORIAL] ✅ Guide launched successfully!", "color: #40c057; font-weight:bold;");
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [location.pathname, isTutorialOpen, startTutorial, user, permissionsLoaded]);

    // --- Handlers ---
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleComplete = () => closeTutorial();
    const handleClose = () => closeTutorial();

    if (!isTutorialOpen || location.pathname === "/login") return null;

    const currentData = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
            {/* Full-screen Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto"
                onClick={handleClose}
            />

            {/* Centered Guide Container */}
            <div className="relative z-10 flex flex-col items-center gap-8 pointer-events-auto animate-in zoom-in-90 fade-in duration-500">

                {/* Animated Robot */}
                <div className="relative group shrink-0">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-[50px] opacity-25 animate-pulse" />
                    <div className="w-28 h-28 relative animate-float">
                        <div className="w-full h-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border-[6px] border-blue-500/10 flex flex-col items-center justify-center overflow-hidden relative">
                            {/* Robot Headband */}
                            <div className="w-full h-8 bg-blue-600 flex items-center justify-center gap-2 px-4 shadow-inner">
                                <div className={`w-1.5 h-1.5 bg-white rounded-full ${isTyping ? 'animate-ping' : 'opacity-40'}`} />
                                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className={`h-full bg-white transition-all duration-300 ${isTyping ? 'w-full' : 'w-0'}`} />
                                </div>
                            </div>
                            {/* Face Display */}
                            <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-4">
                                <div className="flex gap-4 mb-3">
                                    <div className="relative">
                                        <div className={`w-3 h-3 bg-blue-600 rounded-full ${isTyping ? 'animate-pulse scale-110' : 'animate-blink'}`} />
                                        <div className="absolute -inset-1 border border-blue-400/30 rounded-full animate-ping-slow" />
                                    </div>
                                    <div className="relative">
                                        <div className={`w-3 h-3 bg-blue-600 rounded-full ${isTyping ? 'animate-pulse scale-110' : 'animate-blink'}`} />
                                        <div className="absolute -inset-1 border border-blue-400/30 rounded-full animate-ping-slow" />
                                    </div>
                                </div>
                                <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                    {isTyping && <div className="absolute inset-0 bg-blue-500 animate-[shimmer_1s_infinite]" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Speech Bubble Card */}
                <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.2)] border border-white/20 dark:border-slate-700/50 w-[90vw] max-w-[460px] p-8 relative">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-5">
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                            LMS Guide • {currentStep + 1}/{steps.length}
                        </span>
                        <button
                            onClick={handleClose}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors group"
                        >
                            <X className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                        </button>
                    </div>

                    {/* Step Icon */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl shrink-0">
                            {currentData.icon}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                            {currentData.title}
                        </h3>
                    </div>

                    {/* Typed Content */}
                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8 min-h-[5rem] font-medium">
                        {displayedContent}
                        {isTyping && <span className="inline-block w-1.5 h-5 bg-blue-500 animate-pulse ml-1.5 rounded-full align-middle" />}
                    </p>

                    {/* Footer: Dots + Buttons */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-5">
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-3 items-center">
                            {currentStep > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="text-[11px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest flex items-center gap-1"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={isTyping}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black px-7 py-3 rounded-2xl shadow-xl shadow-blue-500/20 dark:shadow-none transition-all hover:scale-105 active:scale-95 uppercase tracking-widest flex items-center gap-2 group"
                            >
                                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    33% { transform: translateY(-8px) rotate(1deg); }
                    66% { transform: translateY(4px) rotate(-1deg); }
                }
                @keyframes blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes ping-slow {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                .animate-float { animation: float 5s ease-in-out infinite; }
                .animate-blink { animation: blink 4s ease-in-out infinite; }
                .animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
