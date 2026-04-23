
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { useUI, useSession } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const TUTORIAL_COUNT_KEY = "lms_tutorial_auto_count";
const TUTORIAL_DISMISSED_KEY = "lms_tutorial_dismissed";

export default function TutorialGuide() {
    const { 
        isSidebarExpanded, toggleSidebar, 
        isTutorialOpen, closeTutorial,
        expandedMenus, setExpandedMenus, toggleSubmenu
    } = useUI();
    const { user, hasPermission, permissionsLoaded } = useSession();
    const navigate = useNavigate();
    const location = useLocation();

    const [currentStep, setCurrentStep] = useState(0);
    const [stepTarget, setStepTarget] = useState(null);

    const { startTutorial } = useUI();

    const allSteps = [
        {
            title: "Hi!",
            content: "Welcome! Let's take a quick tour of LMS 2026.",
            target: null,
            position: "center"
        },
        {
            title: "Home",
            content: "See your activity and stats here.",
            target: "nav-home",
            position: "right",
            permission: "dashboard",
            path: "/"
        },
        {
            title: "New Letter",
            content: "Create and send new letters easily.",
            target: "nav-new-letter",
            position: "right",
            permission: "new-letter",
            path: "/new-letter"
        },
        {
            title: "Inbox",
            content: "Check and sign your incoming letters.",
            target: "nav-inbox",
            position: "right",
            permission: "dashboard",
            path: "/inbox"
        },
        {
            title: "Resumen",
            content: "View simple letter summaries.",
            target: "nav-resumen",
            position: "right",
            path: "/resumen"
        },
        {
            title: "Outbox",
            content: "Check letters you have sent out.",
            target: "nav-outbox",
            position: "right",
            path: "/outbox"
        },
        {
            title: "Master Table",
            content: "Search every letter in the system.",
            target: "nav-master-table",
            position: "right",
            permission: "master-table",
            path: "/master-table"
        },
        {
            title: "Dept Viewer",
            content: "Browse letters by department.",
            target: "nav-dept-viewer",
            position: "right",
            permission: "dept-viewer",
            path: "/dept-viewer"
        },
        {
            title: "Comments",
            content: "See letters with new comments.",
            target: "nav-letters-with-comment",
            position: "right",
            path: "/letters-with-comments"
        },
        {
            title: "Track Any Letter",
            content: "Find any letter using its ID or QR code.",
            target: "nav-letter-tracker",
            position: "right",
            permission: "letter-tracker",
            path: "/letter-tracker"
        },
        {
            title: "File Upload",
            content: "Upload your PDF files here.",
            target: "nav-upload-pdf-files",
            position: "right",
            path: "/upload-pdf"
        },
        {
            title: "Settings",
            content: "Manage system tools and users.",
            target: "nav-settings",
            position: "right",
            path: "#"
        },
        {
            title: "Access Matrix",
            content: "Set what each user role can do.",
            target: "nav-child-access-matrix",
            position: "right",
            permission: "role-matrix",
            path: "/setup/role-matrix"
        },
        {
            title: "App Settings",
            content: "Change how the application looks.",
            target: "nav-child-app-settings",
            position: "right",
            permission: "settings",
            path: "/settings"
        },
        {
            title: "Attachments",
            content: "Set rules for file attachments.",
            target: "nav-child-attachments",
            position: "right",
            permission: "attachments",
            path: "/setup/attachments"
        },
        {
            title: "Contacts",
            content: "Manage your contact list.",
            target: "nav-child-contacts",
            position: "right",
            permission: "persons",
            path: "/setup/persons"
        },
        {
            title: "Data Import",
            content: "Import information from files.",
            target: "nav-child-data-import",
            position: "right",
            permission: "data-import",
            path: "/setup/data-import"
        },
        {
            title: "Departments",
            content: "Manage your office departments.",
            target: "nav-child-departments",
            position: "right",
            permission: "departments",
            path: "/setup/departments"
        },
        {
            title: "Inter-Dept",
            content: "Manage rules between departments.",
            target: "nav-child-inter-dept-management",
            position: "right",
            permission: "inter-dept",
            path: "/setup/inter-dept"
        },
        {
            title: "Categories",
            content: "Set different letter types.",
            target: "nav-child-kinds",
            position: "right",
            permission: "letter-kinds",
            path: "/setup/letter-kinds"
        },
        {
            title: "User Roles",
            content: "Manage roles for your team.",
            target: "nav-child-roles",
            position: "right",
            permission: "roles",
            path: "/setup/roles"
        },
        {
            title: "Statuses",
            content: "Set statuses to track letters.",
            target: "nav-child-statuses",
            position: "right",
            permission: "statuses",
            path: "/setup/statuses"
        },
        {
            title: "Process Steps",
            content: "Set steps for letter processing.",
            target: "nav-child-steps",
            position: "right",
            permission: "process-steps",
            path: "/setup/process-steps"
        },
        {
            title: "Letter Trays",
            content: "Manage physical and digital trays.",
            target: "nav-child-trays",
            position: "right",
            permission: "trays",
            path: "/setup/trays"
        },
        {
            title: "Local Access",
            content: "Set access for your department.",
            target: "nav-child-unit-access-matrix",
            position: "right",
            permission: "dept-matrix",
            path: "/setup/dept-matrix"
        },
        {
            title: "User Accounts",
            content: "Manage all system user accounts.",
            target: "nav-child-users",
            position: "right",
            permission: "users",
            path: "/setup/users"
        },
        {
            title: "Need Help?",
            content: "Click this icon anytime to restart this guide.",
            target: "btn-help",
            position: "bottom"
        }
    ];

    const [displayedContent, setDisplayedContent] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // Filter steps based on PERMISSION ONLY
    const steps = useMemo(() => {
        return allSteps.filter(step => {
            if (step.permission && hasPermission) {
                if (!hasPermission(step.permission, 'can_view')) return false;
            }
            return true;
        });
    }, [hasPermission, isTutorialOpen]); 

    // Handle Typing Animation and Voice
    useEffect(() => {
        if (!isTutorialOpen || steps.length === 0) return;
        const currentData = steps[currentStep];
        if (!currentData) return;

        // Reset state
        setDisplayedContent("");
        const content = currentData.content;
        setIsTyping(true);
        window.speechSynthesis.cancel(); 

        let index = 0;
        
        // Voice Logic
        const speak = () => {
            const utterance = new SpeechSynthesisUtterance(content);
            const voices = window.speechSynthesis.getVoices();
            const maleVoice = voices.find(v => 
                v.name.toLowerCase().includes('male') || 
                v.name.toLowerCase().includes('guy') || 
                v.name.toLowerCase().includes('david') || 
                v.name.toLowerCase().includes('james')
            ) || voices[0];
            
            if (maleVoice) utterance.voice = maleVoice;
            utterance.rate = 1.05; 
            utterance.pitch = 0.9;
            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => speak();
        } else {
            speak();
        }

        // Delay start slightly to ensure clean state
        const timer = setTimeout(() => {
            const typingInterval = setInterval(() => {
                setDisplayedContent(content.substring(0, index + 1));
                index++;
                
                if (index >= content.length) {
                    setIsTyping(false);
                    clearInterval(typingInterval);
                }
            }, 30);
            
            return () => clearInterval(typingInterval);
        }, 100);

        return () => {
            clearTimeout(timer);
            window.speechSynthesis.cancel();
        };
    }, [currentStep, isTutorialOpen, steps]);

    useEffect(() => {
        if (isTutorialOpen) {
            setCurrentStep(0);
            if (!isSidebarExpanded) toggleSidebar();
        }
    }, [isTutorialOpen]);

    useEffect(() => {
        const count = parseInt(localStorage.getItem(TUTORIAL_COUNT_KEY) || "0");
        const isDismissed = localStorage.getItem(TUTORIAL_DISMISSED_KEY);
        
        // Wait for user AND permissions to be fully ready before checking for auto-start
        if (count < 3 && !isDismissed && user && permissionsLoaded && location.pathname !== "/login") {
            const timer = setTimeout(() => {
                if (!isTutorialOpen) {
                    console.log(`[TUTORIAL] Auto-triggering guide (Session #${count + 1})...`);
                    startTutorial();
                    localStorage.setItem(TUTORIAL_COUNT_KEY, (count + 1).toString());
                }
            }, 2500); // Slightly longer delay to ensure full render
            return () => clearTimeout(timer);
        }
    }, [location.pathname, isTutorialOpen, startTutorial, user, permissionsLoaded]);

    // Orchestrate UI
    useEffect(() => {
        if (!isTutorialOpen || steps.length === 0) return;

        const step = steps[currentStep];
        
        if (step?.target?.startsWith('nav-child-') && !expandedMenus['Settings']) {
            setExpandedMenus(prev => ({ ...prev, Settings: true }));
        }

        const updatePosition = () => {
            if (step?.target) {
                const el = document.getElementById(step.target);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    setStepTarget(rect);
                } else {
                    setStepTarget(null);
                }
            } else {
                setStepTarget(null);
            }
        };

        const timer = setTimeout(updatePosition, 100); 
        return () => clearTimeout(timer);
    }, [currentStep, isTutorialOpen, steps, expandedMenus, setExpandedMenus]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        closeTutorial();
        localStorage.setItem(TUTORIAL_DISMISSED_KEY, "true");
    };

    const handleClose = () => {
        closeTutorial();
        window.speechSynthesis.cancel();
    };

    if (!isTutorialOpen || location.pathname === "/login" || steps.length === 0) return null;

    const currentData = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {/* Backdrop with hole */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-500 pointer-events-auto"
                style={{
                    clipPath: stepTarget 
                        ? `polygon(0% 0%, 0% 100%, ${stepTarget.left}px 100%, ${stepTarget.left}px ${stepTarget.top}px, ${stepTarget.right}px ${stepTarget.top}px, ${stepTarget.right}px ${stepTarget.bottom}px, ${stepTarget.left}px ${stepTarget.bottom}px, ${stepTarget.left}px 100%, 100% 100%, 100% 0%)`
                        : 'none'
                }}
            />

            {/* Guide Container */}
            <div 
                className={`absolute transition-all duration-700 ease-out flex pointer-events-auto
                    ${!stepTarget ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8' : 'items-center gap-6'}
                `}
                style={stepTarget ? {
                    top: stepTarget.top < 120 
                        ? stepTarget.bottom + 40 
                        : (stepTarget.top + (stepTarget.height / 2)),
                    left: (stepTarget.right > window.innerWidth - 460) 
                        ? stepTarget.left - 30 
                        : stepTarget.right + 30,
                    transform: `
                        ${stepTarget.top < 120 ? '' : 'translateY(-50%)'} 
                        ${(stepTarget.right > window.innerWidth - 460) ? 'translateX(-100%)' : ''}
                    `,
                    flexDirection: (stepTarget.right > window.innerWidth - 460 && stepTarget.top >= 120) ? 'row-reverse' : 'row'
                } : {}}
            >
                {/* Premium Animated Robot Character */}
                <div className="relative group shrink-0">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-[40px] opacity-20 animate-pulse" />
                    <div className="w-24 h-24 lg:w-32 lg:h-32 relative animate-float">
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
                                <div className={`w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative`}>
                                    {isTyping && <div className="absolute inset-0 bg-blue-500 animate-[shimmer_1s_infinite]" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Glassmorphic Speech Bubble */}
                <div className={`
                    bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 dark:border-slate-700/50
                    w-[340px] lg:w-[420px] relative animate-in zoom-in-90 fade-in duration-500
                    ${stepTarget ? `
                        before:absolute before:w-6 before:h-6 before:bg-white/95 dark:before:bg-slate-800/95 before:border-l before:border-b before:border-slate-100 dark:before:border-slate-700/50 
                        ${stepTarget.top < 120 
                            ? 'before:-top-3 before:left-1/2 before:-translate-x-1/2 before:rotate-[135deg]' 
                            : 'before:top-1/2 before:-translate-y-1/2 before:rotate-45 ' + (stepTarget.right > window.innerWidth - 460 ? 'before:-right-3 before:border-l-0 before:border-b-0 before:border-r before:border-t' : 'before:-left-3')
                        }
                    ` : ''}
                `}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                            TUTORIAL • {currentStep + 1}/{steps.length}
                        </span>
                        <button 
                            onClick={handleClose}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors group"
                        >
                            <X className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                        </button>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight uppercase">
                        {currentData.title}
                    </h3>

                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8 min-h-[4rem] font-medium">
                        {displayedContent}
                        {isTyping && <span className="inline-block w-1.5 h-5 bg-blue-500 animate-pulse ml-1.5 rounded-full" />}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-6">
                        <div className="flex gap-1 max-w-[120px] flex-wrap">
                            {steps.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-4">
                            {currentStep > 0 && (
                                <button 
                                    onClick={handleBack}
                                    className="text-[11px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest active:scale-90"
                                >
                                    Back
                                </button>
                            )}
                            <button 
                                onClick={handleNext}
                                disabled={isTyping}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black px-8 py-3 rounded-2xl shadow-xl shadow-blue-500/20 dark:shadow-none transition-all hover:scale-105 active:scale-95 uppercase tracking-widest flex items-center gap-2 group"
                            >
                                {currentStep === steps.length - 1 ? 'Explore Now' : 'Next'}
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
                .animate-float {
                    animation: float 5s ease-in-out infinite;
                }
                .animate-blink {
                    animation: blink 4s ease-in-out infinite;
                }
                .animate-ping-slow {
                    animation: ping-slow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
