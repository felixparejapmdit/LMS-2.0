
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
  Menu
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function LetterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, layoutStyle, setIsMobileMenuOpen } = useAuth();
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Helper: build browser-accessible URL from a stored file path (Windows absolute OR relative)
  const buildFileUrl = (rawPath) => {
    if (!rawPath) return null;
    const normalized = rawPath.replace(/\\/g, '/');
    const filename = normalized.split('/uploads/').pop();
    return `http://localhost:5000/uploads/${filename}`;
  };

  // Friendly filename
  const getFilename = (rawPath) => rawPath?.split(/[/\\]/).pop() || rawPath;

  const fetchData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/letters/${id}`);
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

  const handleMarkAsDone = async () => {
    setActionLoading(true);
    try {
      // Find the pending assignment for this user's dept
      const deptId = user.dept_id?.id || user.dept_id;
      const assignment = letter.assignments?.find(a =>
        (a.department_id === deptId || a.department?.id === deptId) && a.status !== 'Done'
      );

      if (assignment) {
        await axios.put(`http://localhost:5000/api/letter-assignments/${assignment.id}`, {
          status: "Done",
          completed_at: new Date()
        });

        fetchData();
        alert("Task marked as complete.");
      }
    } catch (error) {
      console.error("Mark as done failed:", error);
    } finally {
      setActionLoading(false);
    }
  };

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
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#333] rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-white/10 hover:border-blue-100 transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Detail View</span>
                <h1 className="text-sm md:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase truncate max-w-[120px] md:max-w-none">{letter.lms_id}</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
            <div className="w-full max-w-full grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-10">

              {/* Main Content (3 Columns) */}
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
                            {letter.kind?.kind_name || 'Standard'}
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
              </div>

              {/* Sidebar Column (1 Column) */}
              <div className="space-y-10">
                <div className="bg-white dark:bg-[#141414] p-8 rounded-[2.5rem] border border-slate-100 dark:border-[#222] shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Meta Data
                  </h3>
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1.5 px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{letter.status?.status_name || 'Unknown'}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 px-6 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-l-4 border-blue-500">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LMS ID</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{letter.lms_id}</span>
                      <span className="text-[9px] font-bold text-gray-400">Entry ID: {letter.entry_id}</span>
                    </div>
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
                    return fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{fileName}</p>
                          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Scanned Copy · Click to View</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
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
    );
  }

  if (layoutStyle === 'linear') {
    return (
      <div className="min-h-screen bg-[#080808] text-[#eee] flex overflow-hidden font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden border-l border-[#1a1a1a]">
          <header className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-4 md:px-6 bg-[#080808]/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-[#666] md:hidden transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1a1a1a] rounded text-[#666] hover:text-[#eee] transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#666] uppercase tracking-widest">
                <span>{letter.atg_id}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#eee]">Issue flow</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-[10px] font-bold text-[#666] hover:text-[#eee] flex items-center gap-2 px-3 py-1.5 hover:bg-[#1a1a1a] rounded-lg transition-all">
                <Zap className="w-3 h-3" /> Shortcuts
              </button>
              <button
                onClick={handleMarkAsDone}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                RESOLVE ISSUE
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
              <div className="lg:col-span-3 space-y-8 md:space-y-10">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-black uppercase tracking-widest">{letter.kind?.kind_name}</span>
                    <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Created {new Date(letter.created_at).toLocaleDateString()}</span>
                  </div>
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight text-[#eee] uppercase leading-tight md:leading-none">{letter.sender}</h1>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-[#444] uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Data payload
                  </h3>
                  <div className="p-6 bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl text-sm text-[#999] leading-relaxed font-mono"
                    dangerouslySetInnerHTML={{ __html: letter.summary }} />
                </div>

                <div className="aspect-video bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl flex flex-col items-center justify-center text-[#222]">
                  <Zap className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Digital Asset: Null</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl space-y-6">
                  <h4 className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Metadata</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#444] font-bold uppercase tracking-tighter">Status</span>
                      <span className="text-indigo-400 font-bold uppercase">{letter.global_status?.status_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#444] font-bold uppercase tracking-tighter">Archive</span>
                      <span className="text-[#eee] font-bold uppercase">{letter.tray_info?.tray_no || 'Pending'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#444] font-bold uppercase tracking-tighter">Assignee</span>
                      <div className="flex items-center gap-2 text-[#eee]">
                        <div className="w-5 h-5 bg-[#222] rounded flex items-center justify-center text-[8px]">{user.dept_id.dept_name[0]}</div>
                        <span className="font-bold">{user.dept_id.dept_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl space-y-4">
                  <h4 className="text-[10px] font-bold text-[#444] uppercase tracking-widest">History</h4>
                  <div className="space-y-4 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#1a1a1a]">
                    {[1, 2].map(i => (
                      <div key={i} className="relative before:absolute before:-left-[15px] before:top-1.5 before:w-1.5 before:h-1.5 before:bg-[#222] before:rounded-full">
                        <p className="text-[10px] font-bold text-[#eee]">Object initialized</p>
                        <p className="text-[8px] text-[#444] uppercase font-bold">4 hours ago</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (layoutStyle === 'notion') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#191919] flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto px-4 md:px-12 pt-12 md:pt-24 pb-16 md:pb-32 relative">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="fixed top-6 left-4 p-2 bg-white/80 dark:bg-[#191919]/80 backdrop-blur shadow-sm border border-gray-100 dark:border-[#333] rounded-lg text-gray-400 md:hidden z-40"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 text-gray-400 mb-8 lowercase text-xs font-semibold">
              <button onClick={() => navigate(-1)} className="hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                <ChevronLeft className="w-3 h-3" /> back
              </button>
              <span>/</span>
              <span className="text-gray-900 dark:text-gray-200">{letter.atg_id}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tighter mb-12">
              {letter.sender}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="md:col-span-3 space-y-12">
                {/* Document Canvas */}
                <div className="aspect-[3/4] bg-gray-50 dark:bg-white/5 rounded-sm border border-gray-100 dark:border-[#222] shadow-2xl flex items-center justify-center relative overflow-hidden group">
                  <div className="text-center group-hover:scale-105 transition-transform duration-500">
                    <FileText className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-xs font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">Digital preview canvas</p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-white dark:bg-black rounded border border-gray-100 dark:border-[#333] shadow-sm">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <section>
                  <h3 className="text-sm font-bold text-gray-300 dark:text-gray-600 uppercase mb-4 tracking-widest">Description</h3>
                  <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed text-lg font-serif"
                    dangerouslySetInnerHTML={{ __html: letter.summary }} />
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-300 dark:text-gray-600 uppercase mb-4 tracking-widest">Attachments</h3>
                  {(() => {
                    const filePath = letter.scanned_copy || letter.attachment?.file_path;
                    const fileUrl = buildFileUrl(filePath);
                    const fileName = getFilename(filePath);
                    return fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{fileName}</p>
                          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Scanned Copy</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
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
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Letter property</h4>
                  <div className="space-y-5">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-gray-400 uppercase font-black tracking-tighter text-[9px]">Classification</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{letter.kind?.kind_name}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-gray-400 uppercase font-black tracking-tighter text-[9px]">Process status</span>
                      <span className="text-orange-600 font-bold">{letter.global_status?.status_name}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-gray-400 uppercase font-black tracking-tighter text-[9px]">Archive location</span>
                      <span className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {letter.tray_info?.tray_no || 'Pending filing'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-[#222]">
                  <button
                    onClick={handleMarkAsDone}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded px-4 text-xs font-bold hover:bg-black dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    COMPLETE TASK
                  </button>
                  <p className="text-[9px] text-gray-400 mt-2 text-center uppercase tracking-widest font-bold">Action as {user.dept_id.dept_name}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0D0D0D] flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Modern Header */}
        <header className={`fixed top-0 right-0 left-0 ${isSidebarExpanded ? 'md:left-64' : 'md:left-20'} h-16 bg-white dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-[#222] px-4 md:px-8 flex items-center justify-between z-10 transition-all duration-300`}>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-full transition-all group"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{letter.atg_id}</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Letter Details</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              <Paperclip className="w-4 h-4" />
              ATTACHMENT
            </button>
            <button
              onClick={handleMarkAsDone}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-2 bg-[#F6A17B] hover:bg-[#e8946e] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-orange-100/50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              MARK AS DONE
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 pt-20 md:pt-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

            {/* Main Content Card */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 dark:border-[#222] bg-slate-50/30 dark:bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <FileText className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sender Information</h2>
                      <p className="text-xs text-gray-500 font-medium">Verified correspondence source</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Received Date</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(letter.date_received).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-10">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">{letter.sender}</h3>
                  <div className="flex flex-wrap gap-3 mb-10">
                    <span className="px-4 py-1.5 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-orange-100/50 dark:border-orange-900/20">
                      {letter.letterKind?.kind_name}
                    </span>
                    <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100/50 dark:border-blue-900/20">
                      STATUS: {letter.status?.status_name || 'Unknown'}
                    </span>
                    {letter.attachment && (
                      <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100/50 dark:border-emerald-900/20 flex items-center gap-2">
                        <Paperclip className="w-3 h-3" />
                        ATTACHMENT: {letter.attachment.attachment_name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" />
                      Summary & Description
                    </h4>
                    <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-[#222] text-gray-700 dark:text-gray-300 leading-relaxed font-serif text-lg"
                      dangerouslySetInnerHTML={{ __html: letter.summary }} />
                  </div>
                </div>
              </section>

              {/* Process Steps Timeline */}
              <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] p-10 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" />
                  Process Lifecycle
                </h3>
                <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-50 dark:before:bg-[#222]">
                  {letter.assignments?.map((a, idx) => (
                    <div key={idx} className="relative pl-12">
                      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 ${a.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'} shadow-lg`}>
                        {a.status === 'Done' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{a.step?.step_name || 'Processing'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{a.department?.dept_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${a.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {a.status}
                          </span>
                          <p className="text-[8px] text-gray-400 mt-1 uppercase font-bold">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : 'Active Session'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {letter.logs?.map((l, idx) => (
                    <div key={`log-${idx}`} className="relative pl-12 opacity-60">
                      <div className="absolute left-1.5 top-2 w-5 h-5 rounded-full bg-gray-200 dark:bg-[#333] flex items-center justify-center z-10">
                        <Zap className="w-3 h-3 text-gray-400" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 capitalize">{l.action_taken}</p>
                      <p className="text-[8px] text-gray-400 uppercase font-black">{new Date(l.log_date).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Side Meta Panel */}
            <div className="space-y-8">
              <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] p-8 shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-6">Tracking Data</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Physical Location</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Tray No: {letter.tray?.tray_no || 'Pending Filing'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Time elapsed</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">48 hours active</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Files Section */}
              <section className="bg-white dark:bg-[#141414] rounded-[2rem] border border-gray-100 dark:border-[#222] p-8 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-500" /> Files
                </h3>
                {(() => {
                  const filePath = letter.scanned_copy || letter.attachment?.file_path;
                  const fileUrl = buildFileUrl(filePath);
                  const fileName = getFilename(filePath);
                  return fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase truncate">{fileName}</p>
                        <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Scanned Copy · Click to View</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 font-bold uppercase tracking-widest">No Documents Attached</p>
                    </div>
                  );
                })()}
              </section>

              <section className="bg-orange-600 rounded-[2rem] p-8 text-white shadow-xl shadow-orange-200/50">
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
                    <p className="text-[10px] font-bold uppercase leading-none">{letter.encoder?.first_name || 'Admin'} {letter.encoder?.last_name || ''}</p>
                    <p className="text-[9px] opacity-60">Lead Encoder</p>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
