
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Building2,
    GitMerge,
    Tags,
    Users as UserGroup,
    ChevronRight,
    ChevronLeft,
    Layout,
    Rocket,
    CheckCircle2,
    Zap,
    Box,
    Sparkles
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import departmentService from "../../services/departmentService";
import processStepService from "../../services/processStepService";
import letterKindService from "../../services/letterKindService";

const StepIcon = ({ icon: Icon, active, completed }) => (
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 scale-animation ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' :
        completed ? 'bg-green-500 text-white shadow-lg shadow-green-500/10' :
            'bg-slate-100 dark:bg-white/5 text-slate-400'
        }`}>
        <Icon className="w-6 h-6" />
    </div>
);

export default function SetupWizard() {
    const { user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [deptData, setDeptData] = useState({ dept_name: "", dept_code: "" });
    const [dnaTemplate, setDnaTemplate] = useState("Standard");
    const [processSteps, setProcessSteps] = useState([
        { step_name: "Incoming", description: "Initial retrieval of mail" },
        { step_name: "For Review", description: "Managerial review" },
        { step_name: "For Signature", description: "Final signature process" }
    ]);
    const [letterKinds, setLetterKinds] = useState([
        { kind_name: "Memorandum", description: "Internal policies" },
        { kind_name: "Letter", description: "General correspondence" }
    ]);

    const totalSteps = 5;

    const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Create Department
            const dept = await departmentService.create(deptData);
            const deptId = dept.id;

            // 2. Create Steps scoped to this Dept
            for (const s of processSteps) {
                await processStepService.create({ ...s, dept_id: deptId });
            }

            // 3. Create Kinds scoped to this Dept
            for (const k of letterKinds) {
                await letterKindService.create({ ...k, dept_id: deptId });
            }

            setStep(6); // Success screen
        } catch (error) {
            console.error("Wizard failed:", error);
            const msg = error.response?.data?.error || error.message;
            const details = error.response?.data?.details?.join(", ") || "";
            alert(`Setup failed: ${msg} ${details ? `(${details})` : ""}`);
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Your Platform. Your DNA.</h2>
                            <p className="text-slate-400 font-medium">LMS 2.0 is now pluggable. Let's build your department's core infrastructure in under 2 minutes.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl space-y-3">
                                <Zap className="w-8 h-8 text-blue-600" />
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Scoped Workflows</h3>
                                <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-black">Define steps that only your team sees.</p>
                            </div>
                            <div className="p-6 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-3xl space-y-3">
                                <Sparkles className="w-8 h-8 text-purple-600" />
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Custom Branding</h3>
                                <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-black">Your logo, your colors, your rules.</p>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Establish Identity</h2>
                            <p className="text-slate-400 font-medium">What is the name and code of this new workspace?</p>
                            <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Tip: Use a name that doesn't exist yet (e.g. "Public Affairs")</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-3xl text-slate-800 dark:text-white font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="e.g. Strategic Planning Division"
                                    value={deptData.dept_name}
                                    onChange={e => setDeptData({ ...deptData, dept_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dept Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-3xl text-slate-800 dark:text-white font-bold outline-none focus:border-blue-500 transition-all shadow-sm uppercase"
                                    placeholder="e.g. SPD-2026"
                                    value={deptData.dept_code}
                                    onChange={e => setDeptData({ ...deptData, dept_code: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Choose DNA Blueprint</h2>
                            <p className="text-slate-400 font-medium">Select a workflow template to pre-configure your dashboard.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { id: "Standard", title: "Standard Office", desc: "Best for general intake and approval flows.", icon: Layout },
                                { id: "Logistics", title: "Inventory & Logistics", desc: "Focused on distribution and tracking.", icon: Box },
                                { id: "Executive", title: "Executive Suite", desc: "High-security, signature-focused workflow.", icon: ShieldAlert }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setDnaTemplate(t.id)}
                                    className={`flex items-center gap-6 p-6 rounded-[2.5rem] border-2 transition-all text-left ${dnaTemplate === t.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-blue-200'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dnaTemplate === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                        <t.icon className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.title}</h4>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Workflow DNA</h2>
                            <p className="text-slate-400 font-medium">Verify the process steps that will define your inbox tabs.</p>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {processSteps.map((s, i) => (
                                <div key={i} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">{i + 1}</div>
                                        <div>
                                            <h5 className="text-[10px] font-black uppercase text-slate-800 dark:text-white">{s.step_name}</h5>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{s.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setProcessSteps(processSteps.filter((_, idx) => idx !== i))} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><ChevronLeft className="w-4 h-4 rotate-45" /></button>
                                </div>
                            ))}
                            <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all">+ Add custom process step</button>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-8">
                        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/40 mb-8">
                            <Rocket className="w-12 h-12" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Ready for Launch</h2>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto">One click to build the infrastructure for <span className="text-blue-600 font-black">{deptData.dept_name || 'your department'}</span>.</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-6 text-left space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                                <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{deptData.dept_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow</span>
                                <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{dnaTemplate} Blueprint</span>
                            </div>
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500 text-center py-12">
                        <div className="w-32 h-32 bg-green-500 rounded-[3rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-500/40 mb-8">
                            <CheckCircle2 className="w-16 h-16" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">DNA Activated.</h2>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto">The workspace is ready. You can now assign users to this department.</p>
                        </div>
                        <button
                            onClick={() => navigate("/setup/users")}
                            className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/20 active:scale-95"
                        >
                            Manage Users
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0D0D0D] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background design */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Stepper Header */}
                {step < 6 && (
                    <div className="flex items-center justify-between mb-16 px-4">
                        <StepIcon icon={Building2} active={step === 2} completed={step > 2} />
                        <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-700 ${step > 2 ? 'bg-green-500' : 'bg-slate-100 dark:bg-white/5'}`} />
                        <StepIcon icon={Layout} active={step === 3} completed={step > 3} />
                        <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-700 ${step > 3 ? 'bg-green-500' : 'bg-slate-100 dark:bg-white/5'}`} />
                        <StepIcon icon={GitMerge} active={step === 4} completed={step > 4} />
                        <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-700 ${step > 4 ? 'bg-green-500' : 'bg-slate-100 dark:bg-white/5'}`} />
                        <StepIcon icon={Rocket} active={step === 5} />
                    </div>
                )}

                {/* Main Wizard Card */}
                <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-[3.5rem] shadow-2xl p-10 md:p-16 relative overflow-hidden">
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    {step < 6 && (
                        <div className="flex items-center justify-between mt-12 gap-4 pt-8 border-t border-slate-50 dark:border-white/5">
                            <button
                                onClick={handleBack}
                                disabled={step === 1 || loading}
                                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${step === 1 ? 'opacity-0' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                    }`}
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button
                                onClick={step === totalSteps ? handleSubmit : handleNext}
                                disabled={loading || (step === 2 && (!deptData.dept_name || !deptData.dept_code))}
                                className="group flex items-center gap-3 px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none min-w-[140px] justify-center"
                            >
                                {loading ? 'Building...' : step === totalSteps ? 'Launch DNA' : 'Next Step'}
                                {!loading && <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {step < 6 && (
                    <div className="flex items-center justify-center gap-8 mt-12 opacity-40 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security: Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <UserGroup className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Context: Super Admin</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Support Icons
const ShieldAlert = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
);
