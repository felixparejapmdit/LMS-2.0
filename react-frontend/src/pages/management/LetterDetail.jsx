
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import axios from "axios";
import {
  FileText,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Info,
  ExternalLink,
  MessageSquare,
  Paperclip,
  User as UserIcon,
  Zap,
  Tag,
  History,
  Send,
  Menu,
  Star,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useAccess from "../../hooks/useAccess";

export default function LetterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, layoutStyle, setIsMobileMenuOpen, isSidebarExpanded } = useAuth();
  const access = useAccess();
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfPanel, setPdfPanel] = useState({ isOpen: false, url: null, name: null });
  const canField = access?.canField || (() => true);
  const canPdf = canField("letter-detail", "pdf_button");
  const canBack = canField("letter-detail", "back_button");

  // Local component for the PDF Preview Panel
  const PdfPanel = ({ pdfPanel, setPdfPanel }) => {
    if (!pdfPanel.isOpen) return null;
    return (
      <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]" onClick={() => setPdfPanel({ isOpen: false, url: null, name: null })} />
        <div className="fixed right-0 top-0 h-full w-full max-w-3xl z-[110] flex flex-col bg-white dark:bg-[#111] shadow-2xl border-l border-gray-100 dark:border-[#222] animate-in slide-in-from-right duration-500">
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-[#222] shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Scanned Copy</span>
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[400px]">{pdfPanel.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={pdfPanel.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" /> Open Tab
              </a>
              <button
                onClick={() => setPdfPanel({ isOpen: false, url: null, name: null })}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-900">
            <iframe
              src={`${pdfPanel.url}#toolbar=0`}
              className="w-full h-full"
              style={{ border: 'none' }}
              title="PDF Preview"
            />
          </div>
        </div>
      </>
    );
  };

  // Helper: build browser-accessible URL from a stored file path (Windows absolute OR relative)
  const buildFileUrl = (rawPath) => {
    if (!rawPath) return null;
    const normalized = rawPath.replace(/\\/g, '/');
    const filename = normalized.split('/uploads/').pop();
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}/uploads/${filename}`;
  };

  // Friendly filename
  const getFilename = (rawPath) => rawPath?.split(/[/\\]/).pop() || rawPath;

  const fetchData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letters/${id}`);
      setLetter(response.data);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808] dark:bg-[#0D0D0D]">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  );

  if (!letter) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0D0D0D] p-8">
      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Record Not Found</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">The correspondence record you are looking for does not exist or has been removed.</p>
      <button
        onClick={() => navigate(-1)}
        className="px-8 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-blue-900/20 hover:bg-blue-700 transition-all"
      >
        Return to Workspace
      </button>
    </div>
  );

  if (layoutStyle === 'grid') {
    return (
      <>
        <PdfPanel pdfPanel={pdfPanel} setPdfPanel={setPdfPanel} />
        <div className="min-h-screen bg-slate-50 dark:bg-[#0D0D0D] flex overflow-hidden font-sans">
          <Sidebar />
          <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="h-20 bg-white dark:bg-[#0D0D0D] border-b border-slate-200 dark:border-[#222] px-4 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-50">
              <div className="flex items-center gap-3 md:gap-6">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 -ml-2 text-slate-400 md:hidden transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
                {canBack && (
                  <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#333] rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-white/10 hover:border-blue-100 transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Letter Details</span>
                  <h1 className="text-sm md:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase truncate max-w-[120px] md:max-w-none">{letter.lms_id}</h1>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
              <div className="w-full grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
                <div className="xl:col-span-3 space-y-8 md:space-y-10">
                  <section className="bg-white dark:bg-[#141414] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-[#222] shadow-xl shadow-slate-200/20 dark:shadow-black/20 space-y-8 md:space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-[1.5rem] flex items-center justify-center border border-blue-100 dark:border-blue-900/20">
                          <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{letter.sender}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 text-[9px] font-black rounded uppercase border border-slate-100 dark:border-[#333]">
                              {letter.kind?.kind_name || letter.letterKind?.kind_name || 'Standard'}
                            </span>
                            <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest leading-none">
                              Added on {new Date(letter.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <FileText className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Letter Summary
                      </label>
                      <div
                        className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] text-sm text-slate-700 dark:text-slate-300 leading-[1.8] font-medium border border-slate-50 dark:border-[#222]"
                        dangerouslySetInnerHTML={{ __html: letter.summary }}
                      />
                    </div>
                  </section>

                  <section className="bg-white dark:bg-[#141414] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-[#222] shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-500" />
                      Past Activity
                    </h3>
                    <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-50 dark:before:bg-[#222]">
                      {letter.assignments?.map((a, idx) => (
                        <div key={`assign-${idx}`} className="relative pl-12">
                          <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 ${a.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'} shadow-lg shadow-blue-500/20`}>
                            {a.status === 'Done' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{a.step?.step_name || 'Workflow Step'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{a.department?.dept_name}</p>
                            <span className="text-[9px] text-slate-300 font-black uppercase mt-1 block">
                              {a.completed_at ? `COMPLETED AT ${new Date(a.completed_at).toLocaleDateString()}` : `STATUS: ${a.status.toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      ))}
                      {letter.logs?.map((l, idx) => {
                        const isEndorsement = l.action_type === 'Endorsed';
                        return (
                          <div key={`log-${idx}`} className={`relative pl-12 ${isEndorsement ? 'opacity-100' : 'opacity-60'}`}>
                            <div className={`absolute left-1.5 top-2 w-5 h-5 rounded-full flex items-center justify-center z-10 ${isEndorsement ? 'bg-orange-500 shadow-xl shadow-orange-500/20' : 'bg-slate-200 dark:bg-[#333]'}`}>
                              {isEndorsement ? <Star className="w-3 h-3 text-white" /> : <Zap className="w-3 h-3 text-slate-400" />}
                            </div>
                            <p className={`text-[10px] font-black uppercase ${isEndorsement ? 'text-orange-500 tracking-widest' : 'text-slate-600 dark:text-slate-400'}`}>
                              {l.log_details || l.action_taken}
                            </p>
                            <p className="text-[8px] text-slate-400 font-black uppercase">{new Date(l.timestamp || l.log_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: true })}</p>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                </div>

                <div className="space-y-10">
                  <div className="bg-white dark:bg-[#141414] p-8 rounded-[2.5rem] border border-slate-100 dark:border-[#222] shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Letter Metadata
                    </h3>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-1.5 px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Letter Status</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{letter.status?.status_name || 'Unknown'}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-l-4 border-blue-500">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference Code</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{letter.lms_id}</span>
                        <span className="text-[9px] font-bold text-gray-400">Entry ID: {letter.entry_id}</span>
                      </div>
                      {letter.assignments?.some(a => a.due_date) && (
                        <div className="flex flex-col gap-1.5 px-6 py-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border-l-4 border-red-500">
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Deadline</span>
                          <span className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                            {new Date(Math.max(...letter.assignments.filter(a => a.due_date).map(a => new Date(a.due_date)))).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {letter.encoder && (
                        <div className="flex flex-col gap-1.5 px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encoded By</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{letter.encoder.first_name} {letter.encoder.last_name}</span>
                          <span className="text-[9px] font-bold text-gray-400">{letter.encoder.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#141414] p-8 rounded-[2.5rem] border border-slate-100 dark:border-[#222] shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Files
                    </h3>
                    {(() => {
                      const filePath = letter.scanned_copy || letter.attachment?.file_path;
                      const fileUrl = buildFileUrl(filePath);
                      const fileName = getFilename(filePath);
                      return canPdf && fileUrl ? (
                        <button
                          onClick={() => setPdfPanel({ isOpen: true, url: fileUrl, name: fileName })}
                          className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group w-full text-left"
                        >
                          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{fileName}</p>
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Scanned Copy · Click to Preview</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">No Documents Attached</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (layoutStyle === 'minimalist') {
    return (
      <>
        <PdfPanel pdfPanel={pdfPanel} setPdfPanel={setPdfPanel} />
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0D0D0D] flex overflow-hidden font-sans">
          <Sidebar />
          <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-[#E5E5E5] dark:border-[#222] px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-gray-400 transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
                {canBack && (
                  <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-[#1A1A1B] dark:hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1A1A1B] dark:text-white" />
                  <div>
                    <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Letter Data</h1>
                    <h2 className="text-sm font-black uppercase tracking-tight text-[#1A1A1B] dark:text-white">{letter.lms_id}</h2>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10 custom-scrollbar">
              <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
                  <div className="lg:col-span-2 space-y-10">
                    <section>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400">
                          <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#737373] uppercase tracking-widest">Sender / Entity</h2>
                          <p className="text-2xl font-bold text-[#1A1A1B] dark:text-white tracking-tight">{letter.sender}</p>
                        </div>
                      </div>
                      <div className="p-8 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-3xl shadow-sm">
                        <h3 className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em] mb-4">Letter Summary</h3>
                        <div className="prose dark:prose-invert max-w-none text-[#1A1A1B] dark:text-gray-300 leading-relaxed font-sans text-lg" dangerouslySetInnerHTML={{ __html: letter.summary }} />
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-sm font-bold text-[#1A1A1B] dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4" /> Letter History
                      </h3>
                      <div className="space-y-4">
                        {letter.assignments?.map((a, idx) => (
                          <div key={`min-assign-${idx}`} className="p-4 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${a.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                              <div>
                                <p className="text-xs font-bold text-[#1A1A1B] dark:text-white uppercase">{a.step?.step_name || 'Processing'}</p>
                                <p className="text-[10px] text-[#737373] uppercase font-bold">{a.department?.dept_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-[#A3A3A3] uppercase">
                                {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : 'In Progress'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {letter.logs?.map((l, idx) => {
                          const isEndorsement = l.action_type === 'Endorsed';
                          return (
                            <div key={`min-log-${idx}`} className="p-4 bg-gray-50/50 dark:bg-white/5 border border-dashed border-[#E5E5E5] dark:border-[#222] rounded-2xl flex items-center justify-between opacity-80 transition-all hover:opacity-100">
                              <div className="flex items-center gap-3">
                                <Zap className={`w-3 h-3 ${isEndorsement ? 'text-orange-500' : 'text-gray-400'}`} />
                                <p className="text-[10px] font-bold text-[#737373] dark:text-gray-400 uppercase tracking-tight">{l.log_details || l.action_taken}</p>
                              </div>
                              <span className="text-[9px] font-black text-[#A3A3A3] uppercase whitespace-nowrap">
                                {new Date(l.timestamp || l.log_date).toLocaleDateString()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <section className="p-6 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-3xl shadow-sm">
                      <h3 className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-6">Letter Metadata</h3>
                      <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-[#A3A3A3] font-bold uppercase tracking-tighter">Current Status</span>
                          <span className="text-xs font-bold text-[#1A1A1B] dark:text-white uppercase">{letter.status?.status_name || 'Active'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-[#A3A3A3] font-bold uppercase tracking-tighter">Stored In</span>
                          <span className="text-xs font-bold text-[#1A1A1B] dark:text-white uppercase flex items-center gap-1.5 cursor-help" title="Physical Tray Number">
                            <MapPin className="w-3 h-3" />
                            {letter.tray?.tray_no || 'Pending Filing'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-[#A3A3A3] font-bold uppercase tracking-tighter">Category</span>
                          <span className="text-xs font-bold text-[#1A1A1B] dark:text-white uppercase">{letter.letterKind?.kind_name || letter.kind?.kind_name || 'Standard'}</span>
                        </div>
                      </div>
                    </section>

                    <section className="p-6 bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-3xl shadow-sm">
                      <h3 className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-6">Digital Copy</h3>
                      {(() => {
                        const filePath = letter.scanned_copy || letter.attachment?.file_path;
                        const fileUrl = buildFileUrl(filePath);
                        const fileName = getFilename(filePath);
                        return canPdf && fileUrl ? (
                          <button
                            onClick={() => setPdfPanel({ isOpen: true, url: fileUrl, name: fileName })}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-gray-200 transition-all group w-full text-left"
                          >
                            <div className="w-10 h-10 bg-[#1A1A1B] text-white rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#1A1A1B] dark:text-white truncate">{fileName}</p>
                              <p className="text-[9px] text-[#737373] uppercase tracking-widest mt-0.5">PDF Document · Preview</p>
                            </div>
                          </button>
                        ) : (
                          <div className="py-4 text-center border border-dashed border-gray-100 rounded-2xl">
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">No Electronic Copy</p>
                          </div>
                        );
                      })()}
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (layoutStyle === 'notion') {
    return (
      <>
        <PdfPanel pdfPanel={pdfPanel} setPdfPanel={setPdfPanel} />
        <div className="min-h-screen bg-white dark:bg-[#191919] flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-10 pb-16 md:pb-24 relative">
              <button onClick={() => setIsMobileMenuOpen(true)} className="fixed top-6 left-4 p-2 bg-white/80 dark:bg-[#191919]/80 backdrop-blur shadow-sm border border-gray-100 dark:border-[#333] rounded-lg text-gray-400 md:hidden z-40">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 text-gray-400 mb-8 lowercase text-xs font-semibold">
                {canBack && (
                  <button onClick={() => navigate(-1)} className="hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                    <ChevronLeft className="w-3 h-3" /> back
                  </button>
                )}
                <span>/</span>
                <span className="text-gray-900 dark:text-gray-200">{letter.lms_id}</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tighter mb-8 leading-none">
                {letter.sender}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
                <div className="md:col-span-3 space-y-12">
                  <div className="aspect-[3/4] bg-gray-50 dark:bg-white/5 rounded-sm border border-gray-100 dark:border-[#222] shadow-2xl flex items-center justify-center relative overflow-hidden group">
                    <div className="text-center group-hover:scale-105 transition-transform duration-500">
                      <FileText className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-xs font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">Digital preview canvas</p>
                    </div>
                    {canPdf && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(() => {
                          const filePath = letter.scanned_copy || letter.attachment?.file_path;
                          const fileUrl = buildFileUrl(filePath);
                          const fileName = getFilename(filePath);
                          return fileUrl && (
                            <button
                              onClick={() => setPdfPanel({ isOpen: true, url: fileUrl, name: fileName })}
                              className="p-2 bg-white dark:bg-black rounded border border-gray-100 dark:border-[#333] shadow-sm hover:bg-gray-50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <section>
                    <h3 className="text-sm font-bold text-gray-300 dark:text-gray-600 uppercase mb-4 tracking-widest">Letter Summary</h3>
                    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed text-lg font-sans" dangerouslySetInnerHTML={{ __html: letter.summary }} />
                  </section>

                  <section>
                    <h3 className="text-sm font-bold text-gray-300 dark:text-gray-600 uppercase mb-4 tracking-widest">Attachments</h3>
                    {(() => {
                      const filePath = letter.scanned_copy || letter.attachment?.file_path;
                      const fileUrl = buildFileUrl(filePath);
                      const fileName = getFilename(filePath);
                      return canPdf && fileUrl ? (
                        <button
                          onClick={() => setPdfPanel({ isOpen: true, url: fileUrl, name: fileName })}
                          className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group w-full text-left"
                        >
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{fileName}</p>
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Scanned Copy · Preview</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <div className="p-12 border-2 border-dashed border-gray-50 dark:border-[#222] rounded-xl text-center">
                          <Paperclip className="w-8 h-8 text-gray-100 dark:text-gray-800 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No external docs uploaded.</p>
                        </div>
                      );
                    })()}
                  </section>
                </div>

                <div className="space-y-10">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Letter Details</h4>
                    <div className="space-y-5">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-400 uppercase font-black tracking-tighter text-[9px]">Category</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{letter.letterKind?.kind_name || letter.kind?.kind_name || 'Standard'}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-400 uppercase font-black tracking-tighter text-[9px]">Status</span>
                        <span className="text-orange-600 font-bold uppercase">{letter.status?.status_name || 'Pending'}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-400 uppercase font-black tracking-tighter text-[9px]">Stored In</span>
                        <span className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1 uppercase">
                          <MapPin className="w-3 h-3 text-gray-300" />
                          {letter.tray?.tray_no || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Past Activity</h4>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {letter.assignments?.map((a, idx) => (
                        <div key={`notion-assign-${idx}`} className="flex gap-3 relative before:absolute before:left-1.5 before:top-4 before:bottom-[-16px] before:w-[1px] before:bg-gray-100 dark:before:bg-[#333] last:before:hidden">
                          <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${a.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <div className="pb-4">
                            <p className="text-[11px] font-bold text-gray-900 dark:text-white uppercase leading-none mb-1">{a.step?.step_name || 'Workflow Step'}</p>
                            <p className="text-[9px] text-gray-400 uppercase font-medium">{a.department?.dept_name}</p>
                            <p className="text-[8px] text-gray-300 uppercase mt-0.5">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : 'IN PROGRESS'}</p>
                          </div>
                        </div>
                      ))}
                      {letter.logs?.sort((a, b) => new Date(b.timestamp || b.log_date) - new Date(a.timestamp || a.log_date)).map((l, idx) => (
                        <div key={`notion-log-${idx}`} className="flex gap-3 relative before:absolute before:left-1.5 before:top-4 before:bottom-[-16px] before:w-[1px] before:bg-gray-100 dark:before:bg-[#333] last:before:hidden opacity-80 group hover:opacity-100">
                          <div className="w-3 h-3 flex items-center justify-center mt-1 shrink-0">
                            <Zap className="w-2.5 h-2.5 text-gray-200 dark:text-gray-700 group-hover:text-amber-500 transition-colors" />
                          </div>
                          <div className="pb-4">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-tight mb-1 uppercase tracking-tight">{l.log_details || l.action_taken}</p>
                            <p className="text-[8px] text-gray-300 dark:text-gray-600 uppercase font-black">{new Date(l.timestamp || l.log_date).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Default Layout
  return (
    <>
      <PdfPanel pdfPanel={pdfPanel} setPdfPanel={setPdfPanel} />
      <div className="flex h-screen bg-neutral-50 dark:bg-[#0D0D0D] overflow-hidden font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-[#222] px-4 md:px-8 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden">
                <Menu className="w-5 h-5" />
              </button>
              {canBack && (
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-full transition-all group">
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </button>
              )}
              <div>
                <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{letter.lms_id}</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Letter Details</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-gray-50 dark:border-[#222] bg-slate-50/30 dark:bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <FileText className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Who Sent This</h2>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-tight">Verified Source</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">When Received</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(letter.date_received).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: true })}</p>
                    </div>
                  </div>

                  <div className="p-10">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-6 leading-tight uppercase tracking-tight">{letter.sender}</h3>
                    <div className="flex flex-wrap gap-3 mb-10">
                      <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100/50 dark:border-blue-900/20">
                        {letter.letterKind?.kind_name || letter.kind?.kind_name || 'Standard'}
                      </span>
                      <span className="px-4 py-1.5 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-orange-100/50 dark:border-orange-900/20">
                        STATUS: {letter.status?.status_name || 'Unknown'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-3 h-3 text-blue-500" />
                        Letter Summary
                      </h4>
                      <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-[#222] text-gray-700 dark:text-gray-300 leading-relaxed font-sans text-lg" dangerouslySetInnerHTML={{ __html: letter.summary }} />
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] p-10 shadow-sm">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    Letter History
                  </h3>
                  <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-50 dark:before:bg-[#222]">
                    {letter.assignments?.map((a, idx) => (
                      <div key={`def-assign-${idx}`} className="relative pl-12">
                        <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 ${a.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'} shadow-lg`}>
                          {a.status === 'Done' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{a.step?.step_name || 'Processing'}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{a.department?.dept_name}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${a.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {a.status}
                            </span>
                            <p className="text-[8px] text-gray-400 mt-1 uppercase font-black">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : 'Active Session'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {letter.logs?.sort((a, b) => new Date(b.timestamp || b.log_date) - new Date(a.timestamp || a.log_date)).map((l, idx) => {
                      const isEndorsement = l.action_type === 'Endorsed';
                      return (
                        <div key={`def-log-${idx}`} className={`relative pl-12 ${isEndorsement ? 'opacity-100' : 'opacity-60'}`}>
                          <div className={`absolute left-1.5 top-2 w-5 h-5 rounded-full flex items-center justify-center z-10 ${isEndorsement ? 'bg-orange-500 shadow-xl shadow-orange-500/20' : 'bg-gray-200 dark:bg-[#333]'}`}>
                            {isEndorsement ? <Star className="w-3 h-3 text-white" /> : <Zap className="w-3 h-3 text-gray-400" />}
                          </div>
                          <p className={`text-[10px] font-black uppercase ${isEndorsement ? 'text-orange-500 tracking-widest' : 'text-gray-600 dark:text-gray-400'}`}>
                            {l.log_details || l.action_taken}
                          </p>
                          <p className="text-[8px] text-gray-400 uppercase font-black">{new Date(l.timestamp || l.log_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short', hour12: true })}</p>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] p-8 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-6">Location Info</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Physical Tray</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{letter.tray?.tray_no || 'Pending Filing'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] p-8 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-500" /> Files
                  </h3>
                  {(() => {
                    const filePath = letter.scanned_copy || letter.attachment?.file_path;
                    const fileUrl = buildFileUrl(filePath);
                    const fileName = getFilename(filePath);
                    return canPdf && fileUrl ? (
                      <button
                        onClick={() => setPdfPanel({ isOpen: true, url: fileUrl, name: fileName })}
                        className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group w-full text-left"
                      >
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase truncate">{fileName}</p>
                          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Scanned Copy · Click to Preview</p>
                        </div>
                      </button>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 font-bold uppercase tracking-widest">No Documents Attached</p>
                      </div>
                    );
                  })()}
                </section>

                <section className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 opacity-50" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Internal Instruction</h3>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed font-medium">Please ensure the summary accurately reflects the urgency needed for the reply. Check for attachments twice before filing.</p>
                  <div className="mt-8 pt-6 border-t border-white/20 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase leading-none">{letter.encoder?.first_name || 'Admin'}</p>
                      <p className="text-[9px] opacity-60">Lead Encoder</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
